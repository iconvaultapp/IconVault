// /tools/js-hidden-classes - V8 hidden-class (shape) transition visualizer and
// inline-cache state explorer: monomorphic, polymorphic, megamorphic.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Fingerprint, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/js-hidden-classes";
import toolSeoMeta from "@/lib/tool-seo-meta-data/js-hidden-classes";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/js-hidden-classes")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/js-hidden-classes";
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
  component: HiddenClassesTool,
});

interface ShapeNode {
  id: string;
  label: string;
  props: string[];
  children: { via: string; node: ShapeNode }[];
}

let shapeSeq = 0;
function makeShape(props: string[]): ShapeNode {
  shapeSeq += 1;
  return { id: `C${shapeSeq}`, label: `C${shapeSeq}`, props, children: [] };
}

function buildTree(order: string[]): ShapeNode {
  shapeSeq = 0;
  const root = makeShape([]);
  let current = root;
  for (const p of order) {
    const child = makeShape([...current.props, p]);
    current.children.push({ via: `+${p}`, node: child });
    current = child;
  }
  return root;
}

function ShapeTree({ node, highlightId }: { node: ShapeNode; highlightId: string | null }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "rounded-xl border-2 px-3 py-2 text-center transition-all",
          highlightId === node.id
            ? "border-primary bg-primary/15 shadow-lg"
            : "border-border bg-card",
        )}
      >
        <p className="font-mono text-sm font-extrabold text-primary">{node.label}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {node.props.length === 0 ? "∅ empty" : `{ ${node.props.join(", ")} }`}
        </p>
      </div>
      {node.children.length > 0 && (
        <div className="mt-2 flex gap-6">
          {node.children.map((c) => (
            <div key={c.node.id} className="flex flex-col items-center">
              <span className="mb-1 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                {c.via}
              </span>
              <div className="h-4 w-px bg-border" />
              <ShapeTree node={c.node} highlightId={highlightId} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PROP_CHOICES = ["x", "y", "z", "name"] as const;

const IC_STATES = [
  {
    id: "uninitialized",
    name: "Uninitialized",
    color: "bg-zinc-500",
    desc: "The call site has never run. V8 is about to observe the first shape.",
  },
  {
    id: "monomorphic",
    name: "Monomorphic",
    color: "bg-emerald-500",
    desc: "One shape seen. The property offset is baked in: a single cheap check, near-C speed.",
  },
  {
    id: "polymorphic",
    name: "Polymorphic",
    color: "bg-amber-500",
    desc: "2-4 shapes seen. V8 keeps a small lookup table. Still fast, slightly more work per access.",
  },
  {
    id: "megamorphic",
    name: "Megamorphic",
    color: "bg-red-500",
    desc: "5+ shapes (or too chaotic). V8 gives up and falls back to a slow dictionary lookup.",
  },
];

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function HiddenClassesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("js-hidden-classes", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<"shapes" | "ic">("shapes");
  const [orderA, setOrderA] = useState<string[]>(["x", "y"]);
  const [orderB, setOrderB] = useState<string[]>(["y", "x"]);
  const [playA, setPlayA] = useState(false);
  const [playB, setPlayB] = useState(false);
  const [icShapes, setIcShapes] = useState(1);
  const [icLog, setIcLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const treeA = buildTree(orderA);
  const treeB = buildTree(orderB);
  const sameOrder = orderA.join(",") === orderB.join(",");

  const finalA = orderA.length;
  const finalB = orderB.length;

  const toggleProp = (which: "A" | "B", p: string) => {
    const set = which === "A" ? setOrderA : setOrderB;
    const cur = which === "A" ? orderA : orderB;
    setPlayA(false);
    setPlayB(false);
    if (cur.includes(p)) set(cur.filter((x) => x !== p));
    else if (cur.length < 3) set([...cur, p]);
  };

  const animateAdd = (which: "A" | "B") => {
    const setPlay = which === "A" ? setPlayA : setPlayB;
    setPlay(false);
    let i = 0;
    setPlay(true);
    const tick = () => {
      i += 1;
      if (i >= 3) setPlay(false);
      else setTimeout(tick, 600);
    };
    setTimeout(tick, 600);
  };

  const icState = icShapes <= 1 ? "monomorphic" : icShapes <= 4 ? "polymorphic" : "megamorphic";
  const active = IC_STATES.find((s) => s.id === icState)!;

  const runAccesses = () => {
    if (!trial.canUse) {
      toast.error("Free uses exhausted - go Pro for unlimited.");
      return;
    }
    const lines = [
      `Simulating 10,000 property reads across ${icShapes} distinct shape${icShapes > 1 ? "s" : ""}...`,
      icState === "monomorphic"
        ? "Every object has shape C2 { x, y }. IC stays MONOMORPHIC: one hidden-class check, then a direct offset load."
        : icState === "polymorphic"
          ? `Objects arrive with ${icShapes} different shapes. IC turns POLYMORPHIC: a 4-entry stub cache handles each shape with one extra lookup.`
          : `${icShapes} shapes blew past the 4-entry limit. IC went MEGAMORPHIC: V8 falls back to generic dictionary lookup for every access.`,
      icState === "megamorphic"
        ? "Fix: initialize properties in the same order (ideally in the constructor) so all instances share one hidden class."
        : "Tip: keep constructors assigning the same properties in the same order to stay here.",
    ];
    setIcLog(lines);
    trial.recordUse();
  };

  const code = sameOrder
    ? `// Same property order -> SAME hidden class -> fast
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const a = new Point(1, 2);
const b = new Point(3, 4);
// a and b share hidden class C2 { x, y }`
    : `// Different property order -> DIFFERENT hidden classes -> slower
function makeA() {
  const o = {};
${orderA.map((p) => `  o.${p} = 0;`).join("\n")}
  return o;
}
function makeB() {
  const o = {};
${orderB.map((p) => `  o.${p} = 0;`).join("\n")}
  return o;
}
// makeA() ends at C${finalA} { ${orderA.join(", ")} }
// makeB() ends at C${finalB} { ${orderB.join(", ")} } - a different class!`;

  const copyCode = async () => {
    if (await copyText(code)) {
      setCopied(true);
      toast.success("Example copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed - select the code manually.");
    }
  };

  return (
    <ToolPageShell toolId="js-hidden-classes" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Hidden Classes" left={trial.left} />

      <div className="mb-5 flex gap-2">
        {(["shapes", "ic"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              tab === t
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {t === "shapes" ? "Hidden-class transitions" : "Inline caching states"}
          </button>
        ))}
      </div>

      {tab === "shapes" && (
        <div className="space-y-6">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            V8 gives every object a <strong className="text-foreground">hidden class</strong> describing its layout.
            Adding a property transitions the object to a new class. Add properties in the
            <strong className="text-foreground"> same order</strong> and objects share classes (fast);
            mix the order and each path gets its own class (slow). Toggle properties below to see the trees diverge.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            {(["A", "B"] as const).map((which) => {
              const order = which === "A" ? orderA : orderB;
              const tree = which === "A" ? treeA : treeB;
              return (
                <div key={which} className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-extrabold">Object {which}</h2>
                    <button
                      type="button"
                      onClick={() => animateAdd(which)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                    >
                      Replay transitions
                    </button>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {PROP_CHOICES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleProp(which, p)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 font-mono text-sm font-bold transition",
                          order.includes(p)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {order.includes(p) ? `${order.indexOf(p) + 1}. ${p}` : p}
                      </button>
                    ))}
                  </div>
                  <div className="min-h-[220px] overflow-x-auto rounded-xl bg-muted/20 p-4">
                    <ShapeTree node={tree} highlightId={null} />
                  </div>
                  <p className="mt-3 font-mono text-xs text-muted-foreground">
                    final class: C{order.length} {"{ "}
                    {order.join(", ") || "∅"}
                    {" }"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className={cn(
            "rounded-2xl border p-4 text-sm font-semibold",
            sameOrder ? "border-emerald-500/40 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5",
          )}>
            {sameOrder
              ? "Same order: both objects end at the identical hidden class. V8 reuses one class and one inline cache."
              : "Different order: the two objects land on different hidden classes. Every property access now has to handle both shapes."}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-extrabold">
                <Fingerprint className="h-4 w-4 text-primary" /> Copyable example
              </h2>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-200">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      )}

      {tab === "ic" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            When code reads <code className="rounded bg-muted px-1 font-mono">obj.x</code> repeatedly, V8 remembers
            which hidden class it saw at that call site: the <strong className="text-foreground">inline cache</strong>.
            Drag the slider to change how many different shapes flow through one call site.
          </p>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-bold">Distinct shapes hitting one call site</label>
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-bold">{icShapes}</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              value={icShapes}
              onChange={(e) => setIcShapes(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {IC_STATES.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-xl border p-3 text-center transition-all",
                    active.id === s.id ? "border-primary bg-primary/5 shadow" : "border-border opacity-50",
                  )}
                >
                  <span className={cn("mx-auto mb-1.5 block h-2.5 w-2.5 rounded-full", s.color)} />
                  <p className="text-xs font-extrabold">{s.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {s.id === "monomorphic" && "1 shape"}
                    {s.id === "polymorphic" && "2-4 shapes"}
                    {s.id === "megamorphic" && "5+ shapes"}
                    {s.id === "uninitialized" && "0 runs"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{active.desc}</p>
            <div className="mt-4">
              <ActionButton busy={false} disabled={!trial.canUse} onClick={runAccesses}>
                Simulate 10,000 property reads
              </ActionButton>
              {!isPro && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free simulations left.
                </p>
              )}
            </div>
          </div>

          {icLog.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-extrabold">Simulation report</h2>
                <button
                  type="button"
                  onClick={() => setIcLog([])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Clear
                </button>
              </div>
              <div className="space-y-1.5">
                {icLog.map((l, i) => (
                  <p key={i} className="rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs leading-relaxed">{l}</p>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Educational simulation of V8's inline-cache states, not a live engine measurement.
              </p>
            </div>
          )}
        </div>
      )}
    </ToolPageShell>
  );
}
