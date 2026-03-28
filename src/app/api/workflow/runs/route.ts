import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";
import { decodeEscapedObjectStrings, decodeEscapedText } from "@/lib/text-normalize";
import { type WorkflowClient, type WorkflowRun } from "@/lib/workflow-contract";

function normalizeRunContent(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = decodeEscapedText(value).trim();
    return normalized || null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidate = [record.markdown, record.raw, record.text, record.content].find(
    (entry) => typeof entry === "string" && entry.trim().length > 0,
  );

  return typeof candidate === "string" ? decodeEscapedText(candidate).trim() || null : null;
}

export async function GET(request: Request) {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId")?.trim() ?? "";

  let runQuery = supabase
    .from("client_deliverables")
    .select("id, client_id, title, type, content, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(clientId ? 20 : 40);

  if (clientId) {
    runQuery = runQuery.eq("client_id", clientId);
  }

  const { data: runData, error: runError } = await runQuery;

  if (runError) {
    return NextResponse.json({ error: runError.message }, { status: 500 });
  }

  const runs = ((runData ?? []) as unknown) as WorkflowRun[];
  const clientIds = Array.from(new Set(runs.map((run) => run.client_id).filter(Boolean)));

  let clients: WorkflowClient[] = [];

  if (clientIds.length > 0) {
    let clientQuery = supabase
      .from("clients")
      .select("id, name, visibility")
      .in("id", clientIds);

    if (!user.canAdmin) {
      clientQuery = clientQuery.or("visibility.eq.all,visibility.is.null");
    }

    const { data } = await clientQuery;
    clients = (((data ?? []) as unknown) as WorkflowClient[]).filter((client) => client.id);
  }

  const clientMap = new Map(clients.map((client) => [client.id, client.name]));

  const visibleRuns = runs
    .filter((run) => user.canAdmin || clientMap.has(run.client_id))
    .map((run) => {
      const normalizedRun = decodeEscapedObjectStrings(run);

      return {
        ...normalizedRun,
        client_name: clientMap.get(run.client_id) ?? null,
        content: normalizeRunContent(normalizedRun.content),
      };
    });

  return NextResponse.json({ runs: visibleRuns });
}
