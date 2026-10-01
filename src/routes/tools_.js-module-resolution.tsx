// /tools/js-module-resolution - Step through the CJS vs ESM resolution
// algorithm against a fake project tree, including node_modules traversal.

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronRight, Copy, FileCode, Folder, Play, RotateCcw, StepForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-module-resolution")({
  head: () => {
    const seo = getToolSeoMeta("js-module-resolution");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ModuleResolutionTool,
});

type Mode = "cjs" | "esm";

type Step = { text: string; kind: "lookup" | "hit" | "miss" | "done" | "error"; node?: string };

type FileEntry = { kind: "file"; content?: string };
type DirEntry = { kind: "dir"; children: Record<string, FileEntry | DirEntry> };
type Node = FileEntry | DirEntry;

const PKG_ROOT = JSON.stringify({ name: "my-app", type: "module", main: "src/index.js" }, null, 2);
const PKG_LODASH = JSON.stringify({ name: "lodash", version: "4.17.21", main: "lodash.js" }, null, 2);
const PKG_SCOPED = JSON.stringify({
  name: "@scope/pkg", version: "2.0.0",
  exports: { ".": "./dist/main.js", "./feature": "./dist/feature.js" },
}, null, 2);
const PKG_NESTED = JSON.stringify({ name: "nested-dep", version: "1.0.0", main: "index.js" }, null, 2);

