// /tools/prettier-config-generator - Visual .prettierrc builder. Toggle and
// slider controls, live JSON output, and a sample snippet that re-formats
// itself as you change settings. Copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/prettier-config-generator")({
  head: () => {
    const seo = getToolSeoMeta("prettier-config-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PrettierTool,
});

interface Cfg {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  trailingComma: "all" | "es5" | "none";
  bracketSpacing: boolean;
  arrowParens: "always" | "avoid";
  endOfLine: "lf" | "crlf" | "auto";
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition hover:border-primary/40"
    >
      <span>
        <span className="block font-mono text-[13px] font-bold">{label}</span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[13px] font-bold">{label}</span>
        <span className="rounded-lg bg-muted px-2.5 py-1 font-mono text-xs font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
        aria-label={label}
      />
    </div>
  );
}

function Sel<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[13px] font-bold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

/** Re-format a fixed sample snippet using the current settings, so the
 *  effect of every option is visible in real code. */
function formatSample(c: Cfg): string {
  const q = c.singleQuote ? "'" : '"';
  const semi = c.semi ? ";" : "";
  const bs = c.bracketSpacing ? " " : "";
  const ind = c.useTabs ? "\t" : " ".repeat(c.tabWidth);
  const comma = c.trailingComma === "all" || c.trailingComma === "es5" ? "," : "";
  const arrow = c.arrowParens === "always" ? "(user)" : "user";

  const out: string[] = [];
  out.push(`const user = {${bs}name: ${q}Ada${q}, role: ${q}admin${q}${bs}}${semi}`);
  out.push(`const tags = [`);
  out.push(`${ind}${q}javascript${q},`);
  out.push(`${ind}${q}typescript${q},`);
  out.push(`${ind}${q}react${q}${comma}`);
  out.push(`]${semi}`);
  out.push(`const greet = ${arrow} => ${q}Hello, ${q} + user.name${semi}`);
  out.push("");
  const call = `notifySubscribersWithAVeryLongName(${q}ada@example.com${q}, {${bs}role: ${q}admin${q}${bs}});`;
  if (call.length > c.printWidth) {
    out.push(`notifySubscribersWithAVeryLongName(`);
    out.push(`${ind}${q}ada@example.com${q},`);
    out.push(`${ind}{${bs}role: ${q}admin${q}${bs}}${comma}`);
    out.push(`)${semi}  // wrapped: over printWidth ${c.printWidth}`);
  } else {
    out.push(`${call}  // fits within printWidth ${c.printWidth}`);
  }
  return out.join("\n");
}

function PrettierTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("prettier-config-generator", isPro);
  const seo = getToolSeo("prettier-config-generator");

  const [cfg, setCfg] = useState<Cfg>({
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    endOfLine: "lf",
  });
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<Cfg>) => setCfg((p) => ({ ...p, ...patch }));

  const output = useMemo(() => JSON.stringify(cfg, null, 2), [cfg]);
  const sample = useMemo(() => formatSample(cfg), [cfg]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success(".prettierrc copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "application/json" }), ".prettierrc");
    trial.recordUse();
    toast.success(".prettierrc downloaded");
  };

  return (
    <ToolPageShell toolId="prettier-config-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Prettier Config Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_500px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Slider label="printWidth" value={cfg.printWidth} min={40} max={160} onChange={(v) => update({ printWidth: v })} />
            <Slider label="tabWidth" value={cfg.tabWidth} min={1} max={8} onChange={(v) => update({ tabWidth: v })} />
            <Sel label="trailingComma" value={cfg.trailingComma} options={["all", "es5", "none"]} onChange={(v) => update({ trailingComma: v })} />
            <Sel label="arrowParens" value={cfg.arrowParens} options={["always", "avoid"]} onChange={(v) => update({ arrowParens: v })} />
            <Sel label="endOfLine" value={cfg.endOfLine} options={["lf", "crlf", "auto"]} onChange={(v) => update({ endOfLine: v })} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Toggle label="useTabs" desc="Indent with tabs instead of spaces" checked={cfg.useTabs} onChange={(v) => update({ useTabs: v })} />
            <Toggle label="semi" desc="Print semicolons at statement ends" checked={cfg.semi} onChange={(v) => update({ semi: v })} />
            <Toggle label="singleQuote" desc="Use single quotes instead of double" checked={cfg.singleQuote} onChange={(v) => update({ singleQuote: v })} />
            <Toggle label="bracketSpacing" desc="Spaces inside object braces: { a }" checked={cfg.bracketSpacing} onChange={(v) => update({ bracketSpacing: v })} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-1 text-sm font-bold">Live sample - watch the code change</p>
            <p className="mb-3 text-xs text-muted-foreground">
              A demonstrator applies your settings to a real snippet, including printWidth wrapping of the long call below.
            </p>
            <pre className="overflow-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
              {sample}
            </pre>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">.prettierrc - live preview</p>
            <pre className="overflow-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
              {output}
            </pre>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton disabled={!trial.canUse} onClick={() => void doCopy()}>
                {copied ? <Check className="h-4 w-4 text-green-200" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </ActionButton>
              <ActionButton disabled={!trial.canUse} onClick={doDownload}>
                <Download className="h-4 w-4" /> Download
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Everything runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
