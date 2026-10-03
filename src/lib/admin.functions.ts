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
  is_banned: boolean;
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
      (supabaseAdmin as any).from("profiles").select("user_id, display_name, username, is_banned"),
      supabaseAdmin.from("user_plans").select("user_id, plan"),
    ]);

    const ownerId = roles?.find((r) => r.role === "admin")?.user_id ?? null;
    const planByUser = new Map<string, string>();
    (plans ?? []).forEach((p) => planByUser.set(p.user_id, p.plan));

    const accounts: AccountRow[] = (list?.users ?? []).map((u) => {
      const profile = (profiles as any[] | null)?.find((p: any) => p.user_id === u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        display_name: profile?.display_name ?? profile?.username ?? null,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
        is_owner: u.id === ownerId,
        plan: planByUser.get(u.id) ?? "free",
        is_banned: profile?.is_banned ?? false,
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

// ================= admin backend: payments, coupons, tickets, tools, content =================

export interface AdminPaymentRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  email: string | null;
  created_at: string;
}
export interface AdminSubscriptionRow {
  id: string;
  status: string;
  email: string | null;
  amount: number | null;
  currency: string | null;
  current_period_end: string | null;
}
export interface CouponRow {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}
export interface TicketRow {
  id: string;
  user_id: string | null;
  email: string;
  subject: string;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}
export interface TicketReplyRow {
  id: string;
  ticket_id: string;
  author_id: string | null;
  is_admin: boolean;
  body: string;
  created_at: string;
}
export interface ErrorLogRow {
  id: string;
  message: string;
  stack: string | null;
  url: string | null;
  user_id: string | null;
  created_at: string;
}
export interface ToolSettingRow {
  tool_id: string;
  name: string;
  category: string | null;
  enabled: boolean;
  free_limit: number | null;
}
export interface TakedownRow {
  id: string;
  reporter_email: string;
  icon_set: string;
  reason: string;
  status: string;
  created_at: string;
}
export interface ChangelogRow {
  id: string;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}
export interface ReferralRow {
  id: string;
  referrer_email: string | null;
  referred_email: string | null;
  status: string;
  created_at: string;
}
export interface CampaignRow {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}
export interface ConversionStats {
  total_users: number;
  pro_users: number;
  conversion_pct: number;
  churn_pct: number;
  active_subs: number;
  cancelled_subs: number;
}

async function requireAdmin(userId: string): Promise<void> {
  const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
  const { isAdmin } = await fetchRoleStatus(userId);
  if (!isAdmin) throw new Error("Forbidden");
}

async function requireOwner(userId: string): Promise<void> {
  const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
  const { isOwner } = await fetchRoleStatus(userId);
  if (!isOwner) throw new Error("Forbidden");
}

/** Collect up to `limit` items from a Dodo auto-paginating list iterator. */
async function collectDodoList<T>(list: AsyncIterable<T>, limit: number): Promise<T[]> {
  const out: T[] = [];
  for await (const item of list) {
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

// ================= payments (Dodo) =================

/** Admin-only payment list from Dodo. Never throws: returns { ok: false } on Dodo errors. */
export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => {
    const limit = Math.min(Math.max(Math.floor(input.limit ?? 50), 1), 200);
    return { limit };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; payments: AdminPaymentRow[] } | { ok: false; error: string }> => {
      await requireAdmin(context.userId);
      try {
        const { getDodoClient } = await import("@/lib/billing.server");
        const client = getDodoClient();
        const rows = await collectDodoList(
          client.payments.list({ page_size: Math.min(data.limit, 100) }),
          data.limit,
        );
        return {
          ok: true as const,
          payments: rows.map((p) => ({
            id: p.payment_id,
            // Dodo reports money in the currency's smallest unit (cents for USD).
            amount: (p.total_amount ?? 0) / 100,
            currency: p.currency,
            status: p.status ?? "unknown",
            email: p.customer?.email ?? null,
            created_at: p.created_at,
          })),
        };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Failed to load payments" };
      }
    },
  );

/** Admin-only subscription list from Dodo. Never throws: returns { ok: false } on Dodo errors. */
export const listSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => {
    const limit = Math.min(Math.max(Math.floor(input.limit ?? 50), 1), 200);
    return { limit };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: true; subscriptions: AdminSubscriptionRow[] } | { ok: false; error: string }> => {
      await requireAdmin(context.userId);
      try {
        const { getDodoClient } = await import("@/lib/billing.server");
        const client = getDodoClient();
        const rows = await collectDodoList(
          client.subscriptions.list({ page_size: Math.min(data.limit, 100) }),
          data.limit,
        );
        return {
          ok: true as const,
          subscriptions: rows.map((s) => ({
            id: s.subscription_id,
            status: s.status,
            email: s.customer?.email ?? null,
            // recurring_pre_tax_amount is in the currency's smallest unit.
            amount: s.recurring_pre_tax_amount != null ? s.recurring_pre_tax_amount / 100 : null,
            currency: s.currency ?? null,
            // Dodo's next_billing_date marks the end of the current billing period.
            current_period_end: s.next_billing_date ?? null,
          })),
        };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Failed to load subscriptions" };
      }
    },
  );

/** Owner-only full refund of a Dodo payment. */
export const createRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string }) => {
    if (!input.paymentId) throw new Error("paymentId required");
    return input;
  })
  .handler(
    async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
      await requireOwner(context.userId);
      try {
        const { getDodoClient } = await import("@/lib/billing.server");
        const client = getDodoClient();
        await client.refunds.create({ payment_id: data.paymentId });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("admin_activity_log").insert({
          actor_id: context.userId,
          action: "payment.refund",
          target: data.paymentId,
        });
        return { ok: true as const };
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Refund failed" };
      }
    },
  );

