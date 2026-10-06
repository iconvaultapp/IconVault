// /tools/cors-preflight-flow - Step through the browser's CORS decision algorithm
// across 8 realistic scenarios: simple vs preflighted requests, allow vs block.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ChevronRight, Globe, RotateCcw, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/cors-preflight-flow";
import toolSeoMeta from "@/lib/tool-seo-meta-data/cors-preflight-flow";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/cors-preflight-flow")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/cors-preflight-flow";
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
  component: CorsFlow,
});

type Verdict = "pass" | "fail" | "info";
type Step = { title: string; detail: string; verdict: Verdict };
type Scenario = {
  id: string; name: string; tag: string;
  request: { method: string; url: string; headers: string[]; credentials: boolean };
  steps: Step[];
  allowed: boolean;
  summary: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: "simple-get", name: "Simple GET, public API", tag: "Allowed",
    request: { method: "GET", url: "https://api.example.com/posts", headers: ["Accept: application/json"], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Origin https://app.example.org differs from https://api.example.com, so this is a cross-origin request.", verdict: "info" },
      { title: "Simple request?", detail: "GET is a CORS-safelisted method and Accept is a CORS-safelisted header. No preflight needed.", verdict: "pass" },
      { title: "Send the actual request", detail: "Browser sends GET directly, with an Origin header.", verdict: "info" },
      { title: "Check the response", detail: "Response includes Access-Control-Allow-Origin: *. The requesting origin is allowed, so JavaScript can read the response.", verdict: "pass" },
    ],
    allowed: true,
    summary: "Simple requests skip preflight entirely. The browser only checks ACAO on the way back.",
  },
  {
    id: "simple-post", name: "POST form submit", tag: "Allowed",
    request: { method: "POST", url: "https://api.example.com/contact", headers: ["Content-Type: application/x-www-form-urlencoded"], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin: the page and the API live on different origins.", verdict: "info" },
      { title: "Simple request?", detail: "POST is safelisted, and application/x-www-form-urlencoded is a safelisted content type. No preflight.", verdict: "pass" },
      { title: "Send the actual request", detail: "Browser sends POST directly with the Origin header.", verdict: "info" },
      { title: "Check the response", detail: "ACAO: https://app.example.org matches the request origin. Response readable.", verdict: "pass" },
    ],
    allowed: true,
    summary: "Classic HTML form posts are simple requests. Only multipart/form-data, urlencoded and text/plain content types qualify.",
  },
  {
    id: "json-post", name: "POST with JSON body", tag: "Preflight, allowed",
    request: { method: "POST", url: "https://api.example.com/users", headers: ["Content-Type: application/json"], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin request.", verdict: "info" },
      { title: "Simple request?", detail: "application/json is NOT a CORS-safelisted content type, so this is a preflighted request.", verdict: "fail" },
      { title: "Preflight: OPTIONS", detail: "Browser sends OPTIONS with Access-Control-Request-Method: POST and Access-Control-Request-Headers: content-type.", verdict: "info" },
      { title: "Preflight response", detail: "Server replies 204 with ACAO: *, ACAM: POST, GET, OPTIONS, ACAH: content-type. Everything the browser asked for is permitted.", verdict: "pass" },
      { title: "Send the actual request", detail: "Preflight passed, so the browser now sends the real POST with the JSON body.", verdict: "pass" },
      { title: "Check the response", detail: "Response carries ACAO: *. JavaScript can read it.", verdict: "pass" },
    ],
    allowed: true,
    summary: "JSON APIs almost always trigger a preflight because application/json is not a safelisted content type.",
  },
  {
    id: "put", name: "PUT update", tag: "Preflight, allowed",
    request: { method: "PUT", url: "https://api.example.com/users/7", headers: ["Content-Type: application/json"], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin request.", verdict: "info" },
      { title: "Simple request?", detail: "PUT is not a safelisted method. Preflight required.", verdict: "fail" },
      { title: "Preflight: OPTIONS", detail: "Browser asks: is PUT allowed, with content-type?", verdict: "info" },
      { title: "Preflight response", detail: "ACAM includes PUT, ACAH includes content-type. Approved.", verdict: "pass" },
      { title: "Actual request", detail: "The PUT goes through and its ACAO header checks out.", verdict: "pass" },
    ],
    allowed: true,
    summary: "PUT, PATCH and DELETE always need a preflight, even with no custom headers.",
  },
  {
    id: "api-key", name: "Custom X-API-Key header", tag: "Preflight, allowed",
    request: { method: "GET", url: "https://api.example.com/data", headers: ["X-API-Key: secret-123"], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin request.", verdict: "info" },
      { title: "Simple request?", detail: "GET is safelisted, but X-API-Key is a non-safelisted header. Any custom header forces a preflight.", verdict: "fail" },
      { title: "Preflight: OPTIONS", detail: "Browser sends Access-Control-Request-Headers: x-api-key.", verdict: "info" },
      { title: "Preflight response", detail: "Server lists x-api-key in ACAH. Approved.", verdict: "pass" },
      { title: "Actual request", detail: "GET with the API key goes through; response readable.", verdict: "pass" },
    ],
    allowed: true,
    summary: "One custom header is enough to turn an otherwise simple GET into a preflighted request.",
  },
  {
    id: "method-denied", name: "DELETE not allowed by server", tag: "Blocked",
    request: { method: "DELETE", url: "https://api.example.com/users/7", headers: [], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin request.", verdict: "info" },
      { title: "Simple request?", detail: "DELETE is not safelisted. Preflight required.", verdict: "fail" },
      { title: "Preflight: OPTIONS", detail: "Browser asks permission for DELETE.", verdict: "info" },
      { title: "Preflight response", detail: "Server replies ACAM: GET, POST only. DELETE is missing.", verdict: "fail" },
    ],
    allowed: false,
    summary: "Blocked at the preflight: the actual DELETE is never sent. Fix: add DELETE to Access-Control-Allow-Methods on the server.",
  },
  {
    id: "no-acao", name: "Missing ACAO on response", tag: "Blocked",
    request: { method: "GET", url: "https://api.example.com/posts", headers: ["Accept: application/json"], credentials: false },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin request.", verdict: "info" },
      { title: "Simple request?", detail: "Simple GET, no preflight needed.", verdict: "pass" },
      { title: "Send the actual request", detail: "The request goes out and the server responds 200 with the data.", verdict: "info" },
      { title: "Check the response", detail: "No Access-Control-Allow-Origin header on the response. The browser received the data but refuses to expose it to JavaScript.", verdict: "fail" },
    ],
    allowed: false,
    summary: "The #1 CORS bug: the server worked fine, but without ACAO the browser hides the response. The network tab shows 200 while fetch() throws.",
  },
  {
    id: "credentials-star", name: "Credentials with ACAO: *", tag: "Blocked",
    request: { method: "GET", url: "https://api.example.com/me", headers: [], credentials: true },
    steps: [
      { title: "Same-origin check", detail: "Cross-origin request with credentials: include (cookies sent).", verdict: "info" },
      { title: "Simple request?", detail: "Simple GET, no preflight.", verdict: "pass" },
      { title: "Send with credentials", detail: "Browser attaches cookies because credentials mode is include.", verdict: "info" },
      { title: "Check the response", detail: "Server replied ACAO: *. With credentials, a wildcard origin is rejected: the server must echo the exact origin AND send Access-Control-Allow-Credentials: true.", verdict: "fail" },
    ],
    allowed: false,
    summary: "Credentialed requests can never use ACAO: *. Fix: echo the request Origin and add ACAC: true on the server.",
  },
];

