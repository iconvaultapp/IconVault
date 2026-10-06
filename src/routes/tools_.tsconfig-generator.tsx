// /tools/tsconfig-generator - Visual tsconfig.json builder with project
// presets (Node, React, Next.js, Deno, Library), live JSON preview, copy +
// download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/tsconfig-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/tsconfig-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/tsconfig-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/tsconfig-generator";
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
  component: TsconfigTool,
});

interface Cfg {
  target: string;
  module: string;
  moduleResolution: string;
  jsx: string;
  strict: boolean;
  esModuleInterop: boolean;
  skipLibCheck: boolean;
  forceConsistentCasingInFileNames: boolean;
  allowSyntheticDefaultImports: boolean;
  resolveJsonModule: boolean;
  declaration: boolean;
  sourceMap: boolean;
  outDir: string;
  rootDir: string;
  include: string;
  exclude: string;
}

type PresetName = "node" | "react" | "next" | "deno" | "library";

const BASE: Cfg = {
  target: "ES2022",
  module: "ESNext",
  moduleResolution: "bundler",
  jsx: "none",
  strict: true,
  esModuleInterop: true,
  skipLibCheck: true,
  forceConsistentCasingInFileNames: true,
  allowSyntheticDefaultImports: false,
  resolveJsonModule: true,
  declaration: false,
  sourceMap: true,
  outDir: "dist",
  rootDir: "",
  include: "",
  exclude: "",
};

const PRESETS: Record<PresetName, { label: string; note: string; cfg: Cfg }> = {
  node: {
    label: "Node.js",
    note: "Backend services, CLIs and scripts running on modern Node.",
    cfg: { ...BASE, module: "NodeNext", moduleResolution: "nodenext", rootDir: "src", include: "src", exclude: "node_modules,dist" },
  },
  react: {
    label: "React",
    note: "Vite / webpack React apps with the new JSX transform.",
    cfg: { ...BASE, target: "ES2020", jsx: "react-jsx", rootDir: "src", include: "src", exclude: "node_modules,dist" },
  },
  next: {
    label: "Next.js",
    note: "Next.js apps. Next extends its own base config, this gives you the common overrides.",
    cfg: { ...BASE, target: "ES2017", jsx: "preserve", allowSyntheticDefaultImports: true, outDir: "", rootDir: "", include: "next-env.d.ts,**/*.ts,**/*.tsx,.next/types/**/*", exclude: "node_modules" },
  },
  deno: {
    label: "Deno",
    note: "Deno projects. Deno type-checks strictly and resolves modules natively.",
    cfg: { ...BASE, target: "ESNext", strict: true, skipLibCheck: false, allowSyntheticDefaultImports: true, outDir: "", rootDir: "", include: "", exclude: "" },
  },
  library: {
    label: "Library",
    note: "Publishable packages: declarations and source maps on, clean dist output.",
    cfg: { ...BASE, target: "ES2020", declaration: true, sourceMap: true, rootDir: "src", include: "src", exclude: "node_modules,dist,**/*.test.ts" },
  },
};

const TARGETS = ["ESNext", "ES2022", "ES2021", "ES2020", "ES2019", "ES2018", "ES2017", "ES6"];
const MODULES = ["ESNext", "ES2020", "ES2015", "CommonJS", "NodeNext", "Node16"];
const MODULE_RESOLUTIONS = ["bundler", "node", "node16", "nodenext", "classic"];
const JSX_MODES = ["none", "react-jsx", "react", "react-native", "preserve"];

const TOGGLES: { key: keyof Cfg; desc: string }[] = [
  { key: "strict", desc: "Enable all strict type-checking options" },
  { key: "esModuleInterop", desc: "Emit helpers for default imports of CommonJS modules" },
  { key: "skipLibCheck", desc: "Skip type checking of .d.ts files (faster builds)" },
  { key: "forceConsistentCasingInFileNames", desc: "Error on mismatched import casing" },
  { key: "allowSyntheticDefaultImports", desc: "Allow default imports from modules without a default export" },
  { key: "resolveJsonModule", desc: "Allow importing .json files directly" },
  { key: "declaration", desc: "Emit .d.ts files for published packages" },
  { key: "sourceMap", desc: "Emit .js.map files for debugging" },
];

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

