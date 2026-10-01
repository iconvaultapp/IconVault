// /tools/baby-name-generator - Discover baby names by origin and gender
// with meanings, randomizer and saved favorites, 100% client-side.

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Dices, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/baby-name-generator")({
  head: () => {
    const seo = getToolSeoMeta("baby-name-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: BabyNameTool,
});

interface NameEntry {
  name: string;
  meaning: string;
  gender: "boy" | "girl" | "neutral";
}

const ORIGINS: { id: string; label: string; names: NameEntry[] }[] = [
  {
    id: "english", label: "English",
    names: [
      { name: "Oliver", meaning: "Olive tree", gender: "boy" },
      { name: "Amelia", meaning: "Hardworking", gender: "girl" },
      { name: "Henry", meaning: "Ruler of the home", gender: "boy" },
      { name: "Grace", meaning: "Elegance and charm", gender: "girl" },
      { name: "Rowan", meaning: "Little redhead", gender: "neutral" },
      { name: "Everett", meaning: "Brave as a wild boar", gender: "boy" },
      { name: "Eleanor", meaning: "Shining light", gender: "girl" },
      { name: "Avery", meaning: "Ruler of elves", gender: "neutral" },
      { name: "Theodore", meaning: "Gift of God", gender: "boy" },
      { name: "Violet", meaning: "Purple flower", gender: "girl" },
      { name: "Ellis", meaning: "Benevolent", gender: "neutral" },
      { name: "Charlotte", meaning: "Free person", gender: "girl" },
    ],
  },
  {
    id: "spanish", label: "Spanish",
    names: [
      { name: "Mateo", meaning: "Gift of God", gender: "boy" },
      { name: "Sofia", meaning: "Wisdom", gender: "girl" },
      { name: "Diego", meaning: "Supplanter", gender: "boy" },
      { name: "Valentina", meaning: "Strong and healthy", gender: "girl" },
      { name: "Santiago", meaning: "Saint James", gender: "boy" },
      { name: "Lucia", meaning: "Light", gender: "girl" },
      { name: "Angel", meaning: "Messenger", gender: "neutral" },
      { name: "Camila", meaning: "Young ceremonial attendant", gender: "girl" },
      { name: "Emiliano", meaning: "Rival, eager", gender: "boy" },
      { name: "Isabella", meaning: "God is my oath", gender: "girl" },
      { name: "Ariel", meaning: "Lion of God", gender: "neutral" },
      { name: "Alejandro", meaning: "Defender of men", gender: "boy" },
    ],
  },
  {
    id: "french", label: "French",
    names: [
      { name: "Gabriel", meaning: "God is my strength", gender: "boy" },
      { name: "Chloe", meaning: "Blooming", gender: "girl" },
      { name: "Louis", meaning: "Famous warrior", gender: "boy" },
      { name: "Manon", meaning: "Bitter, wished-for child", gender: "girl" },
      { name: "Noel", meaning: "Christmas day", gender: "neutral" },
      { name: "Jade", meaning: "Precious green stone", gender: "girl" },
      { name: "Hugo", meaning: "Mind, intellect", gender: "boy" },
      { name: "Camille", meaning: "Young ceremonial attendant", gender: "neutral" },
      { name: "Leo", meaning: "Lion", gender: "boy" },
      { name: "Emma", meaning: "Universal", gender: "girl" },
      { name: "Jules", meaning: "Youthful", gender: "boy" },
      { name: "Lea", meaning: "Weary, lioness", gender: "girl" },
    ],
  },
  {
    id: "italian", label: "Italian",
    names: [
      { name: "Leonardo", meaning: "Brave lion", gender: "boy" },
      { name: "Giulia", meaning: "Youthful", gender: "girl" },
      { name: "Marco", meaning: "Warlike", gender: "boy" },
      { name: "Aurora", meaning: "Dawn", gender: "girl" },
      { name: "Andrea", meaning: "Manly, brave", gender: "neutral" },
      { name: "Alessandro", meaning: "Defender of men", gender: "boy" },
      { name: "Sofia", meaning: "Wisdom", gender: "girl" },
      { name: "Francesco", meaning: "Frenchman, free", gender: "boy" },
      { name: "Elena", meaning: "Bright, shining light", gender: "girl" },
      { name: "Mattia", meaning: "Gift of God", gender: "neutral" },
      { name: "Bianca", meaning: "White", gender: "girl" },
      { name: "Lorenzo", meaning: "Laurel-crowned", gender: "boy" },
    ],
  },
  {
    id: "indian", label: "Indian",
    names: [
      { name: "Aarav", meaning: "Peaceful sound", gender: "boy" },
      { name: "Diya", meaning: "Lamp, light", gender: "girl" },
      { name: "Arjun", meaning: "Bright, shining", gender: "boy" },
      { name: "Anaya", meaning: "Without a superior", gender: "girl" },
      { name: "Aryan", meaning: "Noble", gender: "boy" },
      { name: "Ishaan", meaning: "Sun, guardian", gender: "boy" },
      { name: "Meera", meaning: "Devotee, prosperous", gender: "girl" },
      { name: "Dev", meaning: "Divine", gender: "neutral" },
      { name: "Priya", meaning: "Beloved", gender: "girl" },
      { name: "Vivaan", meaning: "Full of life", gender: "boy" },
      { name: "Saanvi", meaning: "Goddess Lakshmi", gender: "girl" },
      { name: "Aadi", meaning: "Beginning", gender: "neutral" },
    ],
  },
  {
    id: "arabic", label: "Arabic",
    names: [
      { name: "Omar", meaning: "Flourishing, long-lived", gender: "boy" },
      { name: "Layla", meaning: "Night", gender: "girl" },
      { name: "Zaid", meaning: "Growth, abundance", gender: "boy" },
      { name: "Noor", meaning: "Light", gender: "neutral" },
      { name: "Fatima", meaning: "One who abstains", gender: "girl" },
      { name: "Yusuf", meaning: "God increases", gender: "boy" },
      { name: "Amira", meaning: "Princess, leader", gender: "girl" },
      { name: "Karim", meaning: "Generous", gender: "boy" },
      { name: "Samira", meaning: "Companion in evening talk", gender: "girl" },
      { name: "Aziz", meaning: "Beloved, powerful", gender: "boy" },
      { name: "Hana", meaning: "Happiness, bliss", gender: "girl" },
      { name: "Rayan", meaning: "Lush, well-watered", gender: "neutral" },
    ],
  },
  {
    id: "chinese", label: "Chinese",
    names: [
      { name: "Wei", meaning: "Great, powerful", gender: "neutral" },
      { name: "Mei", meaning: "Beautiful", gender: "girl" },
      { name: "Jun", meaning: "Handsome, talented", gender: "boy" },
      { name: "Li", meaning: "Pretty, jasmine", gender: "girl" },
      { name: "Chen", meaning: "Morning, dawn", gender: "boy" },
      { name: "Xiao", meaning: "Dawn, little", gender: "neutral" },
      { name: "Fang", meaning: "Fragrant", gender: "girl" },
      { name: "Lei", meaning: "Thunder", gender: "boy" },
      { name: "Na", meaning: "Elegant, graceful", gender: "girl" },
      { name: "Tao", meaning: "Peach, long life", gender: "boy" },
      { name: "Xin", meaning: "New, heart", gender: "neutral" },
      { name: "Yan", meaning: "Colorful, swallow bird", gender: "girl" },
    ],
  },
  {
    id: "japanese", label: "Japanese",
    names: [
      { name: "Ren", meaning: "Lotus, love", gender: "neutral" },
      { name: "Sakura", meaning: "Cherry blossom", gender: "girl" },
      { name: "Haruto", meaning: "Sunlight, clear weather", gender: "boy" },
      { name: "Yui", meaning: "Gentle, superior", gender: "girl" },
      { name: "Sora", meaning: "Sky", gender: "boy" },
      { name: "Akira", meaning: "Bright, clear", gender: "neutral" },
      { name: "Hana", meaning: "Flower", gender: "girl" },
      { name: "Daiki", meaning: "Great glory", gender: "boy" },
      { name: "Yuki", meaning: "Snow, happiness", gender: "neutral" },
      { name: "Rin", meaning: "Dignified", gender: "girl" },
      { name: "Kaito", meaning: "Sea, soar", gender: "boy" },
      { name: "Nana", meaning: "Seven, greens", gender: "girl" },
    ],
  },
  {
    id: "african", label: "African",
    names: [
      { name: "Zola", meaning: "Quiet, tranquil", gender: "neutral" },
      { name: "Amara", meaning: "Grace, mercy", gender: "girl" },
      { name: "Kwame", meaning: "Born on Saturday", gender: "boy" },
      { name: "Nia", meaning: "Purpose", gender: "girl" },
      { name: "Jabari", meaning: "Brave, fearless", gender: "boy" },
      { name: "Zuri", meaning: "Beautiful", gender: "girl" },
      { name: "Kofi", meaning: "Born on Friday", gender: "boy" },
      { name: "Ayana", meaning: "Beautiful flower", gender: "girl" },
      { name: "Imani", meaning: "Faith", gender: "neutral" },
      { name: "Sefu", meaning: "Sword", gender: "boy" },
      { name: "Dalia", meaning: "Gentle", gender: "girl" },
      { name: "Tunde", meaning: "Returned, reborn", gender: "boy" },
    ],
  },
  {
    id: "hebrew", label: "Hebrew",
    names: [
      { name: "Noah", meaning: "Rest, comfort", gender: "neutral" },
      { name: "Ava", meaning: "Life, bird", gender: "girl" },
      { name: "Ethan", meaning: "Strong, firm", gender: "boy" },
      { name: "Maya", meaning: "Water", gender: "girl" },
      { name: "David", meaning: "Beloved", gender: "boy" },
      { name: "Sarah", meaning: "Princess", gender: "girl" },
      { name: "Ariel", meaning: "Lion of God", gender: "neutral" },
      { name: "Levi", meaning: "Joined, attached", gender: "boy" },
      { name: "Tamar", meaning: "Date palm", gender: "girl" },
      { name: "Eli", meaning: "Ascended, my God", gender: "boy" },
      { name: "Shira", meaning: "Song, poetry", gender: "girl" },
      { name: "Asher", meaning: "Happy, blessed", gender: "boy" },
    ],
  },
  {
    id: "greek", label: "Greek",
    names: [
      { name: "Alexander", meaning: "Defender of men", gender: "boy" },
      { name: "Sophia", meaning: "Wisdom", gender: "girl" },
      { name: "Nicholas", meaning: "Victory of the people", gender: "boy" },
      { name: "Elena", meaning: "Bright, shining light", gender: "girl" },
      { name: "Alex", meaning: "Defender", gender: "neutral" },
      { name: "Penelope", meaning: "Weaver", gender: "girl" },
      { name: "Dorian", meaning: "Gift", gender: "boy" },
      { name: "Thalia", meaning: "To flourish", gender: "girl" },
      { name: "Theo", meaning: "Gift of God", gender: "boy" },
      { name: "Iris", meaning: "Rainbow", gender: "girl" },
      { name: "Nico", meaning: "Victory of the people", gender: "neutral" },
      { name: "Daphne", meaning: "Laurel tree", gender: "girl" },
    ],
  },
  {
    id: "norse", label: "Norse",
    names: [
      { name: "Freya", meaning: "Noble lady", gender: "girl" },
      { name: "Erik", meaning: "Eternal ruler", gender: "boy" },
      { name: "Astrid", meaning: "Divinely beautiful", gender: "girl" },
      { name: "Leif", meaning: "Heir, descendant", gender: "boy" },
      { name: "Saga", meaning: "Seeress, story", gender: "neutral" },
      { name: "Bjorn", meaning: "Bear", gender: "boy" },
      { name: "Ingrid", meaning: "Beautiful, fair", gender: "girl" },
      { name: "Soren", meaning: "Stern", gender: "boy" },
      { name: "Liv", meaning: "Life", gender: "girl" },
      { name: "Odin", meaning: "Frenzy, inspiration", gender: "boy" },
      { name: "Eira", meaning: "Mercy, snow", gender: "girl" },
      { name: "Sten", meaning: "Stone", gender: "neutral" },
    ],
  },
];

