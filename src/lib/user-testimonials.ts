/** User-submitted testimonials, stored device-locally in localStorage.
 * No backend needed: a user's own review appears on the homepage on their
 * own device right after they submit it from their profile panel. */

export interface UserTestimonial {
  name: string;
  quote: string;
  rating: number; // 1-5
  createdAt: string; // ISO timestamp, used as the stable id
}

const KEY = "iconvault_user_testimonials";
const MAX_QUOTE = 300;

function readAll(): UserTestimonial[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserTestimonial[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t) =>
        t &&
        typeof t.name === "string" &&
        typeof t.quote === "string" &&
        t.quote.trim().length > 0 &&
        t.quote.length <= MAX_QUOTE + 40,
    );
  } catch {
    return [];
  }
}

export function getUserTestimonials(): UserTestimonial[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveUserTestimonial(input: {
  name: string;
  quote: string;
  rating: number;
}): UserTestimonial {
  const entry: UserTestimonial = {
    name: input.name.trim().slice(0, 60) || "Anonymous",
    quote: input.quote.trim().slice(0, MAX_QUOTE),
    rating: Math.min(5, Math.max(1, Math.round(input.rating) || 5)),
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage full or unavailable: the entry still renders for this session.
  }
  return entry;
}

export function deleteUserTestimonial(createdAt: string): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(readAll().filter((t) => t.createdAt !== createdAt)),
    );
  } catch {
    // Ignore storage errors on delete.
  }
}

export const TESTIMONIAL_MAX_LENGTH = MAX_QUOTE;