function CorsFlow() {
  const { isPro } = usePlan();
  const trial = useToolTrial("cors-preflight-flow", isPro);
  const seo = toolSeo;

  const [active, setActive] = useState<Scenario>(SCENARIOS[2]!);
  const [stepIdx, setStepIdx] = useState(0);

  const start = (s: Scenario) => {
    if (!trial.canUse) return;
    setActive(s);
    setStepIdx(0);
    trial.recordUse();
  };

  const next = () => setStepIdx((i) => Math.min(i + 1, active.steps.length));
  const reset = () => setStepIdx(0);
  const done = stepIdx >= active.steps.length;

  return (
    <ToolPageShell toolId="cors-preflight-flow" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CORS Preflight Flow" left={trial.left} />

      <div className="mb-5">
        <p className="mb-2 text-[13px] font-medium text-foreground/80">Pick a scenario</p>
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button key={s.id} type="button" onClick={() => start(s)}
              className={cn("inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                active.id === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {s.allowed ? <ShieldCheck className="h-4 w-4 text-emerald-500" /> : <ShieldAlert className="h-4 w-4 text-red-500" />}
              {s.name}
            </button>
          ))}
        </div>
        {!isPro && <p className="mt-2 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free walkthroughs left.</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Request card */}
        <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-base font-extrabold">{active.name}</h2>
          </div>
          <div className="rounded-xl bg-muted/60 p-3 font-mono text-xs leading-relaxed">
            <div><span className="font-bold text-primary">{active.request.method}</span> {active.request.url}</div>
            <div className="mt-1 text-muted-foreground">Origin: https://app.example.org</div>
            {active.request.headers.map((h) => <div key={h} className="text-muted-foreground">{h}</div>)}
            <div className="text-muted-foreground">credentials: {active.request.credentials ? "include" : "same-origin"}</div>
          </div>
          <p className="text-sm text-muted-foreground">{active.summary}</p>
          <div className="flex gap-2">
            <ActionButton onClick={next} disabled={done}>
              {done ? "Walkthrough complete" : `Next step (${stepIdx + 1}/${active.steps.length})`} <ChevronRight className="h-4 w-4" />
            </ActionButton>
            <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold transition hover:border-primary/50">
              <RotateCcw className="h-4 w-4" /> Replay
            </button>
          </div>
          {done && (
            <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm font-semibold",
              active.allowed ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300")}>
              {active.allowed ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
              {active.allowed ? "Verdict: JavaScript can read the response." : "Verdict: the browser blocks the response. See the failing step above for the fix."}
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">The browser's decision algorithm</p>
          <ol className="relative space-y-4 border-l-2 border-border pl-6">
            {active.steps.map((s, i) => {
              const revealed = i < stepIdx;
              return (
                <li key={i} className={cn("relative transition-opacity", revealed ? "opacity-100" : "opacity-30")}>
                  <span className={cn("absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-card",
                    revealed && s.verdict === "pass" && "border-emerald-500 text-emerald-500",
                    revealed && s.verdict === "fail" && "border-red-500 text-red-500",
                    revealed && s.verdict === "info" && "border-sky-500 text-sky-500",
                    !revealed && "border-border text-muted-foreground")}>
                    {revealed ? (s.verdict === "pass" ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.verdict === "fail" ? <XCircle className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />)
                      : <span className="font-mono text-[10px] font-bold">{i + 1}</span>}
                  </span>
                  <p className="text-sm font-bold">{s.title}</p>
                  {revealed && <p className="mt-0.5 text-sm text-muted-foreground">{s.detail}</p>}
                </li>
              );
            })}
          </ol>
          {stepIdx === 0 && <p className="mt-4 text-sm text-muted-foreground">Press "Next step" to walk through exactly what the browser checks, in order.</p>}
        </div>
      </div>
    </ToolPageShell>
  );
}
