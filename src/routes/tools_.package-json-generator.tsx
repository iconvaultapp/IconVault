// /tools/package-json-generator - Build a valid package.json visually:
// project type (CLI/library/app), name, version, scripts add/remove,
// dependencies add/remove with versions, engines. Live JSON preview,
// copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/package-json-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/package-json-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/tools_/package-json-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/package-json-generator";
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
  component: PackageJsonGeneratorTool,
});

type ProjectType = "app" | "library" | "cli";

interface NamedEntry {
  id: number;
  name: string;
  value: string;
}

let entrySeq = 1;

const blankEntry = (name = "", value = ""): NamedEntry => ({ id: entrySeq++, name, value });

const TYPE_PRESETS: Record<ProjectType, { scripts: [string, string][]; main: string; bin: boolean }> = {
  app: {
    scripts: [["dev", "vite"], ["build", "vite build"], ["preview", "vite preview"]],
    main: "index.js",
    bin: false,
  },
  library: {
    scripts: [["build", "tsc -p tsconfig.json"], ["test", "vitest run"], ["prepublishOnly", "npm run build"]],
    main: "dist/index.js",
    bin: false,
  },
  cli: {
    scripts: [["build", "tsc -p tsconfig.json"], ["start", "node dist/cli.js"]],
    main: "dist/cli.js",
    bin: true,
  },
};

const nameOk = (n: string) => n.trim().length > 0;

