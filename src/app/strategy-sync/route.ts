import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { StrategyHistoryEntry, StrategyRequestDraft } from "@/lib/strategy-draft";
import { getStrategyDraftKey } from "@/lib/strategy-storage";

type StrategyMemoryStore = {
  drafts: Record<string, StrategyRequestDraft>;
  history: StrategyHistoryEntry[];
};

type StrategyMemoryPayload = {
  draft?: StrategyRequestDraft;
  historyEntry?: StrategyHistoryEntry;
};

const storageFilePath =
  process.env.STRATEGY_MEMORY_FILE ||
  path.join("/tmp", "command-center-v2", "strategy-memory.json");
const historyLimit = 12;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readStore(): Promise<StrategyMemoryStore> {
  try {
    const raw = await readFile(storageFilePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<StrategyMemoryStore>;

    return {
      drafts:
        parsed.drafts && typeof parsed.drafts === "object" ? parsed.drafts : {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return {
      drafts: {},
      history: [],
    };
  }
}

async function writeStore(store: StrategyMemoryStore) {
  await mkdir(path.dirname(storageFilePath), { recursive: true });
  await writeFile(storageFilePath, JSON.stringify(store, null, 2), "utf8");
}

async function requireUserEmail() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  return user.email;
}

function buildUserDraftKey(
  userEmail: string,
  clientId?: string | null,
  clientName?: string | null,
) {
  const draftKey = getStrategyDraftKey(clientId, clientName);
  if (!draftKey) {
    return null;
  }

  return `${userEmail.trim().toLowerCase()}::${draftKey}`;
}

function filterHistory(
  history: StrategyHistoryEntry[],
  clientId?: string | null,
  clientName?: string | null,
) {
  const normalizedClientName = clientName?.trim().toLowerCase();

  const filtered =
    clientId || normalizedClientName
      ? history.filter((entry) => {
          return (
            (clientId ? entry.clientId === clientId : false) ||
            (normalizedClientName
              ? entry.clientName.toLowerCase() === normalizedClientName
              : false)
          );
        })
      : history;

  return filtered
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .slice(0, historyLimit);
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const userEmail = await requireUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const clientName = searchParams.get("clientName");
  const store = await readStore();
  const key = buildUserDraftKey(userEmail, clientId, clientName);

  return NextResponse.json({
    draft: key ? store.drafts[key] ?? null : null,
    history: filterHistory(store.history, clientId, clientName),
  });
}

export async function POST(request: Request) {
  const userEmail = await requireUserEmail();
  if (!userEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: StrategyMemoryPayload;

  try {
    payload = (await request.json()) as StrategyMemoryPayload;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!payload?.draft && !payload?.historyEntry) {
    return badRequest("A draft or history entry is required.");
  }

  const store = await readStore();
  const clientId =
    payload.draft?.clientId ?? payload.historyEntry?.clientId ?? null;
  const clientName =
    payload.draft?.clientName ?? payload.historyEntry?.clientName ?? null;

  if (payload.draft) {
    const key = buildUserDraftKey(
      userEmail,
      payload.draft.clientId,
      payload.draft.clientName,
    );
    if (key) {
      store.drafts[key] = payload.draft;
    }
  }

  if (payload.historyEntry) {
    store.history = [
      payload.historyEntry,
      ...store.history.filter((entry) => entry.id !== payload.historyEntry?.id),
    ]
      .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
      .slice(0, 60);
  }

  await writeStore(store);

  return NextResponse.json({
    ok: true,
    draft:
      clientId || clientName
        ? store.drafts[buildUserDraftKey(userEmail, clientId, clientName) ?? ""] ??
          null
        : null,
    history: filterHistory(store.history, clientId, clientName),
  });
}
