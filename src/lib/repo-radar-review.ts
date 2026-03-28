import { Buffer } from "node:buffer";

import { generateWithFallback } from "@/lib/ai";
import type { RepoRadarReviewCostSource, RepoRadarSettings } from "@/lib/repo-radar-store";

export type RepoRadarCandidateInput = {
  category: string;
  description: string;
  forks: number;
  fullName: string;
  language: string;
  name: string;
  openIssues: number;
  possibleUse: string;
  pushedAt?: string | null;
  score: number;
  stars: number;
  topics: string[];
  url: string;
  whyItMatches: string;
};

type RepoMetadata = {
  defaultBranch: string;
  fullName: string;
  homepage: string;
  license: string;
  latestReleaseName: string;
  openIssues: number;
  owner: string;
  pushedAt: string | null;
  readmeContent: string;
  rootEntries: string[];
  stars: number;
  topics: string[];
  updatedAt: string | null;
  watchers: number;
};

type RepoRadarReviewResult = {
  fitScore: number;
  implementationIdeas: string[];
  recommendation: "ignore" | "watch" | "backlog" | "apply_candidate";
  risks: string[];
  summary: string;
  whyItMatters: string;
};

type RepoRadarReviewOptions = {
  exactCostRequired?: boolean;
};

type GithubJson = Record<string, unknown>;

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value: string, limit: number) {
  const next = value.trim();
  return next.length > limit ? `${next.slice(0, Math.max(0, limit - 1)).trim()}…` : next;
}

function normalizeStringArray(value: unknown, limit = 6) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => sanitizeText(entry))
    .filter(Boolean)
    .slice(0, limit);
}

async function fetchGitHubJson(path: string) {
  const token = process.env.GITHUB_TOKEN?.trim();
  const response = await fetch(`https://api.github.com${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "User-Agent": "command-center-repo-radar",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed with ${response.status}.`);
  }

  return (await response.json()) as GithubJson | GithubJson[];
}

async function fetchRepoMetadata(fullName: string): Promise<RepoMetadata> {
  const repo = (await fetchGitHubJson(`/repos/${fullName}`)) as GithubJson;
  const [contents, release, readme] = await Promise.all([
    fetchGitHubJson(`/repos/${fullName}/contents`).catch(() => []),
    fetchGitHubJson(`/repos/${fullName}/releases/latest`).catch(() => ({})),
    fetchGitHubJson(`/repos/${fullName}/readme`).catch(() => ({})),
  ]);
  const releasePayload =
    typeof release === "object" && release && !Array.isArray(release) ? (release as GithubJson) : null;
  const readmePayload =
    typeof readme === "object" && readme && !Array.isArray(readme) ? (readme as GithubJson) : null;

  const readmeContent =
    readmePayload &&
    typeof readmePayload.content === "string" &&
    typeof readmePayload.encoding === "string" &&
    readmePayload.encoding.toLowerCase() === "base64"
      ? Buffer.from(readmePayload.content, "base64").toString("utf8")
      : "";

  return {
    defaultBranch: sanitizeText(repo.default_branch),
    fullName,
    homepage: sanitizeText(repo.homepage),
    license:
      typeof repo.license === "object" && repo.license
        ? sanitizeText((repo.license as GithubJson).spdx_id)
        : "",
    latestReleaseName:
      releasePayload ? sanitizeText(releasePayload.name ?? releasePayload.tag_name) : "",
    openIssues: Number(repo.open_issues_count ?? 0) || 0,
    owner:
      typeof repo.owner === "object" && repo.owner ? sanitizeText((repo.owner as GithubJson).login) : "",
    pushedAt: sanitizeText(repo.pushed_at) || null,
    readmeContent,
    rootEntries: Array.isArray(contents)
      ? contents
          .map((entry) =>
            typeof entry === "object" && entry
              ? `${sanitizeText((entry as GithubJson).type)}:${sanitizeText((entry as GithubJson).name)}`
              : "",
          )
          .filter(Boolean)
          .slice(0, 20)
      : [],
    stars: Number(repo.stargazers_count ?? 0) || 0,
    topics: normalizeStringArray(repo.topics, 12),
    updatedAt: sanitizeText(repo.updated_at) || null,
    watchers: Number(repo.subscribers_count ?? repo.watchers_count ?? 0) || 0,
  };
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Empty AI response.");
  }

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response was not valid JSON.");
    }
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeReviewResult(value: Record<string, unknown>): RepoRadarReviewResult {
  const recommendation = sanitizeText(value.recommendation);

  return {
    fitScore: Math.max(0, Math.min(100, Number(value.fitScore ?? 0) || 0)),
    implementationIdeas: normalizeStringArray(value.implementationIdeas),
    recommendation:
      recommendation === "ignore" ||
      recommendation === "watch" ||
      recommendation === "backlog" ||
      recommendation === "apply_candidate"
        ? recommendation
        : "watch",
    risks: normalizeStringArray(value.risks),
    summary: truncateText(sanitizeText(value.summary), 700),
    whyItMatters: truncateText(sanitizeText(value.whyItMatters), 900),
  };
}

