// /tools/html-entity-converter - Encode/decode HTML entities with a searchable 250-entry reference.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/html-entity-converter")({
  head: () => {
    const seo = getToolSeoMeta("html-entity-converter");
    const canonical = "https://iconvault.site/tools/html-entity-converter";
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
  component: EntityTool,
});

// [name, char] - code points derived at runtime.
const ENTITIES: [string, string][] = [
  ["amp", "&"], ["lt", "<"], ["gt", ">"], ["quot", '"'], ["apos", "'"],
  ["nbsp", " "], ["iexcl", "¡"], ["cent", "¢"], ["pound", "£"], ["curren", "¤"],
  ["yen", "¥"], ["brvbar", "¦"], ["sect", "§"], ["uml", "¨"], ["copy", "©"],
  ["ordf", "ª"], ["laquo", "«"], ["not", "¬"], ["shy", "­"], ["reg", "®"],
  ["macr", "¯"], ["deg", "°"], ["plusmn", "±"], ["sup2", "²"], ["sup3", "³"],
  ["acute", "´"], ["micro", "µ"], ["para", "¶"], ["middot", "·"], ["cedil", "¸"],
  ["sup1", "¹"], ["ordm", "º"], ["raquo", "»"], ["frac14", "¼"], ["frac12", "½"],
  ["frac34", "¾"], ["iquest", "¿"], ["Agrave", "À"], ["Aacute", "Á"], ["Acirc", "Â"],
  ["Atilde", "Ã"], ["Auml", "Ä"], ["Aring", "Å"], ["AElig", "Æ"], ["Ccedil", "Ç"],
  ["Egrave", "È"], ["Eacute", "É"], ["Ecirc", "Ê"], ["Euml", "Ë"], ["Igrave", "Ì"],
  ["Iacute", "Í"], ["Icirc", "Î"], ["Iuml", "Ï"], ["ETH", "Ð"], ["Ntilde", "Ñ"],
  ["Ograve", "Ò"], ["Oacute", "Ó"], ["Ocirc", "Ô"], ["Otilde", "Õ"], ["Ouml", "Ö"],
  ["times", "×"], ["Oslash", "Ø"], ["Ugrave", "Ù"], ["Uacute", "Ú"], ["Ucirc", "Û"],
  ["Uuml", "Ü"], ["Yacute", "Ý"], ["THORN", "Þ"], ["szlig", "ß"], ["agrave", "à"],
  ["aacute", "á"], ["acirc", "â"], ["atilde", "ã"], ["auml", "ä"], ["aring", "å"],
  ["aelig", "æ"], ["ccedil", "ç"], ["egrave", "è"], ["eacute", "é"], ["ecirc", "ê"],
  ["euml", "ë"], ["igrave", "ì"], ["iacute", "í"], ["icirc", "î"], ["iuml", "ï"],
  ["eth", "ð"], ["ntilde", "ñ"], ["ograve", "ò"], ["oacute", "ó"], ["ocirc", "ô"],
  ["otilde", "õ"], ["ouml", "ö"], ["divide", "÷"], ["oslash", "ø"], ["ugrave", "ù"],
  ["uacute", "ú"], ["ucirc", "û"], ["uuml", "ü"], ["yacute", "ý"], ["thorn", "þ"],
  ["yuml", "ÿ"],
  ["Alpha", "Α"], ["Beta", "Β"], ["Gamma", "Γ"], ["Delta", "Δ"], ["Epsilon", "Ε"],
  ["Zeta", "Ζ"], ["Eta", "Η"], ["Theta", "Θ"], ["Iota", "Ι"], ["Kappa", "Κ"],
  ["Lambda", "Λ"], ["Mu", "Μ"], ["Nu", "Ν"], ["Xi", "Ξ"], ["Omicron", "Ο"],
  ["Pi", "Π"], ["Rho", "Ρ"], ["Sigma", "Σ"], ["Tau", "Τ"], ["Upsilon", "Υ"],
  ["Phi", "Φ"], ["Chi", "Χ"], ["Psi", "Ψ"], ["Omega", "Ω"],
  ["alpha", "α"], ["beta", "β"], ["gamma", "γ"], ["delta", "δ"], ["epsilon", "ε"],
  ["zeta", "ζ"], ["eta", "η"], ["theta", "θ"], ["iota", "ι"], ["kappa", "κ"],
  ["lambda", "λ"], ["mu", "μ"], ["nu", "ν"], ["xi", "ξ"], ["omicron", "ο"],
  ["pi", "π"], ["rho", "ρ"], ["sigmaf", "ς"], ["sigma", "σ"], ["tau", "τ"],
  ["upsilon", "υ"], ["phi", "φ"], ["chi", "χ"], ["psi", "ψ"], ["omega", "ω"],
  ["forall", "∀"], ["part", "∂"], ["exist", "∃"], ["empty", "∅"], ["nabla", "∇"],
  ["isin", "∈"], ["notin", "∉"], ["ni", "∋"], ["prod", "∏"], ["sum", "∑"],
  ["minus", "−"], ["lowast", "∗"], ["radic", "√"], ["prop", "∝"], ["infin", "∞"],
  ["ang", "∠"], ["and", "∧"], ["or", "∨"], ["cap", "∩"], ["cup", "∪"],
  ["int", "∫"], ["there4", "∴"], ["sim", "∼"], ["cong", "≅"], ["asymp", "≈"],
  ["ne", "≠"], ["equiv", "≡"], ["le", "≤"], ["ge", "≥"], ["sub", "⊂"],
  ["sup", "⊃"], ["nsub", "⊄"], ["sube", "⊆"], ["supe", "⊇"], ["oplus", "⊕"],
  ["otimes", "⊗"], ["perp", "⊥"], ["sdot", "⋅"],
  ["larr", "←"], ["uarr", "↑"], ["rarr", "→"], ["darr", "↓"], ["harr", "↔"],
  ["crarr", "↵"], ["lArr", "⇐"], ["uArr", "⇑"], ["rArr", "⇒"], ["dArr", "⇓"], ["hArr", "⇔"],
  ["bull", "•"], ["hellip", "…"], ["prime", "′"], ["Prime", "″"], ["oline", "‾"],
  ["frasl", "⁄"], ["weierp", "℘"], ["image", "ℑ"], ["real", "ℜ"], ["trade", "™"],
  ["alefsym", "ℵ"], ["spades", "♠"], ["clubs", "♣"], ["hearts", "♥"], ["diams", "♦"],
  ["OElig", "Œ"], ["oelig", "œ"], ["Scaron", "Š"], ["scaron", "š"], ["Yuml", "Ÿ"],
  ["fnof", "ƒ"], ["circ", "ˆ"], ["tilde", "˜"], ["ensp", " "], ["emsp", " "],
  ["thinsp", " "], ["zwnj", "‌"], ["zwj", "‍"], ["lrm", "‎"], ["rlm", "‏"],
  ["ndash", "–"], ["mdash", "—"], ["lsquo", "‘"], ["rsquo", "’"], ["sbquo", "‚"],
  ["ldquo", "“"], ["rdquo", "”"], ["bdquo", "„"], ["dagger", "†"], ["Dagger", "‡"],
  ["permil", "‰"], ["lsaquo", "‹"], ["rsaquo", "›"], ["euro", "€"],
];

