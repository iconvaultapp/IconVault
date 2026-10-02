// /tools/text-to-speech - Read text aloud with your device's built-in voices.
// Voice picker, rate and pitch controls, pause/resume. 100% in-browser, nothing
// is uploaded. Uses the Web Speech API, so available voices depend on the device.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/text-to-speech")({
  head: () => {
    const seo = getToolSeoMeta("text-to-speech");
    const canonical = "https://iconvault.site/tools/text-to-speech";
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
  component: TextToSpeechTool,
});

function supported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function TextToSpeechTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("text-to-speech", isPro);
  const seo = getToolSeo("text-to-speech");

  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!supported()) return;
    const load = () => {
      const vs = window.speechSynthesis.getVoices();
      setVoices(vs);
      setVoiceURI((prev) => {
        if (prev && vs.some((v) => v.voiceURI === prev)) return prev;
        const def = vs.find((v) => v.default) ?? vs[0];
        return def ? def.voiceURI : "";
      });
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    if (!supported()) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const speak = useCallback(() => {
    if (!supported() || !text.trim() || !trial.canUse) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.voiceURI === voiceURI);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => { setSpeaking(false); setPaused(false); };
    u.onerror = (e) => {
      if (e.error !== "interrupted") toast.error("Speech failed on this device.");
      setSpeaking(false);
      setPaused(false);
    };
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    setPaused(false);
    trial.recordUse();
  }, [text, voices, voiceURI, rate, pitch, trial]);

  const togglePause = useCallback(() => {
    if (!supported() || !speaking) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }, [speaking, paused]);

  if (!supported()) {
    return (
      <ToolPageShell toolId="text-to-speech" seo={seo} trial={trial} isPro={isPro}>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Volume2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-semibold">Speech synthesis is not supported in this browser</p>
          <p className="mt-1 text-sm text-muted-foreground">Try Chrome, Edge, Safari or Firefox on a phone or computer.</p>
        </div>
      </ToolPageShell>
    );
  }

  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <ToolPageShell toolId="text-to-speech" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Text to Speech" left={trial.left} />

      <div className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Text to read aloud</p>
            <p className="text-xs text-muted-foreground">{chars} characters · {words} words</p>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text here, then press Speak"
            spellCheck={false}
            className="h-44 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <p className="mb-1 text-[13px] font-medium text-foreground/80">Voice</p>
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {voices.length === 0 && <option value="">Loading voices…</option>}
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang}){v.default ? " - default" : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Uses your device's built-in voices.</p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Rate</p>
                <span className="text-xs font-bold text-muted-foreground">{rate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Pitch</p>
                <span className="text-xs font-bold text-muted-foreground">{pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!speaking ? (
              <ActionButton disabled={!text.trim() || !trial.canUse} onClick={speak}>
                <Play className="h-4 w-4" /> Speak
              </ActionButton>
            ) : (
              <>
                <ActionButton onClick={togglePause}>
                  <Pause className="h-4 w-4" /> {paused ? "Resume" : "Pause"}
                </ActionButton>
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/40"
                >
                  <Square className="h-4 w-4" /> Stop
                </button>
              </>
            )}
            {!isPro && (
              <p className="text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
        </div>

        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          This tool uses your device's built-in speech voices through your browser, so it works
          offline after the page loads and no audio is ever sent anywhere. The number and quality
          of voices depends on your browser and operating system.
        </p>
      </div>
    </ToolPageShell>
  );
}
