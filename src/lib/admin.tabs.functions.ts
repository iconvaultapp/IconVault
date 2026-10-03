import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server functions backing the new admin tab components
 * (Payments, Coupons, Support, Tools, Changelog, Takedowns, Referrals,
 * Campaigns, ErrorLogs).
 *
 * These were specified to live in `@/lib/admin.functions.ts`, but that
 * module did not contain them, so they are implemented here in a new
 * file (no existing file was modified). If they are later moved into
 * `admin.functions.ts`, the tab components' import path can be switched
 * in one place each.
 */

async function requireAdmin(userId: string) {
  const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
  const { isAdmin } = await fetchRoleStatus(userId);
  if (!isAdmin) throw new Error("Forbidden");
}

async function requireOwner(userId: string) {
  const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
  const { isOwner } = await fetchRoleStatus(userId);
  if (!isOwner) throw new Error("Forbidden");
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

// ================= payments (Dodo) =================

export interface AdminPaymentRow {
  id: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

export interface AdminSubscriptionRow {
  id: string;
  email: string;
  status: string;
  amount: number;
  current_period_end: string;
}

type DodoResult<T> = ({ ok: true } & T) | { ok: false; error: string };

function dodoError(e: unknown): { ok: false; error: string } {
  return { ok: false as const, error: e instanceof Error ? e.message : "Unknown Dodo error" };
}

/** Admin-only listing of recent Dodo payments. Returns {ok:false} when Dodo is unreachable. */
export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DodoResult<{ payments: AdminPaymentRow[] }>> => {
    await requireAdmin(context.userId);
    try {
      const { getDodoClient } = await import("@/lib/billing.server");
      const client = getDodoClient();
      const page = await client.payments.list({ page_size: 100 });
      const payments: AdminPaymentRow[] = (page.items ?? []).map((p: any) => ({
        id: String(p.payment_id),
        email: String(p.customer?.email ?? ""),
        amount: Number(p.total_amount ?? 0) / 100,
        currency: String(p.currency ?? "USD"),
        status: String(p.status ?? "unknown"),
        created_at: String(p.created_at ?? ""),
      }));
      return { ok: true as const, payments };
    } catch (e) {
      return dodoError(e);
    }
  });

/** Admin-only listing of Dodo subscriptions. Returns {ok:false} when Dodo is unreachable. */
export const listSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DodoResult<{ subscriptions: AdminSubscriptionRow[] }>> => {
    await requireAdmin(context.userId);
    try {
      const { getDodoClient } = await import("@/lib/billing.server");
      const client = getDodoClient();
      const page = await client.subscriptions.list({ page_size: 100 });
      const subscriptions: AdminSubscriptionRow[] = (page.items ?? []).map((s: any) => ({
        id: String(s.subscription_id),
        email: String(s.customer?.email ?? ""),
        status: String(s.status ?? "unknown"),
        amount: Number(s.recurring_pre_tax_amount ?? 0) / 100,
        current_period_end: String(s.next_billing_date ?? ""),
      }));
      return { ok: true as const, subscriptions };
    } catch (e) {
      return dodoError(e);
    }
  });

/** Admin-only full refund of a Dodo payment. */
export const createRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { payment_id: string }) => {
    if (!input.payment_id) throw new Error("payment_id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    await requireAdmin(context.userId);
    try {
      const { getDodoClient } = await import("@/lib/billing.server");
      const client = getDodoClient();
      await client.refunds.create({ payment_id: data.payment_id });
      return { ok: true };
    } catch (e) {
      return dodoError(e);
    }
  });

// ================= coupons =================

export interface CouponRow {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ coupons: CouponRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("coupons")
      .select("id, code, discount_percent, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      coupons: (data ?? []).map((c: any) => ({
        id: String(c.id),
        code: String(c.code),
        discount_percent: Number(c.discount_percent),
        max_uses: c.max_uses == null ? null : Number(c.max_uses),
        used_count: Number(c.used_count ?? 0),
        expires_at: c.expires_at == null ? null : String(c.expires_at),
        is_active: Boolean(c.active),
        created_at: String(c.created_at),
      })),
    };
  });

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      code: string;
      discount_percent: number;
      max_uses?: number | null;
      expires_at?: string | null;
    }) => {
      const code = String(input.code ?? "")
        .trim()
        .toUpperCase();
      const discount_percent = Math.round(Number(input.discount_percent));
      if (!code) throw new Error("code required");
      if (!Number.isFinite(discount_percent) || discount_percent < 1 || discount_percent > 100) {
        throw new Error("discount_percent must be 1-100");
      }
      return {
        code,
        discount_percent,
        max_uses:
          input.max_uses == null || (input.max_uses as unknown) === ""
            ? null
            : Math.max(1, Math.round(Number(input.max_uses))),
        expires_at: input.expires_at ? String(input.expires_at) : null,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db.from("coupons").insert({
      code: data.code,
      discount_percent: data.discount_percent,
      max_uses: data.max_uses,
      expires_at: data.expires_at,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const toggleCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; active: boolean }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db.from("coupons").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= support tickets =================

export interface TicketRow {
  id: string;
  subject: string;
  email: string;
  status: string;
  created_at: string;
}

export interface TicketReplyRow {
  id: string;
  author: "admin" | "user";
  body: string;
  created_at: string;
}

export const listTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ tickets: TicketRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("support_tickets")
      .select("id, subject, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      tickets: (data ?? []).map((t: any) => ({
        id: String(t.id),
        subject: String(t.subject),
        email: String(t.email),
        status: String(t.status),
        created_at: String(t.created_at),
      })),
    };
  });