// ================= coupons =================

/** Admin-only coupon listing. */
export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ coupons: CouponRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("coupons")
      .select("id, code, discount_percent, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false });
    return { coupons: (data ?? []) as CouponRow[] };
  });

/** Owner-only coupon creation. Code is trimmed and uppercased. */
export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { code: string; discount_percent: number; max_uses?: number | null; expires_at?: string | null }) => {
      const code = (input.code ?? "").trim().toUpperCase();
      if (!code) throw new Error("code required");
      if (!Number.isInteger(input.discount_percent) || input.discount_percent < 1 || input.discount_percent > 100) {
        throw new Error("discount_percent must be an integer between 1 and 100");
      }
      const max_uses =
        input.max_uses == null ? null : Math.floor(input.max_uses);
      if (max_uses != null && (!Number.isInteger(max_uses) || max_uses < 1)) {
        throw new Error("max_uses must be a positive integer");
      }
      return { code, discount_percent: input.discount_percent, max_uses, expires_at: input.expires_at ?? null };
    },
  )
  .handler(
    async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
      await requireOwner(context.userId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await (supabaseAdmin as any).from("coupons").insert({
        code: data.code,
        discount_percent: data.discount_percent,
        max_uses: data.max_uses,
        expires_at: data.expires_at,
      });
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    },
  );

/** Owner-only coupon enable/disable. */
export const toggleCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; active: boolean }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("coupons")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Owner-only coupon deletion. */
export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= support tickets =================

const TICKET_STATUSES = ["open", "in_progress", "closed"] as const;

