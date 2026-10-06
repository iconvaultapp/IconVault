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
 *  AND the caller's verified email matches OWNER_EMAIL. The check + insert
 *  run atomically inside the claim_first_admin RPC (advisory-locked), so two
 *  simultaneous claims cannot both succeed. Fails closed: with OWNER_EMAIL
 *  unset, nobody can claim the slot. */
export async function claimFirstAdminFor(userId: string): Promise<boolean> {
  const ownerEmail = getServerEnv("OWNER_EMAIL")?.trim();
  if (!ownerEmail) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).rpc("claim_first_admin", {
    p_user_id: userId,
    p_owner_email: ownerEmail,
  });
  if (error) {
    console.error("[admin] claim_first_admin rpc failed:", error.message ?? error);
    return false;
  }
  return data === true;
}
