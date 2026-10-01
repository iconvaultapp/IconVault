/**
 * Server-only role helpers. The database role helpers live in a private schema
 * that the Data API cannot reach, so privilege checks happen here instead of
 * through client-callable RPCs.
 */

import { getServerEnv } from "@/lib/server-env.server";

/** Returns the admin/owner status for a user. Owner = the first admin granted. */
export async function fetchRoleStatus(userId: string): Promise<{
  isAdmin: boolean;
  isOwner: boolean;
  ownerId: string | null;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: admins }, { data: mine }] = await Promise.all([
    supabaseAdmin
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").limit(1),
  ]);

  const ownerId = admins?.[0]?.user_id ?? null;
  return {
    isAdmin: Boolean(mine && mine.length > 0),
    isOwner: Boolean(ownerId && ownerId === userId),
    ownerId,
  };
}

/** Grants admin to the caller only when the site has no admin at all yet,
 *  AND the caller's email matches OWNER_EMAIL. This closes the takeover race
 *  where any early registrant could claim the owner slot before Sameer. */
export async function claimFirstAdminFor(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1);
  if (admins && admins.length > 0) return false;

  const ownerEmail = getServerEnv("OWNER_EMAIL")?.toLowerCase();
  if (ownerEmail) {
    const { data: caller } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (caller?.user?.email?.toLowerCase() !== ownerEmail) return false;
  }

  const { error } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
  return !error;
}
