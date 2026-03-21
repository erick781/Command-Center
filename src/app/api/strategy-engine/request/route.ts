import { NextResponse } from "next/server";

import { evaluateMissingContext } from "@/lib/strategy-missing-context";
import { resolveStrategyOverlays } from "@/lib/strategy-overlays";
import type {
  StrategyOutputMode,
  StrategyProfileRecord,
  StrategyRequestRecord,
} from "@/lib/strategy-schema";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import {
  loadEffectiveSourceContext,
  loadFreshSourceContext,
  loadRetrievedContextSnapshot,
  requireStrategyUser,
  saveStrategyProfile,
  saveStrategyRequest,
  upsertSourceContext,
} from "@/lib/strategy-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.canWrite) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    profile?: StrategyProfileRecord;
    request?: StrategyRequestRecord;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!body.profile || !body.request) {
    return badRequest("profile and request payloads are required.");
  }

  if (!body.profile.clientId || !body.profile.clientName) {
    return badRequest("profile.clientId and profile.clientName are required.");
  }

  if (!body.request.objective || !body.request.stage || !body.request.timeHorizon) {
    return badRequest("request.objective, request.stage, and request.timeHorizon are required.");
  }

  try {
    const freshSourceContext = await loadFreshSourceContext({
      clientId: body.profile.clientId,
      clientName: body.profile.clientName,
      profile: body.profile,
    });
    const preparedOutputs: StrategyOutputMode[] =
      Array.isArray(body.request.requestedOutputs) && body.request.requestedOutputs.length > 0
        ? body.request.requestedOutputs
        : ["30_day_action_plan"];
    const outputMode = preparedOutputs[0] ?? "30_day_action_plan";
    const normalizedRequest: StrategyRequestRecord = {
      ...body.request,
      clientId: body.profile.clientId,
      requestedOutputs: preparedOutputs,
    };
    const savedProfile = await saveStrategyProfile(supabase, body.profile, freshSourceContext);
    const sourceContext =
      savedProfile.id
        ? await loadEffectiveSourceContext(supabase, {
            profile: savedProfile,
            profileId: savedProfile.id,
            requestId: body.request.id,
            clientId: savedProfile.clientId,
            clientName: savedProfile.clientName,
          })
        : freshSourceContext;
    const retrievedContextSnapshot = await loadRetrievedContextSnapshot({
      clientId: savedProfile.clientId,
      clientName: savedProfile.clientName,
      profile: savedProfile,
      sourceContext,
    });
    const overlays = resolveStrategyOverlays({
      clientProfile: savedProfile,
      requestContext: normalizedRequest,
      sourceContext,
    });
    const evaluation = evaluateMissingContext({
      clientProfile: savedProfile,
      requestContext: normalizedRequest,
      sourceContext,
      resolvedOverlays: overlays,
      generationOptions: {
        language: savedProfile.identity.language,
        outputMode,
      },
    });
    const preparedRequest: StrategyRequestRecord = {
      ...normalizedRequest,
      profileId: savedProfile.id,
      retrievedContextSnapshot,
      missingQuestions: [
        ...evaluation.criticalMissing.map((item) => item.question),
        ...evaluation.recommendedMissing.map((item) => item.question),
      ],
      dataConfidence: {
        confidenceScore: evaluation.confidenceScore,
        generationReadiness: evaluation.generationReadiness,
        sourceWarnings: evaluation.sourceWarnings,
      },
    };

    const savedRequest = await saveStrategyRequest(supabase, {
      clientName: savedProfile.clientName,
      ownerUserId: user.userId,
      profileId: savedProfile.id!,
      request: preparedRequest,
      generationState:
        evaluation.generationReadiness === "needs_more_context"
          ? "draft"
          : "ready_for_generation",
    });
    const savedSources = await upsertSourceContext(
      supabase,
      savedProfile.id!,
      savedRequest.id,
      sourceContext,
    );

    return NextResponse.json({
      evaluation,
      ok: true,
      overlays,
      profile: savedProfile,
      request: savedRequest,
      sourceContext: savedSources,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer la requete strategique.",
      },
      { status: 500 },
    );
  }
}
