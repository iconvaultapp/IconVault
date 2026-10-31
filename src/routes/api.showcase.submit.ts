import { createFileRoute } from "@tanstack/react-router";
import { isRateLimitedKV, rateLimitedResponse } from "../lib/rate-limit";

/**
 * IconVault v55 — Community Showcase submission endpoint.
 * Rate-limited with the existing KV limiter (5 submissions/minute/IP).
 * Validates fields server-side, always forces status = 'pending' — nothing
 * becomes public until the founder flips it to 'approved' in Supabase.
 * Writes via the service-role client (bypasses RLS by design); there is no
 * anonymous INSERT policy on the table.
 */

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
};

const safeUrl = (v: string): boolean => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export const Route = createFileRoute("/api/showcase/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (await isRateLimitedKV(request, "api:showcase-submit", 5)) return rateLimitedResponse();
        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 });
        }

        const projectName = str(body["project_name"], 120);
        const creatorName = str(body["creator_name"], 120);
        const creatorSite = str(body["creator_site"], 500);
        const description = str(body["description"], 500);
        const iconsUsed = str(body["icons_used"], 300);
        const contactEmail = body["contact_email"] === undefined || body["contact_email"] === ""
          ? null
          : str(body["contact_email"], 200);

        if (!projectName || !creatorName || !creatorSite || !description || !iconsUsed) {
          return Response.json({ error: "All required fields must be filled in." }, { status: 400 });
        }
        if (!safeUrl(creatorSite)) {
          return Response.json({ error: "Creator site must be a valid http(s) URL." }, { status: 400 });
        }
        if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
          return Response.json({ error: "Contact email looks invalid." }, { status: 400 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await (supabaseAdmin as any).from("showcase_projects").insert({
            project_name: projectName,
            creator_name: creatorName,
            creator_site: creatorSite,
            description,
            icons_used: iconsUsed,
            contact_email: contactEmail,
            status: "pending",
          });
          if (error) throw error;
        } catch {
          // Most likely cause: the founder has not run the migration yet.
          return Response.json(
            { error: "Submissions are not set up yet — the showcase table migration still needs to be run." },
            { status: 503 },
          );
        }

        return Response.json({ ok: true }, { status: 201 });
      },
    },
  },
});
