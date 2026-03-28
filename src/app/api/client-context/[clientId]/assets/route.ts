import { NextResponse } from "next/server";

import {
  deleteClientAsset,
  listClientAssets,
  uploadClientAssets,
} from "@/lib/client-assets";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
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
  const { user } = await getAuthorizedUser();

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

  try {
    const assets = await listClientAssets(clientId);
    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de charger les assets client.",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const { user } = await getAuthorizedUser();

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

  const formData = await request.formData().catch(() => null);
  const files = (formData?.getAll("files") ?? []).filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );

  if (files.length === 0) {
    return badRequest("At least one file is required.");
  }

  try {
    const assets = await uploadClientAssets(clientId, files);
    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d'uploader les assets client.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const { user } = await getAuthorizedUser();

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

  const body = (await request.json().catch(() => null)) as { path?: string } | null;
  const path = body?.path?.trim();

  if (!path) {
    return badRequest("path is required.");
  }

  try {
    const assets = await deleteClientAsset(clientId, path);
    return NextResponse.json({ assets });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible de supprimer l'asset client.",
      },
      { status: 500 },
    );
  }
}
