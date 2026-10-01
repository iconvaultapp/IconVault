// /tools/payment-handler-playground - Learn the PaymentRequest API: build a real
// PaymentRequest object, call canMakePayment(), and step through the checkout
// flow with a simulator. Runs fully in-browser; no payment is ever charged.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CreditCard, Play, RotateCcw, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/payment-handler-playground")({
  head: () => {
    const seo = getToolSeoMeta("payment-handler-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: PaymentHandlerPlayground,
});

interface LogLine {
  time: string;
  step: string;
  detail: string;
}

const STEPS = [
  { key: "construct", label: "1. new PaymentRequest()" },
  { key: "canMake", label: "2. canMakePayment()" },
  { key: "show", label: "3. show() - payment sheet" },
  { key: "complete", label: "4. complete('success')" },
];

const now = () => new Date().toLocaleTimeString();

function PaymentHandlerPlayground() {
  const { isPro } = usePlan();
  const trial = useToolTrial("payment-handler-playground", isPro);
  const seo = getToolSeo("payment-handler-playground");

  const [supported, setSupported] = useState<boolean | null>(null);
  const [secure, setSecure] = useState<boolean | null>(null);
  const [canMakeResult, setCanMakeResult] = useState<string | null>(null);
  const [simStep, setSimStep] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [method, setMethod] = useState<"basic-card" | "custom">("basic-card");
  const [total, setTotal] = useState("49.99");
  const [currency, setCurrency] = useState("USD");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "PaymentRequest" in window);
    setSecure(typeof window !== "undefined" && window.isSecureContext);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const push = (step: string, detail: string) =>
    setLog((p) => [...p, { time: now(), step, detail }]);

  const methodData = () =>
    method === "basic-card"
      ? [{ supportedMethods: "basic-card", data: { supportedNetworks: ["visa", "mastercard"], supportedTypes: ["debit", "credit"] } }]
      : [{ supportedMethods: "https://example.com/pay", data: { merchantId: "demo-merchant" } }];

  const detailsData = () => ({
    total: { label: "IconVault Pro demo", amount: { currency, value: total || "0.00" } },
    displayItems: [
      { label: "Subtotal", amount: { currency, value: (parseFloat(total) || 0).toFixed(2) } },
      { label: "Tax (est.)", amount: { currency, value: ((parseFloat(total) || 0) * 0.08).toFixed(2) } },
    ],
  });

  const buildRequest = (): any | null => {
    if (!supported) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (window as any).PaymentRequest(methodData(), detailsData(), { requestShipping: false });
    } catch {
      return null;
    }
  };

  const checkCanMake = async () => {
    if (!trial.canUse) return;
    const req = buildRequest();
    if (!req) {
      push("canMakePayment()", "PaymentRequest not available in this browser");
      toast.error("PaymentRequest is not available here");
      return;
    }
    try {
      const result = await req.canMakePayment();
      const msg = result ? "true - a payment method can handle this request" : "false - no matching handler installed (normal in a demo tab)";
      setCanMakeResult(msg);
      push("canMakePayment()", msg);
      trial.recordUse();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "canMakePayment threw";
      setCanMakeResult(msg);
      push("canMakePayment()", msg);
    }
  };

  const startSimulation = () => {
    if (!trial.canUse) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSimStep(0);
    setLog([]);
    push("Simulation", `PaymentRequest built with method "${methodData()[0]?.supportedMethods}" and total ${currency} ${total || "0.00"}`);
    let step = 0;
    timerRef.current = setInterval(() => {
      step += 1;
      setSimStep(step);
      if (step === 1) push("show()", "Browser shows the payment sheet (method picker, shipping, contact)");
      if (step === 2) push("handler invoked", "The installed payment handler app receives the request and validates the total");
      if (step === 3) push("complete('success')", "Merchant receives the response; UI closes. No real charge was made");
      if (step >= 3) { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; }
    }, 1400);
    trial.recordUse();
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSimStep(0);
    setLog([]);
    setCanMakeResult(null);
  };

  const exportLog = () => {
    const text = log.map((l) => `[${l.time}] ${l.step} - ${l.detail}`).join("\n");
    downloadBlob(new Blob([text || "No events yet"], { type: "text/plain" }), "payment-handler-log.txt");
    toast.success("Session log downloaded");
  };

  return (
    <ToolPageShell toolId="payment-handler-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Payment Handler Playground" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-1 text-sm font-bold">Environment</p>
            <div className="space-y-1.5 text-[13px]">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">PaymentRequest API</span>
                <span className={cn("font-bold", supported ? "text-green-600" : "text-red-500")}>
                  {supported === null ? "Checking…" : supported ? "Supported" : "Not supported"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">Secure context</span>
                <span className={cn("font-bold", secure ? "text-green-600" : "text-red-500")}>
                  {secure === null ? "Checking…" : secure ? "Yes (HTTPS)" : "No - required"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {(["basic-card", "custom"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    method === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {m === "basic-card" ? "basic-card" : "custom URL"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Total</span>
              <input
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/[^0-9.]/g, ""))}
                inputMode="decimal"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Currency</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
                {["USD", "EUR", "GBP", "INR", "JPY", "AED"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton busy={false} disabled={!trial.canUse} onClick={checkCanMake}>
              <ShieldCheck className="h-4 w-4" /> canMakePayment()
            </ActionButton>
            <ActionButton busy={false} disabled={!trial.canUse} onClick={startSimulation}>
              <Play className="h-4 w-4" /> Run flow simulation
            </ActionButton>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-bold text-foreground/80"><Wallet className="h-3.5 w-3.5" /> Honest sandbox note</p>
            <p>
              A real charge needs a registered payment handler installed from the same origin, a secure (HTTPS)
              context, and merchant credentials. This lab constructs a genuine PaymentRequest and calls
              canMakePayment() against your browser; the step-through flow is simulated so nothing is ever charged.
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset lab
          </button>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-bold">Flow steps</p>
            <div className="flex flex-wrap items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2 font-mono text-xs font-semibold transition",
                      simStep > i ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300" : "border-border text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </div>
                  {i < STEPS.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              ))}
            </div>
            {canMakeResult && (
              <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
                <span className="font-bold">canMakePayment() → </span>{canMakeResult}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-bold"><CreditCard className="h-4 w-4" /> Session log</p>
              <button
                type="button"
                onClick={exportLog}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/40"
              >
                Download log
              </button>
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto font-mono text-xs">
              {log.length === 0 && <p className="text-muted-foreground">Run canMakePayment() or the simulation to fill this log.</p>}
              {log.map((l, i) => (
                <div key={i} className="rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">[{l.time}]</span>{" "}
                  <span className="font-bold text-primary">{l.step}</span>
                  <p className="text-foreground/80">{l.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
