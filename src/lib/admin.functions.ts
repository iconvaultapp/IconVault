import { getServerEnv } from "@/lib/server-env.server";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { isRateLimited } from "@/lib/rate-limit";

/**
 * Creates (or repairs) the single site-owner account and grants it the admin
 * role. Safe to call repeatedly: once an owner exists it only reports back.
 * Per-IP rate limited (10/min) since this is an unauthenticated endpoint.
 */
export const ensureOwnerAccount = createServerFn({ method: "POST" }).handler(async () => {
  try {
    if (isRateLimited(getRequest(), "owner-bootstrap", 10)) {
      return { ok: false as const, reason: "rate-limited" };
    }
  } catch {
    /* if request context is unavailable, continue without throttling */
  }
  const email = getServerEnv("OWNER_EMAIL");
  const password = getServerEnv("OWNER_PASSWORD");
  if (!email || !password) return { ok: false as const, reason: "not-configured" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existingAdmins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1);

  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let ownerId = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())?.id;

  if (!ownerId) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Site owner" },
    });
    if (error || !created.user) return { ok: false as const, reason: "create-failed" };
    ownerId = created.user.id;
  }

  if (existingAdmins && existingAdmins.length > 0 && existingAdmins[0]?.user_id !== ownerId) {
    // Another account already holds the owner slot - don't silently take it over.
    return { ok: true as const, created: false, ownerId };
  }

  // The owner account may already exist (e.g. created via the normal sign-up
  // page) with a different password. Sync it so OWNER_PASSWORD is always the
  // login password for the admin panel.
  const { error: pwError } = await supabaseAdmin.auth.admin.updateUserById(ownerId, {
    password,
    email_confirm: true,
  });
  if (pwError) return { ok: false as const, reason: "password-sync-failed" };

  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: ownerId, role: "admin" }, { onConflict: "user_id,role" });

  return { ok: true as const, created: true, ownerId };
});

interface AccountRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  roles: string[];
  is_owner: boolean;
  plan: string;
}

/** Admin-only listing of every account with its roles. */
export const listAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ accounts: AccountRow[] }> => {
    const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
    const { isAdmin } = await fetchRoleStatus(context.userId);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: list }, { data: roles }, { data: profiles }, { data: plans }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from("user_roles").select("user_id, role, created_at").order("created_at"),
      supabaseAdmin.from("profiles").select("user_id, display_name, username"),
      supabaseAdmin.from("user_plans").select("user_id, plan"),
    ]);

    const ownerId = roles?.find((r) => r.role === "admin")?.user_id ?? null;
    const planByUser = new Map<string, string>();
    (plans ?? []).forEach((p) => planByUser.set(p.user_id, p.plan));

    const accounts: AccountRow[] = (list?.users ?? []).map((u) => {
      const profile = profiles?.find((p) => p.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        display_name: profile?.display_name ?? profile?.username ?? null,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
        is_owner: u.id === ownerId,
        plan: planByUser.get(u.id) ?? "free",
      };
    });

    accounts.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { accounts };
  });

/** Owner-only role management. */
export const setAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "moderator" | "user"; grant: boolean }) => {
    if (!input.userId) throw new Error("userId required");
    if (!["admin", "moderator", "user"].includes(input.role)) throw new Error("bad role");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
    const { isOwner } = await fetchRoleStatus(context.userId);
    if (!isOwner) throw new Error("Forbidden");
    if (data.userId === context.userId && data.role === "admin" && !data.grant) {
      throw new Error("The owner cannot remove their own admin role");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
    }

    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: context.userId,
      action: data.grant ? "role.grant" : "role.revoke",
      target: data.userId,
      details: { role: data.role },
    });

    return { ok: true as const };
  });

/** Owner-only account deletion. */
export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Error("userId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
    const { isOwner } = await fetchRoleStatus(context.userId);
    if (!isOwner) throw new Error("Forbidden");
    if (data.userId === context.userId) throw new Error("You cannot delete the owner account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: context.userId,
      action: "account.delete",
      target: data.userId,
    });

    return { ok: true as const };
  });