/** Admin-only ticket listing, optionally filtered by status. */
export const listTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string } = {}) => {
    if (input.status && !TICKET_STATUSES.includes(input.status as (typeof TICKET_STATUSES)[number])) {
      throw new Error("bad status");
    }
    return { status: input.status ?? null };
  })
  .handler(async ({ data, context }): Promise<{ tickets: TicketRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = (supabaseAdmin as any)
      .from("support_tickets")
      .select("id, user_id, email, subject, message, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: tickets } = await q;
    return { tickets: (tickets ?? []) as TicketRow[] };
  });

/** Admin-only: one ticket with its replies in chronological order. */
export const getTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(
    async ({ data, context }): Promise<{ ticket: TicketRow; replies: TicketReplyRow[] }> => {
      await requireAdmin(context.userId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const sb = supabaseAdmin as any;
      const { data: ticket, error } = await sb
        .from("support_tickets")
        .select("id, user_id, email, subject, message, status, created_at, updated_at")
        .eq("id", data.id)
        .single();
      if (error || !ticket) throw new Error("Ticket not found");
      const { data: replies } = await sb
        .from("ticket_replies")
        .select("id, ticket_id, author_id, is_admin, body, created_at")
        .eq("ticket_id", data.id)
        .order("created_at", { ascending: true });
      return { ticket: ticket as TicketRow, replies: (replies ?? []) as TicketReplyRow[] };
    },
  );

/** Admin-only reply. Marks an open ticket in_progress. */
export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; body: string }) => {
    if (!input.id) throw new Error("id required");
    const body = (input.body ?? "").trim();
    if (!body) throw new Error("body required");
    if (body.length > 10000) throw new Error("body too long");
    return { id: input.id, body };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data: ticket } = await sb
      .from("support_tickets")
      .select("status")
      .eq("id", data.id)
      .single();
    if (!ticket) throw new Error("Ticket not found");
    const { error } = await sb.from("ticket_replies").insert({
      ticket_id: data.id,
      author_id: context.userId,
      is_admin: true,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    await sb
      .from("support_tickets")
      .update({ status: ticket.status === "open" ? "in_progress" : ticket.status })
      .eq("id", data.id);
    return { ok: true as const };
  });

/** Admin-only ticket status change. */
export const setTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    if (!input.id) throw new Error("id required");
    if (!TICKET_STATUSES.includes(input.status as (typeof TICKET_STATUSES)[number])) {
      throw new Error("bad status");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= error logs =================

/** Admin-only error log listing (newest first). */
export const listErrorLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { limit?: number } = {}) => {
    const limit = Math.min(Math.max(Math.floor(input.limit ?? 100), 1), 500);
    return { limit };
  })
  .handler(async ({ data, context }): Promise<{ logs: ErrorLogRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: logs } = await (supabaseAdmin as any)
      .from("error_logs")
      .select("id, message, stack, url, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { logs: (logs ?? []) as ErrorLogRow[] };
  });

/** Owner-only: wipe the error log table. */
export const clearErrorLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("error_logs").delete().not("id", "is", null);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= tool settings =================

/**
 * Admin-only: every tool from the catalog merged with its DB override
 * (defaults: enabled=true, free_limit=null).
 */
export const listToolSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ tools: ToolSettingRow[] }> => {
    await requireAdmin(context.userId);
    // NOTE: tool-catalog exports ALL_TOOLS (LIVE_TOOLS + SOON_TOOLS); there is
    // no bare TOOLS export, so ALL_TOOLS is the "every tool" source.
    const { ALL_TOOLS } = await import("@/lib/tool-catalog");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: overrides } = await (supabaseAdmin as any)
      .from("tool_settings")
      .select("tool_id, enabled, free_limit");
    const byId = new Map<string, { enabled: boolean; free_limit: number | null }>();
    ((overrides ?? []) as { tool_id: string; enabled: boolean; free_limit: number | null }[]).forEach((o) =>
      byId.set(o.tool_id, { enabled: o.enabled, free_limit: o.free_limit }),
    );
    return {
      tools: ALL_TOOLS.map((t: { id: string; name: string; category?: string }) => {
        const o = byId.get(t.id);
        return {
          tool_id: t.id,
          name: t.name,
          category: t.category ?? null,
          enabled: o?.enabled ?? true,
          free_limit: o?.free_limit ?? null,
        };
      }),
    };
  });

