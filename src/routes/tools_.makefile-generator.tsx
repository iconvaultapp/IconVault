// /tools/makefile-generator - Build a real Makefile visually: language
// starter templates, add/remove targets (name, deps, commands), variables.
// Live preview with real tab indentation, copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/makefile-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/makefile-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/tools_/makefile-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/makefile-generator";
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
  component: MakefileGeneratorTool,
});

interface Target {
  id: number;
  name: string;
  deps: string;
  commands: string;
  phony: boolean;
}

interface Var {
  id: number;
  name: string;
  value: string;
}

let targetSeq = 1;
let varSeq = 1;

const blankTarget = (name = "", deps = "", commands = "", phony = true): Target => ({
  id: targetSeq++, name, deps, commands, phony,
});

const TEMPLATES: Record<string, { vars: [string, string][]; targets: Target[] }> = {
  c: {
    vars: [["CC", "gcc"], ["CFLAGS", "-Wall -Wextra -O2"], ["SRC", "main.c"], ["BIN", "app"]],
    targets: [
      blankTarget("all", "$(BIN)", "", true),
      blankTarget("$(BIN)", "$(SRC)", "$(CC) $(CFLAGS) -o $(BIN) $(SRC)", false),
      blankTarget("clean", "", "rm -f $(BIN) *.o", true),
    ],
  },
  cpp: {
    vars: [["CXX", "g++"], ["CXXFLAGS", "-std=c++20 -Wall -Wextra -O2"], ["SRC", "$(wildcard src/*.cpp)"], ["BIN", "app"]],
    targets: [
      blankTarget("all", "$(BIN)", "", true),
      blankTarget("$(BIN)", "$(SRC)", "$(CXX) $(CXXFLAGS) -o $(BIN) $(SRC)", false),
      blankTarget("clean", "", "rm -f $(BIN) *.o", true),
    ],
  },
  go: {
    vars: [["BIN", "app"], ["SRC", "./..."]],
    targets: [
      blankTarget("build", "", "go build -o $(BIN) .", true),
      blankTarget("test", "", "go test $(SRC)", true),
      blankTarget("lint", "", "go vet $(SRC)", true),
      blankTarget("clean", "", "rm -f $(BIN)", true),
    ],
  },
  rust: {
    vars: [],
    targets: [
      blankTarget("build", "", "cargo build", true),
      blankTarget("release", "", "cargo build --release", true),
      blankTarget("test", "", "cargo test", true),
      blankTarget("clean", "", "cargo clean", true),
    ],
  },
  python: {
    vars: [["PY", "python3"], ["VENV", ".venv"]],
    targets: [
      blankTarget("install", "", "pip install -r requirements.txt", true),
      blankTarget("venv", "", "$(PY) -m venv $(VENV)", true),
      blankTarget("test", "", "pytest", true),
      blankTarget("lint", "", "ruff check .", true),
      blankTarget("clean", "", "find . -type d -name __pycache__ -exec rm -rf {} +", true),
    ],
  },
  node: {
    vars: [["PM", "npm"]],
    targets: [
      blankTarget("install", "", "$(PM) install", true),
      blankTarget("dev", "", "$(PM) run dev", true),
      blankTarget("build", "", "$(PM) run build", true),
      blankTarget("test", "", "$(PM) test", true),
      blankTarget("clean", "", "rm -rf node_modules dist", true),
    ],
  },
  docker: {
    vars: [["IMAGE", "myapp"], ["TAG", "latest"]],
    targets: [
      blankTarget("build", "", "docker build -t $(IMAGE):$(TAG) .", true),
      blankTarget("run", "build", "docker run --rm -p 8080:8080 $(IMAGE):$(TAG)", true),
      blankTarget("push", "build", "docker push $(IMAGE):$(TAG)", true),
    ],
  },
  latex: {
    vars: [["DOC", "main"]],
    targets: [
      blankTarget("all", "$(DOC).pdf", "", true),
      blankTarget("$(DOC).pdf", "$(DOC).tex", "pdflatex $(DOC).tex", false),
      blankTarget("clean", "", "rm -f *.aux *.log *.out *.toc", true),
    ],
  },
};

