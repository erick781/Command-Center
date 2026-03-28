import { createClient } from "@/lib/supabase";

export function isAdminRole(role?: string | null) {
  return role === "admin" || role === "super_admin";
}

export async function loadCurrentUserAccess() {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user?.email) {
    return {
      email: null,
      isAdmin: false,
      role: null,
    };
  }

  const normalizedEmail = user.email.toLowerCase();
  const { data: roleData, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (roleError) {
    return {
      email: normalizedEmail,
      isAdmin: false,
      role: null,
    };
  }

  const role = typeof roleData?.role === "string" ? roleData.role : null;

  return {
    email: normalizedEmail,
    isAdmin: isAdminRole(role),
    role,
  };
}
