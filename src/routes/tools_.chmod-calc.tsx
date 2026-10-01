// /tools/chmod-calc - Unix permissions playground: click the 3x3 permission
// matrix and get the octal number, symbolic string and the chmod command.
// Also parses octal or symbolic input back into the matrix.

import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/chmod-calc")({
  head: () => {
    const seo = getToolSeoMeta("chmod-calc");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ChmodCalc,
});

const CLASSES = ["owner", "group", "other"] as const;
const PERMS = [
  { key: "r", label: "Read", bit: 4 },
  { key: "w", label: "Write", bit: 2 },
  { key: "x", label: "Execute", bit: 1 },
] as const;

type Matrix = Record<(typeof CLASSES)[number], Record<"r" | "w" | "x", boolean>>;

const DEFAULT_MATRIX: Matrix = {
  owner: { r: true, w: true, x: true },
  group: { r: true, w: false, x: true },
  other: { r: true, w: false, x: true },
};

const PRESETS: { name: string; octal: string }[] = [
  { name: "755", octal: "755" },
  { name: "644", octal: "644" },
  { name: "700", octal: "700" },
  { name: "600", octal: "600" },
  { name: "777", octal: "777" },
  { name: "400", octal: "400" },
];

function matrixToOctal(m: Matrix, special: { suid: boolean; sgid: boolean; sticky: boolean }): string {
  const specialDigit = (special.suid ? 4 : 0) + (special.sgid ? 2 : 0) + (special.sticky ? 1 : 0);
  const digits = CLASSES.map((c) => (m[c].r ? 4 : 0) + (m[c].w ? 2 : 0) + (m[c].x ? 1 : 0)).join("");
  return (specialDigit > 0 ? `${specialDigit}` : "") + digits;
}

function matrixToSymbolic(m: Matrix, special: { suid: boolean; sgid: boolean; sticky: boolean }): string {
  const execChar = (cls: (typeof CLASSES)[number], bit: "x"): string => {
    const on = m[cls][bit];
    if (cls === "owner" && special.suid) return on ? "s" : "S";
    if (cls === "group" && special.sgid) return on ? "s" : "S";
    if (cls === "other" && special.sticky) return on ? "t" : "T";
    return on ? "x" : "-";
  };
  return CLASSES.map((c) => `${m[c].r ? "r" : "-"}${m[c].w ? "w" : "-"}${execChar(c, "x")}`).join("");
}

function octalToMatrix(octal: string): { matrix: Matrix; special: { suid: boolean; sgid: boolean; sticky: boolean } } | null {
  if (!/^[0-7]{3,4}$/.test(octal)) return null;
  const padded = octal.padStart(4, "0");
  const d = padded.split("").map(Number);
  const [s, o, g, t] = d as [number, number, number, number];
  const bits = (n: number) => ({ r: (n & 4) !== 0, w: (n & 2) !== 0, x: (n & 1) !== 0 });
  return {
    matrix: { owner: bits(o), group: bits(g), other: bits(t) },
    special: { suid: (s & 4) !== 0, sgid: (s & 2) !== 0, sticky: (s & 1) !== 0 },
  };
}

function symbolicToMatrix(sym: string): { matrix: Matrix; special: { suid: boolean; sgid: boolean; sticky: boolean } } | null {
  const clean = sym.trim().replace(/^[dl-]/, "");
  if (!/^[rwxstST-]{9}$/.test(clean)) return null;
  const cls = (i: number): Record<"r" | "w" | "x", boolean> => ({
    r: clean[i] === "r",
    w: clean[i + 1] === "w",
    x: ["x", "s", "t"].includes(clean[i + 2]!),
  });
  return {
    matrix: { owner: cls(0), group: cls(3), other: cls(6) },
    special: {
      suid: ["s", "S"].includes(clean[2]!),
      sgid: ["s", "S"].includes(clean[5]!),
      sticky: ["t", "T"].includes(clean[8]!),
    },
  };
}

function describe(octal: string): string {
  const map: Record<string, string> = {
    "777": "Everyone can read, write and execute. Avoid on the web.",
    "755": "Standard for scripts and directories: owner has full control, everyone else can read and execute.",
    "700": "Owner only. Good for private scripts and SSH keys directories.",
    "644": "Standard for files: owner can edit, everyone else can only read.",
    "600": "Owner read/write only. Good for private files and key files.",
    "400": "Owner read-only. Good for immutable secrets.",
  };
  return map[octal] ?? "Custom permission set.";
}

