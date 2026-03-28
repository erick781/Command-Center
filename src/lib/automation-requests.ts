import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type AutomationRequestStatus =
  | "pending"
  | "planned"
  | "in_progress"
  | "live"
  | "blocked"
  | "done";

export type AutomationRequestPriority = "low" | "medium" | "high" | "urgent";

export type AutomationRequestRecord = {
  clientName: string;
  context: string;
  createdAt: string;
  createdBy: string;
  id: string;
  priority: AutomationRequestPriority;
  requestedOutcome: string;
  source: "manual";
  status: AutomationRequestStatus;
  title: string;
  updatedAt: string;
  updatedBy: string;
};

export type AutomationSignalRecord = {
  channel: string;
  createdAt: string;
  id: string;
  language: string;
  priority: AutomationRequestPriority;
  requester: string;
  source: "signal";
  status: string;
  summary: string;
  title: string;
};

type PendingApprovalRecord = {
  channel?: string;
  created_at?: string;
  id?: string;
  language?: string;
  original_message?: string;
  request_summary?: string;
  sender?: string;
  status?: string;
  urgency?: string;
};

type CreateAutomationRequestInput = {
  clientName?: string;
  context?: string;
  priority?: AutomationRequestPriority;
  requestedOutcome: string;
  title: string;
};

type UpdateAutomationRequestInput = {
  id: string;
  status: AutomationRequestStatus;
};

const STATUS_VALUES: AutomationRequestStatus[] = [
  "pending",
  "planned",
  "in_progress",
  "live",
  "blocked",
  "done",
];

const PRIORITY_VALUES: AutomationRequestPriority[] = ["low", "medium", "high", "urgent"];

function normalizeStatus(value: unknown): AutomationRequestStatus {
  return STATUS_VALUES.includes(value as AutomationRequestStatus)
    ? (value as AutomationRequestStatus)
    : "pending";
}

function normalizePriority(value: unknown): AutomationRequestPriority {
  return PRIORITY_VALUES.includes(value as AutomationRequestPriority)
    ? (value as AutomationRequestPriority)
    : "medium";
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getAutomationRequestsDirectory() {
  return process.env.AUTOMATION_REQUESTS_DIR || path.join(process.cwd(), ".ops-data");
}

function getAutomationRequestsFilePath() {
  return path.join(getAutomationRequestsDirectory(), "automation-requests.json");
}

async function ensureRequestsFile() {
  const directory = getAutomationRequestsDirectory();
  const filePath = getAutomationRequestsFilePath();
  await mkdir(directory, { recursive: true });

  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, "[]\n", "utf8");
  }

  return filePath;
}

export async function listAutomationRequests(): Promise<AutomationRequestRecord[]> {
  const filePath = await ensureRequestsFile();

  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        const record = item as Partial<AutomationRequestRecord>;

        return {
          clientName: sanitizeText(record.clientName),
          context: sanitizeText(record.context),
          createdAt: sanitizeText(record.createdAt) || new Date().toISOString(),
          createdBy: sanitizeText(record.createdBy),
          id: sanitizeText(record.id) || randomUUID(),
          priority: normalizePriority(record.priority),
          requestedOutcome: sanitizeText(record.requestedOutcome),
          source: "manual" as const,
          status: normalizeStatus(record.status),
          title: sanitizeText(record.title),
          updatedAt: sanitizeText(record.updatedAt) || sanitizeText(record.createdAt) || new Date().toISOString(),
          updatedBy: sanitizeText(record.updatedBy) || sanitizeText(record.createdBy),
        };
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}

async function saveAutomationRequests(requests: AutomationRequestRecord[]) {
  const filePath = await ensureRequestsFile();
  await writeFile(filePath, `${JSON.stringify(requests, null, 2)}\n`, "utf8");
}

export async function createAutomationRequest(
  input: CreateAutomationRequestInput,
  actorEmail: string,
) {
  const title = sanitizeText(input.title);
  const requestedOutcome = sanitizeText(input.requestedOutcome);

  if (!title || !requestedOutcome) {
    throw new Error("Title and requested outcome are required.");
  }

  const now = new Date().toISOString();
  const requests = await listAutomationRequests();
  const record: AutomationRequestRecord = {
    clientName: sanitizeText(input.clientName),
    context: sanitizeText(input.context),
    createdAt: now,
    createdBy: actorEmail,
    id: randomUUID(),
    priority: normalizePriority(input.priority),
    requestedOutcome,
    source: "manual",
    status: "pending",
    title,
    updatedAt: now,
    updatedBy: actorEmail,
  };

  requests.unshift(record);
  await saveAutomationRequests(requests);
  return record;
}

export async function updateAutomationRequest(
  input: UpdateAutomationRequestInput,
  actorEmail: string,
) {
  const requests = await listAutomationRequests();
  const index = requests.findIndex((request) => request.id === input.id);

  if (index === -1) {
    throw new Error("Automation request not found.");
  }

  const nextRecord: AutomationRequestRecord = {
    ...requests[index],
    status: normalizeStatus(input.status),
    updatedAt: new Date().toISOString(),
    updatedBy: actorEmail,
  };

  requests[index] = nextRecord;
  await saveAutomationRequests(requests);
  return nextRecord;
}

function inferSignalPriority(value: string): AutomationRequestPriority {
  const normalized = value.toLowerCase();

  if (normalized.includes("immediate")) return "urgent";
  if (normalized.includes("today")) return "high";
  if (normalized.includes("this_week")) return "medium";
  return "medium";
}

function buildSignalTitle(record: PendingApprovalRecord) {
  const summary = sanitizeText(record.request_summary);
  if (summary) {
    return summary.split(".")[0] || summary;
  }

  const original = sanitizeText(record.original_message);
  return original.slice(0, 120) || "Automation signal";
}

function isAutomationSignal(record: PendingApprovalRecord) {
  const text = `${record.request_summary ?? ""}\n${record.original_message ?? ""}`.toLowerCase();
  const keywords = [
    "automation",
    "automations",
    "workflow",
    "n8n",
    "zap",
    "form has been created",
    "set up the automations",
  ];

  return keywords.some((keyword) => text.includes(keyword));
}

function getPendingApprovalsPath() {
  return path.resolve(process.cwd(), "..", "command-center-agent", "pending_approvals.json");
}

export async function listAutomationSignals(): Promise<AutomationSignalRecord[]> {
  try {
    const raw = await readFile(getPendingApprovalsPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => item as PendingApprovalRecord)
      .filter(isAutomationSignal)
      .map((record) => ({
        channel: sanitizeText(record.channel),
        createdAt: sanitizeText(record.created_at),
        id: sanitizeText(record.id) || randomUUID(),
        language: sanitizeText(record.language) || "en",
        priority: inferSignalPriority(sanitizeText(record.urgency)),
        requester: sanitizeText(record.sender),
        source: "signal" as const,
        status: sanitizeText(record.status) || "pending",
        summary:
          sanitizeText(record.request_summary) || sanitizeText(record.original_message) || "No summary",
        title: buildSignalTitle(record),
      }))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [];
  }
}
