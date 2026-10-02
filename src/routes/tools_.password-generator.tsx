// /tools/password-generator - cryptographically secure random password
// generator. 100% client-side via crypto.getRandomValues; nothing is sent
// anywhere.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/password-generator")({
  head: () => {
    const seo = getToolSeoMeta("password-generator");
    const canonical = "https://iconvault.site/tools/password-generator";
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
  component: PasswordGeneratorTool,
});

const SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
} as const;

type OptKey = keyof typeof SETS;

const OPTS: { key: OptKey; label: string }[] = [
  { key: "lowercase", label: "Lowercase (a–z)" },
  { key: "uppercase", label: "Uppercase (A–Z)" },
  { key: "digits", label: "Digits (0–9)" },
  { key: "symbols", label: "Symbols (!@#…)" },
];

/** 256 common words for memorable passphrases (8 bits of entropy per word). */
const WORDS = (
  "apple river stone cloud brave eagle forest flame ocean pearl thunder " +
  "meadow falcon ivory jade kite lemon mango north olive piano quartz raven " +
  "sun tide umbra vivid whale xenon yellow zebra anchor bloom cinder drift " +
  "ember frost glade harbor iris jewel kayak lagoon maple nectar onyx prism " +
  "quill ridge sable token urban vapor willow xerox yacht zephyr amber " +
  "brook coral dune echo fern grove heath isle juniper knoll lark moss " +
  "nymph opal pine quarry robin sage terra unity vista wolf xylem yarn " +
  "zinnia acorn birch clover dusk elm field gale hawthorn ivy jasmine kelp " +
  "linden moon night owl peak quince rain sparrow thyme urchin valley wind " +
  "xray year zip almond breeze canyon dawn elmwood flint glacier heron ink " +
  "jolt karma leaf lotus mesa nimbus orbit pepper quake rocket shore tango " +
  "ultra velvet wheat xeno youth zulu arcade badge cobble dagger elite " +
  "fable gnome hinge inlet joker lasso marble nudge oxen pilot quest rover " +
  "sonic tempo wager yonder zero ash bark cedar dew elk finch gull ibis jay " +
  "kiwi loon magpie newt otter plover quail snipe tern vireo wren xeme " +
  "yellowhammer zinc aloe basil chive dill endive fennel garlic herb kale " +
  "leek mint nutmeg oregano parsley rosemary umber vanilla wasabi xanthan " +
  "yam zest apron beacon cactus delta fig granite honey igloo jigsaw koala " +
  "llama noodle oasis panda quasar radar samba umbrella volcano waffle " +
  "xylophone yoga zenith armor bison comet dragon eclair island jungle " +
  "lantern narwhal pebble rainbow sequoia tundra unicorn vineyard cipher " +
  "pixel turbo laser comet2 nebula drift2 solar lunar comet3 cobalt ember2 " +
  "harbor2 meadow2 prairie summit"
).split(" ");

function PasswordGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("password-generator", isPro);
  const seo = getToolSeo("password-generator");

  const [mode, setMode] = useState<"random" | "passphrase">("random");
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState<Record<OptKey, boolean>>({
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
  });
  const [noAmbiguous, setNoAmbiguous] = useState(false);
  // Passphrase options
  const [wordCount, setWordCount] = useState(6);
  const [separator, setSeparator] = useState("-");
  const [capitalize, setCapitalize] = useState(true);
  const [addNumber, setAddNumber] = useState(true);
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const AMBIGUOUS = "l1I0O|";
  const charset = (Object.keys(SETS) as OptKey[])
    .filter((k) => opts[k])
    .map((k) => SETS[k])
    .join("")
    .split("")
    .filter((c) => !noAmbiguous || !AMBIGUOUS.includes(c))
    .join("");
  const entropy =
    mode === "random"
      ? charset
        ? Math.round(length * Math.log2(charset.length))
        : 0
      : Math.round(wordCount * Math.log2(WORDS.length) + (addNumber ? Math.log2(90) : 0));
  const strength = entropy < 50 ? "Weak" : entropy < 90 ? "OK" : "Strong";
  const strengthColor =
    strength === "Strong" ? "bg-emerald-500" : strength === "OK" ? "bg-amber-500" : "bg-red-500";
  const strengthText =
    strength === "Strong"
      ? "text-emerald-600 dark:text-emerald-400"
      : strength === "OK"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const toggle = (key: OptKey) => setOpts((p) => ({ ...p, [key]: !p[key] }));

  const rand = (n: number): number[] => {
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    return Array.from(buf);
  };

  const generate = () => {
    if (!trial.canUse) return;
    let out = "";
    if (mode === "random") {
      if (!charset) {
        toast.error("Select at least one character set.");
        return;
      }
      const r = rand(length);
      for (let i = 0; i < length; i++) out += charset[(r[i] ?? 0) % charset.length];
    } else {
      const r = rand(wordCount + 1);
      const words = r.slice(0, wordCount).map((x) => {
        const w = WORDS[x % WORDS.length] ?? "";
        return capitalize ? w.charAt(0).toUpperCase() + w.slice(1) : w;
      });
      if (addNumber) words.push(String(10 + ((r[wordCount] ?? 0) % 90)));
      out = words.join(separator);
    }
    setPassword(out);
    setHistory((h) => [out, ...h].slice(0, 8));
    trial.recordUse();
  };

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied to clipboard.");
    } catch {
      toast.error("Could not copy - select the password and copy it manually.");
    }
  };

  return (
    <ToolPageShell toolId="password-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Password Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="inline-flex rounded-xl bg-muted/60 p-1">
            {(["random", "passphrase"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-lg px-5 py-2 text-sm font-bold capitalize transition",
                  mode === m ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {mode === "random" ? (
            <>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-foreground/80">Password length</span>
                  <span className="tabular-nums text-muted-foreground">{length} characters</span>
                </div>
                <input
                  type="range" min={8} max={64} value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>

              <div className="space-y-2.5">
                {OPTS.map((o) => (
                  <label key={o.key} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:border-primary/40">
                    <input
                      type="checkbox" checked={opts[o.key]}
                      onChange={() => toggle(o.key)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-medium">{o.label}</span>
                  </label>
                ))}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:border-primary/40">
                  <input
                    type="checkbox" checked={noAmbiguous}
                    onChange={() => setNoAmbiguous((v) => !v)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm font-medium">Exclude ambiguous <span className="font-mono text-muted-foreground">l 1 I 0 O |</span></span>
                </label>
              </div>
            </>
          ) : (
            <>
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-foreground/80">Words</span>
                  <span className="tabular-nums text-muted-foreground">{wordCount} words</span>
                </div>
                <input
                  type="range" min={3} max={12} value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Separator</span>
                <div className="flex gap-2">
                  {["-", "_", ".", " "].map((s) => (
                    <button
                      key={s || "space"}
                      type="button"
                      onClick={() => setSeparator(s)}
                      className={cn(
                        "flex-1 rounded-xl border py-2 font-mono text-sm font-bold transition",
                        separator === s ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                      )}
                    >
                      {s === " " ? "space" : s}
                    </button>
                  ))}
                </div>
              </label>
              <div className="space-y-2.5">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:border-primary/40">
                  <input type="checkbox" checked={capitalize} onChange={() => setCapitalize((v) => !v)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm font-medium">Capitalize words</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 transition hover:border-primary/40">
                  <input type="checkbox" checked={addNumber} onChange={() => setAddNumber((v) => !v)} className="h-4 w-4 accent-primary" />
                  <span className="text-sm font-medium">Append a random number</span>
                </label>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Each word adds ~8 bits of entropy. 6 words + a number ≈ {Math.round(6 * Math.log2(256) + Math.log2(90))} bits - memorable and strong.
              </p>
            </>
          )}

          <ActionButton busy={false} disabled={!trial.canUse} onClick={generate}>
            <RefreshCw className="h-4 w-4" /> Generate {mode === "random" ? "password" : "passphrase"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - nothing ever leaves your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {password === "" ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <KeyRound className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your password appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Generated with your operating system's cryptographically secure random number
                generator - never sent over the network.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3 rounded-xl bg-muted/60 p-4">
                <p className="break-all font-mono text-lg leading-relaxed">{password}</p>
                <button
                  type="button" onClick={copy} aria-label="Copy password"
                  className="shrink-0 rounded-lg border border-border bg-card p-2.5 hover:border-primary/50"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="font-medium text-foreground/80">Password strength</span>
                  <span className={cn("font-bold", strengthText)}>
                    {strength} · ~{entropy} bits of entropy
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", strengthColor)}
                    style={{ width: `${Math.min(100, (entropy / 128) * 100)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Entropy = length × log₂(charset size). Aim for 80+ bits for important accounts -
                  16 random characters with all sets enabled gives about 105 bits.
                </p>
              </div>

              <button
                type="button" onClick={copy}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/50"
              >
                <Copy className="h-4 w-4" /> Copy {mode === "random" ? "password" : "passphrase"}
              </button>

              {history.length > 1 && (
                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[13px] font-bold text-foreground/80">This session's history</p>
                    <button type="button" onClick={() => setHistory([])} className="text-xs font-bold text-muted-foreground hover:text-red-500">
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {history.slice(1).map((h, i) => (
                      <button
                        key={`${i}-${h.slice(0, 8)}`}
                        type="button"
                        onClick={() => setPassword(h)}
                        className="block w-full truncate rounded-lg bg-muted/40 px-3 py-2 text-left font-mono text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title="Click to restore"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">Kept only in memory - gone when you leave the page.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
