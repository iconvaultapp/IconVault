import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * User account server functions. All require a logged-in user; the caller's
 * id comes from requireSupabaseAuth -> context.userId.
 * (Admin functions live in src/lib/admin.functions.ts - do not add admin
 * functions here.)
 */

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function callerEmail(userId: string): Promise<string | null> {
  const sb = await admin();
  const { data } = await sb.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

const authed = () => createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]);

// ================= billing (Dodo Payments) =================

export interface BillingPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
}

/** Payments for the caller's Dodo customer record, newest first. */
export const getBillingHistory = authed().handler(async ({ context }): Promise<{ ok: boolean; payments: BillingPayment[] }> => {
  try {
    const email = await callerEmail(context.userId);
    if (!email) return { ok: false, payments: [] };
    const { getDodoClient } = await import("@/lib/billing.server");
    const client = getDodoClient();
    const customers = await client.customers.list({ email });
    const customer = customers.items?.[0];
    if (!customer) return { ok: true, payments: [] };
    const page = await client.payments.list({ customer_id: (customer as any).customer_id });
    const payments: BillingPayment[] = (page.items ?? []).map((p: any) => ({
      id: String(p.payment_id ?? p.id ?? ""),
      amount: (p.total_amount ?? p.amount ?? 0) / 100,
      currency: p.currency ?? "USD",
      status: p.status ?? "unknown",
      created_at: p.created_at ?? "",
    }));
    return { ok: true, payments };
  } catch {
    return { ok: false, payments: [] };
  }
});

export interface SubscriptionInfo {
  found: boolean;
  status: string | null;
  cancelAtNextBillingDate: boolean;
  nextBillingDate: string | null;
  subscriptionId: string | null;
}

/** The caller's active Dodo subscription, if any. */
export const getSubscriptionStatus = authed().handler(async ({ context }): Promise<SubscriptionInfo> => {
  const empty: SubscriptionInfo = {
    found: false,
    status: null,
    cancelAtNextBillingDate: false,
    nextBillingDate: null,
    subscriptionId: null,
  };
  try {
    const email = await callerEmail(context.userId);
    if (!email) return empty;
    const { getDodoClient } = await import("@/lib/billing.server");
    const client = getDodoClient();
    const customers = await client.customers.list({ email });
    const customer = customers.items?.[0];
    if (!customer) return empty;
    const subs = await client.subscriptions.list({ customer_id: (customer as any).customer_id } as any);
    const active = (subs.items ?? []).find(
      (s: any) => s.status === "active" || s.status === "trialing",
    ) as any;
    if (!active) return empty;
    return {
      found: true,
      status: active.status ?? null,
      cancelAtNextBillingDate: Boolean(active.cancel_at_next_billing_date),
      nextBillingDate: active.next_billing_date ?? null,
      subscriptionId: active.subscription_id ?? null,
    };
  } catch {
    return empty;
  }
});

/** Schedule cancellation at the end of the current billing period. */
export const cancelSubscription = authed().handler(async ({ context }): Promise<{ ok: boolean }> => {
  try {
    const email = await callerEmail(context.userId);
    if (!email) return { ok: false };
    const { getDodoClient } = await import("@/lib/billing.server");
    const client = getDodoClient();
    const customers = await client.customers.list({ email });
    const customer = customers.items?.[0];
    if (!customer) return { ok: false };
    const subs = await client.subscriptions.list({ customer_id: (customer as any).customer_id } as any);
    const active = (subs.items ?? []).find(
      (s: any) => s.status === "active" || s.status === "trialing",
    ) as any;
    if (!active?.subscription_id) return { ok: false };
    await client.subscriptions.update(active.subscription_id, {
      cancel_at_next_billing_date: true,
    } as any);
    return { ok: true };
  } catch {
    return { ok: false };
  }
});

