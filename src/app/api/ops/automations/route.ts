import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

const execFileAsync = promisify(execFile);

function getSnapshotScriptPath() {
  return path.resolve(process.cwd(), "..", "command-center-agent", "scripts", "n8n_ops_snapshot.py");
}

function getControlScriptPath() {
  return path.resolve(process.cwd(), "..", "command-center-agent", "scripts", "n8n_workflow_control.py");
}

async function requireAdmin() {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.canAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET() {
  const authResponse = await requireAdmin();
  if (authResponse) {
    return authResponse;
  }

  try {
    const { stdout, stderr } = await execFileAsync("python3", [getSnapshotScriptPath()], {
      env: process.env,
      maxBuffer: 1024 * 1024 * 2,
      timeout: 20_000,
    });

    if (!stdout.trim()) {
      throw new Error(stderr || "No n8n snapshot returned.");
    }

    return NextResponse.json(JSON.parse(stdout));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load n8n automations.",
        fetchedAt: new Date().toISOString(),
        reachable: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authResponse = await requireAdmin();
  if (authResponse) {
    return authResponse;
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: string; workflowId?: string }
    | null;
  const workflowId = body?.workflowId?.trim();
  const action = body?.action?.trim().toLowerCase();

  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflow id." }, { status: 400 });
  }

  if (action !== "activate" && action !== "deactivate") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  try {
    const { stdout, stderr } = await execFileAsync("python3", [getControlScriptPath(), workflowId, action], {
      env: process.env,
      maxBuffer: 1024 * 1024,
      timeout: 20_000,
    });

    if (!stdout.trim()) {
      throw new Error(stderr || "No n8n control response returned.");
    }

    return NextResponse.json(JSON.parse(stdout));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to control n8n workflow.",
      },
      { status: 500 },
    );
  }
}
