import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const INTEL_BASE = process.env.INTELLIGENCE_API_URL ?? "http://localhost:8765";
const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET ?? "";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params;

  // Auth: vérifier que l'utilisateur est connecté
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Proxy vers FastAPI
  try {
    const r = await fetch(`${INTEL_BASE}/intelligence/${clientId}`, {
      headers: {
        "x-internal-secret": DASHBOARD_SECRET,
      },
      signal: AbortSignal.timeout(30_000),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (err) {
    console.error("[intelligence] proxy error:", err);
    return NextResponse.json(
      { error: "Intelligence service unavailable" },
      { status: 503 },
    );
  }
}
