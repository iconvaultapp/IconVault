// /tools/bill-splitter - Split a bill across people with per-item
// assignment, tax and tip sharing. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Plus, Trash2, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/bill-splitter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/bill-splitter";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/bill-splitter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/bill-splitter";
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
  component: BillSplitterTool,
});

const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary";

interface Item {
  id: number;
  name: string;
  price: string;
  who: number;
}

let nextId = 1;

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BillSplitterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("bill-splitter", isPro);
  const seo = toolSeo;

  const [people, setPeople] = useState<string[]>(["Alex", "Sam"]);
  const [items, setItems] = useState<Item[]>([
    { id: nextId++, name: "Pizza", price: "24.00", who: 0 },
    { id: nextId++, name: "Pasta", price: "18.50", who: 1 },
  ]);
  const [taxPct, setTaxPct] = useState("8");
  const [tipPct, setTipPct] = useState("15");

  const calc = useMemo(() => {
    const parsed = items.map((it) => ({
      ...it,
      value: Math.max(0, parseFloat(it.price) || 0),
    }));
    const subtotal = parsed.reduce((a, it) => a + it.value, 0);
    const tax = subtotal * (Math.max(0, parseFloat(taxPct) || 0) / 100);
    const tip = subtotal * (Math.max(0, parseFloat(tipPct) || 0) / 100);
    const per = people.map((name, idx) => {
      const share = parsed.filter((it) => it.who === idx).reduce((a, it) => a + it.value, 0);
      const ratio = subtotal > 0 ? share / subtotal : people.length > 0 ? 1 / people.length : 0;
      return { name, itemsTotal: share, tax: tax * ratio, tip: tip * ratio, total: share + tax * ratio + tip * ratio };
    });
    return { subtotal, tax, tip, grand: subtotal + tax + tip, per };
  }, [items, people, taxPct, tipPct]);

  const addPerson = () => {
    if (people.length >= 12) {
      toast.error("Up to 12 people per bill.");
      return;
    }
    setPeople((p) => [...p, `Person ${p.length + 1}`]);
  };

  const removePerson = (idx: number) => {
    if (people.length <= 1) return;
    setPeople((p) => p.filter((_, i) => i !== idx));
    setItems((list) =>
      list.map((it) => ({
        ...it,
        who: it.who === idx ? 0 : it.who > idx ? it.who - 1 : it.who,
      })),
    );
  };

  const addItem = () =>
    setItems((list) => [...list, { id: nextId++, name: "", price: "", who: 0 }]);

  const updateItem = (id: number, patch: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id: number) => setItems((list) => list.filter((it) => it.id !== id));

  const copySummary = async () => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    const lines = [
      "Bill split",
      `Subtotal ${money(calc.subtotal)} | Tax ${money(calc.tax)} | Tip ${money(calc.tip)}`,
      `Total ${money(calc.grand)}`,
      "",
      ...calc.per.map((p) => `${p.name}: ${money(p.total)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("Summary copied - paste it in your group chat");
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="bill-splitter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Bill Splitter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">People</p>
              <button type="button" onClick={addPerson} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40">
                <UserPlus className="h-3.5 w-3.5" /> Add person
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {people.map((name, idx) => (
                <div key={idx} className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 px-2 py-1">
                  <input
                    value={name}
                    onChange={(e) => setPeople((p) => p.map((n, i) => (i === idx ? e.target.value : n)))}
                    className="w-24 bg-transparent text-sm font-semibold outline-none"
                    aria-label={`Person ${idx + 1} name`}
                  />
                  {people.length > 1 && (
                    <button type="button" onClick={() => removePerson(idx)} className="text-muted-foreground hover:text-red-500" aria-label={`Remove ${name}`}>
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Items</p>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/40">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-[1fr_96px_110px_36px] items-center gap-2">
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(it.id, { name: e.target.value })}
                    placeholder="Item name"
                    className={inputCls}
                    aria-label="Item name"
                  />
                  <input
                    value={it.price}
                    onChange={(e) => updateItem(it.id, { price: e.target.value })}
                    placeholder="0.00"
                    inputMode="decimal"
                    className={inputCls}
                    aria-label="Item price"
                  />
                  <select
                    value={it.who}
                    onChange={(e) => updateItem(it.id, { who: Number(e.target.value) })}
                    className={inputCls}
                    aria-label="Paid by"
                  >
                    {people.map((name, idx) => (
                      <option key={idx} value={idx}>{name || `Person ${idx + 1}`}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeItem(it.id)} className="text-muted-foreground hover:text-red-500" aria-label="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet - add one to get started.</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="bs-tax">Tax %</label>
              <input id="bs-tax" value={taxPct} onChange={(e) => setTaxPct(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80" htmlFor="bs-tip">Tip %</label>
              <input id="bs-tip" value={tipPct} onChange={(e) => setTipPct(e.target.value)} inputMode="decimal" className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Tax and tip are shared in proportion to each person's item subtotal.</p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Per-person totals</p>
            <button
              type="button"
              onClick={copySummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-3.5 w-3.5" /> Copy summary
            </button>
          </div>
          <div className="space-y-3">
            {calc.per.map((p, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{p.name || `Person ${idx + 1}`}</p>
                  <p className="font-mono text-xl font-bold text-primary">{money(p.total)}</p>
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Items {money(p.itemsTotal)} + Tax {money(p.tax)} + Tip {money(p.tip)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 font-mono text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{money(calc.subtotal)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{money(calc.tax)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tip</span><span>{money(calc.tip)}</span></div>
            <div className="mt-1 flex justify-between font-bold"><span>Grand total</span><span>{money(calc.grand)}</span></div>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