const TREE: DirEntry = {
  kind: "dir",
  children: {
    "project": {
      kind: "dir",
      children: {
        "package.json": { kind: "file", content: PKG_ROOT },
        "src": {
          kind: "dir",
          children: {
            "app.js": { kind: "file" },
            "index.js": { kind: "file" },
            "lib": { kind: "dir", children: { "util.js": { kind: "file" }, "index.js": { kind: "file" } } },
          },
        },
        "node_modules": {
          kind: "dir",
          children: {
            "lodash": {
              kind: "dir",
              children: {
                "package.json": { kind: "file", content: PKG_LODASH },
                "lodash.js": { kind: "file" },
                "fp.js": { kind: "file" },
              },
            },
            "@scope": {
              kind: "dir",
              children: {
                "pkg": {
                  kind: "dir",
                  children: {
                    "package.json": { kind: "file", content: PKG_SCOPED },
                    "dist": { kind: "dir", children: { "main.js": { kind: "file" }, "feature.js": { kind: "file" } } },
                  },
                },
              },
            },
            "dep": {
              kind: "dir",
              children: {
                "package.json": { kind: "file", content: JSON.stringify({ name: "dep", main: "index.js" }) },
                "index.js": { kind: "file" },
                "node_modules": {
                  kind: "dir",
                  children: {
                    "nested-dep": {
                      kind: "dir",
                      children: {
                        "package.json": { kind: "file", content: PKG_NESTED },
                        "index.js": { kind: "file" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

function getNode(path: string): Node | null {
  const parts = path.split("/").filter(Boolean);
  let cur: Node = TREE;
  for (const p of parts) {
    if (cur.kind !== "dir") return null;
    const next: Node | undefined = cur.children[p];
    if (!next) return null;
    cur = next;
  }
  return cur;
}

function parentDir(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "/" : path.slice(0, i);
}

function nodeModulesDirs(fromDir: string): string[] {
  const dirs: string[] = [];
  let dir = fromDir;
  while (true) {
    dirs.push(`${dir}/node_modules`);
    if (dir === "/" || dir === "") break;
    dir = parentDir(dir);
  }
  return dirs;
}

function readMain(pkgDir: string): string | null {
  const pkg = getNode(`${pkgDir}/package.json`);
  if (pkg?.kind === "file" && pkg.content) {
    try {
      const j = JSON.parse(pkg.content) as { main?: string };
      return j.main ?? null;
    } catch { return null; }
  }
  return null;
}

function readExports(pkgDir: string, subpath: string): string | null {
  const pkg = getNode(`${pkgDir}/package.json`);
  if (pkg?.kind === "file" && pkg.content) {
    try {
      const j = JSON.parse(pkg.content) as { exports?: Record<string, string> };
      if (j.exports && typeof j.exports === "object") {
        const key = subpath === "" ? "." : `./${subpath}`;
        return j.exports[key] ?? null;
      }
    } catch { return null; }
  }
  return null;
}

function resolve(spec: string, from: string, mode: Mode): Step[] {
  const steps: Step[] = [];
  const fromDir = parentDir(from);
  const cjs = mode === "cjs";
  steps.push({ text: `Resolving "${spec}" from ${from} (${cjs ? "CommonJS" : "ESM"})`, kind: "lookup" });

  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) {
    const base = spec.startsWith("/") ? spec : `${fromDir}/${spec}`.replace(/\/+/g, "/");
    const norm = base.split("/").reduce<string[]>((acc, p) => {
      if (p === "..") acc.pop(); else if (p !== ".") acc.push(p);
      return acc;
    }, []).join("/") || "/";
    steps.push({ text: `Relative specifier: resolve against ${fromDir} -> ${norm}`, kind: "lookup", node: norm });
    const node = getNode(norm);
    if (node?.kind === "file") {
      steps.push({ text: `Found file ${norm}`, kind: "hit", node: norm });
      steps.push({ text: `RESOLVED -> ${norm}`, kind: "done", node: norm });
      return steps;
    }
    steps.push({ text: `${norm} is not a file`, kind: "miss" });
    const exts = cjs ? [".js", ".json", ".node"] : [".js", ".mjs", ".cjs"];
    for (const ext of exts) {
      const cand = `${norm}${ext}`;
      steps.push({ text: cjs ? `Try ${cand}` : `Try ${cand} (ESM: extension probing is NOT standard, bundlers add it)`, kind: "lookup", node: cand });
      if (getNode(cand)?.kind === "file") {
        steps.push({ text: `RESOLVED -> ${cand}`, kind: "done", node: cand });
        return steps;
      }
      steps.push({ text: `Not found`, kind: "miss" });
    }
    if (!cjs) {
      steps.push({ text: "ESM requires the full filename with extension. Add .js to the import.", kind: "error" });
      return steps;
    }
    const dirNode = getNode(norm);
    if (dirNode?.kind === "dir") {
      const main = readMain(norm) ?? "index.js";
      steps.push({ text: `Directory: read package.json main -> "${main}"`, kind: "lookup", node: `${norm}/package.json` });
      const target = `${norm}/${main}`;
      if (getNode(target)?.kind === "file") {
        steps.push({ text: `RESOLVED -> ${target}`, kind: "done", node: target });
        return steps;
      }
      steps.push({ text: `${target} missing, try ${norm}/index.js`, kind: "lookup" });
      if (getNode(`${norm}/index.js`)?.kind === "file") {
        steps.push({ text: `RESOLVED -> ${norm}/index.js`, kind: "done", node: `${norm}/index.js` });
        return steps;
      }
    }
    steps.push({ text: `Cannot find module "${spec}"`, kind: "error" });
    return steps;
  }

  // Bare specifier
  const [pkgName, ...rest] = spec.split("/");
  const pkgId = spec.startsWith("@") ? `${pkgName}/${rest.shift() ?? ""}` : pkgName;
  const subpath = spec.startsWith("@") ? rest.join("/") : rest.join("/");
  steps.push({ text: `Bare specifier: package "${pkgId}"${subpath ? `, subpath "${subpath}"` : ""}`, kind: "lookup" });
  for (const nm of nodeModulesDirs(fromDir)) {
    const pkgDir = `${nm}/${pkgId}`;
    steps.push({ text: `Look in ${pkgDir}`, kind: "lookup", node: nm });
    if (getNode(pkgDir)?.kind === "dir") {
      steps.push({ text: `Found package dir ${pkgDir}`, kind: "hit", node: pkgDir });
      const exp = readExports(pkgDir, subpath);
      if (exp !== null) {
        steps.push({ text: `package.json "exports" maps "${subpath || "."}" -> "${exp}"`, kind: "hit", node: `${pkgDir}/package.json` });
        const target = `${pkgDir}/${exp.replace(/^\.\//, "")}`;
        steps.push({ text: `RESOLVED -> ${target}`, kind: "done", node: target });
        return steps;
      }
      if (subpath) {
        const target = `${pkgDir}/${subpath}`;
        steps.push({ text: `No exports map: try ${target}`, kind: "lookup", node: target });
        const exts = cjs ? ["", ".js", ".json"] : [".js", ".mjs"];
        for (const ext of exts) {
          if (getNode(`${target}${ext}`)?.kind === "file") {
            steps.push({ text: `RESOLVED -> ${target}${ext}`, kind: "done", node: `${target}${ext}` });
            return steps;
          }
        }
        steps.push({ text: `Subpath not found in ${pkgId}`, kind: "miss" });
      } else {
        const main = readMain(pkgDir) ?? "index.js";
        steps.push({ text: `package.json "main" -> "${main}"`, kind: "lookup", node: `${pkgDir}/package.json` });
        const target = `${pkgDir}/${main}`;
        if (getNode(target)?.kind === "file") {
          steps.push({ text: `RESOLVED -> ${target}`, kind: "done", node: target });
          return steps;
        }
        steps.push({ text: `${target} missing`, kind: "miss" });
      }
      steps.push({ text: `Package found but entry not resolvable`, kind: "error" });
      return steps;
    }
    steps.push({ text: `Not here, walk up`, kind: "miss" });
  }
  steps.push({ text: `Cannot find module "${spec}"`, kind: "error" });
  return steps;
}

const SCENARIOS: { label: string; spec: string; from: string }[] = [
  { label: '"./lib/util.js" (ESM)', spec: "./lib/util.js", from: "/project/src/app.js" },
  { label: '"./lib" (CJS)', spec: "./lib", from: "/project/src/app.js" },
  { label: '"./lib" (ESM)', spec: "./lib", from: "/project/src/app.js" },
  { label: '"lodash"', spec: "lodash", from: "/project/src/app.js" },
  { label: '"lodash/fp"', spec: "lodash/fp", from: "/project/src/app.js" },
  { label: '"@scope/pkg/feature"', spec: "@scope/pkg/feature", from: "/project/src/app.js" },
  { label: '"nested-dep" from dep', spec: "nested-dep", from: "/project/node_modules/dep/index.js" },
  { label: '"nested-dep" from src', spec: "nested-dep", from: "/project/src/app.js" },
];

function TreeView({ activeNode }: { activeNode?: string }) {
  const render = (node: Node, path: string, depth: number): ReactNode[] => {
    if (node.kind !== "dir") return [];
    return Object.entries(node.children).map(([name, child]) => {
      const p = `${path}/${name}`;
      const isActive = activeNode === p || (activeNode?.startsWith(p + "/") ?? false);
      const isExact = activeNode === p;
      return (
        <div key={p}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[12px]",
              isExact ? "bg-primary/15 text-primary" : isActive ? "text-foreground" : "text-muted-foreground",
            )}
            style={{ paddingLeft: depth * 14 + 6 }}
          >
            {child.kind === "dir" ? <Folder className="h-3.5 w-3.5 shrink-0" /> : <FileCode className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{name}{child.kind === "file" && (child as FileEntry).content ? " ⚙" : ""}</span>
          </div>
          {render(child, p, depth + 1)}
        </div>
      );
    });
  };
  return <div className="max-h-[420px] overflow-auto rounded-xl border border-border bg-background p-2">{render(TREE, "", 0)}</div>;
}

function ModuleResolutionTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-module-resolution", isPro);
  const seo = getToolSeo("js-module-resolution");
  const [mode, setMode] = useState<Mode>("esm");
  const [spec, setSpec] = useState("./lib/util.js");
  const [from, setFrom] = useState("/project/src/app.js");
  const [stepIdx, setStepIdx] = useState(-1);

  const steps = useMemo(() => resolve(spec.trim() || "./lib/util.js", from.trim() || "/project/src/app.js", mode), [spec, from, mode]);
  const visible = stepIdx < 0 ? [] : steps.slice(0, stepIdx + 1);
  const activeNode = stepIdx >= 0 ? steps[stepIdx]?.node : undefined;

  const runAll = useCallback(() => {
    if (!trial.canUse) return;
    setStepIdx(steps.length - 1);
    trial.recordUse();
  }, [steps.length, trial]);

  const next = useCallback(() => {
    if (!trial.canUse && stepIdx < 0) return;
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    if (stepIdx < 0) trial.recordUse();
  }, [stepIdx, steps.length, trial]);

  const reset = useCallback(() => setStepIdx(-1), []);
  const pickScenario = useCallback((s: { spec: string; from: string }) => {
    setSpec(s.spec); setFrom(s.from); setStepIdx(-1);
  }, []);

  const copyTrace = useCallback(() => {
    const text = steps.map((s, i) => `${i + 1}. [${s.kind}] ${s.text}`).join("\n");
    void navigator.clipboard.writeText(`// Resolving "${spec}" from ${from} (${mode.toUpperCase()})\n${text}`)
      .then(() => toast.success("Resolution trace copied"))
      .catch(() => toast.error("Copy failed"));
  }, [steps, spec, from, mode]);

  const kindStyle: Record<Step["kind"], string> = {
    lookup: "border-border text-muted-foreground",
    hit: "border-emerald-500/40 bg-emerald-500/5 text-foreground",
    miss: "border-border text-muted-foreground/70",
    done: "border-primary bg-primary/10 text-foreground font-semibold",
    error: "border-red-500/40 bg-red-500/5 text-red-500",
  };

  return (
    <ToolPageShell toolId="js-module-resolution" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="JS Module Resolution" left={trial.left} />
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs font-semibold text-muted-foreground">
          Import specifier
          <input value={spec} onChange={(e) => { setSpec(e.target.value); setStepIdx(-1); }} spellCheck={false}
            className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary" />
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Importing file
          <input value={from} onChange={(e) => { setFrom(e.target.value); setStepIdx(-1); }} spellCheck={false}
            className="mt-1 block w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground outline-none focus:border-primary" />
        </label>
        <div className="flex items-end gap-2">
          {(["cjs", "esm"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => { setMode(m); setStepIdx(-1); }}
              className={cn("rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button key={s.label} type="button" onClick={() => pickScenario(s)}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            {s.label}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ActionButton onClick={next} disabled={stepIdx >= steps.length - 1}>
          <StepForward className="h-4 w-4" /> {stepIdx < 0 ? "Start stepping" : `Step ${stepIdx + 2} of ${steps.length}`}
        </ActionButton>
        <button type="button" onClick={runAll} disabled={!trial.canUse}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
          <Play className="h-4 w-4" /> Run all
        </button>
        <button type="button" onClick={reset}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <button type="button" onClick={copyTrace}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
          <Copy className="h-4 w-4" /> Copy trace
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Press Start stepping to walk the {mode.toUpperCase()} resolution algorithm one lookup at a time.
            </div>
          )}
          {visible.map((s, i) => (
            <div key={i} className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-[13px]", kindStyle[s.kind])}>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-mono">{s.text}</span>
            </div>
          ))}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" /> Legend: highlighted tree nodes are the paths being probed right now.</p>
        </div>
        <TreeView {...(activeNode !== undefined ? { activeNode } : {})} />
      </div>
      <div className="mt-6 grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground md:grid-cols-2">
        <p><span className="font-bold text-foreground">CJS</span> probes extensions (.js, .json, .node), reads package.json main, and falls back to index.js for directories.</p>
        <p><span className="font-bold text-foreground">ESM</span> needs the exact filename including extension, and package.json exports maps win over main. Bare imports walk node_modules upward from the importing file.</p>
      </div>
      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free resolutions left. Runs fully in your browser.</p>
      )}
    </ToolPageShell>
  );
}
