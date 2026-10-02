// /tools/css-property-playground - Typed custom properties lab: see why
// @property registration makes --angle, --p and friends actually animate,
// then build and register your own typed property. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Check, Copy, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/css-property-playground")({
  head: () => {
    const seo = getToolSeoMeta("css-property-playground");
    const canonical = "https://iconvault.site/tools/css-property-playground";
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
  component: PropertyPlaygroundTool,
});

function supportInfo(): { register: boolean; atRule: boolean } {
  if (typeof CSS === "undefined") return { register: false, atRule: false };
  const anyCss = CSS as unknown as { registerProperty?: unknown };
  let atRule = false;
  try {
    atRule = CSS.supports("syntax: '<angle>'");
  } catch {
    atRule = false;
  }
  return { register: typeof anyCss.registerProperty === "function", atRule };
}

const SYNTAXES = ["<angle>", "<color>", "<length>", "<number>", "<integer>", "<percentage>", "<length-percentage>", "*"];

function CodeBlock({ title, code, onCopy }: { title: string; code: string; onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={() => {
            onCopy();
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/50 hover:text-primary"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-72 overflow-auto p-4 text-xs leading-relaxed text-foreground/90">{code}</pre>
    </div>
  );
}

function DemoCard({
  title,
  blurb,
  registered,
  onToggleRegistered,
  onAnimate,
  animating,
  children,
}: {
  title: string;
  blurb: string;
  registered: boolean;
  onToggleRegistered: () => void;
  onAnimate: () => void;
  animating: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{title}</h3>
        <button
          type="button"
          onClick={onToggleRegistered}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold transition",
            registered ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground",
          )}
          aria-pressed={registered}
        >
          {registered ? "@property ON" : "@property OFF"}
        </button>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{blurb}</p>
      {children}
      <button
        type="button"
        onClick={onAnimate}
        className="mt-4 flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:border-primary/50 hover:text-primary"
      >
        <Play className="h-4 w-4" /> {animating ? "Animating…" : "Animate it"}
      </button>
    </div>
  );
}

function PropertyPlaygroundTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("css-property-playground", isPro);
  const seo = getToolSeo("css-property-playground");
  const support = useMemo(supportInfo, []);

  const [regAngle, setRegAngle] = useState(true);
  const [regP, setRegP] = useState(true);
  const [regHue, setRegHue] = useState(true);
  const [animAngle, setAnimAngle] = useState(false);
  const [animP, setAnimP] = useState(false);
  const [animHue, setAnimHue] = useState(false);

  // builder form
  const [name, setName] = useState("--my-angle");
  const [syntax, setSyntax] = useState("<angle>");
  const [inherits, setInherits] = useState(false);
  const [initial, setInitial] = useState("0deg");
  const [registerMsg, setRegisterMsg] = useState<string | null>(null);

  const runDemo = (kind: "angle" | "p" | "hue") => {
    const set = kind === "angle" ? setAnimAngle : kind === "p" ? setAnimP : setAnimHue;
    set(false);
    requestAnimationFrame(() => requestAnimationFrame(() => set(true)));
  };

  const registerCustom = () => {
    setRegisterMsg(null);
    try {
      const anyCss = CSS as unknown as { registerProperty?: (d: { name: string; syntax: string; inherits: boolean; initialValue: string }) => void };
      if (typeof anyCss.registerProperty !== "function") {
        setRegisterMsg("This browser has no CSS.registerProperty. The @property code below still works where the at-rule is supported.");
        return;
      }
      if (!/^--[a-zA-Z0-9-_]+$/.test(name.trim())) {
        setRegisterMsg("Custom property names must start with -- and contain only letters, numbers, - and _.");
        return;
      }
      anyCss.registerProperty({ name: name.trim(), syntax, inherits, initialValue: initial });
      setRegisterMsg(`Registered ${name.trim()} on this page. You can now transition it in DevTools or your own CSS.`);
      trial.recordUse();
      toast.success("Property registered");
    } catch (e) {
      setRegisterMsg(e instanceof Error ? e.message : "Registration failed.");
    }
  };

  const copyText = async (text: string, okMsg: string) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(okMsg);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  const atRule = `@property ${name.trim() || "--my-angle"} {\n  syntax: "${syntax}";\n  inherits: ${inherits};\n  initial-value: ${initial || "(required)"};\n}`;
  const jsSnippet = `CSS.registerProperty({\n  name: "${name.trim() || "--my-angle"}",\n  syntax: "${syntax}",\n  inherits: ${inherits},\n  initialValue: "${initial || ""}",\n});`;

  const inject = `
.ivp-angle { --iv-angle: 0deg; transition: --iv-angle 1.6s ease-in-out; background: conic-gradient(from var(--iv-angle), #0f766e, #14b8a6, #5eead4, #0f766e); }
${regAngle ? "@property --iv-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }" : ""}
.ivp-angle.go { --iv-angle: 360deg; }
.ivp-bar { --iv-p: 10; transition: --iv-p 1.6s ease-in-out; }
${regP ? "@property --iv-p { syntax: '<number>'; inherits: false; initial-value: 10; }" : ""}
.ivp-bar.go { --iv-p: 92; }
.ivp-hue { --iv-hue: 160; transition: --iv-hue 1.6s ease-in-out; background: hsl(var(--iv-hue) 70% 45%); }
${regHue ? "@property --iv-hue { syntax: '<number>'; inherits: false; initial-value: 160; }" : ""}
.ivp-hue.go { --iv-hue: 320; }
`;

  return (
    <ToolPageShell toolId="css-property-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSS @property Playground" left={trial.left} />
      <style>{inject}</style>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", support.atRule ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400")}>
          {support.atRule ? "@property supported here" : "@property not detected here"}
        </span>
        <span className="text-xs text-muted-foreground">
          Baseline widely available (Chrome 85+, Safari 16.4+, Firefox 128+). Without registration the demos below jump instead of animating, that is the whole point.
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <DemoCard
          title="Animated gradient angle"
          blurb="conic-gradient(from var(--iv-angle), …) with transition on --iv-angle. Registered as <angle>, the browser interpolates degrees. Unregistered, it flips from 0 to 360 instantly."
          registered={regAngle}
          onToggleRegistered={() => setRegAngle((v) => !v)}
          onAnimate={() => runDemo("angle")}
          animating={animAngle}
        >
          <div className={cn("h-32 rounded-xl", "ivp-angle", animAngle && "go")} />
        </DemoCard>

        <DemoCard
          title="Progress number"
          blurb="A bar whose width is calc(var(--iv-p) * 1%). Registered as <number>, 10 to 92 eases smoothly. Unregistered, custom properties are just token streams and cannot interpolate."
          registered={regP}
          onToggleRegistered={() => setRegP((v) => !v)}
          onAnimate={() => runDemo("p")}
          animating={animP}
        >
          <div className="h-32 rounded-xl bg-muted/50 p-4">
            <div className="h-5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full bg-teal-600", "ivp-bar", animP && "go")} style={{ width: "calc(var(--iv-p) * 1%)" }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">--iv-p drives the width via calc().</p>
          </div>
        </DemoCard>

        <DemoCard
          title="Hue shift"
          blurb="hsl(var(--iv-hue) 70% 45%) transitioning --iv-hue from 160 to 320. A registered <number> interpolates; without it you get a hard cut between two colors."
          registered={regHue}
          onToggleRegistered={() => setRegHue((v) => !v)}
          onAnimate={() => runDemo("hue")}
          animating={animHue}
        >
          <div className={cn("h-32 rounded-xl", "ivp-hue", animHue && "go")} />
        </DemoCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold">Build your own typed property</h3>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Property name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Syntax</label>
            <div className="flex flex-wrap gap-2">
              {SYNTAXES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSyntax(s)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 font-mono text-xs transition",
                    syntax === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Initial value</label>
            <input
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-sm outline-none focus:border-primary/60"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={inherits} onChange={(e) => setInherits(e.target.checked)} className="h-4 w-4 accent-teal-600" />
            inherits: true
          </label>
          <ActionButton disabled={!trial.canUse} onClick={registerCustom}>
            <Braces className="h-4 w-4" /> Register on this page
          </ActionButton>
          {registerMsg && <p className="text-xs text-muted-foreground">{registerMsg}</p>}
          {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free uses left. The demos and typing are unlimited.</p>}
        </div>

        <div className="grid content-start gap-5 md:grid-cols-2">
          <CodeBlock title="@property at-rule" code={atRule} onCopy={() => void copyText(atRule, "@property copied")} />
          <CodeBlock title="JS equivalent" code={jsSnippet} onCopy={() => void copyText(jsSnippet, "JS snippet copied")} />
        </div>
      </div>
    </ToolPageShell>
  );
}
