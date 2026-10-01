// /tools/web-otp-playground - Learn the WebOTP API: capability detection,
// correct SMS format builder, and the autocomplete="one-time-code" pattern.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, KeyRound, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-otp-playground")({
  head: () => {
    const seo = getToolSeoMeta("web-otp-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: WebOtpTool,
});

function WebOtpTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-otp-playground", isPro);
  const seo = getToolSeo("web-otp-playground");

  const [webOtp, setWebOtp] = useState<boolean | null>(null);
  const [https, setHttps] = useState<boolean | null>(null);
  const [domain, setDomain] = useState("example.com");
  const [code, setCode] = useState("739184");
  const [otpInput, setOtpInput] = useState("");

  useEffect(() => {
    setWebOtp(typeof window !== "undefined" && "OTPCredential" in window && !!navigator.credentials);
    setHttps(typeof window !== "undefined" && window.location.protocol === "https:");
  }, []);

  const sms = `Your ${domain} verification code: ${code}\n\n@${domain} #${code}`;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked - select and copy manually.");
    }
  };

  const snippet = `// Read an SMS one-time code with the WebOTP API
if ("OTPCredential" in window) {
  const ac = new AbortController();
  setTimeout(() => ac.abort(), 60_000); // stop listening after 1 min

  const cred = await navigator.credentials.get({
    otp: { transport: ["sms"] },
    signal: ac.signal,
  });
  if (cred && "code" in cred) {
    console.log("Code:", cred.code);
  }
}`;

  return (
    <ToolPageShell toolId="web-otp-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web OTP" left={trial.left} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">WebOTP support</p>
          <p className={cn("mt-1 text-lg font-bold", webOtp ? "text-emerald-500" : "text-amber-500")}>
            {webOtp === null ? "Checking…" : webOtp ? "Supported" : "Not detected"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Chrome/Edge on Android with Play Services.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Secure context</p>
          <p className={cn("mt-1 text-lg font-bold", https ? "text-emerald-500" : "text-amber-500")}>
            {https === null ? "Checking…" : https ? "HTTPS" : "Not HTTPS"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">WebOTP only works on HTTPS origins.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">SMS autofill</p>
          <p className="mt-1 text-lg font-bold text-emerald-500">Try below</p>
          <p className="mt-1 text-xs text-muted-foreground">
            On iOS and most browsers, autocomplete="one-time-code" fills codes from SMS.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <MessageSquareText className="h-5 w-5 text-primary" /> SMS format lab
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              WebOTP only reads messages whose <strong>last line</strong> is exactly <code>@yourdomain.com #123456</code>.
              Type a domain and code to build a valid sample message.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Domain</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value.replace(/\s/g, ""))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                inputMode="numeric"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <pre className="whitespace-pre-wrap rounded-xl bg-muted p-4 font-mono text-sm">{sms}</pre>

          <ActionButton
            disabled={!trial.canUse}
            onClick={() => {
              trial.recordUse();
              void copy(sms, "Sample SMS");
            }}
          >
            <ClipboardCopy className="h-4 w-4" /> Copy sample SMS
          </ActionButton>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• The binding line must be the <strong>last line</strong> of the message.</li>
            <li>• The domain must match the website origin requesting the code.</li>
            <li>• A real SMS costs a real send - this lab builds the format only.</li>
          </ul>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <KeyRound className="h-5 w-5 text-primary" /> Try the autofill pattern
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This is the exact input your login form needs. On a real phone, a matching SMS offers to fill it automatically.
            </p>
            <input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="Enter code"
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Markup: <code>&lt;input autocomplete="one-time-code" inputmode="numeric" /&gt;</code>
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">navigator.credentials.get snippet</h2>
              <button
                type="button"
                onClick={() => void copy(snippet, "Snippet")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ClipboardCopy className="h-3.5 w-3.5" /> Copy
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
