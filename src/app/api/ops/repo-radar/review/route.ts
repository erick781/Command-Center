import { NextResponse } from "next/server";

import { createDevRequest } from "@/lib/dev-requests";
import { type RepoRadarCandidateInput, runRepoRadarDeepReview } from "@/lib/repo-radar-review";
import {
  createRepoRadarReview,
  ensureRepoRadarInternalToken,
  findLatestRepoRadarReview,
  getRepoRadarSettings,
  hasFreshRepoRadarReview,
  listRepoRadarReviews,
  summarizeRepoRadarBudget,
} from "@/lib/repo-radar-store";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

export const maxDuration = 120;

type ReviewTrigger = "auto" | "manual";

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCandidate(value: unknown): RepoRadarCandidateInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<RepoRadarCandidateInput>;
  const fullName = sanitizeText(candidate.fullName);
  const url = sanitizeText(candidate.url);

  if (!fullName || !url) {
    return null;
  }

  return {
    category: sanitizeText(candidate.category),
    description: sanitizeText(candidate.description),
    forks: Number(candidate.forks ?? 0) || 0,
    fullName,
    language: sanitizeText(candidate.language),
    name: sanitizeText(candidate.name) || fullName.split("/").at(-1) || fullName,
    openIssues: Number(candidate.openIssues ?? 0) || 0,
    possibleUse: sanitizeText(candidate.possibleUse),
    pushedAt: sanitizeText(candidate.pushedAt) || null,
    score: Number(candidate.score ?? 0) || 0,
    stars: Number(candidate.stars ?? 0) || 0,
    topics: Array.isArray(candidate.topics)
      ? candidate.topics.map((topic) => sanitizeText(topic)).filter(Boolean).slice(0, 12)
      : [],
    url,
    whyItMatches: sanitizeText(candidate.whyItMatches),
  };
}

function extractCandidates(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const payload = value as {
    candidate?: unknown;
    candidates?: unknown;
    report?: { candidates?: unknown };
  };

  const rawCandidates = Array.isArray(payload.candidates)
    ? payload.candidates
    : Array.isArray(payload.report?.candidates)
      ? payload.report?.candidates
      : payload.candidate
        ? [payload.candidate]
        : [];

  const deduped = new Map<string, RepoRadarCandidateInput>();

  rawCandidates.forEach((entry) => {
    const candidate = normalizeCandidate(entry);
    if (!candidate) {
      return;
    }
    deduped.set(candidate.fullName.toLowerCase(), candidate);
  });

  return Array.from(deduped.values()).sort((left, right) => right.score - left.score);
}

async function requireAuthorizedReviewActor(request: Request) {
  const internalToken = request.headers.get("x-repo-radar-token")?.trim();
  const expectedToken = await ensureRepoRadarInternalToken();

  if (internalToken && internalToken === expectedToken) {
    return {
      actorEmail: "repo-radar@n8n",
      error: null,
      internal: true,
    };
  }

  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return {
      actorEmail: "",
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      internal: false,
    };
  }

  if (!user.canAdmin) {
    return {
      actorEmail: "",
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      internal: false,
    };
  }

  return {
    actorEmail: user.email,
    error: null,
    internal: false,
  };
}

function normalizeTrigger(value: unknown, internal: boolean): ReviewTrigger {
  if (sanitizeText(value) === "manual") {
    return "manual";
  }

  if (sanitizeText(value) === "auto") {
    return "auto";
  }

  return internal ? "auto" : "manual";
}

