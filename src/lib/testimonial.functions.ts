import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { isRateLimited } from "@/lib/rate-limit";

export interface TestimonialRow {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  is_approved: boolean;
  created_at: string;
}

async function requireOwner(userId: string) {
  const { fetchRoleStatus } = await import("@/lib/admin-roles.server");
  const { isOwner } = await fetchRoleStatus(userId);
  if (!isOwner) throw new Error("Forbidden");
}

/**
 * Submit a review from a signed-in user. Stored unapproved; it appears on
 * the homepage only after an admin approves it. Rate-limited per user.
 */
export const submitTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; text: string; rating: number }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean; reason?: string }> => {
    try {
      if (isRateLimited(getRequest(), `testimonial-${context.userId}`, 5)) {
        return { ok: false, reason: "rate-limited" };
      }
    } catch {
      /* continue without throttling when request context is unavailable */
    }
    const name = String(data.name ?? "").trim().slice(0, 80);
    const text = String(data.text ?? "").trim().slice(0, 2000);
    const rating = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5)));
    if (!name || !text) return { ok: false, reason: "missing-fields" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("testimonials").insert({
      name,
      role: "IconVault User",
      text,
      rating,
      is_approved: false,
    });
    if (error) return { ok: false, reason: "save-failed" };
    return { ok: true };
  });

/** List every testimonial (approved + pending), newest first. Owner only. */
export const listTestimonialsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ testimonials: TestimonialRow[] }> => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("testimonials")
      .select("id, name, role, text, rating, is_approved, created_at")
      .order("created_at", { ascending: false });
    return { testimonials: (data ?? []) as TestimonialRow[] };
  });

/** Approve or unapprove a testimonial. Owner only. */
export const setTestimonialApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approved: boolean }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("testimonials")
      .update({ is_approved: data.approved })
      .eq("id", data.id);
    return { ok: !error };
  });

/** Edit a testimonial's name, role, text, or rating. Owner only. */
export const updateTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; name: string; role: string; text: string; rating: number }) => input,
  )
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("testimonials")
      .update({
        name: String(data.name ?? "").trim().slice(0, 80),
        role: String(data.role ?? "").trim().slice(0, 80) || "IconVault User",
        text: String(data.text ?? "").trim().slice(0, 2000),
        rating: Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5))),
      })
      .eq("id", data.id);
    return { ok: !error };
  });

/** Delete a testimonial. Owner only. */
export const deleteTestimonial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }): Promise<{ ok: boolean }> => {
    await requireOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("testimonials").delete().eq("id", data.id);
    return { ok: !error };
  });
