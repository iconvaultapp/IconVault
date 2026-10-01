// /tools/speech-playground - Speech studio: real mic transcription via
// SpeechRecognition and real text-to-speech with the browser's voices.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mic, MicOff, Play, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/speech-playground")({
  head: () => {
    const seo = getToolSeoMeta("speech-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SpeechTool,
});

type RecogCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function SpeechTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("speech-playground", isPro);
  const seo = getToolSeo("speech-playground");

  const [sttOk, setSttOk] = useState<boolean | null>(null);
  const [ttsOk, setTtsOk] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("en-US");
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const recogRef = useRef<InstanceType<RecogCtor> | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [ttsText, setTtsText] = useState("Hello! This is the IconVault speech studio, running entirely in your browser.");
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
    setSttOk(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    setTtsOk("speechSynthesis" in window);
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        setVoices(v);
        const en = v.findIndex((x) => x.lang.startsWith("en"));
        setVoiceIdx(en >= 0 ? en : 0);
      }
    };
    load();
    window.speechSynthesis?.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis?.removeEventListener("voiceschanged", load);
      window.speechSynthesis?.cancel();
      recogRef.current?.abort();
    };
  }, []);

  const toggleListen = () => {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    if (!trial.canUse) return;
    const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const recog = new Ctor();
    recog.lang = lang;
    recog.interimResults = true;
    recog.continuous = true;
    recog.onresult = (e) => {
      let interimTxt = "";
      let finalTxt = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const alt = res?.[0];
        const transcript = alt?.transcript ?? "";
        const isFinal =
          (res as unknown as { isFinal?: boolean } | undefined)?.isFinal === true ||
          alt?.isFinal === true;
        if (isFinal) {
          finalTxt += transcript + " ";
        } else {
          interimTxt += transcript;
        }
      }
      setInterim(interimTxt);
      if (finalTxt) setFinalText((p) => (p + finalTxt).trim() + " ");
    };
    recog.onerror = (e) => {
      toast.error(e.error === "not-allowed" ? "Microphone permission denied." : `Recognition error: ${e.error}`);
      setListening(false);
    };
    recog.onend = () => setListening(false);
    try {
      recog.start();
      recogRef.current = recog;
      setListening(true);
      trial.recordUse();
      toast.success("Listening - speak now");
    } catch {
      toast.error("Could not start recognition.");
    }
  };

  const speak = () => {
    if (!("speechSynthesis" in window) || speaking) return;
    if (!trial.canUse) return;
    const u = new SpeechSynthesisUtterance(ttsText.trim() || "Nothing to speak.");
    if (voices[voiceIdx]) u.voice = voices[voiceIdx];
    u.rate = rate;
    u.pitch = pitch;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
    trial.recordUse();
  };

  return (
    <ToolPageShell toolId="speech-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Speech Playground" left={trial.left} />

      {sttOk === false && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <p className="font-bold">Speech recognition is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">
            Live transcription needs Chrome or Edge on desktop/Android. The mic button stays disabled here on purpose -
            text-to-speech on the right may still work.
          </p>
        </div>
      )}
      {ttsOk === false && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <p className="font-bold">Text-to-speech is not supported in this browser.</p>
          <p className="mt-1 text-muted-foreground">speechSynthesis is missing, so the TTS panel is disabled.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Mic className="h-5 w-5 text-primary" /> Mic transcription
          </h2>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Language</label>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {["en-US", "en-GB", "hi-IN", "es-ES", "fr-FR", "de-DE", "ja-JP", "pt-BR", "ar-SA", "zh-CN"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-muted p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Live interim</p>
            <p className="mt-1 min-h-[3rem] text-sm italic text-muted-foreground">{interim || "…"}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Final transcript</p>
            <p className="mt-1 min-h-[5rem] text-sm">{finalText || "Press start and speak. Final results accumulate here."}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!sttOk || !trial.canUse} onClick={toggleListen}>
              {listening ? <><Square className="h-4 w-4" /> Stop listening</> : <><Mic className="h-4 w-4" /> Start listening</>}
            </ActionButton>
            {finalText && (
              <button
                type="button"
                onClick={() => { setFinalText(""); setInterim(""); }}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
              >
                <MicOff className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
          {listening && (
            <p className="flex items-center gap-2 text-xs font-semibold text-red-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Recording - your audio is processed by the browser, never uploaded by this page.
            </p>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Volume2 className="h-5 w-5 text-primary" /> Text to speech
          </h2>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Text to speak</label>
            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">
              Voice ({voices.length} found)
            </label>
            <select
              value={voiceIdx}
              onChange={(e) => setVoiceIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {voices.map((v, i) => (
                <option key={i} value={i}>
                  {v.name} ({v.lang}){v.localService ? " - local" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Voice list comes from your OS and browser - nothing is faked.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground/80">Rate</label>
                <span className="text-sm font-bold text-primary">{rate.toFixed(2)}x</span>
              </div>
              <input type="range" min={0.5} max={2} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground/80">Pitch</label>
                <span className="text-sm font-bold text-primary">{pitch.toFixed(2)}</span>
              </div>
              <input type="range" min={0} max={2} step={0.05} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full accent-primary" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!ttsOk || speaking || !trial.canUse} onClick={speak}>
              <Play className={cn("h-4 w-4", speaking && "hidden")} /> {speaking ? "Speaking…" : "Speak"}
            </ActionButton>
            {speaking && (
              <button
                type="button"
                onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
              >
                <Square className="h-4 w-4" /> Stop
              </button>
            )}
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free sessions left.
            </p>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
