import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadSearchIndex } from "@/lib/iconify";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  placeholder?: string;
  loading?: boolean;
  autoFocus?: boolean;
  size?: "md" | "lg";
  suggestions?: string[];
  className?: string;
}

export const SearchBar = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Search 421,020 icons - try 'shopping cart'",
  loading = false,
  autoFocus = false,
  size = "md",
  suggestions = [],
  className,
}: SearchBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const indexWarmed = useRef(false);
  const handleFocus = () => {
    setFocused(true);
    // Fetch the 8.2MB search index only when the user actually reaches for
    // search - not on page load. One fetch, then it is cached.
    if (!indexWarmed.current) {
      indexWarmed.current = true;
      preloadSearchIndex();
    }
  };

  useEffect(() => {
    // preventScroll: focusing must not yank the page down past the hero on load.
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Scrolling while the field is focused used to leave the input tucked under the
  // sticky header with the panel floating over the page - dismiss it instead.
  useEffect(() => {
    if (!focused) return;
    const start = window.scrollY;
    const onScroll = () => {
      // Ignore the small jump mobile keyboards cause when the field gains focus.
      if (Math.abs(window.scrollY - start) < 80) return;
      inputRef.current?.blur();
      setFocused(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [focused]);

  const visibleSuggestions = focused && value.length === 0 ? suggestions.slice(0, 6) : [];

  return (
    <div className={cn("relative w-full", focused ? "z-40" : "z-10", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.(value);
        }}
        className={cn(
          "flex items-center gap-3 rounded-2xl border bg-surface px-4 transition-all duration-300",
          size === "lg" ? "h-16 px-5" : "h-12",
          focused ? "border-primary/50 shadow-ring" : "border-border shadow-soft",
        )}
      >
        {loading ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        ) : (
          <Search className={cn("shrink-0 text-muted-foreground", size === "lg" ? "h-5 w-5" : "h-4.5 w-4.5")} />
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          aria-label="Search icons"
          className={cn(
            "min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
            size === "lg" ? "text-base sm:text-lg" : "text-sm",
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </form>

      {visibleSuggestions.length > 0 && (
        <div className="animate-pop absolute left-0 right-0 top-full z-40 mt-2 rounded-2xl border border-border bg-popover p-2 shadow-lift">
          <p className="eyebrow px-2 py-1">Try searching</p>
          {visibleSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => {
                onChange(s);
                onSubmit?.(s);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
