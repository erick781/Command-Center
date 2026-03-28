import { NextResponse } from "next/server";

import { createRouteSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.id) {
    return new NextResponse("Unauthorized", {
      headers: { "Cache-Control": "no-store" },
      status: 401,
    });
  }

  return new NextResponse("OK", {
    headers: {
      "Cache-Control": "no-store",
      "X-Command-Center-User": user.id,
    },
    status: 200,
  });
}
