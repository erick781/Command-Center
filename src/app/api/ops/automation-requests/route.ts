import { NextResponse } from "next/server";

import {
  createAutomationRequest,
  listAutomationRequests,
  listAutomationSignals,
  updateAutomationRequest,
} from "@/lib/automation-requests";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
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

  const [manualRequests, signalRequests] = await Promise.all([
    listAutomationRequests(),
    listAutomationSignals(),
  ]);

  return NextResponse.json({
    manualRequests,
    signalRequests,
    summary: {
      done: manualRequests.filter((request) => request.status === "done").length,
      live: manualRequests.filter((request) => request.status === "live").length,
      pending:
        manualRequests.filter((request) =>
          ["pending", "planned", "in_progress", "blocked"].includes(request.status),
        ).length + signalRequests.filter((request) => request.status === "pending").length,
      signals: signalRequests.length,
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
        clientName?: string;
        context?: string;
        priority?: string;
        requestedOutcome?: string;
        title?: string;
      }
    | null;

  if (!payload) {
    return NextResponse.json({ error: "A valid JSON payload is required." }, { status: 400 });
  }

  try {
    const record = await createAutomationRequest(
      {
        clientName: payload.clientName,
        context: payload.context,
        priority: payload.priority as "low" | "medium" | "high" | "urgent" | undefined,
        requestedOutcome: payload.requestedOutcome || "",
        title: payload.title || "",
      },
      admin.user.email,
    );

    return NextResponse.json({ request: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create automation request.",
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
    const record = await updateAutomationRequest(
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
        error: error instanceof Error ? error.message : "Unable to update automation request.",
      },
      { status: 400 },
    );
  }
}
