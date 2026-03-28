import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

import {
  getRepoRadarSettings,
  listRepoRadarReviews,
  summarizeRepoRadarBudget,
  updateRepoRadarSettings,
} from "@/lib/repo-radar-store";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

const execFileAsync = promisify(execFile);

function getSnapshotScriptPath() {
  return path.resolve(process.cwd(), "..", "command-center-agent", "scripts", "n8n_repo_radar_snapshot.py");
}

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

async function loadSnapshot() {
  const { stdout, stderr } = await execFileAsync("python3", [getSnapshotScriptPath()], {
    env: process.env,
    maxBuffer: 1024 * 1024 * 2,
    timeout: 20_000,
  });

  if (!stdout.trim()) {
    throw new Error(stderr || "No Repo Radar snapshot returned.");
  }

  return JSON.parse(stdout) as Record<string, unknown>;
}

export async function GET() {
  const admin = await requireAdminUser();
  if (admin.error) {
    return admin.error;
  }

  try {
    const [snapshot, settings, reviews] = await Promise.all([
      loadSnapshot(),
      getRepoRadarSettings(),
      listRepoRadarReviews(40),
    ]);

    return NextResponse.json({
      ...snapshot,
      budget: summarizeRepoRadarBudget(reviews, settings),
      reviews,
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        budget: summarizeRepoRadarBudget([], await getRepoRadarSettings()),
        error: error instanceof Error ? error.message : "Unable to load Repo Radar.",
        fetchedAt: new Date().toISOString(),
        reachable: false,
        reviews: [],
        settings: await getRepoRadarSettings(),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdminUser();
  if (admin.error || !admin.user) {
    return admin.error as NextResponse;
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "A valid JSON payload is required." }, { status: 400 });
  }

  try {
    const settings = await updateRepoRadarSettings(payload, admin.user.email);
    const reviews = await listRepoRadarReviews(40);

    return NextResponse.json({
      budget: summarizeRepoRadarBudget(reviews, settings),
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update Repo Radar settings.",
      },
      { status: 400 },
    );
  }
}