function buildPackage(o: {
  type: ProjectType; name: string; version: string; description: string; author: string;
  license: string; main: string; module: string; types: string; binName: string; binOn: boolean;
  scripts: NamedEntry[]; deps: NamedEntry[]; devDeps: NamedEntry[]; engines: NamedEntry[];
  isPrivate: boolean; sideEffects: boolean;
}): Record<string, unknown> {
  const pkg: Record<string, unknown> = {};
  pkg["name"] = o.name.trim() || "my-package";
  pkg["version"] = o.version.trim() || "1.0.0";
  if (o.isPrivate) pkg["private"] = true;
  if (o.description.trim()) pkg["description"] = o.description.trim();
  if (o.main.trim()) pkg["main"] = o.main.trim();
  if (o.module.trim()) pkg["module"] = o.module.trim();
  if (o.types.trim()) pkg["types"] = o.types.trim();
  if (o.binOn && o.binName.trim()) {
    const bin: Record<string, string> = {};
    bin[o.binName.trim()] = o.main.trim() || "dist/cli.js";
    pkg["bin"] = bin;
  }
  const scripts: Record<string, string> = {};
  for (const s of o.scripts) if (nameOk(s.name) && s.value.trim()) scripts[s.name.trim()] = s.value.trim();
  if (Object.keys(scripts).length) pkg["scripts"] = scripts;
  const deps: Record<string, string> = {};
  for (const d of o.deps) if (nameOk(d.name)) deps[d.name.trim()] = d.value.trim() || "*";
  if (Object.keys(deps).length) pkg["dependencies"] = deps;
  const devDeps: Record<string, string> = {};
  for (const d of o.devDeps) if (nameOk(d.name)) devDeps[d.name.trim()] = d.value.trim() || "*";
  if (Object.keys(devDeps).length) pkg["devDependencies"] = devDeps;
  const engines: Record<string, string> = {};
  for (const e of o.engines) if (nameOk(e.name) && e.value.trim()) engines[e.name.trim()] = e.value.trim();
  if (Object.keys(engines).length) pkg["engines"] = engines;
  if (!o.sideEffects) pkg["sideEffects"] = false;
  if (o.author.trim()) pkg["author"] = o.author.trim();
  pkg["license"] = o.license.trim() || "MIT";
  return pkg;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function EntryList({ title, entries, setEntries, namePlaceholder, valuePlaceholder, addLabel }: {
  title: string;
  entries: NamedEntry[];
  setEntries: React.Dispatch<React.SetStateAction<NamedEntry[]>>;
  namePlaceholder: string;
  valuePlaceholder: string;
  addLabel: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-[13px] font-medium text-foreground/80">{title} ({entries.length})</Label>
        <button
          type="button"
          onClick={() => setEntries((p) => [...p, blankEntry()])}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      </div>
      <div className="max-h-44 space-y-2 overflow-y-auto">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-2">
            <Input
              value={e.name}
              onChange={(e2) => setEntries((p) => p.map((x) => (x.id === e.id ? { ...x, name: e2.target.value } : x)))}
              placeholder={namePlaceholder}
              className="font-mono text-xs"
            />
            <Input
              value={e.value}
              onChange={(e2) => setEntries((p) => p.map((x) => (x.id === e.id ? { ...x, value: e2.target.value } : x)))}
              placeholder={valuePlaceholder}
              className="font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setEntries((p) => p.filter((x) => x.id !== e.id))}
              aria-label={`Remove ${title} entry`}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted-foreground">None added.</p>}
      </div>
    </div>
  );
}

function PackageJsonGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("package-json-generator", isPro);
  const seo = toolSeo;

  const [type, setType] = useState<ProjectType>("app");
  const [name, setName] = useState("my-app");
  const [version, setVersion] = useState("1.0.0");
  const [description, setDescription] = useState("");
  const [author, setAuthor] = useState("");
  const [license, setLicense] = useState("MIT");
  const [main, setMain] = useState(TYPE_PRESETS.app.main);
  const [module, setModule] = useState("");
  const [types, setTypes] = useState("");
  const [binOn, setBinOn] = useState(false);
  const [binName, setBinName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [sideEffects, setSideEffects] = useState(true);
  const [scripts, setScripts] = useState<NamedEntry[]>(() => TYPE_PRESETS.app.scripts.map(([n, v]) => blankEntry(n, v)));
  const [deps, setDeps] = useState<NamedEntry[]>([blankEntry("react", "^19.0.0")]);
  const [devDeps, setDevDeps] = useState<NamedEntry[]>([blankEntry("vite", "^6.0.0"), blankEntry("typescript", "~5.7.0")]);
  const [engines, setEngines] = useState<NamedEntry[]>([blankEntry("node", ">=20")]);

  const pickType = (t: ProjectType) => {
    setType(t);
    const p = TYPE_PRESETS[t];
    setScripts(p.scripts.map(([n, v]) => blankEntry(n, v)));
    setMain(p.main);
    setBinOn(p.bin);
    if (t === "cli" && !binName) setBinName(name.trim() || "my-cli");
    setIsPrivate(t === "app");
  };

  const json = useMemo(
    () => JSON.stringify(buildPackage({ type, name, version, description, author, license, main, module, types, binName, binOn, scripts, deps, devDeps, engines, isPrivate, sideEffects }), null, 2) + "\n",
    [type, name, version, description, author, license, main, module, types, binName, binOn, scripts, deps, devDeps, engines, isPrivate, sideEffects],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    const ok = await copyToClipboard(json);
    if (ok) {
      trial.recordUse();
      toast.success("package.json copied.");
    } else toast.error("Could not copy to clipboard.");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([json], { type: "application/json" }), "package.json");
    trial.recordUse();
    toast.success("package.json downloaded.");
  };

  return (
    <ToolPageShell toolId="package-json-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="package.json Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Project type</Label>
              <Select value={type} onValueChange={(v) => pickType(v as ProjectType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="app">App (private, bundler scripts)</SelectItem>
                  <SelectItem value="library">Library (publishable)</SelectItem>
                  <SelectItem value="cli">CLI (bin entry)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-xs" placeholder="my-package" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Version</Label>
                <Input value={version} onChange={(e) => setVersion(e.target.value)} className="font-mono text-xs" placeholder="1.0.0" />
              </div>
              <div className="col-span-2">
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this package does" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Author</Label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your Name" />
              </div>
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">License</Label>
                <Select value={license} onValueChange={setLicense}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["MIT", "Apache-2.0", "GPL-3.0-only", "BSD-3-Clause", "ISC", "UNLICENSED"].map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">main</Label>
                <Input value={main} onChange={(e) => setMain(e.target.value)} className="font-mono text-xs" placeholder="index.js" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">module</Label>
                <Input value={module} onChange={(e) => setModule(e.target.value)} className="font-mono text-xs" placeholder="dist/index.mjs" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs text-muted-foreground">types</Label>
                <Input value={types} onChange={(e) => setTypes(e.target.value)} className="font-mono text-xs" placeholder="dist/index.d.ts" />
              </div>
            </div>
            <div className="divide-y divide-border/60 rounded-xl border border-border px-4">
              <div className="flex items-center justify-between gap-3 py-1.5">
                <div>
                  <p className="text-[13px] font-medium">Private package</p>
                  <p className="text-xs text-muted-foreground">Blocks accidental npm publish</p>
                </div>
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <div>
                  <p className="text-[13px] font-medium">CLI bin entry</p>
                  <p className="text-xs text-muted-foreground">Adds a bin command for the package</p>
                </div>
                <Switch checked={binOn} onCheckedChange={setBinOn} />
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5">
                <div>
                  <p className="text-[13px] font-medium">Has side effects</p>
                  <p className="text-xs text-muted-foreground">Off writes "sideEffects": false for tree-shaking</p>
                </div>
                <Switch checked={sideEffects} onCheckedChange={setSideEffects} />
              </div>
            </div>
            {binOn && (
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Bin command name</Label>
                <Input value={binName} onChange={(e) => setBinName(e.target.value)} className="font-mono text-xs" placeholder="my-cli" />
              </div>
            )}
          </div>

          <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
            <EntryList title="Scripts" entries={scripts} setEntries={setScripts} namePlaceholder="build" valuePlaceholder="tsc" addLabel="Add script" />
            <EntryList title="Dependencies" entries={deps} setEntries={setDeps} namePlaceholder="lodash" valuePlaceholder="^4.17.0" addLabel="Add dep" />
            <EntryList title="Dev dependencies" entries={devDeps} setEntries={setDevDeps} namePlaceholder="vitest" valuePlaceholder="^2.0.0" addLabel="Add dev dep" />
            <EntryList title="Engines" entries={engines} setEntries={setEngines} namePlaceholder="node" valuePlaceholder=">=20" addLabel="Add engine" />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <ActionButton busy={false} disabled={!trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download package.json
            </ActionButton>
            {!isPro && (
              <p className="mt-2 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - runs fully in your browser, nothing is uploaded.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Live preview: package.json</p>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                !trial.canUse && "cursor-not-allowed opacity-50",
              )}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="max-h-[800px] overflow-auto whitespace-pre rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
            {json}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Output is generated with <span className="font-mono">JSON.stringify</span>, so it is always valid JSON. Empty fields are omitted automatically.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
