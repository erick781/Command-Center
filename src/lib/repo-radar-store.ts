import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

type ProviderName = "anthropic" | "openrouter";

export type RepoRadarSettings = {
  autoDeepReviewEnabled: boolean;
  autoShipToDevEnabled: boolean;
  costControlEnabled: boolean;
  dailyUsdCap: number;
  estimatedUsdPerDeepReview: number;
  maxAutoReviewsPerDay: number;
  maxAutoReviewsPerRun: number;
  minimumFitScoreForAutoShip: number;
  minimumScoreForAutoReview: number;
  preferredProviderOrder: ProviderName[];
  reviewFreshnessDays: number;
  updatedAt: string;
  updatedBy: string;
};

export type RepoRadarReviewTrigger = "auto" | "manual";

export type RepoRadarReviewStatus =
  | "completed"
  | "failed"
  | "skipped_budget"
  | "skipped_disabled";

export type RepoRadarReviewRecommendation =
  | "ignore"
  | "watch"
  | "backlog"
  | "apply_candidate";

export type RepoRadarReviewCostSource = "exact" | "legacy_estimate" | "unavailable";

export type RepoRadarReviewRecord = {
  actualCostUsd: number | null;
  category: string;
  costSource: RepoRadarReviewCostSource;
  createdAt: string;
  error: string;
  fitScore: number;
  fullName: string;
  id: string;
  implementationIdeas: string[];
  modelId: string;
  possibleUse: string;
  provider: ProviderName | "";
  recommendation: RepoRadarReviewRecommendation;
  repoPushedAt: string | null;
  risks: string[];
  score: number;
  source: RepoRadarReviewTrigger;
  status: RepoRadarReviewStatus;
  summary: string;
  title: string;
  topics: string[];
  updatedAt: string;
  usage: {
    cachedTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  whyItMatters: string;
};

export type RepoRadarBudgetSummary = {
  actualSpendTodayUsd: number;
  autoReviewsToday: number;
  costControlEnabled: boolean;
  dailyUsdCap: number;
  manualReviewsToday: number;
  remainingBudgetUsd: number | null;
  reviewSlotsRemainingToday: number | null;
  reviewsToday: number;
  reviewsWithoutRealCostToday: number;
  skippedForBudgetToday: number;
};

type RepoRadarSettingsInput = Partial<
  Omit<RepoRadarSettings, "preferredProviderOrder" | "updatedAt" | "updatedBy"> & {
    preferredProviderOrder: ProviderName[] | string;
  }
>;

const DEFAULT_SETTINGS: RepoRadarSettings = {
  autoDeepReviewEnabled: true,
  autoShipToDevEnabled: true,
  costControlEnabled: false,
  dailyUsdCap: 2,
  estimatedUsdPerDeepReview: 0.03,
  maxAutoReviewsPerDay: 4,
  maxAutoReviewsPerRun: 2,
  minimumFitScoreForAutoShip: 82,
  minimumScoreForAutoReview: 55,
  preferredProviderOrder: ["openrouter", "anthropic"],
  reviewFreshnessDays: 10,
  updatedAt: new Date(0).toISOString(),
  updatedBy: "system",
};
const DEFAULT_OPS_DIRECTORY = ".ops-data";
const DEFAULT_SETTINGS_PATH = `${DEFAULT_OPS_DIRECTORY}/repo-radar-settings.json`;
const DEFAULT_REVIEWS_PATH = `${DEFAULT_OPS_DIRECTORY}/repo-radar-reviews.json`;
const DEFAULT_INTERNAL_TOKEN_PATH = `${DEFAULT_OPS_DIRECTORY}/repo-radar-internal-token`;

function getOpsDirectory() {
  return process.env.REPO_RADAR_DATA_DIR || DEFAULT_OPS_DIRECTORY;
}

function getSettingsPath() {
  return process.env.REPO_RADAR_DATA_DIR
    ? `${getOpsDirectory()}/repo-radar-settings.json`
    : DEFAULT_SETTINGS_PATH;
}

function getReviewsPath() {
  return process.env.REPO_RADAR_DATA_DIR
    ? `${getOpsDirectory()}/repo-radar-reviews.json`
    : DEFAULT_REVIEWS_PATH;
}

function getInternalTokenPath() {
  return (
    process.env.REPO_RADAR_INTERNAL_TOKEN_PATH ||
    (process.env.REPO_RADAR_DATA_DIR
      ? `${getOpsDirectory()}/repo-radar-internal-token`
      : DEFAULT_INTERNAL_TOKEN_PATH)
  );
}

async function ensureDirectory() {
  const directory = getOpsDirectory();
  await mkdir(directory, { recursive: true });
  return directory;
}

async function ensureFile(filePath: string, fallbackContent: string) {
  await ensureDirectory();

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, fallbackContent, "utf8");
  }

  return filePath;
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  options?: { max?: number; min?: number; precision?: number },
) {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  const next = Number.isFinite(raw) ? raw : fallback;
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  const bounded = Math.min(max, Math.max(min, next));
  const precision = options?.precision ?? 0;

  if (precision <= 0) {
    return Math.round(bounded);
  }

  const factor = 10 ** precision;
  return Math.round(bounded * factor) / factor;
}