function Sel({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[13px] font-bold">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Txt({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[13px] font-bold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
      />
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

function TsconfigTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("tsconfig-generator", isPro);
  const seo = toolSeo;

  const [preset, setPreset] = useState<PresetName>("node");
  const [cfg, setCfg] = useState<Cfg>(PRESETS.node.cfg);
  const [copied, setCopied] = useState(false);

  const update = (patch: Partial<Cfg>) => setCfg((p) => ({ ...p, ...patch }));

  const applyPreset = (p: PresetName) => {
    setPreset(p);
    setCfg(PRESETS[p].cfg);
    toast.success(`${PRESETS[p].label} preset applied`);
  };

  const output = useMemo(() => {
    const co: Record<string, string | boolean> = {
      target: cfg.target,
      module: cfg.module,
      moduleResolution: cfg.moduleResolution,
    };
    if (cfg.jsx !== "none") co["jsx"] = cfg.jsx;
    co["strict"] = cfg.strict;
    co["esModuleInterop"] = cfg.esModuleInterop;
    co["skipLibCheck"] = cfg.skipLibCheck;
    co["forceConsistentCasingInFileNames"] = cfg.forceConsistentCasingInFileNames;
    co["allowSyntheticDefaultImports"] = cfg.allowSyntheticDefaultImports;
    co["resolveJsonModule"] = cfg.resolveJsonModule;
    co["declaration"] = cfg.declaration;
    co["sourceMap"] = cfg.sourceMap;
    if (cfg.outDir.trim()) co["outDir"] = cfg.outDir.trim();
    if (cfg.rootDir.trim()) co["rootDir"] = cfg.rootDir.trim();
    const doc: Record<string, unknown> = { compilerOptions: co };
    const inc = cfg.include.split(",").map((s) => s.trim()).filter(Boolean);
    const exc = cfg.exclude.split(",").map((s) => s.trim()).filter(Boolean);
    if (inc.length) doc["include"] = inc;
    if (exc.length) doc["exclude"] = exc;
    return JSON.stringify(doc, null, 2);
  }, [cfg]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("tsconfig.json copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "application/json" }), "tsconfig.json");
    trial.recordUse();
    toast.success("tsconfig.json downloaded");
  };

  return (
    <ToolPageShell toolId="tsconfig-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="tsconfig Generator" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Start from a preset:</span>
        {(Object.keys(PRESETS) as PresetName[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => applyPreset(p)}
            title={PRESETS[p].note}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              preset === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:text-primary",
            )}
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>
      <p className="mb-6 -mt-4 text-xs text-muted-foreground">{PRESETS[preset].note}</p>

      <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Sel label="target" value={cfg.target} options={TARGETS} onChange={(v) => update({ target: v })} />
            <Sel label="module" value={cfg.module} options={MODULES} onChange={(v) => update({ module: v })} />
            <Sel label="moduleResolution" value={cfg.moduleResolution} options={MODULE_RESOLUTIONS} onChange={(v) => update({ moduleResolution: v })} />
            <Sel label="jsx" value={cfg.jsx} options={JSX_MODES} onChange={(v) => update({ jsx: v })} />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {TOGGLES.map((t) => (
              <Toggle
                key={t.key}
                label={t.key}
                desc={t.desc}
                checked={cfg[t.key] as boolean}
                onChange={(v) => update({ [t.key]: v } as Partial<Cfg>)}
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Txt label="outDir" value={cfg.outDir} onChange={(v) => update({ outDir: v })} placeholder="dist" />
            <Txt label="rootDir" value={cfg.rootDir} onChange={(v) => update({ rootDir: v })} placeholder="src" />
            <Txt label="include" value={cfg.include} onChange={(v) => update({ include: v })} placeholder="src (comma separated)" />
            <Txt label="exclude" value={cfg.exclude} onChange={(v) => update({ exclude: v })} placeholder="node_modules,dist" />
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">jsx: none</span> means the key is left out of the file, which is what plain Node projects want.
          </p>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">tsconfig.json - live preview</p>
            <pre className="max-h-[520px] overflow-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
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
