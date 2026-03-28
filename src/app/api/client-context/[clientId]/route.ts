import { NextResponse } from "next/server";

import {
  clientMemoryKeys,
  loadClientMemory,
  saveClientMemory,
  type ClientMemoryForm,
  type ClientMemorySeed,
} from "@/lib/client-memory";
import {
  normalizeClientContextField,
  type ClientContextEditableField,
} from "@/lib/client-context-normalize";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

const clientContextColumns = [
  "id",
  "name",
  "industry",
  "status",
  "health_score",
  "retainer_monthly",
  "monthly_budget",
  "website",
  "visibility",
  "notes",
  "meta_account_id",
  "google_ads_customer_id",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "youtube_url",
  "linkedin_url",
  "asana_project_id",
  "slack_channel_id",
  "google_drive_folder_id",
].join(",");

const editableFields = [
  "website",
  "notes",
  "meta_account_id",
  "google_ads_customer_id",
  "facebook_url",
  "instagram_url",
  "tiktok_url",
  "youtube_url",
  "linkedin_url",
  "asana_project_id",
  "slack_channel_id",
  "google_drive_folder_id",
] as const;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function toClientMemorySeed(client: {
  id: string;
  industry?: string | null;
  name: string;
  notes?: string | null;
  website?: string | null;
}): ClientMemorySeed {
  return {
    id: client.id,
    industry: client.industry,
    name: client.name,
    notes: client.notes,
    website: client.website,
  };
}

async function getAuthorizedUser() {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  return { supabase, user };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const { supabase, user } = await getAuthorizedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.canAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await context.params;

  if (!clientId) {
    return badRequest("clientId is required.");
  }

  const { data, error } = await supabase
    .from("clients")
    .select(clientContextColumns)
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const client = (data as unknown) as {
    id: string;
    industry?: string | null;
    name: string;
    notes?: string | null;
    website?: string | null;
  };
  const memoryResult = await loadClientMemory(supabase, toClientMemorySeed(client));

  return NextResponse.json({
    client,
    memory: memoryResult.memory,
    permissions: {
      canAdmin: user.canAdmin,
      canWrite: user.canWrite,
      role: user.role,
    },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const { supabase, user } = await getAuthorizedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.canAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await context.params;

  if (!clientId) {
    return badRequest("clientId is required.");
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return badRequest("A valid JSON payload is required.");
  }

  const { data: existingClient, error: existingError } = await supabase
    .from("clients")
    .select(clientContextColumns)
    .eq("id", clientId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existingClient) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  editableFields.forEach((field) => {
    if (field in payload) {
      updates[field] = normalizeClientContextField(
        field as ClientContextEditableField,
        payload[field],
      );
    }
  });

  const memoryUpdates = clientMemoryKeys.reduce<Partial<ClientMemoryForm>>((accumulator, key) => {
    if (key in payload && typeof payload[key] === "string") {
      accumulator[key] = payload[key] as string;
    }

    return accumulator;
  }, {});

  if (Object.keys(updates).length === 0 && Object.keys(memoryUpdates).length === 0) {
    return badRequest("No editable fields were provided.");
  }

  let nextClient = (existingClient as unknown) as {
    id: string;
    industry?: string | null;
    name: string;
    notes?: string | null;
    website?: string | null;
  };

  if (Object.keys(updates).length > 0) {
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", clientId)
      .select(clientContextColumns)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    nextClient = (data as unknown) as typeof nextClient;
  }

  let memoryResult;

  try {
    memoryResult =
      Object.keys(memoryUpdates).length > 0
        ? await saveClientMemory(supabase, toClientMemorySeed(nextClient), memoryUpdates)
        : await loadClientMemory(supabase, toClientMemorySeed(nextClient));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de sauvegarder la memoire client.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    client: nextClient,
    memory: memoryResult.memory,
  });
}