/** Current caller's admin/owner status, computed server-side. */
export const getRoleStatus = createServerFn({ method: "POST" })  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean; isOwner: boolean }> => {
    const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
    const { isAdmin, isOwner } = await fetchRoleStatus(context.userId);
    return { isAdmin, isOwner };
  });

/** Bootstraps the very first admin when the site has none. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ claimed: boolean }> => {
    const { claimFirstAdminFor } = await import("@/lib/admin-roles.server");
    return { claimed: await claimFirstAdminFor(context.userId) };
  });

export interface RecentUserRow {
  id: string;
  email: string | null;
  plan: string;
  created_at: string;
}

export interface PlanBreakdownRow {
  plan: string;
  count: number;
}

/**
 * Owner-facing operating stats: total users, plan breakdown (free vs paid
 * plans) and the 20 most recent accounts. Admin-only; email addresses come
 * from the auth admin API, plans from the user_plans table.
 */
export const getOperatingStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      totalUsers: number;
      planBreakdown: PlanBreakdownRow[];
      freeCount: number;
      recentUsers: RecentUserRow[];
    }> => {
      const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
      const { isAdmin } = await fetchRoleStatus(context.userId);
      if (!isAdmin) throw new Error("Forbidden");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const [{ count: totalUsers }, { data: plans }, { data: list }] = await Promise.all([
        supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("user_plans").select("user_id, plan"),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

      const planByUser = new Map<string, string>();
      (plans ?? []).forEach((p) => planByUser.set(p.user_id, p.plan));

      const byPlan = new Map<string, number>();
      planByUser.forEach((plan) => byPlan.set(plan, (byPlan.get(plan) ?? 0) + 1));
      const planBreakdown: PlanBreakdownRow[] = [...byPlan.entries()]
        .map(([plan, count]) => ({ plan, count }))
        .sort((a, b) => b.count - a.count);

      const freeCount = Math.max((totalUsers ?? 0) - planByUser.size, 0);

      const recentUsers: RecentUserRow[] = (list?.users ?? [])
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 20)
        .map((u) => ({
          id: u.id,
          email: u.email ?? null,
          plan: planByUser.get(u.id) ?? "free",
          created_at: u.created_at,
        }));

      return { totalUsers: totalUsers ?? 0, planBreakdown, freeCount, recentUsers };
    },
  );

export interface AdminApiKeyRow {
  id: string;
  user_id: string;
  user_email: string | null;
  name: string;
  key_prefix: string;
  monthly_quota: number;
  used_this_month: number;
  revoked: boolean;
  created_at: string;
}

/** Admin-only listing of every API key with its owner's email and usage. */
export const listApiKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ keys: AdminApiKeyRow[] }> => {
    const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
    const { isAdmin } = await fetchRoleStatus(context.userId);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: keys }, { data: list }] = await Promise.all([
      (supabaseAdmin as any)
        .from("api_keys")
        .select("id, user_id, name, key_prefix, monthly_quota, used_this_month, revoked, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    const emailById = new Map<string, string>();
    (list?.users ?? []).forEach((u) => {
      if (u.email) emailById.set(u.id, u.email);
    });

    return {
      keys: (keys ?? []).map(
        (k: {
          id: string;
          user_id: string;
          name: string;
          key_prefix: string;
          monthly_quota: number;
          used_this_month: number;
          revoked: boolean;
          created_at: string;
        }) => ({
          id: k.id,
          user_id: k.user_id,
          user_email: emailById.get(k.user_id) ?? null,
          name: k.name,
          key_prefix: k.key_prefix,
          monthly_quota: k.monthly_quota,
          used_this_month: k.used_this_month,
          revoked: k.revoked,
          created_at: k.created_at,
        }),
      ),
    };
  });

/** Owner-only revoke / unrevoke for an API key. */
export const setApiKeyRevoked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keyId: string; revoked: boolean }) => {
    if (!input.keyId) throw new Error("keyId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
    const { isOwner } = await fetchRoleStatus(context.userId);
    if (!isOwner) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("api_keys")
      .update({ revoked: data.revoked })
      .eq("id", data.keyId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: context.userId,
      action: data.revoked ? "apikey.revoke" : "apikey.unrevoke",
      target: data.keyId,
    });

    return { ok: true as const };
  });
