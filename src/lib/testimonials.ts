import { supabase } from "@/integrations/supabase/client";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  created_at: string;
}

// Built-in fallback used when Supabase is unreachable or no approved
// testimonials exist yet. Keep in sync with the migration seed.
export const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "default-1",
    name: "Marta Ilves",
    role: "IconVault User",
    text: "We standardised our whole design system on one collection in an afternoon. The token export dropped straight into our Tailwind config.",
    rating: 5,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "default-2",
    name: "Dev Prakash",
    role: "IconVault User",
    text: "The CLI is the part I did not know I needed. iconvault add lucide:rocket and it is in my repo, correctly named.",
    rating: 5,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "default-3",
    name: "Sasha Renn",
    role: "IconVault User",
    text: "Comparing four candidate icons side by side stopped a week of Slack debate. That feature alone earned the Pro seat.",
    rating: 5,
    created_at: "2026-01-03T00:00:00Z",
  },
  {
    id: "default-4",
    name: "Arjun Mehta",
    role: "IconVault User",
    text: "I replaced three bookmark folders with one IconVault collection. Finding the right icon now takes seconds, not minutes.",
    rating: 5,
    created_at: "2026-01-04T00:00:00Z",
  },
  {
    id: "default-5",
    name: "Priya Sharma",
    role: "IconVault User",
    text: "The background remover saved my product listings. Clean cutouts in one click, no Photoshop needed.",
    rating: 5,
    created_at: "2026-01-05T00:00:00Z",
  },
  {
    id: "default-6",
    name: "Rahul Verma",
    role: "IconVault User",
    text: "579 tools and I keep discovering new ones. The QR generator and JSON formatter are part of my daily workflow now.",
    rating: 5,
    created_at: "2026-01-06T00:00:00Z",
  },
];

/**
 * Fetch approved testimonials from Supabase. Falls back to the built-in
 * defaults when the fetch fails or returns nothing, so the homepage never
 * shows an empty section.
 */
export async function getApprovedTestimonials(): Promise<Testimonial[]> {
  try {
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, name, role, text, rating, created_at")
      .eq("is_approved", true)
      .order("created_at", { ascending: true })
      .limit(24);
    if (error || !data || data.length === 0) return DEFAULT_TESTIMONIALS;
    return data as Testimonial[];
  } catch {
    return DEFAULT_TESTIMONIALS;
  }
}
