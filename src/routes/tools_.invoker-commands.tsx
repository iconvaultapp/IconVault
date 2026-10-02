// /tools/invoker-commands - Live demos of the HTML command/commandfor
// attributes: dialogs, popovers and media controls with zero JavaScript.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Terminal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/invoker-commands")({
  head: () => {
    const seo = getToolSeoMeta("invoker-commands");
    const canonical = "https://iconvault.site/tools/invoker-commands";
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
  component: InvokerTool,
});

interface Demo {
  id: string;
  name: string;
  blurb: string;
  html: string;
}

/* The demos below use the real command/commandfor attributes. React passes
   unknown attributes straight through to the DOM, so command and commandfor
   work without any JavaScript wiring. */

const DEMOS: Demo[] = [
  {
    id: "dialog",
    name: "Dialog show / close",
    blurb: "A modal dialog opened and closed by buttons alone. Focus trapping and Esc come free.",
    html: `<button command="show-modal" commandfor="signup-dialog">Open signup</button>

<dialog id="signup-dialog" closedby="any">
  <h2>Create account</h2>
  <form method="dialog">
    <input type="email" placeholder="you@site.com" required>
    <button>Join</button>
  </form>
  <button command="close" commandfor="signup-dialog">Cancel</button>
</dialog>`,
  },
  {
    id: "popover",
    name: "Popover toggle",
    blurb: "Light-dismiss tooltips and menus. command=\"toggle-popover\" is the canonical pattern.",
    html: `<button command="toggle-popover" commandfor="hint-pop">What is this?</button>

<div id="hint-pop" popover>
  <strong>Popover</strong>
  <p>Click anywhere outside to dismiss. No JS, no positioning library.</p>
</div>`,
  },
  {
    id: "media",
    name: "Media controls",
    blurb: "Play, pause and mute an audio element declaratively. The tone is generated in your browser.",
    html: `<button command="play" commandfor="tone-player">Play</button>
<button command="pause" commandfor="tone-player">Pause</button>
<button command="mute" commandfor="tone-player">Mute</button>

<audio id="tone-player" src="tone.wav"></audio>`,
  },
  {
    id: "details",
    name: "Details toggle",
    blurb: "Command buttons can open and close disclosure widgets too.",
    html: `<button command="toggle" commandfor="faq-1">How does this work?</button>

<details id="faq-1">
  <summary>How does this work?</summary>
  <p>The button's command targets the details element, so the answer toggles without JavaScript.</p>
</details>`,
  },
];

/** Generate a short sine-tone WAV in the browser so the media demo has real audio. */
function makeToneWav(): string {
  const seconds = 2;
  const rate = 22050;
  const n = seconds * rate;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const sample = Math.sin(2 * Math.PI * 440 * t) * Math.sin(2 * Math.PI * 2 * t) * 0.4;
    v.setInt16(44 + i * 2, sample * 32767, true);
  }
  const blob = new Blob([buf], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function InvokerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("invoker-commands", isPro);
  const seo = getToolSeo("invoker-commands");

  const [active, setActive] = useState(DEMOS[0]!);
  const [copied, setCopied] = useState(false);
  const [supported] = useState(() => typeof HTMLElement !== "undefined" && "command" in HTMLElement.prototype);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const url = makeToneWav();
    if (audioRef.current) audioRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, []);

  const copyCode = async () => {
    if (!trial.canUse) return;
    if (await copyText(active.html)) {
      trial.recordUse();
      setCopied(true);
      toast.success(`${active.name} HTML copied`);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed - select the code manually.");
    }
  };

  return (
    <ToolPageShell toolId="invoker-commands" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Invoker Commands" left={trial.left} />

      {!supported && (
        <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <strong>Browser note:</strong> your browser does not support the <code className="rounded bg-muted px-1 font-mono">command</code> attribute yet
          (Chrome 135+, Edge 135+). The code samples below still work where supported.
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {DEMOS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setActive(d)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              active.id === d.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            <h2 className="font-extrabold">Live demo - {active.name}</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">{active.blurb}</p>
          <div className="min-h-[280px] rounded-xl border border-dashed border-border bg-muted/20 p-6">
            {active.id === "dialog" && (
              <div className="space-y-3">
                {/* @ts-expect-error - command/commandfor are new HTML attributes */}
                <button command="show-modal" commandfor="demo-dialog" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                  Open signup dialog
                </button>
                <dialog id="demo-dialog" closedby="any" className="rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop:bg-black/50">
                  <h3 className="text-lg font-extrabold">Create account</h3>
                  <p className="mt-1 text-sm text-muted-foreground">This dialog opened with zero JavaScript.</p>
                  <form method="dialog" className="mt-4 flex gap-2">
                    <input type="email" required placeholder="you@site.com" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Join</button>
                  </form>
                  <div className="mt-3">
                    {/* @ts-expect-error - new HTML attributes */}
                    <button command="close" commandfor="demo-dialog" className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:border-primary/40">
                      Cancel
                    </button>
                  </div>
                </dialog>
                <p className="text-xs text-muted-foreground">Try Esc or clicking the backdrop - focus is trapped automatically.</p>
              </div>
            )}
            {active.id === "popover" && (
              <div className="space-y-3">
                {/* @ts-expect-error - new HTML attributes */}
                <button command="toggle-popover" commandfor="demo-pop" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                  What is a popover?
                </button>
                <div id="demo-pop" popover="auto" className="max-w-xs rounded-2xl border border-border bg-card p-4 shadow-2xl">
                  <p className="text-sm font-extrabold">Popover</p>
                  <p className="mt-1 text-sm text-muted-foreground">Click anywhere outside to dismiss. No JS, no positioning library.</p>
                </div>
                <p className="text-xs text-muted-foreground">Toggle it again to hide. Light dismiss is built in.</p>
              </div>
            )}
            {active.id === "media" && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {/* @ts-expect-error - new HTML attributes */}
                  <button command="play" commandfor="demo-audio" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">Play</button>
                  {/* @ts-expect-error - new HTML attributes */}
                  <button command="pause" commandfor="demo-audio" className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/40">Pause</button>
                  {/* @ts-expect-error - new HTML attributes */}
                  <button command="mute" commandfor="demo-audio" className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-primary/40">Mute</button>
                </div>
                <audio ref={audioRef} id="demo-audio" controls className="w-full" />
                <p className="text-xs text-muted-foreground">The 2-second tone is synthesized in your browser. The buttons drive it via command only.</p>
              </div>
            )}
            {active.id === "details" && (
              <div className="space-y-3">
                {/* @ts-expect-error - new HTML attributes */}
                <button command="toggle" commandfor="demo-details" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">
                  Toggle the answer
                </button>
                <details id="demo-details" className="rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-bold">How does this work?</summary>
                  <p className="mt-2 text-sm text-muted-foreground">The button's command targets the details element, so the disclosure toggles without JavaScript.</p>
                </details>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-extrabold">HTML source</h2>
            <ActionButton busy={false} disabled={!trial.canUse} onClick={copyCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy HTML"}
            </ActionButton>
          </div>
          <pre className="max-h-[420px] overflow-auto rounded-xl bg-zinc-950 p-4 text-[12.5px] leading-relaxed text-zinc-200">
            <code>{active.html}</code>
          </pre>
          <div className="mt-4 rounded-xl bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Built-in commands:</strong> show-modal, close, show-popover,
            hide-popover, toggle-popover, play, pause, mute, unmute, toggle (details), request-close,
            and custom commands via <code className="rounded bg-muted px-1 font-mono">commandevent</code> listeners on any element.
          </div>
          {!isPro && (
            <p className="mt-3 text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