const GENDERS = [
  { id: "all", label: "All" },
  { id: "boy", label: "Boy" },
  { id: "girl", label: "Girl" },
  { id: "neutral", label: "Gender neutral" },
] as const;

const FAV_KEY = "iconvault-baby-name-favs";

interface Fav {
  name: string;
  meaning: string;
  origin: string;
}

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";

function BabyNameTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("baby-name-generator", isPro);
  const seo = getToolSeo("baby-name-generator");

  const [origin, setOrigin] = useState("english");
  const [gender, setGender] = useState<"all" | "boy" | "girl" | "neutral">("all");
  const [current, setCurrent] = useState<NameEntry | null>(null);
  const [favs, setFavs] = useState<Fav[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(JSON.parse(raw) as Fav[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* ignore */ }
  }, [favs]);

  const originLabel = useMemo(() => ORIGINS.find((o) => o.id === origin)?.label ?? "English", [origin]);

  const randomize = () => {
    const pool = ORIGINS.find((o) => o.id === origin)?.names ?? [];
    const filtered = gender === "all" ? pool : pool.filter((n) => n.gender === gender);
    if (!filtered.length) {
      toast.error("No names match that filter.");
      return;
    }
    setCurrent(filtered[Math.floor(Math.random() * filtered.length)]!);
    trial.recordUse();
  };

  const saveFav = () => {
    if (!current) return;
    if (favs.some((f) => f.name === current.name && f.origin === originLabel)) {
      toast("Already in your favorites.");
      return;
    }
    setFavs((fs) => [...fs, { name: current.name, meaning: current.meaning, origin: originLabel }]);
    toast.success("Saved to favorites");
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed. Your browser blocked clipboard access.");
    }
  };

  const removeFav = (name: string, org: string) =>
    setFavs((fs) => fs.filter((f) => !(f.name === name && f.origin === org)));

  return (
    <ToolPageShell toolId="baby-name-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Baby Name Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-[13px] font-medium text-foreground/80">Origin ({ORIGINS.length} cultures)</label>
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputCls}>
              {ORIGINS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Gender</p>
            <div className="grid grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    gender === g.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <ActionButton onClick={randomize}>
            <Dices className="h-4 w-4" /> Generate name
          </ActionButton>
          <p className="text-xs text-muted-foreground">
            Every name comes with its meaning. Tap the heart to save names you love.
          </p>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-medium text-foreground/80">Favorites ({favs.length})</p>
              {favs.length > 0 && (
                <button type="button" onClick={() => setFavs([])} className="text-xs font-medium text-muted-foreground hover:text-red-500">
                  Clear all
                </button>
              )}
            </div>
            {favs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No favorites yet. Generate names and tap the heart.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                {favs.map((f) => (
                  <li key={`${f.origin}-${f.name}`} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                    <div className="flex-1">
                      <p className="font-semibold">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.origin} - {f.meaning}</p>
                    </div>
                    <button type="button" onClick={() => copy(f.name)} title="Copy name" className="rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => removeFav(f.name, f.origin)} title="Remove" className="rounded-lg p-1.5 text-muted-foreground transition hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
          {!current ? (
            <div>
              <p className="text-lg font-semibold">Ready when you are</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pick an origin and gender, then hit Generate name for a random pick with its meaning.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">{originLabel}</p>
              <h2 className="mt-2 text-5xl font-bold">{current.name}</h2>
              <p className="mt-3 text-lg text-muted-foreground">"{current.meaning}"</p>
              <div className="mt-6 flex justify-center gap-2">
                <ActionButton onClick={randomize}>
                  <Dices className="h-4 w-4" /> Another
                </ActionButton>
                <ActionButton onClick={saveFav}>
                  <Heart className="h-4 w-4" /> Save
                </ActionButton>
                <ActionButton onClick={() => copy(current.name)}>
                  <Copy className="h-4 w-4" /> Copy
                </ActionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
