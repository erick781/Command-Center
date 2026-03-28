import { NextResponse } from "next/server";

import {
  buildClientMemoryContextBlock,
  hasClientMemory,
  loadClientMemory,
} from "@/lib/client-memory";
import {
  buildExtractedClientAssetContextBlock,
  listClientAssets,
} from "@/lib/client-assets";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";
import {
  buildWorkflowClientCoverage,
  buildWorkflowContextBlock,
  hasWorkflowManualContext,
  hydrateWorkflowClient,
  type WorkflowClient,
  workflowClientColumns,
} from "@/lib/workflow-contract";
import { normalizeCommandCenterLanguage } from "@/lib/language";
import { getWorkflowTask, resolveWorkflowTask } from "@/lib/workflow-tasks";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function buildNextBestContextAdds(input: {
  assetsCount: number;
  hasClientMemory: boolean;
  hasManualNotes: boolean;
  language: "fr" | "en";
  client: WorkflowClient;
}) {
  const { assetsCount, client, hasClientMemory, hasManualNotes, language } = input;
  const suggestions: string[] = [];
  const hasSocials = Boolean(
    client.facebook_url ||
      client.instagram_url ||
      client.tiktok_url ||
      client.youtube_url ||
      client.linkedin_url,
  );
  const hasAdsConnector = Boolean(client.meta_account_id || client.google_ads_customer_id);

  if (!client.website) {
    suggestions.push(
      language === "fr"
        ? "Ajoute le site web du client pour enrichir automatiquement le contexte de base."
        : "Add the client website so the system can enrich the baseline context automatically.",
    );
  }

  if (!hasSocials) {
    suggestions.push(
      language === "fr"
        ? "Ajoute les URLs sociales principales pour mieux comprendre la présence, le ton et les offres."
        : "Add the main social URLs to better understand the client’s presence, tone, and offers.",
    );
  }

  if (!hasManualNotes && !hasClientMemory) {
    suggestions.push(
      language === "fr"
        ? "Sauvegarde des notes internes ou de la mémoire stratégique pour éviter de repartir de zéro."
        : "Save internal notes or strategy memory so the workflow does not restart from zero every time.",
    );
  }

  if (!hasAdsConnector) {
    suggestions.push(
      language === "fr"
        ? "Mappe Meta Ads ou Google Ads pour récupérer des signaux de performance vérifiables."
        : "Map Meta Ads or Google Ads so the workflow can pull verified performance signals.",
    );
  }

  if (assetsCount === 0) {
    suggestions.push(
      language === "fr"
        ? "Upload des notes d’appel, briefs, decks ou docs clients pour nourrir les prochains outputs."
        : "Upload call notes, briefs, decks, or client docs to feed future outputs.",
    );
  }

  if (!client.asana_project_id && !client.google_drive_folder_id && !client.slack_channel_id) {
    suggestions.push(
      language === "fr"
        ? "Ajoute au moins un connecteur opérationnel pour mieux relier exécution, assets et contexte."
        : "Add at least one operational connector to better link execution, assets, and context.",
    );
  }

  return suggestions.slice(0, 4);
}

export async function GET(request: Request) {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const language = normalizeCommandCenterLanguage(searchParams.get("lang"));
  const taskId = searchParams.get("taskId");

  if (!clientId || !taskId) {
    return badRequest("clientId and taskId are required.");
  }

  const task = getWorkflowTask(taskId);

  if (!task) {
    return badRequest("Unknown task.");
  }

  let query = supabase.from("clients").select(workflowClientColumns).eq("id", clientId);

  if (!user.canAdmin) {
    query = query.or("visibility.eq.all,visibility.is.null");
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const fallbackClient = (data as unknown) as WorkflowClient;
  const client = await hydrateWorkflowClient(fallbackClient);
  const memoryResult = await loadClientMemory(supabase, {
    id: client.id,
    industry: client.industry,
    name: client.name,
    notes: client.notes,
    website: client.website,
  });
  const assets = await listClientAssets(client.id).catch(() => []);
  const coverage = buildWorkflowClientCoverage(client);
  const hasManualNotes = hasWorkflowManualContext(client);
  const hasMemory = hasClientMemory(memoryResult.memory);
  const memoryBlock = buildClientMemoryContextBlock(memoryResult.memory);
  const assetBlock = await buildExtractedClientAssetContextBlock(assets, language);
  const resolvedTask = resolveWorkflowTask(task, {
    assetsCount: assets.length,
    client,
    language,
    memory: memoryResult.memory,
  });
  const warnings = [
    ...resolvedTask.warnings,
    coverage.missing.length >= 5 && resolvedTask.task.questions.length > 0
      ? language === "fr"
        ? "Le profil client reste léger, donc quelques réponses ciblées auront plus d’impact que d’habitude."
        : "The client profile is still light, so a few targeted answers will matter more than usual."
      : null,
  ].filter((warning): warning is string => Boolean(warning));

  return NextResponse.json({
    client,
    contextSnapshot: [buildWorkflowContextBlock(client), memoryBlock, assetBlock]
      .filter(Boolean)
      .join("\n\n"),
    coverage,
    defaultAnswers: resolvedTask.defaultAnswers,
    nextBestContextAdds: buildNextBestContextAdds({
      assetsCount: assets.length,
      client,
      hasClientMemory: hasMemory,
      hasManualNotes,
      language,
    }).concat(resolvedTask.profileContextNeeds).filter((value, index, all) => all.indexOf(value) === index).slice(0, 4),
    task: resolvedTask.task,
    warnings,
  });
}