/** Owner-only upsert of a tool's enabled flag / free limit. */
export const setToolSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tool_id: string; enabled: boolean; free_limit?: number | null }) => {
    if (!input.tool_id) throw new Error("tool_id required");
    const free_limit = input.free_limit ?? null;
    if (free_limit != null && (!Number.isInteger(free_limit) || free_limit < 0)) {
      throw new Error("free_limit must be a non-negative integer");
    }
    return { tool_id: input.tool_id, enabled: Boolean(input.enabled), free_limit };
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("tool_settings").upsert(
      { tool_id: data.tool_id, enabled: data.enabled, free_limit: data.free_limit },
      { onConflict: "tool_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= takedown requests =================

/** Admin-only takedown listing (newest first). */
export const listTakedowns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ takedowns: TakedownRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("takedown_requests")
      .select("id, reporter_email, icon_set, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { takedowns: (data ?? []) as TakedownRow[] };
  });

const TAKEDOWN_STATUSES = ["pending", "approved", "rejected"] as const;

/** Admin-only takedown status change. */
export const setTakedownStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    if (!input.id) throw new Error("id required");
    if (!TAKEDOWN_STATUSES.includes(input.status as (typeof TAKEDOWN_STATUSES)[number])) {
      throw new Error("bad status");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("takedown_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= changelog =================

/** Admin-only: all changelog posts including drafts. */
export const listChangelogAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ posts: ChangelogRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("changelog_posts")
      .select("id, title, body, published, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { posts: (data ?? []) as ChangelogRow[] };
  });

/** Owner-only create/update of a changelog post. */
export const saveChangelog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; title: string; body: string; published: boolean }) => {
    const title = (input.title ?? "").trim();
    const body = (input.body ?? "").trim();
    if (!title) throw new Error("title required");
    if (!body) throw new Error("body required");
    return { id: input.id ?? null, title, body, published: Boolean(input.published) };
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    if (data.id) {
      const { error } = await sb
        .from("changelog_posts")
        .update({ title: data.title, body: data.body, published: data.published })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb
        .from("changelog_posts")
        .insert({ title: data.title, body: data.body, published: data.published });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

/** Owner-only changelog deletion. */
export const deleteChangelog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("changelog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= referrals / newsletter / campaigns =================

/** Admin-only referral list with referrer/referred emails resolved from auth. */
export const getReferrals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ referrals: ReferralRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const [{ data: rows }, { data: list }] = await Promise.all([
      sb
        .from("referrals")
        .select("id, referrer_id, referred_id, referred_email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const emailById = new Map<string, string>();
    (list?.users ?? []).forEach((u: { id: string; email?: string | null }) => {
      if (u.email) emailById.set(u.id, u.email);
    });
    return {
      referrals: ((rows ?? []) as {
        id: string;
        referrer_id: string;
        referred_id: string;
        referred_email: string | null;
        status: string;
        created_at: string;
      }[]).map((r) => ({
        id: r.id,
        referrer_email: emailById.get(r.referrer_id) ?? null,
        referred_email: r.referred_email ?? emailById.get(r.referred_id) ?? null,
        status: r.status,
        created_at: r.created_at,
      })),
    };
  });

/** Admin-only newsletter (waitlist) subscriber count. */
export const getNewsletterCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ count: number }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("waitlist").select("id", { count: "exact", head: true });
    return { count: count ?? 0 };
  });

/** Admin-only campaign listing (newest first). */
export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ campaigns: CampaignRow[] }> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("campaigns")
      .select("id, subject, body, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    return { campaigns: (data ?? []) as CampaignRow[] };
  });

/** Owner-only: create a campaign draft. */
export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subject: string; body: string }) => {
    const subject = (input.subject ?? "").trim();
    const body = (input.body ?? "").trim();
    if (!subject) throw new Error("subject required");
    if (!body) throw new Error("body required");
    return { subject, body };
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("campaigns")
      .insert({ subject: data.subject, body: data.body, status: "draft" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= user moderation =================

/** Owner-only: ban a user (sets profiles.is_banned + reason). */
export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; reason?: string }) => {
    if (!input.userId) throw new Error("userId required");
    return { userId: input.userId, reason: (input.reason ?? "").trim() || null };
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot ban the owner account");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("profiles").upsert(
      { user_id: data.userId, is_banned: true, banned_reason: data.reason },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: context.userId,
      action: "user.ban",
      target: data.userId,
      details: { reason: data.reason },
    });
    return { ok: true as const };
  });

