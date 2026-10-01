// /tools/regex-visualizer - Railroad diagram, plain-English explanation and live tester for JS regex.

import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/regex-visualizer")({
  head: () => {
    const seo = getToolSeoMeta("regex-visualizer");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: RegexVizTool,
});

/* ---------------- parser ---------------- */

type RNode =
  | { t: "seq"; items: RNode[] }
  | { t: "alt"; branches: RNode[] }
  | { t: "lit"; v: string }
  | { t: "dot" }
  | { t: "cls"; v: string; neg: boolean }
  | { t: "group"; idx: number; inner: RNode; kind: string }
  | { t: "anchor"; v: string }
  | { t: "quant"; min: number; max: number | "inf"; inner: RNode; lazy: boolean };

const SHORTHANDS: Record<string, string> = {
  d: "digit", D: "non-digit", w: "word char", W: "non-word char", s: "whitespace", S: "non-whitespace",
};

function parseRegex(src: string): RNode {
  let i = 0;
  let groupCount = 0;

  function parseAlt(): RNode {
    const branches = [parseSeq()];
    while (src[i] === "|") { i++; branches.push(parseSeq()); }
    const first = branches[0];
    return branches.length === 1 && first ? first : { t: "alt", branches };
  }
  function parseSeq(): RNode {
    const items: RNode[] = [];
    while (i < src.length && src[i] !== ")" && src[i] !== "|") items.push(parseTerm());
    return { t: "seq", items };
  }
  function parseTerm(): RNode {
    const atom = parseAtom();
    const c = src[i];
    if (c === "*" || c === "+" || c === "?") {
      i++;
      const lazy = src[i] === "?";
      if (lazy) i++;
      return { t: "quant", min: c === "+" ? 1 : 0, max: c === "?" ? 1 : "inf", inner: atom, lazy };
    }
    if (c === "{") {
      const m = /^\{(\d+)(?:,(\d*)?)?\}/.exec(src.slice(i));
      if (m) {
        i += m[0].length;
        const lazy = src[i] === "?";
        if (lazy) i++;
        const min = parseInt(m[1] ?? "0", 10);
        const max: number | "inf" = m[2] === undefined ? min : m[2] === "" ? "inf" : parseInt(m[2], 10);
        if (typeof max === "number" && max < min) throw new Error(`{${min},${max}} - max is less than min`);
        return { t: "quant", min, max, inner: atom, lazy };
      }
    }
    return atom;
  }
  function parseAtom(): RNode {
    const c = src[i];
    if (c === "(") {
      i++;
      let kind = "capture";
      if (src[i] === "?") {
        if (src[i + 1] === ":") { kind = "non-capturing"; i += 2; }
        else if (src[i + 1] === "<") {
          const m = /^<([A-Za-z_$][\w$]*)>/.exec(src.slice(i + 1));
          if (!m) throw new Error("Unsupported (?<...) group syntax");
          kind = `named "${m[1]}"`;
          i += 1 + m[0].length;
        } else throw new Error("Unsupported (?...) group syntax");
      }
      groupCount++;
      const idx = groupCount;
      const inner = parseAlt();
      if (src[i] !== ")") throw new Error("Unclosed group - missing )");
      i++;
      return { t: "group", idx, inner, kind };
    }
    if (c === "[") {
      i++;
      let neg = false;
      if (src[i] === "^") { neg = true; i++; }
      let raw = "";
      if (src[i] === "]") { raw += "]"; i++; }
      while (i < src.length && src[i] !== "]") {
        if (src[i] === "\\") { raw += src.slice(i, i + 2); i += 2; }
        else { raw += src[i]; i++; }
      }
      if (src[i] !== "]") throw new Error("Unclosed character class - missing ]");
      i++;
      return { t: "cls", v: raw, neg };
    }
    if (c === "\\") {
      const n = src[i + 1];
      if (n === undefined) throw new Error("Pattern ends with a backslash");
      i += 2;
      if (n === "b") return { t: "anchor", v: "word boundary" };
      if (n === "B") return { t: "anchor", v: "non-word boundary" };
      if (SHORTHANDS[n]) return { t: "cls", v: `\\${n}`, neg: false };
      return { t: "lit", v: n };
    }
    if (c === ".") { i++; return { t: "dot" }; }
    if (c === "^") { i++; return { t: "anchor", v: "start of input" }; }
    if (c === "$") { i++; return { t: "anchor", v: "end of input" }; }
    if (c === undefined) throw new Error("Unexpected end of pattern");
    if ("*+?{".includes(c)) throw new Error(`"${c}" has nothing to repeat`);
    i++;
    return { t: "lit", v: c };
  }

  const root = parseAlt();
  if (i < src.length) throw new Error(`Unexpected "${src[i]}"`);
  return mergeLits(root);
}

