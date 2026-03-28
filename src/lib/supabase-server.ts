import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createRouteSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Let @supabase/ssr handle raw, chunked, and base64-encoded auth cookies.
          // Filtering these values here drops the real browser session and causes
          // authenticated route handlers to return 401 even after a successful login.
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
