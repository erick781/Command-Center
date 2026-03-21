import { NextResponse } from "next/server";

import { evaluateMissingContext } from "@/lib/strategy-missing-context";
import { resolveStrategyOverlays } from "@/lib/strategy-overlays";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { loadStrategyContext, requireStrategyUser } from "@/lib/strategy-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const clientName = searchParams.get("clientName");

  if (!clientId && !clientName) {
    return badRequest("clientId or clientName is required.");
  }

  try {
    const context = await loadStrategyContext(supabase, user, {
      clientId,
      clientName,
    });
    const overlays = resolveStrategyOverlays({
      clientProfile: context.profile,
      requestContext: context.request,
      sourceContext: context.sourceContext,
    });
    const evaluation = evaluateMissingContext({
      clientProfile: context.profile,
      requestContext: context.request,
      sourceContext: context.sourceContext,
      resolvedOverlays: overlays,
      generationOptions: {
        language: context.profile.identity.language,
        outputMode: context.request.requestedOutputs[0] ?? "30_day_action_plan",
      },
    });

    return NextResponse.json({
      client: context.client,
      evaluation,
      history: context.history,
      overlays,
      permissions: {
        canAdmin: user.canAdmin,
        canWrite: user.canWrite,
        role: user.role,
      },
      profile: context.profile,
      request: {
        ...context.request,
        missingQuestions: [
          ...evaluation.criticalMissing.map((item) => item.question),
          ...evaluation.recommendedMissing.map((item) => item.question),
        ],
      },
      sourceContext: context.sourceContext,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger le contexte strategique.",
      },
      { status: 500 },
    );
  }
}