/** Hosted Dodo customer-portal URL so users can manage payment methods themselves. */
export const getCustomerPortalUrl = authed().handler(async ({ context }): Promise<{ ok: boolean; url: string | null }> => {
  try {
    const email = await callerEmail(context.userId);
    if (!email) return { ok: false, url: null };
    const { getDodoClient } = await import("@/lib/billing.server");
    const client = getDodoClient();
    const customers = await client.customers.list({ email });
    const customer = customers.items?.[0];
    if (!customer) return { ok: false, url: null };
    const session = await client.customers.customerPortal.create((customer as any).customer_id, {
      return_url: "https://iconvault.site/profile",
    });
    const url = (session as any)?.link ?? (session as any)?.url ?? null;
    return { ok: Boolean(url), url };
  } catch {
    return { ok: false, url: null };
  }
});

// ================= download history =================

export interface DownloadRow {
  id: string;
  item_label: string;
  tool_id: string | null;
  created_at: string;
}

export const getDownloadHistory = authed()
  .inputValidator((input: { limit?: number }) => input)
  .handler(async ({ context, data }): Promise<DownloadRow[]> => {
    const sb = await admin();
    const { data: rows } = await (sb as any)
      .from("download_history")
      .select("id, item_label, tool_id, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(data?.limit ?? 50, 1), 200));
    return (rows ?? []) as DownloadRow[];
  });

/** Fire-and-forget from the client after a download completes. Never throws. */
export const trackDownload = authed()
  .inputValidator((input: { item_label: string; tool_id?: string | null }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    try {
      const label = (data?.item_label ?? "").slice(0, 200);
      if (!label) return { ok: false };
      const sb = await admin();
      await (sb as any).from("download_history").insert({
        user_id: context.userId,
        item_label: label,
        tool_id: data?.tool_id ?? null,
      });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

// ================= notifications =================

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export const getNotifications = authed().handler(async ({ context }): Promise<NotificationRow[]> => {
  const sb = await admin();
  const { data: rows } = await (sb as any)
    .from("notifications")
    .select("id, title, body, link, read, created_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (rows ?? []) as NotificationRow[];
});

export const markNotificationRead = authed()
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const sb = await admin();
    const { error } = await (sb as any)
      .from("notifications")
      .update({ read: true })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: !error };
  });

export const markAllNotificationsRead = authed().handler(async ({ context }): Promise<{ ok: boolean }> => {
  const sb = await admin();
  const { error } = await (sb as any)
    .from("notifications")
    .update({ read: true })
    .eq("user_id", context.userId)
    .eq("read", false);
  return { ok: !error };
});

// ================= data export & account deletion =================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface UserDataExport {
  exported_at: string;
  email: string | null;
  profile: Record<string, any> | null;
  plan: Record<string, any> | null;
  roles: Record<string, any>[];
  favourites: Record<string, any>[];
  collections: Record<string, any>[];
  api_keys: Record<string, any>[];
  download_history: Record<string, any>[];
  notifications: Record<string, any>[];
}

export const exportUserData = authed().handler(async ({ context }): Promise<UserDataExport> => {
  const sb = await admin();
  const uid = context.userId;
  const [profile, favourites, collections, keys, downloads, notes, roles, plans] =
    await Promise.all([
      (sb as any).from("profiles").select("*").eq("id", uid).maybeSingle(),
      (sb as any).from("favourites").select("icon_id, created_at").eq("user_id", uid),
      (sb as any).from("icon_collections").select("*").eq("user_id", uid),
      (sb as any)
        .from("api_keys")
        .select("id, name, key_prefix, monthly_quota, used_this_month, revoked, created_at")
        .eq("user_id", uid),
      (sb as any).from("download_history").select("item_label, tool_id, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(500),
      (sb as any).from("notifications").select("title, body, link, read, created_at").eq("user_id", uid),
      (sb as any).from("user_roles").select("role, created_at").eq("user_id", uid),
      (sb as any).from("user_plans").select("plan, purchased_at, created_at").eq("user_id", uid).maybeSingle(),
    ]);
  const email = await callerEmail(uid);
  return {
    exported_at: new Date().toISOString(),
    email,
    profile: profile?.data ?? null,
    plan: plans?.data ?? null,
    roles: roles?.data ?? [],
    favourites: favourites?.data ?? [],
    collections: collections?.data ?? [],
    api_keys: keys?.data ?? [],
    download_history: downloads?.data ?? [],
    notifications: notes?.data ?? [],
  };
});

/** Permanently delete the caller's account and all their data. Requires {confirm: true}. */
export const deleteMyAccount = authed()
  .inputValidator((input: { confirm?: boolean }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    if (!data?.confirm) return { ok: false };
    const sb = await admin();
    const uid = context.userId;
    try {
      // Never delete the site owner's account this way.
      const { data: roles } = await (sb as any).from("user_roles").select("role").eq("user_id", uid);
      if ((roles ?? []).some((r: any) => r.role === "admin")) return { ok: false };
      const tables = [
        "download_history",
        "notifications",
        "support_tickets",
        "referrals",
        "api_keys",
        "favourites",
        "icon_collections",
        "user_plans",
        "profiles",
        "user_roles",
      ];
      for (const t of tables) {
        await (sb as any).from(t).delete().eq("user_id", uid);
      }
      // profiles/user_plans/user_roles are keyed by id in some schemas
      await (sb as any).from("profiles").delete().eq("id", uid);
      await (sb as any).from("user_plans").delete().eq("user_id", uid);
      await (sb as any).from("user_roles").delete().eq("user_id", uid);
      const { error } = await sb.auth.admin.deleteUser(uid);
      return { ok: !error };
    } catch {
      return { ok: false };
    }
  });

// ================= support tickets =================

export interface TicketRow {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  replies: { body: string; from_admin: boolean; created_at: string }[];
}

export const createTicket = authed()
  .inputValidator((input: { subject: string; message: string }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    const subject = (data?.subject ?? "").trim().slice(0, 120);
    const message = (data?.message ?? "").trim().slice(0, 4000);
    if (!subject || !message) return { ok: false };
    const sb = await admin();
    const email = await callerEmail(context.userId);
    const { error } = await (sb as any).from("support_tickets").insert({
      user_id: context.userId,
      email,
      subject,
      message,
      status: "open",
    });
    return { ok: !error };
  });

export const getMyTickets = authed().handler(async ({ context }): Promise<TicketRow[]> => {
  const sb = await admin();
  const { data: tickets } = await (sb as any)
    .from("support_tickets")
    .select("id, subject, message, status, created_at")
    .eq("user_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(30);
  const rows: TicketRow[] = [];
  for (const t of (tickets ?? []) as any[]) {
    const { data: replies } = await (sb as any)
      .from("ticket_replies")
      .select("body, author_id, created_at")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true });
    rows.push({
      id: t.id,
      subject: t.subject,
      message: t.message,
      status: t.status,
      created_at: t.created_at,
      replies: ((replies ?? []) as any[]).map((r) => ({
        body: r.body,
        from_admin: r.author_id !== context.userId,
        created_at: r.created_at,
      })),
    });
  }
  return rows;
});

// ================= referrals =================

function referralCodeFor(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export const getMyReferralCode = authed().handler(async ({ context }): Promise<{ code: string }> => {
  return { code: referralCodeFor(context.userId) };
});

export interface ReferralRow {
  referred_email: string | null;
  status: string;
  created_at: string;
}

export const getMyReferrals = authed().handler(async ({ context }): Promise<ReferralRow[]> => {
  const sb = await admin();
  const { data: rows } = await (sb as any)
    .from("referrals")
    .select("referred_email, status, created_at")
    .eq("referrer_id", context.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (rows ?? []) as ReferralRow[];
});
