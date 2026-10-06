// /tools/permissions-dashboard - Query the real Permissions API for camera, mic,
// geolocation, notifications and more. Live granted / denied / prompt states with
// working request buttons and copyable code snippets. Fully client-side.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Camera, Check, Copy, Info, Mic, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/permissions-dashboard";
import toolSeoMeta from "@/lib/tool-seo-meta-data/permissions-dashboard";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/permissions-dashboard")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/permissions-dashboard";
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
  component: PermissionsDashboard,
});

interface PermRow {
  name: string;
  label: string;
  icon: "camera" | "mic" | "pin" | "bell" | "other";
  state: "granted" | "denied" | "prompt" | "unsupported" | "checking";
  requestable: boolean;
}

const PERMISSIONS: { name: string; label: string; requestable: boolean }[] = [
  { name: "camera", label: "Camera", requestable: true },
  { name: "microphone", label: "Microphone", requestable: true },
  { name: "geolocation", label: "Geolocation", requestable: true },
  { name: "notifications", label: "Notifications", requestable: true },
  { name: "clipboard-read", label: "Clipboard read", requestable: false },
  { name: "clipboard-write", label: "Clipboard write", requestable: false },
  { name: "persistent-storage", label: "Persistent storage", requestable: true },
  { name: "midi", label: "MIDI", requestable: true },
  { name: "background-sync", label: "Background sync", requestable: false },
  { name: "accelerometer", label: "Accelerometer", requestable: false },
  { name: "gyroscope", label: "Gyroscope", requestable: false },
  { name: "magnetometer", label: "Magnetometer", requestable: false },
  { name: "ambient-light-sensor", label: "Ambient light", requestable: false },
  { name: "screen-wake-lock", label: "Screen wake lock", requestable: false },
];

const iconFor = (name: string) => {
  if (name === "camera") return Camera;
  if (name === "microphone") return Mic;
  if (name === "notifications") return Bell;
  return ShieldCheck;
};

function PermissionsDashboard() {
  const { isPro } = usePlan();
  const trial = useToolTrial("permissions-dashboard", isPro);
  const seo = toolSeo;

  const [rows, setRows] = useState<PermRow[]>(() =>
    PERMISSIONS.map((p) => ({ name: p.name, label: p.label, icon: "other", state: "checking", requestable: p.requestable })),
  );
  const [copied, setCopied] = useState(false);

  const queryAll = async () => {
    const next = await Promise.all(
      PERMISSIONS.map(async (p): Promise<PermRow> => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const res = await (navigator.permissions as any).query({ name: p.name });
          return { name: p.name, label: p.label, icon: "other", state: res.state as PermRow["state"], requestable: p.requestable };
        } catch {
          return { name: p.name, label: p.label, icon: "other", state: "unsupported", requestable: p.requestable };
        }
      }),
    );
    setRows(next);
  };

  useEffect(() => {
    void queryAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    if (!trial.canUse) return;
    await queryAll();
    trial.recordUse();
    toast.success("Permission states refreshed");
  };

  const requestPerm = async (name: string) => {
    if (!trial.canUse) return;
    try {
      if (name === "notifications") {
        const r = await Notification.requestPermission();
        toast.info(`Notifications: ${r}`);
      } else if (name === "camera" || name === "microphone") {
        const stream = await navigator.mediaDevices.getUserMedia({ video: name === "camera", audio: name === "microphone" });
        stream.getTracks().forEach((t) => t.stop());
        toast.success(`${name} granted - test stream opened and closed`);
      } else if (name === "geolocation") {
        await new Promise<void>((res, rej) => navigator.geolocation.getCurrentPosition(() => res(), (e) => rej(new Error(e.message)), { timeout: 15000 }));
        toast.success("Geolocation granted");
      } else if (name === "persistent-storage") {
        const granted = await navigator.storage.persist();
        toast.info(`Persistent storage: ${granted ? "granted" : "not granted"}`);
      } else if (name === "midi") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator as any).requestMIDIAccess();
        toast.success("MIDI granted");
      }
      trial.recordUse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Permission request failed");
    }
    await queryAll();
  };

  const snippet = `// Query a permission state
const res = await navigator.permissions.query({ name: "camera" });
console.log(res.state); // "granted" | "denied" | "prompt"

// Listen for changes
res.onchange = () => console.log("Now:", res.state);`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Snippet copied");
    } catch {
      toast.error("Clipboard blocked - copy the text manually");
    }
  };

  const counts = {
    granted: rows.filter((r) => r.state === "granted").length,
    denied: rows.filter((r) => r.state === "denied").length,
    prompt: rows.filter((r) => r.state === "prompt").length,
    unsupported: rows.filter((r) => r.state === "unsupported").length,
  };

  return (
    <ToolPageShell toolId="permissions-dashboard" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Permissions Dashboard" left={trial.left} />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {(["granted", "denied", "prompt", "unsupported"] as const).map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className={cn("text-2xl font-black", s === "granted" && "text-green-600", s === "denied" && "text-red-500", s === "prompt" && "text-amber-500", s === "unsupported" && "text-muted-foreground")}>
              {counts[s]}
            </p>
            <p className="text-xs font-semibold capitalize text-muted-foreground">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold">Live permission states</p>
            <ActionButton busy={false} disabled={!trial.canUse} onClick={refresh}>
              <RefreshCw className="h-4 w-4" /> Refresh all
            </ActionButton>
          </div>
          <div className="space-y-2">
            {rows.map((r) => {
              const Icon = iconFor(r.name);
              return (
                <div key={r.name} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{r.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{r.name}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      r.state === "granted" && "bg-green-500/15 text-green-600",
                      r.state === "denied" && "bg-red-500/15 text-red-500",
                      r.state === "prompt" && "bg-amber-500/15 text-amber-600",
                      (r.state === "unsupported" || r.state === "checking") && "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.state}
                  </span>
                  {r.requestable && r.state !== "unsupported" && (
                    <button
                      type="button"
                      onClick={() => void requestPerm(r.name)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40"
                    >
                      Request
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-1.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Some browsers do not expose every permission name, and "Request" triggers the real browser prompt.
              A "denied" state often means the site was blocked in browser settings, not in this lab.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">How it works</p>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:border-primary/40"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">{snippet}</pre>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground">
            <p className="mb-2 text-sm font-bold text-foreground">Permission gotchas</p>
            <ul className="list-disc space-y-1.5 pl-4">
              <li><span className="font-semibold text-foreground/80">prompt</span> means "not decided yet" - the first Request click shows the browser dialog.</li>
              <li>Geolocation and camera prompts only fire from a user gesture, which these buttons provide.</li>
              <li>MIDI in Chrome requires the <span className="font-mono">webmidi</span> permission and shows a checkbox for SysEx access.</li>
              <li>Denied permissions usually must be reset in the browser's site settings; the API cannot override a deny.</li>
            </ul>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
