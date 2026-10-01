// /tools/alt-text-helper - Draft and polish image alt text with live
// accessibility feedback: ideal length, redundant phrases, keyword stuffing,
// decorative-image guidance. Runs 100% in the browser.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert, Copy, FileUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/alt-text-helper")({
  head: () => {
    const seo = getToolSeoMeta("alt-text-helper");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: AltTextHelperTool,
});

const REDUNDANT = ["image of", "picture of", "photo of", "photograph of", "screenshot of", "icon of", "graphic of", "logo of"];
const IDEAL_MAX = 125;

interface Note {
  kind: "ok" | "warn" | "error";
  text: string;
}

function analyze(alt: string, decorative: boolean): Note[] {
  const notes: Note[] = [];
  const trimmed = alt.trim();

  if (decorative) {
    if (trimmed.length > 0) {
      notes.push({ kind: "warn", text: "Decorative images should use empty alt (alt=\"\"). Clear the text so screen readers skip it." });
    } else {
      notes.push({ kind: "ok", text: "Decorative marked and alt empty - screen readers will skip this image." });
    }
    return notes;
  }

  if (trimmed.length === 0) {
    notes.push({ kind: "error", text: "Alt text is empty. Describe what the image shows, or mark it decorative if it adds no information." });
    return notes;
  }

  const len = trimmed.length;
  if (len <= IDEAL_MAX) {
    notes.push({ kind: "ok", text: `Length is ${len} characters - inside the ${IDEAL_MAX}-character sweet spot.` });
  } else if (len <= 150) {
    notes.push({ kind: "warn", text: `Length is ${len} characters - slightly over the ${IDEAL_MAX}-character ideal. Trim filler words.` });
  } else {
    notes.push({ kind: "error", text: `Length is ${len} characters - most screen readers cut off around 125-150. Shorten it.` });
  }

  const lower = trimmed.toLowerCase();
  const found = REDUNDANT.filter((p) => lower.includes(p));
  if (found.length > 0) {
    notes.push({ kind: "warn", text: `Redundant opener (${found[0]}): screen readers already announce it is an image, so start with the subject.` });
  } else {
    notes.push({ kind: "ok", text: "No redundant openers - you are not wasting words saying it is an image." });
  }

  const words = lower.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length > 35) {
    notes.push({ kind: "warn", text: `${words.length} words is very long - possible keyword stuffing. Alt text is not an SEO keyword field.` });
  }
  const freq = new Map<string, number>();
  for (const w of words) {
    if (w.length > 3) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  const repeated = [...freq.entries()].filter(([, n]) => n >= 4).map(([w]) => w);
  const repeatWord = repeated[0];
  if (repeatWord) {
    notes.push({ kind: "warn", text: `Word "${repeatWord}" repeats ${freq.get(repeatWord) ?? 0} times - sounds like keyword stuffing to a screen reader.` });
  }

  if (/[.!?]$/.test(trimmed)) {
    notes.push({ kind: "ok", text: "Ends with punctuation, which helps some screen readers pause correctly." });
  } else {
    notes.push({ kind: "warn", text: "Consider ending with a period so screen readers pause naturally." });
  }

  return notes;
}

function AltTextHelperTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("alt-text-helper", isPro);
  const seo = getToolSeo("alt-text-helper");

  const [previewUrl, setPreviewUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const notes = useMemo(() => analyze(alt, decorative), [alt, decorative]);

  const acceptFile = (f: File) => {
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(f));
  };

  const copyAlt = () => {
    if (!trial.canUse) {
      toast.error("Trial limit reached. Go Pro for unlimited use.");
      return;
    }
    const text = decorative ? "" : alt.trim();
    if (!text) {
      toast.error(decorative ? "Nothing to copy - alt should be empty for decorative images." : "Write some alt text first.");
      return;
    }
    void navigator.clipboard.writeText(text).then(() => {
      trial.recordUse();
      toast.success("Alt text copied to clipboard");
    }).catch(() => toast.error("Clipboard blocked by the browser."));
  };

  return (
    <ToolPageShell toolId="alt-text-helper" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Alt Text Helper" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex min-h-[180px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Uploaded preview" className="max-h-44 rounded-lg" />
            ) : (
              <>
                <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-semibold">Drop the image here</p>
                <p className="mt-1 text-xs text-muted-foreground">Preview only - never uploaded</p>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />
          </div>

          <div>
            <label htmlFor="alt-input" className="mb-2 block text-[13px] font-medium text-foreground/80">
              Draft your alt text
            </label>
            <textarea
              id="alt-input"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              rows={4}
              disabled={decorative}
              placeholder='e.g. "Barista pouring latte art into a ceramic cup on a wooden counter"'
              className="w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 disabled:opacity-50"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={decorative}
              onChange={(e) => setDecorative(e.target.checked)}
              className="mt-1 h-4 w-4 accent-teal-600"
            />
            <span>
              <span className="font-semibold">This image is decorative</span>
              <span className="block text-xs text-muted-foreground">It adds no information - it should get an empty alt attribute.</span>
            </span>
          </label>

          <ActionButton busy={false} disabled={(!alt.trim() && !decorative) || !trial.canUse} onClick={copyAlt}>
            <Copy className="h-4 w-4" /> Copy alt text
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Live feedback</h2>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Upload an image and start typing to get feedback.</p>
            ) : (
              <ul className="space-y-2.5">
                {notes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                    {n.kind === "ok" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    ) : n.kind === "warn" ? (
                      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                    )}
                    <p className="text-sm">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Alt text rules of thumb</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Describe the image's purpose, not every pixel: what would a reader miss if the image vanished?</li>
              <li>Never start with "image of" - screen readers announce the element type already.</li>
              <li>Keep it under {IDEAL_MAX} characters; most screen readers truncate long alt text.</li>
              <li>Do not stuff keywords - alt text is for people using assistive tech, not rankings.</li>
              <li>Pure decoration (borders, spacers, background flourishes) gets <code className="rounded bg-muted px-1.5 py-0.5 text-xs">alt=""</code> so it is skipped.</li>
              <li>Charts and infographics need a longer text alternative nearby, not just one line.</li>
            </ul>
          </div>
        </div>
      </div>

    </ToolPageShell>
  );
}
