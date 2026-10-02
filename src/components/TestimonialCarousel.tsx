import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  getApprovedTestimonials,
  DEFAULT_TESTIMONIALS,
  type Testimonial,
} from "@/lib/testimonials";

/** 3 cards per view on desktop, 1 on mobile. */
function usePerView() {
  const [perView, setPerView] = useState(1);
  useEffect(() => {
    const update = () => setPerView(window.innerWidth >= 768 ? 3 : 1);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return perView;
}

/**
 * Auto-sliding testimonial carousel. Pulls approved testimonials from
 * Supabase, falling back to built-in defaults when the fetch fails.
 */
export function TestimonialCarousel() {
  const [items, setItems] = useState<Testimonial[]>(DEFAULT_TESTIMONIALS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const perView = usePerView();
  const maxIndex = Math.max(0, items.length - perView);

  useEffect(() => {
    let cancelled = false;
    getApprovedTestimonials().then((t) => {
      if (!cancelled && t.length > 0) setItems(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIndex((i) => Math.min(i, maxIndex));
  }, [maxIndex]);

  const next = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || maxIndex === 0) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [next, paused, maxIndex]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="-mx-3 overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${(index / items.length) * 100}%)` }}
        >
          {items.map((t) => (
            <div
              key={t.id}
              className="shrink-0 px-3"
              style={{ width: `${100 / perView}%` }}
            >
              <figure className="surface-card flex h-full flex-col gap-4 p-6">
                <div
                  className="flex gap-1 text-accent"
                  aria-label={`${t.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }).map((_, n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${n < t.rating ? "fill-accent" : "opacity-30"}`}
                    />
                  ))}
                </div>
                <blockquote className="flex-1 text-[15px] leading-relaxed text-foreground/90">
                  "{t.text}"
                </blockquote>
                <figcaption>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </div>
      {maxIndex > 0 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`focus-ring h-2 rounded-full transition-all ${
                i === index
                  ? "w-8 bg-primary"
                  : "w-2 bg-border hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
