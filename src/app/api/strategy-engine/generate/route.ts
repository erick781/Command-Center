import { NextResponse } from "next/server";

import { getBackendApiBase } from "@/lib/backend-api";
import { evaluateMissingContext } from "@/lib/strategy-missing-context";
import { normalizeStrategyOutput } from "@/lib/strategy-normalizer";
import { resolveStrategyOverlays } from "@/lib/strategy-overlays";
import { buildFastApiStrategyPayload } from "@/lib/strategy-prompt-builder";
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
  loadStrategyHistory,
  requireStrategyUser,
  saveStrategyOutput,
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
    const draftRequest = await saveStrategyRequest(supabase, {
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
      draftRequest.id,
      sourceContext,
    );

    if (evaluation.generationReadiness === "needs_more_context") {
      return NextResponse.json({
        blocked: true,
        evaluation,
        ok: false,
        overlays,
        profile: savedProfile,
        request: draftRequest,
        sourceContext: savedSources,
      });
    }

    const input = {
      clientProfile: savedProfile,
      requestContext: draftRequest,
      sourceContext: savedSources,
      resolvedOverlays: overlays,
      generationOptions: {
        language: savedProfile.identity.language,
        outputMode: draftRequest.requestedOutputs[0] ?? "30_day_action_plan",
      },
    } as const;

    const requestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}`;
    const payload = buildFastApiStrategyPayload(input, evaluation);

    console.info("[strategy-engine] generate:start", {
      clientId: savedProfile.clientId,
      downstreamModel: "opaque_fastapi",
      objective: draftRequest.objective,
      provider: "fastapi_legacy",
      readiness: evaluation.generationReadiness,
      requestId,
      role: user.role,
      stage: draftRequest.stage,
    });

    const startedAt = Date.now();
    const response = await fetch(`${getBackendApiBase()}/api/strategy/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const raw = await response.json().catch(() => null);

    if (!response.ok || !raw) {
      console.error("[strategy-engine] generate:failed", {
        downstreamProvider: "opaque_fastapi",
        provider: "fastapi_legacy",
        requestId,
        status: response.status,
      });
      return NextResponse.json(
        {
          error: "Le generateur strategie FastAPI a echoue.",
        },
        { status: 502 },
      );
    }

    const normalized = normalizeStrategyOutput({
      raw,
      input,
      evaluation,
      latencyMs: Date.now() - startedAt,
      requestId,
    });
    const generatedRequest = await saveStrategyRequest(supabase, {
      clientName: savedProfile.clientName,
      ownerUserId: user.userId,
      profileId: savedProfile.id!,
      request: {
        ...draftRequest,
        generatedAt: new Date().toISOString(),
      },
      generationState: "generated",
    });

    await saveStrategyOutput(supabase, {
      profileId: savedProfile.id!,
      requestId: generatedRequest.id!,
      clientId: savedProfile.clientId,
      clientName: savedProfile.clientName,
      createdByUserId: user.userId,
      outputMode: overlays.primaryOutputMode,
      output: normalized.output,
      inputSnapshot: {
        evaluation,
        overlays,
        profile: savedProfile,
        request: generatedRequest,
        sourceContext: savedSources,
      },
      provider: normalized.meta.provider,
      model: normalized.meta.model,
      strategyType: overlays.businessModel,
      objective: draftRequest.objective,
      confidenceScore: evaluation.confidenceScore,
      confidenceNote: normalized.output.confidenceNote.rationale,
      sourceConfidenceSnapshot: {
        averageSourceConfidence:
          savedSources.length > 0
            ? savedSources.reduce((sum, source) => sum + source.confidenceScore, 0) / savedSources.length
            : 0,
        readiness: evaluation.generationReadiness,
        warnings: evaluation.sourceWarnings,
      },
    });

    console.info("[strategy-engine] generate:success", {
      confidenceLevel: normalized.output.confidenceNote.level,
      downstreamProvider: "opaque_fastapi",
      latencyMs: normalized.meta.latencyMs,
      model: normalized.meta.model,
      provider: normalized.meta.provider,
      readiness: evaluation.generationReadiness,
      requestId,
    });

    return NextResponse.json({
      evaluation,
      history: await loadStrategyHistory(supabase, savedProfile.clientId),
      meta: normalized.meta,
      ok: true,
      output: normalized.output,
      overlays,
      profile: savedProfile,
      request: generatedRequest,
      sourceContext: savedSources,
    });
  } catch (error) {
    console.error("[strategy-engine] generate:error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de generer la strategie.",
      },
      { status: 500 },
    );
  }
}
