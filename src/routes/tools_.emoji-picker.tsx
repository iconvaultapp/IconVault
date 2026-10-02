// /tools/emoji-picker - Searchable emoji picker with code points. Click to copy.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/emoji-picker")({
  head: () => {
    const seo = getToolSeoMeta("emoji-picker");
    const canonical = "https://iconvault.site/tools/emoji-picker";
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
  component: EmojiPickerTool,
});

type Emoji = { e: string; n: string; c: string };

const EMOJIS: Emoji[] = [
  // Smileys
  { e: "😀", n: "grinning face", c: "Smileys" }, { e: "😃", n: "grinning face with big eyes", c: "Smileys" },
  { e: "😄", n: "grinning face with smiling eyes", c: "Smileys" }, { e: "😁", n: "beaming face with smiling eyes", c: "Smileys" },
  { e: "😆", n: "grinning squinting face", c: "Smileys" }, { e: "😅", n: "grinning face with sweat", c: "Smileys" },
  { e: "😂", n: "face with tears of joy", c: "Smileys" }, { e: "🤣", n: "rolling on the floor laughing", c: "Smileys" },
  { e: "🙂", n: "slightly smiling face", c: "Smileys" }, { e: "😉", n: "winking face", c: "Smileys" },
  { e: "😊", n: "smiling face with smiling eyes", c: "Smileys" }, { e: "😇", n: "smiling face with halo", c: "Smileys" },
  { e: "😍", n: "smiling face with heart eyes", c: "Smileys" }, { e: "🤩", n: "star struck", c: "Smileys" },
  { e: "😘", n: "face blowing a kiss", c: "Smileys" }, { e: "🤔", n: "thinking face", c: "Smileys" },
  { e: "😐", n: "neutral face", c: "Smileys" }, { e: "😑", n: "expressionless face", c: "Smileys" },
  { e: "😶", n: "face without mouth", c: "Smileys" }, { e: "😏", n: "smirking face", c: "Smileys" },
  { e: "😒", n: "unamused face", c: "Smileys" }, { e: "🙄", n: "face with rolling eyes", c: "Smileys" },
  { e: "😬", n: "grimacing face", c: "Smileys" }, { e: "🤥", n: "lying face", c: "Smileys" },
  { e: "😌", n: "relieved face", c: "Smileys" }, { e: "😪", n: "sleepy face", c: "Smileys" },
  { e: "😴", n: "sleeping face", c: "Smileys" }, { e: "😷", n: "face with medical mask", c: "Smileys" },
  { e: "🤒", n: "face with thermometer", c: "Smileys" }, { e: "🤓", n: "nerd face", c: "Smileys" },
  // People
  { e: "👋", n: "waving hand", c: "People" }, { e: "✋", n: "raised hand", c: "People" },
  { e: "👌", n: "ok hand", c: "People" }, { e: "🤏", n: "pinching hand", c: "People" },
  { e: "✌️", n: "victory hand", c: "People" }, { e: "🤞", n: "crossed fingers", c: "People" },
  { e: "🤟", n: "love you gesture", c: "People" }, { e: "🤘", n: "sign of the horns", c: "People" },
  { e: "🤙", n: "call me hand", c: "People" }, { e: "👊", n: "oncoming fist", c: "People" },
  { e: "👍", n: "thumbs up", c: "People" }, { e: "👎", n: "thumbs down", c: "People" },
  { e: "👏", n: "clapping hands", c: "People" }, { e: "🙏", n: "folded hands", c: "People" },
  { e: "🤝", n: "handshake", c: "People" }, { e: "💪", n: "flexed biceps", c: "People" },
  { e: "👀", n: "eyes", c: "People" }, { e: "👂", n: "ear", c: "People" },
  { e: "👃", n: "nose", c: "People" }, { e: "🧠", n: "brain", c: "People" },
  { e: "❤️", n: "red heart", c: "People" }, { e: "💔", n: "broken heart", c: "People" },
  { e: "💋", n: "kiss mark", c: "People" }, { e: "🔥", n: "fire", c: "People" },
  { e: "⭐", n: "star", c: "People" },
  // Nature
  { e: "🐶", n: "dog face", c: "Nature" }, { e: "🐱", n: "cat face", c: "Nature" },
  { e: "🐭", n: "mouse face", c: "Nature" }, { e: "🐰", n: "rabbit face", c: "Nature" },
  { e: "🦊", n: "fox", c: "Nature" }, { e: "🐻", n: "bear", c: "Nature" },
  { e: "🐼", n: "panda", c: "Nature" }, { e: "🐨", n: "koala", c: "Nature" },
  { e: "🦁", n: "lion", c: "Nature" }, { e: "🐮", n: "cow face", c: "Nature" },
  { e: "🐵", n: "monkey face", c: "Nature" }, { e: "🐦", n: "bird", c: "Nature" },
  { e: "🐧", n: "penguin", c: "Nature" }, { e: "🐸", n: "frog", c: "Nature" },
  { e: "🐢", n: "turtle", c: "Nature" }, { e: "🐍", n: "snake", c: "Nature" },
  { e: "🌳", n: "deciduous tree", c: "Nature" }, { e: "🌵", n: "cactus", c: "Nature" },
  { e: "🌻", n: "sunflower", c: "Nature" }, { e: "🌹", n: "rose", c: "Nature" },
  { e: "🌷", n: "tulip", c: "Nature" }, { e: "🍄", n: "mushroom", c: "Nature" },
  { e: "🌍", n: "globe showing europe africa", c: "Nature" }, { e: "🌙", n: "crescent moon", c: "Nature" },
  { e: "☀️", n: "sun", c: "Nature" },
  // Food
  { e: "🍎", n: "red apple", c: "Food" }, { e: "🍌", n: "banana", c: "Food" },
  { e: "🍇", n: "grapes", c: "Food" }, { e: "🍉", n: "watermelon", c: "Food" },
  { e: "🍓", n: "strawberry", c: "Food" }, { e: "🍕", n: "pizza", c: "Food" },
  { e: "🍔", n: "hamburger", c: "Food" }, { e: "🍟", n: "french fries", c: "Food" },
  { e: "🌮", n: "taco", c: "Food" }, { e: "🍣", n: "sushi", c: "Food" },
  { e: "🍩", n: "doughnut", c: "Food" }, { e: "🎂", n: "birthday cake", c: "Food" },
  { e: "🍪", n: "cookie", c: "Food" }, { e: "🍫", n: "chocolate bar", c: "Food" },
  { e: "☕", n: "hot beverage", c: "Food" }, { e: "🍵", n: "teacup without handle", c: "Food" },
  { e: "🍺", n: "beer mug", c: "Food" }, { e: "🍷", n: "wine glass", c: "Food" },
  { e: "🍹", n: "tropical drink", c: "Food" }, { e: "🍿", n: "popcorn", c: "Food" },
  { e: "🥐", n: "croissant", c: "Food" }, { e: "🍳", n: "cooking", c: "Food" },
  { e: "🧀", n: "cheese wedge", c: "Food" }, { e: "🍨", n: "ice cream", c: "Food" },
  { e: "🍭", n: "lollipop", c: "Food" },
  // Activity
  { e: "⚽", n: "soccer ball", c: "Activity" }, { e: "🏀", n: "basketball", c: "Activity" },
  { e: "🏈", n: "american football", c: "Activity" }, { e: "🎾", n: "tennis", c: "Activity" },
  { e: "🏆", n: "trophy", c: "Activity" }, { e: "🏅", n: "sports medal", c: "Activity" },
  { e: "🎸", n: "guitar", c: "Activity" }, { e: "🎹", n: "musical keyboard", c: "Activity" },
  { e: "🎺", n: "trumpet", c: "Activity" }, { e: "🎮", n: "video game", c: "Activity" },
  { e: "🎲", n: "game die", c: "Activity" }, { e: "🧩", n: "puzzle piece", c: "Activity" },
  { e: "🎯", n: "bullseye", c: "Activity" }, { e: "🎳", n: "bowling", c: "Activity" },
  { e: "🎨", n: "artist palette", c: "Activity" }, { e: "📷", n: "camera", c: "Activity" },
  { e: "🎬", n: "clapper board", c: "Activity" }, { e: "🎤", n: "microphone", c: "Activity" },
  { e: "🎧", n: "headphone", c: "Activity" }, { e: "🚀", n: "rocket", c: "Activity" },
  { e: "🎉", n: "party popper", c: "Activity" }, { e: "🎈", n: "balloon", c: "Activity" },
  { e: "🎁", n: "wrapped gift", c: "Activity" }, { e: "✨", n: "sparkles", c: "Activity" },
  { e: "🎊", n: "confetti ball", c: "Activity" },
  // Travel
  { e: "🚗", n: "automobile", c: "Travel" }, { e: "🚕", n: "taxi", c: "Travel" },
  { e: "🚌", n: "bus", c: "Travel" }, { e: "🚂", n: "locomotive", c: "Travel" },
  { e: "✈️", n: "airplane", c: "Travel" }, { e: "🚢", n: "ship", c: "Travel" },
  { e: "🚲", n: "bicycle", c: "Travel" }, { e: "🏍️", n: "motorcycle", c: "Travel" },
  { e: "🏠", n: "house", c: "Travel" }, { e: "🏨", n: "hotel", c: "Travel" },
  { e: "⛺", n: "tent", c: "Travel" }, { e: "🏖️", n: "beach with umbrella", c: "Travel" },
  { e: "⛰️", n: "mountain", c: "Travel" }, { e: "🧭", n: "compass", c: "Travel" },
  { e: "🗺️", n: "world map", c: "Travel" }, { e: "🧳", n: "luggage", c: "Travel" },
  { e: "🎟️", n: "admission tickets", c: "Travel" }, { e: "⚓", n: "anchor", c: "Travel" },
  { e: "⛽", n: "fuel pump", c: "Travel" }, { e: "🚦", n: "vertical traffic light", c: "Travel" },
  // Objects
  { e: "📱", n: "mobile phone", c: "Objects" }, { e: "💻", n: "laptop", c: "Objects" },
  { e: "⌨️", n: "keyboard", c: "Objects" }, { e: "🖱️", n: "computer mouse", c: "Objects" },
  { e: "⌚", n: "watch", c: "Objects" }, { e: "💡", n: "light bulb", c: "Objects" },
  { e: "🔋", n: "battery", c: "Objects" }, { e: "✂️", n: "scissors", c: "Objects" },
  { e: "🔒", n: "locked", c: "Objects" }, { e: "🔑", n: "key", c: "Objects" },
  { e: "🔨", n: "hammer", c: "Objects" }, { e: "🔧", n: "wrench", c: "Objects" },
  { e: "📖", n: "open book", c: "Objects" }, { e: "✏️", n: "pencil", c: "Objects" },
  { e: "📎", n: "paperclip", c: "Objects" }, { e: "✉️", n: "envelope", c: "Objects" },
  { e: "📅", n: "calendar", c: "Objects" }, { e: "⏰", n: "alarm clock", c: "Objects" },
  { e: "💰", n: "money bag", c: "Objects" }, { e: "💎", n: "gem stone", c: "Objects" },
  { e: "👑", n: "crown", c: "Objects" }, { e: "🔔", n: "bell", c: "Objects" },
  { e: "☂️", n: "umbrella", c: "Objects" }, { e: "🧲", n: "magnet", c: "Objects" },
  { e: "🧰", n: "toolbox", c: "Objects" },
  // Symbols
  { e: "✅", n: "check mark button", c: "Symbols" }, { e: "❌", n: "cross mark", c: "Symbols" },
  { e: "⚠️", n: "warning", c: "Symbols" }, { e: "ℹ️", n: "information", c: "Symbols" },
  { e: "❓", n: "question mark", c: "Symbols" }, { e: "❗", n: "exclamation mark", c: "Symbols" },
  { e: "➕", n: "plus", c: "Symbols" }, { e: "➖", n: "minus", c: "Symbols" },
  { e: "➡️", n: "right arrow", c: "Symbols" }, { e: "♻️", n: "recycling symbol", c: "Symbols" },
  { e: "©️", n: "copyright", c: "Symbols" }, { e: "®️", n: "registered", c: "Symbols" },
  { e: "™️", n: "trade mark", c: "Symbols" }, { e: "#️⃣", n: "keycap number sign", c: "Symbols" },
  { e: "*️⃣", n: "keycap asterisk", c: "Symbols" }, { e: "💯", n: "hundred points", c: "Symbols" },
  { e: "🆘", n: "sos button", c: "Symbols" }, { e: "🆙", n: "up button", c: "Symbols" },
  { e: "🆕", n: "new button", c: "Symbols" }, { e: "🆓", n: "free button", c: "Symbols" },
  { e: "🆗", n: "ok button", c: "Symbols" }, { e: "🆚", n: "vs button", c: "Symbols" },
  { e: "🆑", n: "cl button", c: "Symbols" }, { e: "🆒", n: "cool button", c: "Symbols" },
  { e: "🆔", n: "id button", c: "Symbols" },
];

