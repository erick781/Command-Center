import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireStrategyUser } from "@/lib/strategy-store";

export async function GET(request: Request) {
  const supabase = await createRouteSupabaseClient();
  const user = await requireStrategyUser(supabase);

  if (!user) {
    return NextResponse.json({ strategies: [], count: 0 }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientName = searchParams.get("clientName")?.trim() ?? "";

  if (!clientName) {
    return NextResponse.json({ strategies: [], count: 0 });
  }

  const { data, error } = await supabase
    .from("client_strategies")
    .select("id, client_name, strategy_content, strategy_summary, version, status, created_at")
    .ilike("client_name", `%${clientName}%`)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    return NextResponse.json({ strategies: [], count: 0, error: error.message }, { status: 500 });
  }

  const strategies = data ?? [];
  return NextResponse.json({ strategies, count: strategies.length });
}
