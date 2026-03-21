import type { StrategyHistoryEntry, StrategyRequestDraft } from "@/lib/strategy-draft";

const draftStorageKey = "partenaire.strategy-drafts.v1";
const historyStorageKey = "partenaire.strategy-history.v1";
const historyLimit = 12;
const strategySyncEndpoint = "/strategy-sync";

export type StrategyStorageBackend = "server-file" | "supabase";

type StrategyMemoryPayload = {
  draft: StrategyRequestDraft | null;
  history: StrategyHistoryEntry[];
};

function getConfiguredBackend(): StrategyStorageBackend {
  const configured = (
    process.env.NEXT_PUBLIC_STRATEGY_STORAGE_BACKEND || "server-file"
  )
    .trim()
    .toLowerCase();

  return configured === "supabase" ? "supabase" : "server-file";
}

export function getStrategyStorageBackend() {
  return getConfiguredBackend();
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T) {
  if (!isBrowser()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getStrategyDraftKey(clientId?: string | null, clientName?: string | null) {
  if (clientId && clientId.trim()) {
    return `id:${clientId.trim()}`;
  }

  if (clientName && clientName.trim()) {
    return `name:${clientName.trim().toLowerCase()}`;
  }

  return null;
}

export function loadStrategyDraft(clientId?: string | null, clientName?: string | null) {
  const key = getStrategyDraftKey(clientId, clientName);
  if (!key) {
    return null;
  }

  const drafts = readJson<Record<string, StrategyRequestDraft>>(draftStorageKey, {});
  return drafts[key] ?? null;
}

export function saveStrategyDraft(draft: StrategyRequestDraft) {
  const key = getStrategyDraftKey(draft.clientId, draft.clientName);
  if (!key) {
    return;
  }

  const drafts = readJson<Record<string, StrategyRequestDraft>>(draftStorageKey, {});
  drafts[key] = draft;
  writeJson(draftStorageKey, drafts);
}

export function listStrategyHistory() {
  return readJson<StrategyHistoryEntry[]>(historyStorageKey, []);
}

export function saveStrategyHistoryEntry(entry: StrategyHistoryEntry) {
  const nextHistory = [
    entry,
    ...listStrategyHistory().filter((current) => current.id !== entry.id),
  ].slice(0, historyLimit);

  writeJson(historyStorageKey, nextHistory);
  return nextHistory;
}

export function replaceStrategyHistory(entries: StrategyHistoryEntry[]) {
  const nextHistory = entries.slice(0, historyLimit);
  writeJson(historyStorageKey, nextHistory);
  return nextHistory;
}

export function mergeStrategyHistoryEntries(
  existing: StrategyHistoryEntry[],
  incoming: StrategyHistoryEntry[],
) {
  const merged = [...incoming, ...existing].reduce<StrategyHistoryEntry[]>(
    (accumulator, entry) => {
      if (accumulator.some((current) => current.id === entry.id)) {
        return accumulator;
      }

      accumulator.push(entry);
      return accumulator;
    },
    [],
  );

  return merged
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .slice(0, historyLimit);
}

export async function loadStrategyMemoryFromServer(
  clientId?: string | null,
  clientName?: string | null,
) {
  if (!isBrowser()) {
    return null;
  }

  // Supabase is the next backend, but server-file remains the active production path
  // until tables + RLS are finalized and proven.
  if (getConfiguredBackend() === "supabase") {
    return null;
  }

  const params = new URLSearchParams();
  if (clientId) {
    params.set("clientId", clientId);
  }
  if (clientName) {
    params.set("clientName", clientName);
  }

  const query = params.toString();

  try {
    const response = await fetch(
      query ? `${strategySyncEndpoint}?${query}` : strategySyncEndpoint,
      {
        cache: "no-store",
        credentials: "include",
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Partial<StrategyMemoryPayload>;
    return {
      draft: data.draft ?? null,
      history: Array.isArray(data.history) ? data.history : [],
    } satisfies StrategyMemoryPayload;
  } catch {
    return null;
  }
}

export async function saveStrategyMemoryToServer(input: {
  draft?: StrategyRequestDraft;
  historyEntry?: StrategyHistoryEntry;
}) {
  if (!isBrowser()) {
    return false;
  }

  if (!input.draft && !input.historyEntry) {
    return false;
  }

  if (getConfiguredBackend() === "supabase") {
    return false;
  }

  try {
    const response = await fetch(strategySyncEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(input),
    });

    return response.ok;
  } catch {
    return false;
  }
}
