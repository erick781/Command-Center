import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export type DevRequestStatus =
  | "pending"
  | "planned"
  | "in_progress"
  | "live"
  | "blocked"
  | "done";

export type DevRequestPriority = "low" | "medium" | "high" | "urgent";

export type DevRequestSource = "manual" | "repo_radar";

export type DevRequestRecord = {
  context: string;
  createdAt: string;
  createdBy: string;
  fitScore: number | null;
  id: string;
  implementationIdeas: string[];
  modelId: string;
  originReviewId: string;
  priority: DevRequestPriority;
  recommendation: string;
  repoFullName: string;
  repoUrl: string;
  requestedOutcome: string;
  risks: string[];
  source: DevRequestSource;
  status: DevRequestStatus;
  summary: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
  whyItMatters: string;
};

type CreateDevRequestInput = {
  context?: string;
  fitScore?: number | null;
  implementationIdeas?: string[];
  initialStatus?: DevRequestStatus;
  modelId?: string;
  originReviewId?: string;
  priority?: DevRequestPriority;
  recommendation?: string;
  repoFullName?: string;
  repoUrl?: string;
  requestedOutcome: string;
  risks?: string[];
  source?: DevRequestSource;
  summary?: string;
  title: string;
  whyItMatters?: string;
};

type UpdateDevRequestInput = {
  id: string;
  status: DevRequestStatus;
};

const STATUS_VALUES: DevRequestStatus[] = [
  "pending",
  "planned",
  "in_progress",
  "live",
  "blocked",
  "done",
];

const PRIORITY_VALUES: DevRequestPriority[] = ["low", "medium", "high", "urgent"];
const DEV_REQUESTS_FILE_PATH = ".ops-data/dev-requests.json";

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(value: unknown): DevRequestStatus {
  return STATUS_VALUES.includes(value as DevRequestStatus)
    ? (value as DevRequestStatus)
    : "pending";
}

function normalizePriority(value: unknown): DevRequestPriority {
  return PRIORITY_VALUES.includes(value as DevRequestPriority)
    ? (value as DevRequestPriority)
    : "medium";
}

function normalizeStringArray(value: unknown, limit = 8) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => sanitizeText(entry))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeScore(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function getParentDirectory(filePath: string) {
  const normalized = filePath.trim();
  const index = normalized.lastIndexOf("/");
  return index > 0 ? normalized.slice(0, index) : ".";
}

async function ensureRequestsFile() {
  const filePath = DEV_REQUESTS_FILE_PATH;
  await mkdir(getParentDirectory(filePath), { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]\n", "utf8");
  }

  return filePath;
}

export async function listDevRequests(): Promise<DevRequestRecord[]> {
  const filePath = await ensureRequestsFile();

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const record = item as Partial<DevRequestRecord>;

        return {
          context: sanitizeText(record.context),
          createdAt: sanitizeText(record.createdAt) || new Date(0).toISOString(),
          createdBy: sanitizeText(record.createdBy),
          fitScore: normalizeScore(record.fitScore),
          id: sanitizeText(record.id) || randomUUID(),
          implementationIdeas: normalizeStringArray(record.implementationIdeas),
          modelId: sanitizeText(record.modelId),
          originReviewId: sanitizeText(record.originReviewId),
          priority: normalizePriority(record.priority),
          recommendation: sanitizeText(record.recommendation),
          repoFullName: sanitizeText(record.repoFullName),
          repoUrl: sanitizeText(record.repoUrl),
          requestedOutcome: sanitizeText(record.requestedOutcome),
          risks: normalizeStringArray(record.risks),
          source:
            sanitizeText(record.source) === "repo_radar" ? "repo_radar" : "manual",
          status: normalizeStatus(record.status),
          summary: sanitizeText(record.summary),
          title: sanitizeText(record.title),
          updatedAt: sanitizeText(record.updatedAt) || sanitizeText(record.createdAt),
          updatedBy: sanitizeText(record.updatedBy) || sanitizeText(record.createdBy),
          whyItMatters: sanitizeText(record.whyItMatters),
        } satisfies DevRequestRecord;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}

async function saveDevRequests(requests: DevRequestRecord[]) {
  const filePath = await ensureRequestsFile();
  await writeFile(filePath, `${JSON.stringify(requests.slice(0, 400), null, 2)}\n`, "utf8");
}

export async function createDevRequest(input: CreateDevRequestInput, actorEmail: string) {
  const title = sanitizeText(input.title);
  const requestedOutcome = sanitizeText(input.requestedOutcome);

  if (!title || !requestedOutcome) {
    throw new Error("Title and requested outcome are required.");
  }

  const requests = await listDevRequests();
  const originReviewId = sanitizeText(input.originReviewId);

  if (originReviewId) {
    const existing = requests.find((request) => request.originReviewId === originReviewId);
    if (existing) {
      return existing;
    }
  }

  const now = new Date().toISOString();
  const record: DevRequestRecord = {
    context: sanitizeText(input.context),
    createdAt: now,
    createdBy: actorEmail,
    fitScore: normalizeScore(input.fitScore),
    id: randomUUID(),
    implementationIdeas: normalizeStringArray(input.implementationIdeas),
    modelId: sanitizeText(input.modelId),
    originReviewId,
    priority: normalizePriority(input.priority),
    recommendation: sanitizeText(input.recommendation),
    repoFullName: sanitizeText(input.repoFullName),
    repoUrl: sanitizeText(input.repoUrl),
    requestedOutcome,
    risks: normalizeStringArray(input.risks),
    source: input.source === "repo_radar" ? "repo_radar" : "manual",
    status: input.initialStatus ? normalizeStatus(input.initialStatus) : "pending",
    summary: sanitizeText(input.summary),
    title,
    updatedAt: now,
    updatedBy: actorEmail,
    whyItMatters: sanitizeText(input.whyItMatters),
  };

  requests.unshift(record);
  await saveDevRequests(requests);
  return record;
}

export async function updateDevRequest(input: UpdateDevRequestInput, actorEmail: string) {
  const requests = await listDevRequests();
  const index = requests.findIndex((request) => request.id === input.id);

  if (index === -1) {
    throw new Error("Development request not found.");
  }

  const record: DevRequestRecord = {
    ...requests[index],
    status: normalizeStatus(input.status),
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  };

  requests[index] = record;
  await saveDevRequests(requests);
  return record;
}
