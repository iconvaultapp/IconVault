// /tools/timestamp-converter - epoch ⇄ human date, both directions,
// 100% client-side. Unit toggle (seconds / milliseconds) + "Now" shortcut.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Clock, Timer } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/timestamp-converter")({
  head: () => {
    const seo = getToolSeoMeta("timestamp-converter");
    const canonical = "https://iconvault.site/tools/timestamp-converter";
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
  component: TimestampConverterTool,
});

type Unit = "s" | "ms";
type DetectedUnit = "seconds" | "milliseconds" | "microseconds" | "nanoseconds";

/** Auto-detect epoch unit from digit length (non-digits stripped first). */
function detectUnit(digits: string): DetectedUnit | null {
  switch (digits.length) {
    case 10:
      return "seconds";
    case 13:
      return "milliseconds";
    case 16:
      return "microseconds";
    case 19:
      return "nanoseconds";
    default:
      return null;
  }
}

/** Seconds → "1d 2h 3m 4s". */
function secToHuman(total: number): string {
  if (!Number.isFinite(total) || total < 0) return "-";
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

/** Parse "2d 5h 30m 10s" tokens → total seconds. */
function humanToSec(str: string): number | null {
  const re = /(\d+(?:\.\d+)?)\s*([dhms])/gi;
  let total = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    matched = true;
    const v = parseFloat(m[1] ?? "");
    const u = (m[2] ?? "").toLowerCase();
    total += v * (u === "d" ? 86400 : u === "h" ? 3600 : u === "m" ? 60 : 1);
  }
  return matched ? total : null;
}

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const units: [string, number][] = [
    ["year", 31557600000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  for (const [name, u] of units) {
    if (abs >= u) {
      const n = Math.floor(abs / u);
      return diff > 0
        ? `${n} ${name}${n === 1 ? "" : "s"} ago`
        : `in ${n} ${name}${n === 1 ? "" : "s"}`;
    }
  }
  return "just now";
}

interface ForwardResult {
  iso: string;
  local: string;
  rel: string;
}

interface ReverseResult {
  s: number;
  ms: number;
  iso: string;
}

function copy(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error("Copy failed"));
}

function TimestampConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("timestamp-converter", isPro);
  const seo = getToolSeo("timestamp-converter");

  const [epochInput, setEpochInput] = useState("");
  const [unit, setUnit] = useState<Unit>("s");
  const [forward, setForward] = useState<ForwardResult | null>(null);
  const [dtInput, setDtInput] = useState("");
  const [reverse, setReverse] = useState<ReverseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durSec, setDurSec] = useState("");
  const [durHuman, setDurHuman] = useState("");

  // Live auto-detect label for whatever the user has typed.
  const autoUnit = detectUnit(epochInput.replace(/\D/g, ""));

  const convert = () => {
    if (!trial.canUse) return;
    const raw = epochInput.trim();
    const digits = raw.replace(/\D/g, "");
    const auto = detectUnit(digits);
    let ms: number;
    if (auto) {
      // BigInt-safe: 19-digit nanosecond values exceed Number.MAX_SAFE_INTEGER.
      const big = BigInt(digits);
      const msBig =
        auto === "seconds" ? big * 1000n
        : auto === "milliseconds" ? big
        : auto === "microseconds" ? big / 1000n
        : big / 1_000_000n;
      ms = Number(msBig);
    } else {
      const n = Number(raw);
      if (!raw || Number.isNaN(n)) {
        setError("Enter a valid epoch number first.");
        return;
      }
      ms = unit === "s" ? n * 1000 : n;
    }
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) {
      setError("That number is out of the valid date range.");
      return;
    }
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) {
      setError("That number is out of the valid date range.");
      return;
    }
    setForward({
      iso: d.toISOString(),
      local: d.toLocaleString(),
      rel: relTime(ms),
    });
    setError(null);
    trial.recordUse();
  };

  const convertBack = () => {
    if (!trial.canUse) return;
    if (!dtInput) {
      setError("Pick a date and time first.");
      return;
    }
    const ms = new Date(dtInput).getTime();
    if (Number.isNaN(ms)) {
      setError("Could not parse that date.");
      return;
    }
    setReverse({ s: Math.floor(ms / 1000), ms, iso: new Date(ms).toISOString() });
    setError(null);
    trial.recordUse();
  };

  const fillNow = () => {
    const ms = Date.now();
    setEpochInput(unit === "s" ? String(Math.floor(ms / 1000)) : String(ms));
  };

  return (
    <ToolPageShell toolId="timestamp-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Timestamp Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold">Epoch → date</h2>
          </div>
          <div className="flex gap-2">
            <input
              value={epochInput}
              onChange={(e) => setEpochInput(e.target.value)}
              placeholder="e.g. 1758872345, 1758872345123, …"
              inputMode="numeric"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            <div className="flex shrink-0 rounded-xl border border-border p-1">
              {(["s", "ms"] as Unit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                    unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u === "s" ? "sec" : "ms"}
                </button>
              ))}
            </div>
          </div>
          {autoUnit && (
            <p className="-mt-2 text-xs text-muted-foreground">
              detected: <span className="font-bold">{autoUnit}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton disabled={!epochInput.trim() || !trial.canUse} onClick={convert}>
              <ArrowLeftRight className="h-4 w-4" /> Convert
            </ActionButton>
            <button
              type="button" onClick={fillNow}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              Now
            </button>
          </div>
          {forward && (
            <div className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
              <button type="button" onClick={() => copy(forward.iso, "ISO date")} className="block w-full text-left hover:text-foreground">
                <span className="font-bold">UTC ISO:</span>{" "}
                <span className="font-mono text-muted-foreground">{forward.iso}</span>
              </button>
              <button type="button" onClick={() => copy(forward.local, "Local date")} className="block w-full text-left hover:text-foreground">
                <span className="font-bold">Local:</span>{" "}
                <span className="font-mono text-muted-foreground">{forward.local}</span>
              </button>
              <p>
                <span className="font-bold">Relative:</span>{" "}
                <span className="font-mono text-muted-foreground">{forward.rel}</span>
              </p>
              <p className="text-xs text-muted-foreground">Click UTC or Local to copy.</p>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-extrabold">Date → epoch</h2>
          </div>
          <input
            type="datetime-local"
            value={dtInput}
            onChange={(e) => setDtInput(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div>
            <ActionButton disabled={!dtInput || !trial.canUse} onClick={convertBack}>
              <ArrowLeftRight className="h-4 w-4" /> Convert to epoch
            </ActionButton>
          </div>
          {reverse && (
            <div className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
              <button type="button" onClick={() => copy(String(reverse.s), "Epoch seconds")} className="block w-full text-left hover:text-foreground">
                <span className="font-bold">Seconds:</span>{" "}
                <span className="font-mono text-muted-foreground">{reverse.s}</span>
              </button>
              <button type="button" onClick={() => copy(String(reverse.ms), "Epoch milliseconds")} className="block w-full text-left hover:text-foreground">
                <span className="font-bold">Milliseconds:</span>{" "}
                <span className="font-mono text-muted-foreground">{reverse.ms}</span>
              </button>
              <p className="text-xs text-muted-foreground">UTC: <span className="font-mono">{reverse.iso}</span></p>
              <p className="text-xs text-muted-foreground">Click a value to copy.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">Duration calculator</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Seconds → human
            </span>
            <input
              value={durSec}
              onChange={(e) => setDurSec(e.target.value)}
              placeholder="e.g. 90061"
              inputMode="numeric"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            <p className="mt-2 font-mono text-sm">
              {durSec.trim() === "" ? "-" : secToHuman(Number(durSec))}
            </p>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Human → seconds
            </span>
            <input
              value={durHuman}
              onChange={(e) => setDurHuman(e.target.value)}
              placeholder="e.g. 1d 2h 3m 4s"
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
            />
            <p className="mt-2 font-mono text-sm">
              {durHuman.trim() === ""
                ? "-"
                : (() => {
                    const s = humanToSec(durHuman);
                    return s === null ? "no duration found" : `${s.toLocaleString()} s`;
                  })()}
            </p>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Accepts d / h / m / s tokens in any order, e.g. "2d 5h", "90m", "1h30m".
        </p>
      </div>

      {!isPro && (
        <p className="mt-4 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - everything runs in your browser.
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
    </ToolPageShell>
  );
}
