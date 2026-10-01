// /tools/morse-code - encode/decode standard ITU Morse code with audible
// WebAudio playback and a WPM speed slider. 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/morse-code")({
  head: () => {
    const seo = getToolSeoMeta("morse-code");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: MorseCodeTool,
});

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....",
  "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", _: "..--.-",
  '"': ".-..-.", $: "...-..-", "@": ".--.-.",
};

const FROM_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k]),
);

function encode(text: string): string {
  return text
    .toUpperCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((word) =>
      [...word]
        .map((ch) => MORSE[ch] ?? "?")
        .join(" "),
    )
    .join(" / ");
}

function decode(code: string): string {
  return code
    .trim()
    .split(/\s*\/\s*/)
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((c) => FROM_MORSE[c] ?? "?")
        .join(""),
    )
    .join(" ");
}

const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

function MorseCodeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("morse-code", isPro);
  const seo = getToolSeo("morse-code");

  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [input, setInput] = useState("");
  const [wpm, setWpm] = useState(20);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const stopRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);

  const output = useMemo(() => {
    try {
      return direction === "encode" ? encode(input) : decode(input);
    } catch {
      return "";
    }
  }, [input, direction]);

  const morseToPlay = direction === "encode" ? output : input;

  const stop = () => {
    stopRef.current = true;
  };

  const play = async () => {
    if (playing || !morseToPlay.trim() || !trial.canUse) return;
    stopRef.current = false;
    setPlaying(true);
    trial.recordUse();
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const unit = 1200 / wpm;
      const beep = async (dur: number) => {
        if (stopRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 700;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur / 1000 + 0.05);
        await sleep(dur);
      };
      const words = morseToPlay.trim().split(/\s*\/\s*/);
      outer: for (const [wi, word] of words.entries()) {
        for (const letter of word.trim().split(/\s+/)) {
          for (const sym of letter) {
            if (stopRef.current) break outer;
            if (sym === ".") await beep(unit);
            else if (sym === "-") await beep(unit * 3);
            await sleep(unit); // intra-symbol gap
          }
          await sleep(unit * 2); // letter gap (1u already counted)
        }
        if (wi < words.length - 1) await sleep(unit * 4); // word gap (3u already counted)
      }
    } finally {
      setPlaying(false);
    }
  };

  const copy = () => {
    if (!output || !trial.canUse) return;
    navigator.clipboard
      .writeText(output)
      .then(() => {
        setCopied(true);
        trial.recordUse();
        toast.success("Morse code copied");
      })
      .catch(() => toast.error("Copy failed"));
  };

  const setInputAndDir = (dir: "encode" | "decode") => {
    setDirection(dir);
    setInput("");
    setCopied(false);
  };

  return (
    <ToolPageShell toolId="morse-code" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Morse Code" left={trial.left} />

      <div className="mb-6 inline-flex gap-1 rounded-xl bg-muted p-1">
        {(
          [
            { id: "encode", label: "Text to Morse" },
            { id: "decode", label: "Morse to Text" },
          ] as const
        ).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setInputAndDir(d.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-bold transition",
              direction === d.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <label className="block rounded-2xl border border-border bg-card p-4">
          <span className="mb-2 block text-sm font-bold">
            {direction === "encode" ? "Text" : "Morse code"}
          </span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              direction === "encode" ? "Type text to encode..." : "Type morse: ... --- ... (words separated by /)"
            }
            spellCheck={false}
            className="h-52 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          {direction === "decode" && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Separate letters with a space, words with a slash ( / ). Unknown sequences become ?.
            </p>
          )}
        </label>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-bold">{direction === "encode" ? "Morse code" : "Text"}</span>
            <button
              type="button"
              onClick={copy}
              disabled={!output || !trial.canUse}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {output ? (
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className="h-52 w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none"
            />
          ) : (
            <div className="flex h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <p className="px-6 text-sm font-semibold text-muted-foreground">
                Your {direction === "encode" ? "morse code" : "decoded text"} appears here
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border border-border bg-card p-5">
        <button
          type="button"
          onClick={playing ? stop : play}
          disabled={!morseToPlay.trim() || !trial.canUse}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {playing ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? "Stop" : "Play morse"}
        </button>
        <label className="flex min-w-[220px] flex-1 items-center gap-3">
          <span className="text-sm font-bold">Speed</span>
          <input
            type="range"
            min={5}
            max={40}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <span className="w-16 text-right font-mono text-sm font-bold">{wpm} WPM</span>
        </label>
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - everything runs in your browser, nothing is uploaded.
        </p>
      )}
    </ToolPageShell>
  );
}