export async function runRepoRadarDeepReview(
  candidate: RepoRadarCandidateInput,
  settings: RepoRadarSettings,
  options?: RepoRadarReviewOptions,
) {
  const metadata = await fetchRepoMetadata(candidate.fullName);
  const exactCostRequired = Boolean(options?.exactCostRequired);
  const preferredProviders = exactCostRequired
    ? settings.preferredProviderOrder.filter((provider) => provider === "openrouter")
    : settings.preferredProviderOrder;

  if (exactCostRequired && preferredProviders.length === 0) {
    throw new Error("Real provider cost is unavailable with the selected provider priority.");
  }

  const prompt = `
Repo candidate:
- Full name: ${candidate.fullName}
- URL: ${candidate.url}
- Heuristic category: ${candidate.category}
- Heuristic score: ${candidate.score}
- Description: ${candidate.description || "n/a"}
- Why it matched: ${candidate.whyItMatches}
- Possible use: ${candidate.possibleUse}
- Language: ${candidate.language || "unknown"}
- Stars: ${candidate.stars}
- Forks: ${candidate.forks}
- Open issues: ${candidate.openIssues}
- Topics: ${candidate.topics.join(", ") || "none"}

Fresh GitHub context:
- Default branch: ${metadata.defaultBranch || "unknown"}
- Homepage: ${metadata.homepage || "n/a"}
- License: ${metadata.license || "n/a"}
- Latest release: ${metadata.latestReleaseName || "n/a"}
- Updated at: ${metadata.updatedAt || "n/a"}
- Pushed at: ${metadata.pushedAt || "n/a"}
- Watchers: ${metadata.watchers}
- Root entries: ${metadata.rootEntries.join(", ") || "n/a"}

README excerpt:
${truncateText(metadata.readmeContent, 12000) || "No README content available."}

Evaluate whether this repo is worth adapting for Partenaire.io's internal Command Center.
Prioritize simple, flexible, scalable improvements that help:
- client/task/questions/output workflow
- better deliverables or exports
- stronger connectors/context memory
- better ops/automation flows
- safer frontend/backend boundaries

Return strict JSON only with this exact shape:
{
  "summary": "2-4 sentences max",
  "whyItMatters": "Specific product/architecture rationale",
  "recommendation": "ignore|watch|backlog|apply_candidate",
  "fitScore": 0,
  "implementationIdeas": ["idea 1", "idea 2"],
  "risks": ["risk 1", "risk 2"]
}
`.trim();

  const result = await generateWithFallback({
    messages: [{ content: prompt, role: "user" }],
    providerOrder: preferredProviders,
    purpose: "recommendations",
    system:
      "You are a principal product engineer reviewing open-source repos for an internal AI command center. Be practical, skeptical, and product-first. Return strict JSON only.",
  });

  const parsed = normalizeReviewResult(extractJsonObject(result.text));
  const usage = {
    cachedTokens: Math.max(0, result.usage.cachedInputTokens ?? 0),
    inputTokens: Math.max(0, result.usage.inputTokens ?? 0),
    outputTokens: Math.max(0, result.usage.outputTokens ?? 0),
    totalTokens: Math.max(0, result.usage.totalTokens ?? 0),
  };

  const costSource: RepoRadarReviewCostSource =
    result.actualCostUsd !== null ? "exact" : "unavailable";

  return {
    actualCostUsd: result.actualCostUsd,
    costSource,
    metadata,
    modelId: result.resolvedModelId,
    parsed,
    provider: result.provider,
    usage,
  };
}