const varNameOk = (n: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(n.trim());

function buildMakefile(vars: Var[], targets: Target[]): string {
  const L: string[] = [];
  L.push("# Generated by IconVault Makefile Generator");
  L.push("");
  const cleanVars = vars.filter((v) => varNameOk(v.name));
  for (const v of cleanVars) L.push(`${v.name.trim()} = ${v.value}`);
  if (cleanVars.length) L.push("");

  const phonies = targets.filter((t) => t.phony && t.name.trim()).map((t) => t.name.trim());
  if (phonies.length) {
    L.push(`.PHONY: ${phonies.join(" ")}`);
    L.push("");
  }

  for (const t of targets) {
    const name = t.name.trim();
    if (!name) continue;
    const deps = t.deps.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).join(" ");
    L.push(`${name}:${deps ? ` ${deps}` : ""}`);
    const cmds = t.commands.split("\n").map((s) => s.trimEnd()).filter((s) => s.trim());
    if (cmds.length === 0) cmds.push("@echo Done");
    for (const c of cmds) L.push(`\t${c}`);
    L.push("");
  }
  return L.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function MakefileGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("makefile-generator", isPro);
  const seo = toolSeo;

  const loadTemplate = (key: string): { vars: Var[]; targets: Target[] } => {
    const t = TEMPLATES[key] ?? TEMPLATES["c"]!;
    return {
      vars: t.vars.map(([name, value]) => ({ id: varSeq++, name, value })),
      targets: t.targets.map((x) => ({ ...x, id: targetSeq++ })),
    };
  };

  const [tpl, setTpl] = useState("c");
  const [vars, setVars] = useState<Var[]>(() => loadTemplate("c").vars);
  const [targets, setTargets] = useState<Target[]>(() => loadTemplate("c").targets);

  const pickTemplate = (key: string) => {
    setTpl(key);
    const t = loadTemplate(key);
    setVars(t.vars);
    setTargets(t.targets);
  };

  const out = useMemo(() => buildMakefile(vars, targets), [vars, targets]);

  const copy = async () => {
    if (!trial.canUse) return;
    const ok = await copyToClipboard(out);
    if (ok) {
      trial.recordUse();
      toast.success("Makefile copied.");
    } else toast.error("Could not copy to clipboard.");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([out], { type: "text/plain" }), "Makefile");
    trial.recordUse();
    toast.success("Makefile downloaded.");
  };

  return (
    <ToolPageShell toolId="makefile-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Makefile Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Starter template</Label>
            <Select value={tpl} onValueChange={pickTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="c">C</SelectItem>
                <SelectItem value="cpp">C++</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="node">Node.js</SelectItem>
                <SelectItem value="docker">Docker</SelectItem>
                <SelectItem value="latex">LaTeX</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Switching templates replaces your targets and variables.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-[13px] font-medium text-foreground/80">Variables</Label>
              <button
                type="button"
                onClick={() => setVars((p) => [...p, { id: varSeq++, name: "", value: "" }])}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {vars.map((v) => (
                <div key={v.id} className="flex items-center gap-2">
                  <Input value={v.name} onChange={(e) => setVars((p) => p.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)))} placeholder="NAME" className="font-mono text-xs" />
                  <span className="font-mono text-xs text-muted-foreground">=</span>
                  <Input value={v.value} onChange={(e) => setVars((p) => p.map((x) => (x.id === v.id ? { ...x, value: e.target.value } : x)))} placeholder="value" className="font-mono text-xs" />
                  <button
                    type="button"
                    onClick={() => setVars((p) => p.filter((x) => x.id !== v.id))}
                    aria-label="Remove variable"
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {vars.length === 0 && <p className="text-xs text-muted-foreground">No variables.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-[13px] font-medium text-foreground/80">Targets ({targets.length})</Label>
              <button
                type="button"
                onClick={() => setTargets((p) => [...p, blankTarget()])}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add target
              </button>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {targets.map((t) => (
                <div key={t.id} className="space-y-2 rounded-xl border border-border/70 p-3">
                  <div className="flex items-center gap-2">
                    <Input value={t.name} onChange={(e) => setTargets((p) => p.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))} placeholder="target-name" className="font-mono text-xs font-bold" />
                    <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title="List in .PHONY (not a file target)">
                      <input type="checkbox" checked={t.phony} onChange={(e) => setTargets((p) => p.map((x) => (x.id === t.id ? { ...x, phony: e.target.checked } : x)))} className="accent-current" />
                      phony
                    </label>
                    <button
                      type="button"
                      onClick={() => setTargets((p) => p.filter((x) => x.id !== t.id))}
                      aria-label="Remove target"
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input value={t.deps} onChange={(e) => setTargets((p) => p.map((x) => (x.id === t.id ? { ...x, deps: e.target.value } : x)))} placeholder="Dependencies (comma separated)" className="font-mono text-xs" />
                  <Textarea
                    value={t.commands}
                    onChange={(e) => setTargets((p) => p.map((x) => (x.id === t.id ? { ...x, commands: e.target.value } : x)))}
                    placeholder="One command per line"
                    rows={2}
                    className="font-mono text-xs"
                  />
                </div>
              ))}
              {targets.length === 0 && <p className="text-xs text-muted-foreground">Add at least one target.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <ActionButton busy={false} disabled={!trial.canUse || targets.length === 0} onClick={download}>
              <Download className="h-4 w-4" /> Download Makefile
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
            <p className="text-[13px] font-medium text-foreground/80">Live preview: Makefile</p>
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
          <pre className="max-h-[760px] overflow-auto whitespace-pre rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
            {out}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Recipe lines use real tab characters, which make requires. Phony targets are declared in <span className="font-mono">.PHONY</span> so they run even when a file with the same name exists.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