function normalizeProviderOrder(value: unknown) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : DEFAULT_SETTINGS.preferredProviderOrder;

  const parsed = values
    .map((entry) => String(entry).trim().toLowerCase())
    .filter((entry): entry is ProviderName => entry === "anthropic" || entry === "openrouter");

  return parsed.length > 0 ? parsed : DEFAULT_SETTINGS.preferredProviderOrder;
}

function normalizeRecommendation(value: unknown): RepoRadarReviewRecommendation {
  const normalized = sanitizeText(value);

  if (
    normalized === "ignore" ||
    normalized === "watch" ||
    normalized === "backlog" ||
    normalized === "apply_candidate"
  ) {
    return normalized;
  }

  return "watch";
}

function normalizeReviewStatus(value: unknown): RepoRadarReviewStatus {
  const normalized = sanitizeText(value);

  if (
    normalized === "completed" ||
    normalized === "failed" ||
    normalized === "skipped_budget" ||
    normalized === "skipped_disabled"
  ) {
    return normalized;
  }

  return "completed";
}

function normalizeCostSource(value: unknown): RepoRadarReviewCostSource {
  const normalized = sanitizeText(value);

  if (
    normalized === "exact" ||
    normalized === "legacy_estimate" ||
    normalized === "unavailable"
  ) {
    return normalized;
  }

  return "unavailable";
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

export async function getRepoRadarSettings(): Promise<RepoRadarSettings> {
  const filePath = await ensureFile(
    getSettingsPath(),
    `${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`,
  );

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<RepoRadarSettings>;

    return {
      autoDeepReviewEnabled: normalizeBoolean(
        parsed.autoDeepReviewEnabled,
        DEFAULT_SETTINGS.autoDeepReviewEnabled,
      ),
      autoShipToDevEnabled: normalizeBoolean(
        parsed.autoShipToDevEnabled,
        DEFAULT_SETTINGS.autoShipToDevEnabled,
      ),
      costControlEnabled: normalizeBoolean(
        parsed.costControlEnabled,
        DEFAULT_SETTINGS.costControlEnabled,
      ),
      dailyUsdCap: normalizeNumber(parsed.dailyUsdCap, DEFAULT_SETTINGS.dailyUsdCap, {
        min: 0.1,
        precision: 2,
      }),
      estimatedUsdPerDeepReview: normalizeNumber(
        parsed.estimatedUsdPerDeepReview,
        DEFAULT_SETTINGS.estimatedUsdPerDeepReview,
        {
          min: 0.001,
          precision: 3,
        },
      ),
      maxAutoReviewsPerDay: normalizeNumber(
        parsed.maxAutoReviewsPerDay,
        DEFAULT_SETTINGS.maxAutoReviewsPerDay,
        { min: 1, max: 50 },
      ),
      maxAutoReviewsPerRun: normalizeNumber(
        parsed.maxAutoReviewsPerRun,
        DEFAULT_SETTINGS.maxAutoReviewsPerRun,
        { min: 1, max: 10 },
      ),
      minimumFitScoreForAutoShip: normalizeNumber(
        parsed.minimumFitScoreForAutoShip,
        DEFAULT_SETTINGS.minimumFitScoreForAutoShip,
        { min: 0, max: 100, precision: 1 },
      ),
      minimumScoreForAutoReview: normalizeNumber(
        parsed.minimumScoreForAutoReview,
        DEFAULT_SETTINGS.minimumScoreForAutoReview,
        { min: 0, max: 100, precision: 1 },
      ),
      preferredProviderOrder: normalizeProviderOrder(parsed.preferredProviderOrder),
      reviewFreshnessDays: normalizeNumber(
        parsed.reviewFreshnessDays,
        DEFAULT_SETTINGS.reviewFreshnessDays,
        { min: 1, max: 90 },
      ),
      updatedAt: sanitizeText(parsed.updatedAt) || DEFAULT_SETTINGS.updatedAt,
      updatedBy: sanitizeText(parsed.updatedBy) || DEFAULT_SETTINGS.updatedBy,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function saveRepoRadarSettings(settings: RepoRadarSettings) {
  const filePath = await ensureFile(
    getSettingsPath(),
    `${JSON.stringify(DEFAULT_SETTINGS, null, 2)}\n`,
  );
  await writeFile(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
}

export async function updateRepoRadarSettings(
  input: RepoRadarSettingsInput,
  actorEmail: string,
): Promise<RepoRadarSettings> {
  const current = await getRepoRadarSettings();

  const next: RepoRadarSettings = {
    autoDeepReviewEnabled: normalizeBoolean(
      input.autoDeepReviewEnabled,
      current.autoDeepReviewEnabled,
    ),
    autoShipToDevEnabled: normalizeBoolean(
      input.autoShipToDevEnabled,
      current.autoShipToDevEnabled,
    ),
    costControlEnabled: normalizeBoolean(input.costControlEnabled, current.costControlEnabled),
    dailyUsdCap: normalizeNumber(input.dailyUsdCap, current.dailyUsdCap, {
      min: 0.1,
      precision: 2,
    }),
    estimatedUsdPerDeepReview: normalizeNumber(
      input.estimatedUsdPerDeepReview,
      current.estimatedUsdPerDeepReview,
      {
        min: 0.001,
        precision: 3,
      },
    ),
    maxAutoReviewsPerDay: normalizeNumber(
      input.maxAutoReviewsPerDay,
      current.maxAutoReviewsPerDay,
      { min: 1, max: 50 },
    ),
    maxAutoReviewsPerRun: normalizeNumber(
      input.maxAutoReviewsPerRun,
      current.maxAutoReviewsPerRun,
      { min: 1, max: 10 },
    ),
    minimumFitScoreForAutoShip: normalizeNumber(
      input.minimumFitScoreForAutoShip,
      current.minimumFitScoreForAutoShip,
      { min: 0, max: 100, precision: 1 },
    ),
    minimumScoreForAutoReview: normalizeNumber(
      input.minimumScoreForAutoReview,
      current.minimumScoreForAutoReview,
      { min: 0, max: 100, precision: 1 },
    ),
    preferredProviderOrder:
      input.preferredProviderOrder !== undefined
        ? normalizeProviderOrder(input.preferredProviderOrder)
        : current.preferredProviderOrder,
    reviewFreshnessDays: normalizeNumber(
      input.reviewFreshnessDays,
      current.reviewFreshnessDays,
      { min: 1, max: 90 },
    ),
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  };

  await saveRepoRadarSettings(next);
  return next;
}

export async function ensureRepoRadarInternalToken() {
  const filePath = await ensureFile(getInternalTokenPath(), "");
  const existing = sanitizeText(await readFile(filePath, "utf8").catch(() => ""));

  if (existing) {
    return existing;
  }

  const token = randomBytes(24).toString("hex");
  await writeFile(filePath, `${token}\n`, "utf8");
  return token;
}

export async function listRepoRadarReviews(limit?: number): Promise<RepoRadarReviewRecord[]> {
  const filePath = await ensureFile(getReviewsPath(), "[]\n");

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const reviews = parsed
      .map((entry) => {
        const review = entry as Partial<RepoRadarReviewRecord>;
        const legacyEstimatedCostUsd = normalizeNumber(
          (review as { estimatedCostUsd?: unknown }).estimatedCostUsd,
          0,
          {
            min: 0,
            precision: 6,
          },
        );
        const persistedActualCostUsd = normalizeNumber(review.actualCostUsd, legacyEstimatedCostUsd, {
          min: 0,
          precision: 6,
        });
        const inferredCostSource =
          sanitizeText(review.costSource) ||
          ((review as { estimatedCostUsd?: unknown }).estimatedCostUsd !== undefined
            ? "legacy_estimate"
            : persistedActualCostUsd > 0
              ? "exact"
              : "unavailable");
        const costSource = normalizeCostSource(inferredCostSource);

        return {
          actualCostUsd: costSource === "exact" ? persistedActualCostUsd : null,
          category: sanitizeText(review.category),
          costSource,
          createdAt: sanitizeText(review.createdAt) || new Date(0).toISOString(),
          error: sanitizeText(review.error),
          fitScore: normalizeNumber(review.fitScore, 0, { min: 0, max: 100 }),
          fullName: sanitizeText(review.fullName),
          id: sanitizeText(review.id) || randomUUID(),
          implementationIdeas: normalizeStringArray(review.implementationIdeas),
          modelId: sanitizeText(review.modelId),
          possibleUse: sanitizeText(review.possibleUse),
          provider:
            sanitizeText(review.provider) === "openrouter"
              ? "openrouter"
              : sanitizeText(review.provider) === "anthropic"
                ? "anthropic"
                : "",
          recommendation: normalizeRecommendation(review.recommendation),
          repoPushedAt: sanitizeText(review.repoPushedAt) || null,
          risks: normalizeStringArray(review.risks),
          score: normalizeNumber(review.score, 0, { min: 0, max: 100, precision: 1 }),
          source:
            sanitizeText(review.source) === "manual"
              ? "manual"
              : sanitizeText(review.source) === "auto"
                ? "auto"
                : "manual",
          status: normalizeReviewStatus(review.status),
          summary: sanitizeText(review.summary),
          title: sanitizeText(review.title),
          topics: normalizeStringArray(review.topics, 12),
          updatedAt: sanitizeText(review.updatedAt) || sanitizeText(review.createdAt),
          usage: {
            cachedTokens: normalizeNumber(review.usage?.cachedTokens, 0, { min: 0 }),
            inputTokens: normalizeNumber(review.usage?.inputTokens, 0, { min: 0 }),
            outputTokens: normalizeNumber(review.usage?.outputTokens, 0, { min: 0 }),
            totalTokens: normalizeNumber(review.usage?.totalTokens, 0, { min: 0 }),
          },
          whyItMatters: sanitizeText(review.whyItMatters),
        } satisfies RepoRadarReviewRecord;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return typeof limit === "number" ? reviews.slice(0, Math.max(0, limit)) : reviews;
  } catch {
    return [];
  }
}

async function saveRepoRadarReviews(reviews: RepoRadarReviewRecord[]) {
  const filePath = await ensureFile(getReviewsPath(), "[]\n");
  await writeFile(filePath, `${JSON.stringify(reviews.slice(0, 300), null, 2)}\n`, "utf8");
}

export async function createRepoRadarReview(
  input: Omit<RepoRadarReviewRecord, "createdAt" | "id" | "updatedAt">,
) {
  const reviews = await listRepoRadarReviews();
  const now = new Date().toISOString();
  const record: RepoRadarReviewRecord = {
    ...input,
    createdAt: now,
    id: randomUUID(),
    updatedAt: now,
  };

  reviews.unshift(record);
  await saveRepoRadarReviews(reviews);
  return record;
}

export function findLatestRepoRadarReview(
  reviews: RepoRadarReviewRecord[],
  fullName: string,
) {
  return reviews.find((review) => review.fullName.toLowerCase() === fullName.trim().toLowerCase());
}

export function summarizeRepoRadarBudget(
  reviews: RepoRadarReviewRecord[],
  settings: RepoRadarSettings,
): RepoRadarBudgetSummary {
  const today = new Date().toISOString().slice(0, 10);
  const todayReviews = reviews.filter((review) => review.createdAt.slice(0, 10) === today);
  const completedReviews = todayReviews.filter((review) => review.status === "completed");
  const exactCostReviews = completedReviews.filter(
    (review) => review.costSource === "exact" && review.actualCostUsd !== null,
  );
  const actualSpendTodayUsd = exactCostReviews.reduce(
    (sum, review) => sum + Math.max(0, review.actualCostUsd ?? 0),
    0,
  );
  const autoReviewsToday = completedReviews.filter((review) => review.source === "auto").length;
  const manualReviewsToday = completedReviews.filter((review) => review.source === "manual").length;
  const reviewsWithoutRealCostToday = completedReviews.filter(
    (review) => review.costSource !== "exact" || review.actualCostUsd === null,
  ).length;
  const skippedForBudgetToday = todayReviews.filter(
    (review) => review.status === "skipped_budget",
  ).length;
  const remainingBudgetUsd = settings.costControlEnabled
    ? Math.max(0, settings.dailyUsdCap - actualSpendTodayUsd)
    : null;
  const reviewSlotsRemainingToday = settings.costControlEnabled
    ? Math.max(0, settings.maxAutoReviewsPerDay - autoReviewsToday)
    : null;

  return {
    actualSpendTodayUsd,
    autoReviewsToday,
    costControlEnabled: settings.costControlEnabled,
    dailyUsdCap: settings.dailyUsdCap,
    manualReviewsToday,
    remainingBudgetUsd,
    reviewSlotsRemainingToday,
    reviewsToday: completedReviews.length,
    reviewsWithoutRealCostToday,
    skippedForBudgetToday,
  };
}

export function hasFreshRepoRadarReview(
  review: RepoRadarReviewRecord | undefined,
  repoPushedAt: string | null | undefined,
  settings: RepoRadarSettings,
) {
  if (!review || review.status !== "completed") {
    return false;
  }

  const freshnessCutoff = Date.now() - settings.reviewFreshnessDays * 24 * 60 * 60 * 1000;
  const reviewedAt = Date.parse(review.updatedAt || review.createdAt);

  if (!Number.isFinite(reviewedAt) || reviewedAt < freshnessCutoff) {
    return false;
  }

  if (!repoPushedAt || !review.repoPushedAt) {
    return true;
  }

  const candidatePushedAt = Date.parse(repoPushedAt);
  const reviewedForPushedAt = Date.parse(review.repoPushedAt);

  if (!Number.isFinite(candidatePushedAt) || !Number.isFinite(reviewedForPushedAt)) {
    return true;
  }

  return candidatePushedAt <= reviewedForPushedAt;
}
