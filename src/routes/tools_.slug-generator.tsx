// /tools/slug-generator - URL slug generator from headlines.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Link2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/slug-generator")({
  head: () => {
    const seo = getToolSeoMeta("slug-generator");
    const canonical = "https://iconvault.site/tools/slug-generator";
    return {
      meta: [
        { title: seo.title },
        { name: "description", content: seo.metaDescription },
        { property: "og:title", content: seo.title },
        { property: "og:description", content: seo.metaDescription },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: seo.title },
        { name: "twitter:description", content: seo.metaDescription },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: SlugGeneratorTool,
});

type Separator = "-" | "_";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "is", "are", "was", "were", "be", "as", "by", "from", "it", "its",
  "this", "that", "these", "those",
]);

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";
const labelCls = "mb-1.5 block text-[13px] font-medium text-foreground/80";

function slugify(
  text: string,
  lowercase: boolean,
  sep: Separator,
  removeStop: boolean,
  maxLen: number,
): string {
  let s = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (lowercase) s = s.toLowerCase();
  s = s.replace(/[^a-zA-Z0-9]+/g, sep);
  s = s.replace(new RegExp(`${sep}{2,}`, "g"), sep);
  s = s.replace(new RegExp(`^${sep}+|${sep}+$`, "g"), "");
  if (removeStop) {
    s = s
      .split(sep)
      .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()))
      .join(sep);
  }
  if (maxLen > 0 && s.length > maxLen) {
    s = s.slice(0, maxLen).replace(new RegExp(`${sep}+$`), "");
  }
  return s;
}

/** Build slugs with -2, -3 suffixes for duplicates. */
function buildSlugs(
  lines: string[],
  lowercase: boolean,
  sep: Separator,
  removeStop: boolean,
  maxLen: number,
): string[] {
  const counts = new Map<string, number>();
  return lines.map((line) => {
    const base = slugify(line, lowercase, sep, removeStop, maxLen) || "untitled";
    const n = (counts.get(base) ?? 0) + 1;
    counts.set(base, n);
    return n === 1 ? base : `${base}${sep}${n}`;
  });
}

function SlugGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("slug-generator", isPro);
  const seo = getToolSeo("slug-generator");

  const [headlines, setHeadlines] = useState("");
  const [lowercase, setLowercase] = useState(true);
  const [separator, setSeparator] = useState<Separator>("-");
  const [removeStop, setRemoveStop] = useState(false);
  const [maxLength, setMaxLength] = useState("0");
  const [copied, setCopied] = useState<string | null>(null);

  const lines = headlines.split("\n").map((l) => l.trim()).filter(Boolean);
  const maxLen = Math.max(0, parseInt(maxLength, 10) || 0);
  const slugs = buildSlugs(lines, lowercase, separator, removeStop, maxLen);

  const generate = () => {
    if (!trial.canUse) return;
    trial.recordUse();
    toast.success("Slugs generated");
  };

  const copyOne = (slug: string) => {
    navigator.clipboard
      .writeText(slug)
      .then(() => {
        setCopied(slug);
        toast.success("Slug copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const copyAll = () => {
    if (slugs.length === 0) {
      toast.error("Nothing to copy yet - add at least one headline");
      return;
    }
    navigator.clipboard
      .writeText(slugs.join("\n"))
      .then(() => toast.success(`${slugs.length} slugs copied`))
      .catch(() => toast.error("Copy failed"));
  };

  return (
    <ToolPageShell toolId="slug-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Slug Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className={labelCls} htmlFor="sg-headlines">Headlines (one per line)</label>
            <textarea
              id="sg-headlines" className={`${inputCls} min-h-[180px] resize-y`} value={headlines}
              onChange={(e) => setHeadlines(e.target.value)}
              placeholder={"10 Best Free Icon Packs\nHow to Design a Logo in 2026"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="sg-sep">Separator</label>
              <select id="sg-sep" className={inputCls} value={separator} onChange={(e) => setSeparator(e.target.value as Separator)}>
                <option value="-">Hyphen (-)</option>
                <option value="_">Underscore (_)</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="sg-max">Max length (0 = no limit)</label>
              <input
                id="sg-max" className={inputCls} value={maxLength}
                onChange={(e) => setMaxLength(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="0" inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input type="checkbox" checked={lowercase} onChange={(e) => setLowercase(e.target.checked)} className="h-4 w-4 accent-primary" />
              Lowercase
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground/80">
              <input type="checkbox" checked={removeStop} onChange={(e) => setRemoveStop(e.target.checked)} className="h-4 w-4 accent-primary" />
              Remove stop words
            </label>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Wand2 className="h-4 w-4" /> Generate slugs
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {slugs.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Link2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your slugs appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Type or paste headlines on the left - clean URL slugs update live, with -2, -3 suffixes for duplicates.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">{slugs.length} slug{slugs.length === 1 ? "" : "s"} generated</p>
                <button
                  type="button" onClick={copyAll}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Copy className="h-4 w-4" /> Copy all
                </button>
              </div>
              <div className="max-h-[420px] space-y-1.5 overflow-auto">
                {slugs.map((slug, i) => (
                  <div
                    key={`${slug}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs"
                  >
                    <span className="break-all">{slug}</span>
                    <button
                      type="button" onClick={() => copyOne(slug)} aria-label={`Copy ${slug}`}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <Copy className={`h-3.5 w-3.5 ${copied === slug ? "text-emerald-500" : ""}`} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