export const getTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ticket: TicketRow; replies: TicketReplyRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data: ticket, error } = await db
      .from("support_tickets")
      .select("id, subject, email, status, created_at")
      .eq("id", data.id)
      .single();
    if (error || !ticket) throw new Error(error?.message ?? "Ticket not found");
    const { data: replies, error: rErr } = await db
      .from("ticket_replies")
      .select("id, is_admin, body, created_at")
      .eq("ticket_id", data.id)
      .order("created_at", { ascending: true });
    if (rErr) throw new Error(rErr.message);
    return {
      ticket: {
        id: String(ticket.id),
        subject: String(ticket.subject),
        email: String(ticket.email),
        status: String(ticket.status),
        created_at: String(ticket.created_at),
      },
      replies: (replies ?? []).map((r: any) => ({
        id: String(r.id),
        author: r.is_admin ? ("admin" as const) : ("user" as const),
        body: String(r.body),
        created_at: String(r.created_at),
      })),
    };
  });

export const replyTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ticketId: string; body: string }) => {
    if (!input.ticketId) throw new Error("ticketId required");
    const body = String(input.body ?? "")
      .trim()
      .slice(0, 10000);
    if (!body) throw new Error("body required");
    return { ticketId: input.ticketId, body };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db.from("ticket_replies").insert({
      ticket_id: data.ticketId,
      author_id: context.userId,
      is_admin: true,
      body: data.body,
    });
    if (error) throw new Error(error.message);
    // An admin reply moves an untouched ticket into progress.
    await db
      .from("support_tickets")
      .update({ status: "in_progress" })
      .eq("id", data.ticketId)
      .eq("status", "open");
    return { ok: true as const };
  });

export const setTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    if (!input.id) throw new Error("id required");
    if (!["open", "in_progress", "closed"].includes(input.status)) throw new Error("bad status");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("support_tickets")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= error logs =================

export interface ErrorLogRow {
  id: string;
  message: string;
  url: string | null;
  user_id: string | null;
  created_at: string;
}

export const listErrorLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ logs: ErrorLogRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("error_logs")
      .select("id, message, url, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      logs: (data ?? []).map((l: any) => ({
        id: String(l.id),
        message: String(l.message),
        url: l.url == null ? null : String(l.url),
        user_id: l.user_id == null ? null : String(l.user_id),
        created_at: String(l.created_at),
      })),
    };
  });

/** Owner-only: wipes the error log table. */
export const clearErrorLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireOwner(context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("error_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= tool settings =================

export interface ToolSettingRow {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  free_limit: number | null;
}

export const listToolSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ settings: ToolSettingRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    // Dynamic import: the 17MB tool catalog stays out of the client bundle.
    const { ALL_TOOLS, TOOL_CATEGORIES } = await import("@/lib/tool-catalog");
    const { data, error } = await db.from("tool_settings").select("tool_id, enabled, free_limit");
    if (error) throw new Error(error.message);
    const overrideById = new Map<string, { enabled: boolean; free_limit: number | null }>();
    (data ?? []).forEach((r: any) =>
      overrideById.set(String(r.tool_id), {
        enabled: Boolean(r.enabled),
        free_limit: r.free_limit == null ? null : Number(r.free_limit),
      }),
    );
    const labelById = new Map(TOOL_CATEGORIES.map((c) => [c.id, c.label]));
    const settings: ToolSettingRow[] = ALL_TOOLS.map((t) => {
      const o = overrideById.get(t.id);
      return {
        id: t.id,
        name: t.name,
        category: labelById.get(t.category ?? "") ?? t.category ?? "Other",
        enabled: o?.enabled ?? true,
        free_limit: o?.free_limit ?? null,
      };
    });
    return { settings };
  });

