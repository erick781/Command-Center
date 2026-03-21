import { NextResponse } from "next/server";

import type { StrategyProfileRecord } from "@/lib/strategy-schema";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import {
  loadEffectiveSourceContext,
  loadFreshSourceContext,
  requireStrategyUser,
  saveStrategyProfile,
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
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!body.profile?.clientId || !body.profile.clientName) {
    return badRequest("A valid profile payload is required.");
  }

  try {
    const freshSourceContext = await loadFreshSourceContext({
      clientId: body.profile.clientId,
      clientName: body.profile.clientName,
      profile: body.profile,
    });
    const savedProfile = await saveStrategyProfile(
      supabase,
      body.profile,
      freshSourceContext,
    );
    const effectiveSourceContext =
      savedProfile.id
        ? await loadEffectiveSourceContext(supabase, {
            profile: savedProfile,
            profileId: savedProfile.id,
            clientId: savedProfile.clientId,
            clientName: savedProfile.clientName,
          })
        : freshSourceContext;
    const savedSources = savedProfile.id
      ? await upsertSourceContext(
          supabase,
          savedProfile.id,
          undefined,
          effectiveSourceContext,
        )
      : [];

    return NextResponse.json({
      ok: true,
      profile: savedProfile,
      sourceContext: savedSources,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'enregistrer le profil.",
      },
      { status: 500 },
    );
  }
}