function mergeLits(n: RNode): RNode {
  if (n.t === "seq") {
    const items: RNode[] = [];
    for (const it of n.items.map(mergeLits)) {
      const last = items[items.length - 1];
      if (it.t === "lit" && last && last.t === "lit") last.v += it.v;
      else items.push(it);
    }
    return { t: "seq", items };
  }
  if (n.t === "alt") return { t: "alt", branches: n.branches.map(mergeLits) };
  if (n.t === "group") return { ...n, inner: mergeLits(n.inner) };
  if (n.t === "quant") return { ...n, inner: mergeLits(n.inner) };
  return n;
}

/* ---------------- railroad layout ---------------- */

const FS = 12;
const CW = 7.6;
const PH = 14;
const NH = 32;
const GAP = 26;
const ARM = 34;
const VGAP = 16;

interface Lay { w: number; h: number; render: (x: number, mid: number, key: string) => ReactNode; }
const tw = (s: string) => Math.max(30, s.length * CW + PH * 2);
const trunc = (s: string, n = 22) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function boxNode(x: number, mid: number, w: number, label: string, key: string, dashed = false): ReactNode {
  return (
    <g key={key}>
      <line x1={x} y1={mid} x2={x + w} y2={mid} stroke="var(--border)" strokeWidth={2} />
      <rect x={x} y={mid - NH / 2} width={w} height={NH} rx={9} fill="var(--card)" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray={dashed ? "5 4" : undefined} />
      <text x={x + w / 2} y={mid + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={FS} fill="var(--foreground)" fontFamily="ui-monospace, monospace">{label}</text>
    </g>
  );
}

function layout(n: RNode): Lay {
  switch (n.t) {
    case "lit": {
      const label = trunc(n.v === "" ? "empty" : n.v);
      const w = tw(label);
      return { w, h: NH, render: (x, mid, key) => boxNode(x, mid, w, label, key) };
    }
    case "dot": {
      const w = tw("any char");
      return { w, h: NH, render: (x, mid, key) => boxNode(x, mid, w, "any char", key, true) };
    }
    case "cls": {
      const named = SHORTHANDS[n.v.slice(1)];
      const label = n.v.startsWith("\\") && named ? `\\${n.v[1]} ${named}` : trunc(`[${n.neg ? "^" : ""}${n.v}]`);
      const w = tw(label);
      return { w, h: NH, render: (x, mid, key) => boxNode(x, mid, w, label, key) };
    }
    case "anchor": {
      const w = tw(n.v);
      return {
        w, h: NH,
        render: (x, mid, key) => (
          <g key={key}>
            <line x1={x} y1={mid} x2={x + w} y2={mid} stroke="var(--border)" strokeWidth={2} />
            <rect x={x} y={mid - NH / 2} width={w} height={NH} rx={NH / 2} fill="var(--card)" stroke="var(--muted-foreground)" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={x + w / 2} y={mid + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={FS - 1} fill="var(--muted-foreground)" fontFamily="ui-monospace, monospace">{trunc(n.v, 26)}</text>
          </g>
        ),
      };
    }
    case "quant": {
      const inner = layout(n.inner);
      const qlabel = n.min === 0 && n.max === 1 ? "?" : n.min === 1 && n.max === "inf" ? "+" : n.min === 0 && n.max === "inf" ? "*" : n.min === n.max ? `{${n.min}}` : `{${n.min},${n.max === "inf" ? "" : n.max}}`;
      const label = n.lazy ? `${qlabel}?` : qlabel;
      const loop = n.max === "inf";
      const bypass = n.min === 0;
      const padL = loop ? 30 : 8;
      const w = inner.w + padL + 8;
      const extra = loop || bypass ? 30 : 0;
      const h = inner.h + extra;
      return {
        w, h,
        render: (x, mid, key) => {
          const lx = x + padL;
          const rx = lx + inner.w;
          const els: ReactNode[] = [
            <line key={`${key}-line`} x1={x} y1={mid} x2={x + w} y2={mid} stroke="var(--border)" strokeWidth={2} />,
          ];
          if (loop) {
            const yLoop = mid - inner.h / 2 - 26;
            els.push(<path key={`${key}-loop`} d={`M ${rx} ${mid} L ${rx} ${yLoop} L ${lx} ${yLoop} L ${lx} ${mid}`} fill="none" stroke="var(--primary)" strokeWidth={1.8} markerEnd="url(#rv-arrow)" />);
          }
          if (bypass) {
            const yBy = mid - inner.h / 2 - (loop ? 13 : 24);
            els.push(<line key={`${key}-by`} x1={lx} y1={yBy} x2={rx} y2={yBy} stroke="var(--primary)" strokeWidth={1.8} />);
            els.push(<line key={`${key}-byl`} x1={lx} y1={yBy} x2={lx} y2={mid} stroke="var(--primary)" strokeWidth={1.8} />);
            els.push(<line key={`${key}-byr`} x1={rx} y1={yBy} x2={rx} y2={mid} stroke="var(--primary)" strokeWidth={1.8} />);
          }
          els.push(inner.render(lx, mid, `${key}-i`));
          els.push(
            <text key={`${key}-q`} x={x + w - 2} y={mid - h / 2 + 11} textAnchor="end" fontSize={FS} fontWeight={700} fill="var(--primary)" fontFamily="ui-monospace, monospace">{label}</text>,
          );
          return <g key={key}>{els}</g>;
        },
      };
    }
    case "group": {
      const inner = layout(n.inner);
      const title = n.kind === "capture" ? `Group ${n.idx}` : n.kind === "non-capturing" ? "Group (?: )" : `Group ${n.kind}`;
      const w = inner.w + 26;
      const h = inner.h + 40;
      return {
        w, h,
        render: (x, mid, key) => (
          <g key={key}>
            <line x1={x} y1={mid} x2={x + w} y2={mid} stroke="var(--border)" strokeWidth={2} />
            <rect x={x + 4} y={mid - h / 2 + 14} width={w - 8} height={h - 14} rx={10} fill="none" stroke="var(--primary)" strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={x + 14} y={mid - h / 2 + 11} fontSize={FS - 1} fontWeight={700} fill="var(--primary)" fontFamily="ui-monospace, monospace">{title}</text>
            {inner.render(x + 13, mid + 7, `${key}-i`)}
          </g>
        ),
      };
    }
    case "seq": {
      if (n.items.length === 0) {
        return { w: 90, h: NH, render: (x, mid, key) => boxNode(x, mid, 90, "empty", key, true) };
      }
      const kids = n.items.map(layout);
      const w = kids.reduce((a, k) => a + k.w, 0) + GAP * (kids.length - 1);
      const h = Math.max(...kids.map((k) => k.h));
      return {
        w, h,
        render: (x, mid, key) => {
          let cx = x;
          const els: ReactNode[] = [
            <line key={`${key}-line`} x1={x} y1={mid} x2={x + w} y2={mid} stroke="var(--border)" strokeWidth={2} />,
          ];
          kids.forEach((k, idx) => {
            els.push(k.render(cx, mid, `${key}-${idx}`));
            cx += k.w + GAP;
          });
          return <g key={key}>{els}</g>;
        },
      };
    }
    case "alt": {
      const kids = n.branches.map(layout);
      const bw = Math.max(...kids.map((k) => k.w));
      const w = bw + ARM * 2;
      const h = kids.reduce((a, k) => a + k.h, 0) + VGAP * (kids.length - 1);
      return {
        w, h,
        render: (x, mid, key) => {
          const lx = x + 12;
          const rx = x + w - 12;
          let cy = mid - h / 2;
          const els: ReactNode[] = [
            <line key={`${key}-in`} x1={x} y1={mid} x2={lx} y2={mid} stroke="var(--border)" strokeWidth={2} />,
            <line key={`${key}-out`} x1={rx} y1={mid} x2={x + w} y2={mid} stroke="var(--border)" strokeWidth={2} />,
          ];
          const mids: number[] = [];
          kids.forEach((k, idx) => {
            const bm = cy + k.h / 2;
            mids.push(bm);
            els.push(<line key={`${key}-l${idx}`} x1={lx} y1={bm} x2={lx + ARM - 12} y2={bm} stroke="var(--border)" strokeWidth={2} />);
            els.push(k.render(lx + ARM - 12 + (bw - k.w) / 2, bm, `${key}-b${idx}`));
            els.push(<line key={`${key}-r${idx}`} x1={lx + ARM - 12 + bw} y1={bm} x2={rx} y2={bm} stroke="var(--border)" strokeWidth={2} />);
            cy += k.h + VGAP;
          });
          if (mids.length > 1) {
            els.push(<line key={`${key}-vl`} x1={lx} y1={mids[0]} x2={lx} y2={mids[mids.length - 1]} stroke="var(--border)" strokeWidth={2} />);
            els.push(<line key={`${key}-vr`} x1={rx} y1={mids[0]} x2={rx} y2={mids[mids.length - 1]} stroke="var(--border)" strokeWidth={2} />);
          }
          return <g key={key}>{els}</g>;
        },
      };
    }
  }
}

/* ---------------- plain-English ---------------- */

function describe(n: RNode): string {
  switch (n.t) {
    case "lit": return `Match the literal text "${n.v}"`;
    case "dot": return "Match any single character (except a line break)";
    case "cls": {
      const named: Record<string, string> = {
        "\\d": "a digit (0-9)", "\\D": "any non-digit", "\\w": "a word character (A-Z, a-z, 0-9, _)",
        "\\W": "any non-word character", "\\s": "whitespace", "\\S": "any non-whitespace",
      };
      if (named[n.v]) return `Match ${named[n.v]}`;
      return `Match one character ${n.neg ? "NOT " : ""}in the set [${n.v}]`;
    }
    case "anchor": return `Assert ${n.v}`;
    case "quant": {
      const inner = describe(n.inner).replace(/^Match /, "match ");
      const times =
        n.min === 0 && n.max === 1 ? "zero or one time (optional)"
        : n.min === 1 && n.max === "inf" ? "one or more times"
        : n.min === 0 && n.max === "inf" ? "zero or more times"
        : n.min === n.max ? `exactly ${n.min} times`
        : n.max === "inf" ? `${n.min} or more times`
        : `between ${n.min} and ${n.max} times`;
      return `${inner.charAt(0).toUpperCase() + inner.slice(1)}, repeated ${times}${n.lazy ? " (lazy - as few as possible)" : ""}`;
    }
    case "group":
      return `Group ${n.idx}${n.kind === "capture" ? "" : ` (${n.kind})`} containing: ${describe(n.inner)}`;
    case "seq": return n.items.map(describe).join("; then ");
    case "alt": return `Either ${n.branches.map((b) => `(${describe(b)})`).join(" OR ")}`;
  }
}

/* ---------------- component ---------------- */

const VALID_FLAGS = /^[gimsuy]*$/;

function RegexVizTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("regex-visualizer", isPro);
  const seo = getToolSeo("regex-visualizer");

  const [src, setSrc] = useState("(\\d{3})-(\\d{4})");
  const [flags, setFlags] = useState("g");
  const [test, setTest] = useState("Call 555-1234 or 555-9876 today");

  const parsed = useMemo(() => {
    if (src.length > 300) return { ok: false as const, error: "Pattern is too long for the diagram (max 300 chars)." };
    try {
      return { ok: true as const, root: parseRegex(src), lay: layout(parseRegex(src)) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Invalid pattern" };
    }
  }, [src]);

  const explanations = useMemo(() => {
    if (!parsed.ok) return [];
    const root = parsed.root;
    return root.t === "seq" && root.items.length > 1 ? root.items.map(describe) : [describe(root)];
  }, [parsed]);

  const testOut = useMemo(() => {
    if (!VALID_FLAGS.test(flags)) return { error: "Flags may only contain g, i, m, s, u, y." };
    let re: RegExp;
    try {
      re = new RegExp(src || "(?:)", flags.includes("g") ? flags : flags + "g");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Invalid regex" };
    }
    if (!test) return { segs: [] as { text: string; match: boolean }[], count: 0 };
    const segs: { text: string; match: boolean }[] = [];
    let count = 0;
    let last = 0;
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(test)) && guard++ < 500) {
      if (m.index > last) segs.push({ text: test.slice(last, m.index), match: false });
      if (m[0].length > 0) segs.push({ text: m[0], match: true });
      count++;
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < test.length) segs.push({ text: test.slice(last), match: false });
    return { segs, count };
  }, [src, flags, test]);

  const copyExplanation = async () => {
    if (!trial.canUse || explanations.length === 0) return;
    try {
      await navigator.clipboard.writeText(`/${src}/${flags}\n\n${explanations.map((e, i) => `${i + 1}. ${e}`).join("\n")}`);
      trial.recordUse();
      toast.success("Explanation copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="regex-visualizer" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Regex Visualizer" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">Regular expression</label>
              <div className="flex items-center rounded-xl border border-border bg-background px-3 focus-within:border-primary/60">
                <span className="font-mono text-lg text-muted-foreground">/</span>
                <input
                  value={src}
                  onChange={(e) => setSrc(e.target.value)}
                  spellCheck={false}
                  placeholder="your pattern"
                  className="w-full bg-transparent px-1 py-2.5 font-mono text-sm outline-none"
                />
                <span className="font-mono text-lg text-muted-foreground">/</span>
              </div>
            </div>
            <div className="w-full sm:w-36">
              <label className="mb-2 block text-[13px] font-medium text-foreground/80">Flags</label>
              <input
                value={flags}
                onChange={(e) => setFlags(e.target.value)}
                spellCheck={false}
                placeholder="gimsuy"
                maxLength={6}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary/60"
              />
            </div>
          </div>

          <h2 className="mb-2 text-sm font-semibold">Railroad diagram</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-background p-4">
            {!parsed.ok ? (
              <p className="py-8 text-center text-sm font-medium text-red-500">{parsed.error}</p>
            ) : (
              <svg
                width={parsed.lay.w + 48}
                height={parsed.lay.h + 48}
                className="mx-auto block max-w-none"
                role="img"
                aria-label={`Railroad diagram for /${src}/`}
              >
                <defs>
                  <marker id="rv-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                    <path d="M0,0 L8,4.5 L0,9" fill="none" stroke="var(--primary)" strokeWidth={1.8} />
                  </marker>
                </defs>
                {parsed.lay.render(24, 24 + parsed.lay.h / 2, "root")}
              </svg>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">JavaScript (ECMAScript) flavor. Loops show repeats, bypass lines show optional parts.</p>
            <button
              type="button"
              onClick={copyExplanation}
              disabled={!trial.canUse || explanations.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-primary/50 disabled:opacity-40"
            >
              <Copy className="h-4 w-4" /> Copy explanation
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Plain-English explanation</h2>
            {explanations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Fix the pattern to see the explanation.</p>
            ) : (
              <ol className="space-y-2">
                {explanations.map((e, i) => (
                  <li key={i} className="flex gap-2.5 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Test string</h2>
              {"count" in testOut && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {testOut.count} match{testOut.count === 1 ? "" : "es"}
                </span>
              )}
            </div>
            <textarea
              value={test}
              onChange={(e) => setTest(e.target.value)}
              rows={3}
              placeholder="Paste text to test against..."
              className="mb-3 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60"
            />
            <div className="min-h-[72px] whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/40 p-3 text-sm leading-relaxed">
              {"error" in testOut ? (
                <span className="font-medium text-red-500">{testOut.error}</span>
              ) : testOut.segs.length === 0 ? (
                <span className="text-muted-foreground">Type a test string above.</span>
              ) : (
                testOut.segs.map((s, i) =>
                  s.match ? (
                    <mark key={i} className="rounded bg-primary/25 px-0.5 font-semibold text-foreground">{s.text}</mark>
                  ) : (
                    <span key={i}>{s.text}</span>
                  ),
                )
              )}
            </div>
          </div>
        </div>
        {!isPro && (
          <p className="text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - the diagram, explanation and tester are unlimited.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