function ChmodCalc() {
  const { isPro } = usePlan();
  const trial = useToolTrial("chmod-calc", isPro);
  const seo = getToolSeo("chmod-calc");

  const [matrix, setMatrix] = useState<Matrix>(DEFAULT_MATRIX);
  const [special, setSpecial] = useState({ suid: false, sgid: false, sticky: false });
  const [octalInput, setOctalInput] = useState("");
  const [symbolicInput, setSymbolicInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const octal = useMemo(() => matrixToOctal(matrix, special), [matrix, special]);
  const symbolic = useMemo(() => matrixToSymbolic(matrix, special), [matrix, special]);
  const command = useMemo(() => `chmod ${octal} <file>`, [octal]);

  const toggle = useCallback((cls: (typeof CLASSES)[number], perm: "r" | "w" | "x") => {
    setMatrix((p) => ({ ...p, [cls]: { ...p[cls], [perm]: !p[cls][perm] } }));
  }, []);

  const applyParsed = useCallback((kind: "octal" | "symbolic") => {
    if (!trial.canUse) return;
    const raw = kind === "octal" ? octalInput : symbolicInput;
    const parsed = kind === "octal" ? octalToMatrix(raw) : symbolicToMatrix(raw);
    if (!parsed) {
      setError(kind === "octal" ? "Enter 3 or 4 octal digits, e.g. 755 or 4755." : "Enter 9 characters like rwxr-xr--.");
      return;
    }
    setMatrix(parsed.matrix);
    setSpecial(parsed.special);
    setError(null);
    trial.recordUse();
    toast.success("Permissions loaded into the matrix");
  }, [octalInput, symbolicInput, trial]);

  const reset = useCallback(() => {
    setMatrix(DEFAULT_MATRIX);
    setSpecial({ suid: false, sgid: false, sticky: false });
    setOctalInput("");
    setSymbolicInput("");
    setError(null);
  }, []);

  return (
    <ToolPageShell toolId="chmod-calc" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Chmod Calculator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Lock className="h-4 w-4" /> Permission matrix
          </p>
          <div className="grid grid-cols-4 gap-2">
            <div />
            {PERMS.map((p) => (
              <p key={p.key} className="text-center text-xs font-bold uppercase text-muted-foreground">{p.label}</p>
            ))}
            {CLASSES.map((c) => (
              <>
                <p key={c} className="flex items-center text-sm font-bold capitalize">{c}</p>
                {PERMS.map((p) => (
                  <button
                    key={`${c}-${p.key}`}
                    type="button"
                    onClick={() => toggle(c, p.key)}
                    aria-pressed={matrix[c][p.key]}
                    className={cn(
                      "rounded-xl border-2 py-3 text-lg font-extrabold transition",
                      matrix[c][p.key]
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground/40 hover:border-primary/40",
                    )}
                  >
                    {p.key}
                  </button>
                ))}
              </>
            ))}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Special bits</p>
            <div className="flex flex-wrap gap-2">
              {([["suid", "setuid (4)"], ["sgid", "setgid (2)"], ["sticky", "sticky (1)"]] as const).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSpecial((p) => ({ ...p, [k]: !p[k] }))}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-bold transition",
                    special[k] ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.octal}
                  type="button"
                  onClick={() => { const parsed = octalToMatrix(p.octal); if (parsed) { setMatrix(parsed.matrix); setSpecial(parsed.special); } }}
                  className={cn(
                    "rounded-xl border px-4 py-1.5 text-sm font-bold transition",
                    octal === p.octal ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {p.name}
                </button>
              ))}
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1 rounded-xl border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:border-primary/40"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Octal</p>
                <p className="mt-1 font-mono text-3xl font-extrabold text-primary">{octal}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Symbolic</p>
                <p className="mt-1 font-mono text-xl font-extrabold md:text-2xl">{symbolic}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Command</p>
                <p className="mt-1 font-mono text-sm font-bold md:text-base">{command}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{describe(octal)}</p>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Parse into the matrix</p>
            <div className="flex gap-2">
              <input
                value={octalInput}
                onChange={(e) => setOctalInput(e.target.value)}
                placeholder="e.g. 755"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
              <ActionButton disabled={!trial.canUse || !octalInput.trim()} onClick={() => applyParsed("octal")}>
                Parse
              </ActionButton>
            </div>
            <div className="flex gap-2">
              <input
                value={symbolicInput}
                onChange={(e) => setSymbolicInput(e.target.value)}
                placeholder="e.g. rwxr-xr--"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
              <ActionButton disabled={!trial.canUse || !symbolicInput.trim()} onClick={() => applyParsed("symbolic")}>
                Parse
              </ActionButton>
            </div>
            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
