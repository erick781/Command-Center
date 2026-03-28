import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { createDevRequest, listDevRequests, updateDevRequest } from "@/lib/dev-requests";
import { requireStrategyUser } from "@/lib/strategy-store";

async function requireAdminUser() {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null };
  }

  if (!user.canAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null };
  }

  return { error: null, user };
}

export async function GET() {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  const requests = await listDevRequests();

  return NextResponse.json({
    requests,
    summary: {
      done: requests.filter((request) => request.status === "done").length,
      inProgress: requests.filter((request) => request.status === "in_progress").length,
      live: requests.filter((request) => request.status === "live").length,
      pending: requests.filter((request) =>
        ["pending", "planned", "blocked"].includes(request.status),
      ).length,
      repoRadar: requests.filter((request) => request.source === "repo_radar").length,
    },
  });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser();
  if (admin.error || !admin.user) {
    return admin.error as NextResponse;
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        context?: string;
        fitScore?: number | null;
        implementationIdeas?: string[];
        initialStatus?: string;
        modelId?: string;
        originReviewId?: string;
        priority?: string;
        recommendation?: string;
        repoFullName?: string;
        repoUrl?: string;
        requestedOutcome?: string;
        risks?: string[];
        source?: string;
        summary?: string;
        title?: string;
        whyItMatters?: string;
      }
    | null;

  if (!payload) {
    return NextResponse.json({ error: "A valid JSON payload is required." }, { status: 400 });
  }

  try {
    const record = await createDevRequest(
      {
        context: payload.context,
        fitScore: payload.fitScore,
        implementationIdeas: payload.implementationIdeas,
        initialStatus: payload.initialStatus as
          | "pending"
          | "planned"
          | "in_progress"
          | "live"
          | "blocked"
          | "done"
          | undefined,
        modelId: payload.modelId,
        originReviewId: payload.originReviewId,
        priority: payload.priority as "low" | "medium" | "high" | "urgent" | undefined,
        recommendation: payload.recommendation,
        repoFullName: payload.repoFullName,
        repoUrl: payload.repoUrl,
        requestedOutcome: payload.requestedOutcome || "",
        risks: payload.risks,
        source: payload.source === "repo_radar" ? "repo_radar" : "manual",
        summary: payload.summary,
        title: payload.title || "",
        whyItMatters: payload.whyItMatters,
      },
      admin.user.email,
    );

    return NextResponse.json({ request: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create development request.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser();
  if (admin.error || !admin.user) {
    return admin.error as NextResponse;
  }

  const payload = (await request.json().catch(() => null)) as
    | {
        id?: string;
        status?: string;
      }
    | null;

  if (!payload?.id || !payload?.status) {
    return NextResponse.json({ error: "Request id and status are required." }, { status: 400 });
  }

  try {
    const record = await updateDevRequest(
      {
        id: payload.id,
        status: payload.status as
          | "pending"
          | "planned"
          | "in_progress"
          | "live"
          | "blocked"
          | "done",
      },
      admin.user.email,
    );

    return NextResponse.json({ request: record });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update development request.",
      },
      { status: 400 },
    );
  }
}