async function maybeAutoShipToDev(
  actorEmail: string,
  candidate: RepoRadarCandidateInput,
  review: {
    fitScore: number;
    id: string;
    implementationIdeas: string[];
    modelId: string;
    recommendation: string;
    risks: string[];
    summary: string;
    whyItMatters: string;
  },
  settings: Awaited<ReturnType<typeof getRepoRadarSettings>>,
) {
  if (!settings.autoShipToDevEnabled) {
    return null;
  }

  const isAutoShipRecommendation =
    review.recommendation === "apply_candidate" || review.recommendation === "backlog";

  if (!isAutoShipRecommendation) {
    return null;
  }

  if (review.fitScore < settings.minimumFitScoreForAutoShip) {
    return null;
  }

  return createDevRequest(
    {
      context: [
        candidate.description ? `Repo description: ${candidate.description}` : "",
        candidate.whyItMatches ? `Why it matched: ${candidate.whyItMatches}` : "",
        review.recommendation ? `Recommendation: ${review.recommendation}` : "",
        review.modelId ? `Reviewed with: ${review.modelId}` : "",
        "Auto-shipped by Repo Radar because it cleared the apply-candidate threshold.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      fitScore: review.fitScore,
      implementationIdeas: review.implementationIdeas,
      initialStatus: "planned",
      modelId: review.modelId,
      originReviewId: review.id,
      priority: review.fitScore >= 92 ? "urgent" : "high",
      recommendation: review.recommendation,
      repoFullName: candidate.fullName,
      repoUrl: candidate.url,
      requestedOutcome: `Adapt ${candidate.fullName} into scoped implementation work for the Command Center without waiting for manual Repo Radar approval.`,
      risks: review.risks,
      source: "repo_radar",
      summary: review.summary,
      title: `Auto-adapt ${candidate.fullName} for Command Center`,
      whyItMatters: review.whyItMatters,
    },
    actorEmail,
  );
}

export async function POST(request: Request) {
  const actor = await requireAuthorizedReviewActor(request);
  if (actor.error) {
    return actor.error;
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const trigger = normalizeTrigger(payload?.trigger, actor.internal);
  const settings = await getRepoRadarSettings();
  const existingReviews = await listRepoRadarReviews();
  const candidates = extractCandidates(payload);

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "At least one valid repo candidate is required." },
      { status: 400 },
    );
  }

  if (trigger === "auto" && !settings.autoDeepReviewEnabled) {
    return NextResponse.json({
      budget: summarizeRepoRadarBudget(existingReviews, settings),
      processed: [],
      skipped: candidates.map((candidate) => ({
        fullName: candidate.fullName,
        reason: "auto review disabled",
      })),
    });
  }

  const budget = summarizeRepoRadarBudget(existingReviews, settings);
  let actualSpendTodayUsd = budget.actualSpendTodayUsd;
  let autoReviewsToday = budget.autoReviewsToday;
  const processed: Array<{ fullName: string; reviewId: string; status: string }> = [];
  const skipped: Array<{ fullName: string; reason: string }> = [];
  const autoShipped: Array<{ fullName: string; requestId: string; status: string }> = [];
  const reviews = [...existingReviews];

  const selectedCandidates =
    trigger === "manual"
      ? candidates.slice(0, 1)
      : candidates
          .filter((candidate) => candidate.score >= settings.minimumScoreForAutoReview)
          .filter((candidate) => {
            const latest = findLatestRepoRadarReview(reviews, candidate.fullName);
            return !hasFreshRepoRadarReview(latest, candidate.pushedAt, settings);
          })
          .slice(0, settings.maxAutoReviewsPerRun);

  if (selectedCandidates.length === 0) {
    return NextResponse.json({
      budget: summarizeRepoRadarBudget(existingReviews, settings),
      processed: [],
      skipped: candidates.map((candidate) => ({
        fullName: candidate.fullName,
        reason: "no eligible candidates after freshness/score rules",
      })),
    });
  }

  for (const candidate of selectedCandidates) {
    const exactCostRequired = trigger === "auto" && settings.costControlEnabled;
    const providerSupportsRealCost =
      settings.preferredProviderOrder.includes("openrouter") &&
      settings.preferredProviderOrder[0] === "openrouter";
    const wouldExceedDailyReviewCount =
      trigger === "auto" && autoReviewsToday >= settings.maxAutoReviewsPerDay;
    const cannotGuaranteeRealCost = exactCostRequired && !providerSupportsRealCost;

    if (wouldExceedDailyReviewCount || cannotGuaranteeRealCost) {
      const skippedRecord = await createRepoRadarReview({
        actualCostUsd: null,
        category: candidate.category,
        costSource: "unavailable",
        error: wouldExceedDailyReviewCount
          ? "Maximum auto reviews reached for today."
          : "Real provider cost is unavailable with the current provider priority.",
        fitScore: 0,
        fullName: candidate.fullName,
        implementationIdeas: [],
        modelId: "",
        possibleUse: candidate.possibleUse,
        provider: "",
        recommendation: "watch",
        repoPushedAt: candidate.pushedAt || null,
        risks: [],
        score: candidate.score,
        source: trigger,
        status: "skipped_budget",
        summary: "",
        title: candidate.name,
        topics: candidate.topics,
        usage: {
          cachedTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        whyItMatters: "",
      });

      reviews.unshift(skippedRecord);
      skipped.push({
        fullName: candidate.fullName,
        reason: wouldExceedDailyReviewCount
          ? "max auto reviews reached"
          : "real cost unavailable for auto review",
      });
      processed.push({
        fullName: candidate.fullName,
        reviewId: skippedRecord.id,
        status: skippedRecord.status,
      });
      continue;
    }

    try {
      const result = await runRepoRadarDeepReview(candidate, settings, {
        exactCostRequired,
      });
      const wouldExceedBudget =
        exactCostRequired &&
        result.actualCostUsd !== null &&
        actualSpendTodayUsd + result.actualCostUsd > settings.dailyUsdCap;

      if (wouldExceedBudget) {
        const skippedRecord = await createRepoRadarReview({
          actualCostUsd: null,
          category: candidate.category,
          costSource: "unavailable",
          error: "Daily cost cap reached.",
          fitScore: 0,
          fullName: candidate.fullName,
          implementationIdeas: [],
          modelId: result.modelId,
          possibleUse: candidate.possibleUse,
          provider: result.provider,
          recommendation: "watch",
          repoPushedAt: result.metadata.pushedAt || candidate.pushedAt || null,
          risks: [],
          score: candidate.score,
          source: trigger,
          status: "skipped_budget",
          summary: "",
          title: candidate.name,
          topics: candidate.topics,
          usage: result.usage,
          whyItMatters: "",
        });

        reviews.unshift(skippedRecord);
        skipped.push({
          fullName: candidate.fullName,
          reason: "daily cost cap reached",
        });
        processed.push({
          fullName: candidate.fullName,
          reviewId: skippedRecord.id,
          status: skippedRecord.status,
        });
        continue;
      }

      const record = await createRepoRadarReview({
        actualCostUsd: result.actualCostUsd,
        category: candidate.category,
        costSource: result.costSource,
        error: "",
        fitScore: result.parsed.fitScore,
        fullName: candidate.fullName,
        implementationIdeas: result.parsed.implementationIdeas,
        modelId: result.modelId,
        possibleUse: candidate.possibleUse,
        provider: result.provider,
        recommendation: result.parsed.recommendation,
        repoPushedAt: result.metadata.pushedAt || candidate.pushedAt || null,
        risks: result.parsed.risks,
        score: candidate.score,
        source: trigger,
        status: "completed",
        summary: result.parsed.summary,
        title: candidate.name,
        topics: candidate.topics,
        usage: result.usage,
        whyItMatters: result.parsed.whyItMatters,
      });

      reviews.unshift(record);
      if (result.actualCostUsd !== null) {
        actualSpendTodayUsd += result.actualCostUsd;
      }
      if (trigger === "auto") {
        autoReviewsToday += 1;
      }
      const devRequest = await maybeAutoShipToDev(
        actor.actorEmail,
        candidate,
        {
          fitScore: result.parsed.fitScore,
          id: record.id,
          implementationIdeas: result.parsed.implementationIdeas,
          modelId: result.modelId,
          recommendation: result.parsed.recommendation,
          risks: result.parsed.risks,
          summary: result.parsed.summary,
          whyItMatters: result.parsed.whyItMatters,
        },
        settings,
      );
      if (devRequest) {
        autoShipped.push({
          fullName: candidate.fullName,
          requestId: devRequest.id,
          status: devRequest.status,
        });
      }
      processed.push({
        fullName: candidate.fullName,
        reviewId: record.id,
        status: record.status,
      });
    } catch (error) {
      const failedRecord = await createRepoRadarReview({
        actualCostUsd: null,
        category: candidate.category,
        costSource: "unavailable",
        error: error instanceof Error ? error.message : "Deep review failed.",
        fitScore: 0,
        fullName: candidate.fullName,
        implementationIdeas: [],
        modelId: "",
        possibleUse: candidate.possibleUse,
        provider: "",
        recommendation: "watch",
        repoPushedAt: candidate.pushedAt || null,
        risks: [],
        score: candidate.score,
        source: trigger,
        status: "failed",
        summary: "",
        title: candidate.name,
        topics: candidate.topics,
        usage: {
          cachedTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
        whyItMatters: "",
      });

      reviews.unshift(failedRecord);
      processed.push({
        fullName: candidate.fullName,
        reviewId: failedRecord.id,
        status: failedRecord.status,
      });
    }
  }

  const latestReviews = selectedCandidates
    .map((candidate) => findLatestRepoRadarReview(reviews, candidate.fullName))
    .filter((review): review is NonNullable<typeof review> => Boolean(review));

  return NextResponse.json({
    autoShipped,
    budget: summarizeRepoRadarBudget(reviews, settings),
    processed,
    reviews: latestReviews,
    skipped,
  });
}
