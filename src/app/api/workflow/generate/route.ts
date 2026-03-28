import { NextResponse } from "next/server";

import {
  buildExtractedClientAssetContextBlock,
  listClientAssets,
} from "@/lib/client-assets";
import { getBackendApiBase } from "@/lib/backend-api";
import { buildClientMemoryContextBlock, loadClientMemory } from "@/lib/client-memory";
import { normalizeCommandCenterLanguage, type CommandCenterLanguage } from "@/lib/language";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";
import {
  buildWorkflowClientCoverage,
  buildWorkflowContextBlock,
  hydrateWorkflowClient,
  type WorkflowClient,
  workflowClientColumns,
} from "@/lib/workflow-contract";
import { getWorkflowTask, resolveWorkflowTask } from "@/lib/workflow-tasks";

type GenerateBody = {
  answers?: Record<string, string>;
  clientId?: string;
  language?: CommandCenterLanguage;
  taskId?: string;
};

type BackendDeliverableResponse = {
  cached?: boolean;
  client_name?: string;
  content?: string;
  detail?: string;
  error?: string;
  generated_at?: string;
  model?: string;
  task_id?: string;
};

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeAnswers(input: Record<string, string> | undefined) {
  return Object.entries(input ?? {}).reduce<Record<string, string>>((accumulator, [key, value]) => {
    accumulator[key] = typeof value === "string" ? value.trim() : "";
    return accumulator;
  }, {});
}

export async function POST(request: Request) {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateBody;

  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const language = normalizeCommandCenterLanguage(body.language);

  if (!body.clientId || !body.taskId) {
    return badRequest("clientId and taskId are required.");
  }

  const task = getWorkflowTask(body.taskId);

  if (!task) {
    return badRequest("Unknown task.");
  }

  let query = supabase.from("clients").select(workflowClientColumns).eq("id", body.clientId);

  if (!user.canAdmin) {
    query = query.or("visibility.eq.all,visibility.is.null");
  }

  const { data: clientData, error: clientError } = await query.maybeSingle();

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  if (!clientData) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const fallbackClient = (clientData as unknown) as WorkflowClient;
  const client = await hydrateWorkflowClient(fallbackClient);
  const memoryResult = await loadClientMemory(supabase, {
    id: client.id,
    industry: client.industry,
    name: client.name,
    notes: client.notes,
    website: client.website,
  });
  const assets = await listClientAssets(client.id).catch(() => []);
  const contextBlock = [
    buildWorkflowContextBlock(client),
    buildClientMemoryContextBlock(memoryResult.memory),
    await buildExtractedClientAssetContextBlock(assets, language),
  ]
    .filter(Boolean)
    .join("\n\n");
  const coverage = buildWorkflowClientCoverage(client);
  const resolvedTask = resolveWorkflowTask(task, {
    assetsCount: assets.length,
    client,
    language,
    memory: memoryResult.memory,
  });
  const localizedTask = resolvedTask.task;
  const answers = {
    ...resolvedTask.defaultAnswers,
    ...normalizeAnswers(body.answers),
  };

  const missingRequired = localizedTask.questions
    .filter((question) => question.required && !answers[question.id])
    .map((question) => question.label);

  if (missingRequired.length > 0) {
    return badRequest(`Missing required answers: ${missingRequired.join(", ")}`);
  }

  try {
    const response = await fetch(`${getBackendApiBase()}/api/strategy/deliverable`, {
      body: JSON.stringify({
        answers,
        client_id: client.id,
        client_name: client.name,
        context: contextBlock,
        industry: client.industry || "",
        language,
        report_type: answers.report_type || "leadgen",
        task_id: task.id,
        website: client.website || "",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const backendPayload = (await response.json().catch(() => null)) as
      | BackendDeliverableResponse
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            backendPayload?.detail ||
            backendPayload?.error ||
            "Deliverable generation failed.",
        },
        { status: response.status },
      );
    }

    const output = backendPayload?.content?.trim() || "";

    if (!output) {
      return NextResponse.json(
        { error: "Deliverable generation returned empty content." },
        { status: 502 },
      );
    }

    const title = `${localizedTask.label} — ${client.name}`;

    const { data: runData, error: runError } = await supabase
      .from("client_deliverables")
      .insert({
        client_id: client.id,
        content: output,
        metadata: {
          answers,
          coverageScore: coverage.score,
          taskId: task.id,
        },
        title,
        type: task.id,
      })
      .select("id, client_id, title, type, content, created_at, metadata")
      .maybeSingle();

    return NextResponse.json({
      client,
      coverage,
      output,
      run: runError ? null : runData,
      saveWarning: runError ? runError.message : null,
      task: localizedTask,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Workflow generation failed.",
      },
      { status: 500 },
    );
  }
}