const CHAR_TO_NAME = new Map<string, string>();
for (const [name, ch] of ENTITIES) {
  if (!CHAR_TO_NAME.has(ch)) CHAR_TO_NAME.set(ch, name);
}

function encodeHtml(s: string): string {
  return Array.from(s)
    .map((ch) => {
      const named = CHAR_TO_NAME.get(ch);
      if (named) return `&${named};`;
      const cp = ch.codePointAt(0) ?? 0;
      if (cp > 126) return `&#x${cp.toString(16).toUpperCase()};`;
      return ch;
    })
    .join("");
}

function decodeHtml(s: string): string {
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

function EntityTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("html-entity-converter", isPro);
  const seo = getToolSeo("html-entity-converter");

  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState(mode === "encode" ? "Tom & Jerry <3 — 50% off!" : "");
  const [query, setQuery] = useState("");

  const output = useMemo(() => {
    try {
      return mode === "encode" ? encodeHtml(input) : decodeHtml(input);
    } catch {
      return "";
    }
  }, [input, mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ENTITIES;
    return ENTITIES.filter(
      ([name, ch]) => name.toLowerCase().includes(q) || ch === q || `&${name};`.toLowerCase().includes(q),
    );
  }, [query]);

  const copyResult = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(output);
      trial.recordUse();
      toast.success("Result copied");
    } catch {
      toast.error("Copy failed");
    }
  };
  const copyEntity = async (name: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(`&${name};`);
      trial.recordUse();
      toast.success(`&${name}; copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="html-entity-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="HTML Entities" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-border p-1">
              {(["encode", "decode"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition",
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setMode(mode === "encode" ? "decode" : "encode"); setInput(output); }}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:border-primary/50"
            >
              <ArrowLeftRight className="h-4 w-4" /> Swap
            </button>
            <button
              type="button"
              onClick={copyResult}
              disabled={!trial.canUse || !output}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy result
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">
                {mode === "encode" ? "Text to encode" : "Entities to decode"}
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">Result</label>
              <textarea
                value={output}
                readOnly
                rows={6}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 font-mono text-sm outline-none"
              />
            </div>
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - conversion runs fully in your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold">Entity reference ({ENTITIES.length})</h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, e.g. copy, euro, rarr..."
              className="ml-auto w-full max-w-xs rounded-xl border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="grid max-h-96 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map(([name, ch]) => (
              <button
                key={name}
                type="button"
                onClick={() => void copyEntity(name)}
                title={`Copy &${name};`}
                className="flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-1.5 text-left transition hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="w-7 shrink-0 text-center text-lg">{ch}</span>
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs font-semibold">&{name};</span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    U+{(ch.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}
                  </span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No entities match "{query}".</p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Click any entity to copy it. Unknown characters encode as numeric &#x; entities.</p>
        </div>
      </div>
    </ToolPageShell>
  );
}