/** Owner-only: lift a ban. */
export const unbanUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Error("userId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ is_banned: false, banned_reason: null })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: context.userId,
      action: "user.unban",
      target: data.userId,
    });
    return { ok: true as const };
  });

/** Owner-only: set a user's plan (free/pro). */
export const setPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; plan: string }) => {
    if (!input.userId) throw new Error("userId required");
    if (!["free", "pro"].includes(input.plan)) throw new Error("plan must be free or pro");
    return input as { userId: string; plan: "free" | "pro" };
  })
  .handler(async ({ data, context }) => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { error } = await (supabaseAdmin as any).from("user_plans").upsert(
      {
        user_id: data.userId,
        plan: data.plan,
        purchased_at: data.plan === "pro" ? now : null,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_activity_log").insert({
      actor_id: context.userId,
      action: "plan.set",
      target: data.userId,
      details: { plan: data.plan },
    });
    return { ok: true as const };
  });

// ================= conversion stats =================

const ACTIVE_SUB_STATUSES = new Set(["active", "on_hold", "paused"]);
const CANCELLED_SUB_STATUSES = new Set(["cancelled", "expired", "failed"]);

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Admin-only conversion/churn overview: user counts from the DB plus live
 * subscription stats from Dodo. Dodo failures degrade to zeros, never throw.
 */
export const getConversionStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConversionStats> => {
    await requireAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ count: totalUsers }, { count: proUsers }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      (supabaseAdmin as any).from("user_plans").select("user_id", { count: "exact", head: true }).eq("plan", "pro"),
    ]);

    let activeSubs = 0;
    let cancelledSubs = 0;
    try {
      const { getDodoClient } = await import("@/lib/billing.server");
      const client = getDodoClient();
      const subs = await collectDodoList(client.subscriptions.list({ page_size: 100 }), 1000);
      for (const s of subs) {
        if (ACTIVE_SUB_STATUSES.has(s.status)) activeSubs += 1;
        else if (CANCELLED_SUB_STATUSES.has(s.status)) cancelledSubs += 1;
      }
    } catch {
      // Dodo unreachable or unconfigured: report zeros, keep DB stats.
    }

    const total = totalUsers ?? 0;
    const pro = proUsers ?? 0;
    const subTotal = activeSubs + cancelledSubs;
    return {
      total_users: total,
      pro_users: pro,
      conversion_pct: total > 0 ? round1((pro / total) * 100) : 0,
      churn_pct: subTotal > 0 ? round1((cancelledSubs / subTotal) * 100) : 0,
      active_subs: activeSubs,
      cancelled_subs: cancelledSubs,
    };
  });

// ================= referrals (user-facing) =================

/**
 * Record that the caller was referred by the user whose id is `code`.
 * Authenticated only (not admin). Idempotent: already-referred callers get
 * { ok: true, duplicate: true }. The code must be a valid, existing user id.
 */
export const recordReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { code: string }) => {
    const code = (input.code ?? "").trim();
    if (!code) throw new Error("code required");
    return { code };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; duplicate?: boolean }> => {
    if (data.code === context.userId) return { ok: false };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.code)) {
      return { ok: false };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;
    const { data: referrer } = await sb
      .from("profiles")
      .select("user_id")
      .eq("user_id", data.code)
      .limit(1);
    if (!referrer || referrer.length === 0) return { ok: false };
    const { data: existing } = await sb
      .from("referrals")
      .select("id")
      .eq("referred_id", context.userId)
      .limit(1);
    if (existing && existing.length > 0) return { ok: true, duplicate: true };
    const { error } = await sb.from("referrals").insert({
      referrer_id: data.code,
      referred_id: context.userId,
      status: "pending",
    });
    if (error) return { ok: false };
    return { ok: true };
  });
