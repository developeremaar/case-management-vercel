import { supabase } from "@/integrations/supabase/client";

export const PLATFORM_ACCESS_ROLES = [
  "platform_owner",
  "platform_admin",
  "platform_support",
  "platform_auditor",
] as const;

export type PlatformRole = (typeof PLATFORM_ACCESS_ROLES)[number];

export function hasPlatformAccess(role: PlatformRole | null | undefined): boolean {
  return typeof role === "string" && PLATFORM_ACCESS_ROLES.includes(role as PlatformRole);
}

export function isPlatformAdmin(role: PlatformRole | null | undefined): boolean {
  return role === "platform_owner" || role === "platform_admin";
}

export function isPlatformOwner(role: PlatformRole | null | undefined): boolean {
  return role === "platform_owner";
}

export async function fetchPlatformRole(userId: string): Promise<PlatformRole | null> {
  const { data, error } = await supabase
    .from("platform_memberships")
    .select("role_code")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (!error && data) {
    const roles = data.map((row) => row.role_code).filter((role): role is PlatformRole =>
      hasPlatformAccess(role as PlatformRole),
    );

    if (roles.includes("platform_owner")) return "platform_owner";
    if (roles.includes("platform_admin")) return "platform_admin";
    if (roles.includes("platform_support")) return "platform_support";
    if (roles.includes("platform_auditor")) return "platform_auditor";
  }

  const { data: hasAccess } = await supabase.rpc("user_has_platform_access");
  if (!hasAccess) return null;

  const { data: isOwner } = await supabase.rpc("user_is_platform_owner");
  if (isOwner) return "platform_owner";

  const { data: isAdmin } = await supabase.rpc("user_is_platform_admin");
  if (isAdmin) return "platform_admin";

  return "platform_support";
}
