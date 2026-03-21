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
          return cookieStore.getAll().filter((c: { name: string; value: string }) => {
            // Skip Supabase auth cookies with invalid (non-JSON) values
            // to prevent "Cannot create property 'user' on string" TypeError
            if (c.name.startsWith('sb-') && c.value) {
              try {
                const parsed = JSON.parse(c.value);
                return typeof parsed === 'object' && parsed !== null;
              } catch {
                return false;
              }
            }
            return true;
          });
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