export const setToolSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; enabled?: boolean; free_limit?: number | null }) => {
    if (!input.id) throw new Error("id required");
    if (input.free_limit != null && (!Number.isFinite(input.free_limit) || input.free_limit < 0)) {
      throw new Error("free_limit must be a non-negative number");
    }
    return {
      id: input.id,
      enabled: input.enabled,
      free_limit: input.free_limit === undefined ? undefined : input.free_limit,
    };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const patch: { enabled?: boolean; free_limit?: number | null } = {};
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.free_limit !== undefined) patch.free_limit = data.free_limit;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await db
      .from("tool_settings")
      .upsert({ tool_id: data.id, ...patch }, { onConflict: "tool_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= takedowns =================

export interface TakedownRow {
  id: string;
  reporter_email: string;
  icon_set: string;
  reason: string;
  status: string;
  created_at: string;
}

export const listTakedowns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ takedowns: TakedownRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("takedown_requests")
      .select("id, reporter_email, icon_set, reason, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      takedowns: (data ?? []).map((t: any) => ({
        id: String(t.id),
        reporter_email: String(t.reporter_email),
        icon_set: String(t.icon_set),
        reason: String(t.reason),
        status: String(t.status),
        created_at: String(t.created_at),
      })),
    };
  });

export const setTakedownStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    if (!input.id) throw new Error("id required");
    if (!["pending", "approved", "rejected"].includes(input.status)) throw new Error("bad status");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("takedown_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= changelog =================

export interface ChangelogRow {
  id: string;
  title: string;
  body: string;
  published: boolean;
  updated_at: string;
}

export const listChangelogAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ entries: ChangelogRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("changelog_posts")
      .select("id, title, body, published, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      entries: (data ?? []).map((e: any) => ({
        id: String(e.id),
        title: String(e.title),
        body: String(e.body),
        published: Boolean(e.published),
        updated_at: String(e.updated_at),
      })),
    };
  });

export const saveChangelog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; title: string; body: string; published: boolean }) => {
    const title = String(input.title ?? "")
      .trim()
      .slice(0, 200);
    const body = String(input.body ?? "")
      .trim()
      .slice(0, 20000);
    if (!title) throw new Error("title required");
    if (!body) throw new Error("body required");
    return { id: input.id || undefined, title, body, published: Boolean(input.published) };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    if (data.id) {
      const { error } = await db
        .from("changelog_posts")
        .update({ title: data.title, body: data.body, published: data.published })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("changelog_posts")
        .insert({ title: data.title, body: data.body, published: data.published });
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteChangelog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db.from("changelog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ================= referrals =================

export interface ReferralRow {
  id: string;
  referrer_email: string;
  referred_email: string;
  status: string;
  created_at: string;
}

export const getReferrals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ referrals: ReferralRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const [{ data: refs, error }, { data: list }] = await Promise.all([
      db
        .from("referrals")
        .select("id, referrer_id, referred_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (error) throw new Error(error.message);
    const emailById = new Map<string, string>();
    (list?.users ?? []).forEach((u: any) => {
      if (u.email) emailById.set(String(u.id), String(u.email));
    });
    return {
      referrals: (refs ?? []).map((r: any) => ({
        id: String(r.id),
        referrer_email: emailById.get(String(r.referrer_id)) ?? String(r.referrer_id).slice(0, 8),
        referred_email: emailById.get(String(r.referred_id)) ?? String(r.referred_id).slice(0, 8),
        status: String(r.status),
        created_at: String(r.created_at),
      })),
    };
  });

// ================= newsletter + campaigns =================

export const getNewsletterCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ count: number }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    try {
      const { count, error } = await db
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return { count: count ?? 0 };
    } catch {
      // No newsletter table wired up yet: report 0 rather than fail the tab.
      return { count: 0 };
    }
  });

export interface CampaignRow {
  id: string;
  subject: string;
  status: string;
  created_at: string;
}

export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ campaigns: CampaignRow[] }> => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("campaigns")
      .select("id, subject, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return {
      campaigns: (data ?? []).map((c: any) => ({
        id: String(c.id),
        subject: String(c.subject),
        status: String(c.status),
        created_at: String(c.created_at),
      })),
    };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { subject: string; body: string }) => {
    const subject = String(input.subject ?? "")
      .trim()
      .slice(0, 200);
    const body = String(input.body ?? "")
      .trim()
      .slice(0, 50000);
    if (!subject) throw new Error("subject required");
    if (!body) throw new Error("body required");
    return { subject, body };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await adminClient();
    const { error } = await db
      .from("campaigns")
      .insert({ subject: data.subject, body: data.body, status: "draft" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