const CATEGORIES = ["All", ...Array.from(new Set(EMOJIS.map((e) => e.c)))];

function codePointOf(e: string): string {
  return `U+${(e.codePointAt(0) ?? 0).toString(16).toUpperCase()}`;
}

function EmojiPickerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("emoji-picker", isPro);
  const seo = getToolSeo("emoji-picker");

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [last, setLast] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EMOJIS.filter(
      (e) => (cat === "All" || e.c === cat) && (!q || e.n.toLowerCase().includes(q)),
    );
  }, [query, cat]);

  const pick = async (emoji: Emoji) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(emoji.e);
      trial.recordUse();
      setLast(emoji.e);
      toast.success(`${emoji.e} ${emoji.n} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <ToolPageShell toolId="emoji-picker" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Emoji Picker" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emojis, e.g. heart, dog..."
              className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition",
                  cat === c ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          {last && <span className="ml-auto text-2xl" title="Last copied">{last}</span>}
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} of {EMOJIS.length} emojis - click to copy</p>
        <div className="grid max-h-[480px] grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
          {filtered.map((emoji) => (
            <button
              key={emoji.n}
              type="button"
              onClick={() => void pick(emoji)}
              title={`${emoji.n} - click to copy`}
              disabled={!trial.canUse}
              className="flex flex-col items-center gap-0.5 rounded-xl border border-border px-1 py-2.5 transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-40"
            >
              <span className="text-2xl leading-none">{emoji.e}</span>
              <span className="mt-1 max-w-full truncate px-1 text-[10px] text-muted-foreground">{emoji.n}</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">{codePointOf(emoji.e)}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">No emojis match "{query}".</p>
          )}
        </div>
        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
