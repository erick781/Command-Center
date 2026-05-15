import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/new";

  // Use the public app URL to avoid internal proxy URL (localhost:3001) in redirects
  const appUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host")}`;

  if (code) {
    const supabase = await createRouteSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`);
    }
  }

  // If something went wrong, redirect to login with an error param
  return NextResponse.redirect(`${appUrl}/login?error=reset_failed`);
}
