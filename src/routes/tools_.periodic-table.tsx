// /tools/periodic-table - Interactive periodic table lab with built-in data
// for all 118 elements: click for properties, search, copy. Client-side only.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Atom, Copy, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/periodic-table";
import toolSeoMeta from "@/lib/tool-seo-meta-data/periodic-table";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/periodic-table")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/periodic-table";
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
  component: PeriodicTableTool,
});

interface El {
  n: number; sym: string; name: string; mass: string;
  grp: string; col: number; row: number; cat: Category; en: number | null;
}

type Category = "alkali" | "alkaline" | "transition" | "post" | "metalloid" | "nonmetal" | "halogen" | "noble" | "lanthanide" | "actinide";

// [n, sym, name, mass, group, col, row, category, electronegativity]
const RAW: [number, string, string, string, string, number, number, Category, number | null][] = [
  [1, "H", "Hydrogen", "1.008", "1", 1, 1, "nonmetal", 2.20],
  [2, "He", "Helium", "4.003", "18", 18, 1, "noble", null],
  [3, "Li", "Lithium", "6.94", "1", 1, 2, "alkali", 0.98],
  [4, "Be", "Beryllium", "9.012", "2", 2, 2, "alkaline", 1.57],
  [5, "B", "Boron", "10.81", "13", 13, 2, "metalloid", 2.04],
  [6, "C", "Carbon", "12.011", "14", 14, 2, "nonmetal", 2.55],
  [7, "N", "Nitrogen", "14.007", "15", 15, 2, "nonmetal", 3.04],
  [8, "O", "Oxygen", "15.999", "16", 16, 2, "nonmetal", 3.44],
  [9, "F", "Fluorine", "18.998", "17", 17, 2, "halogen", 3.98],
  [10, "Ne", "Neon", "20.180", "18", 18, 2, "noble", null],
  [11, "Na", "Sodium", "22.990", "1", 1, 3, "alkali", 0.93],
  [12, "Mg", "Magnesium", "24.305", "2", 2, 3, "alkaline", 1.31],
  [13, "Al", "Aluminium", "26.982", "13", 13, 3, "post", 1.61],
  [14, "Si", "Silicon", "28.085", "14", 14, 3, "metalloid", 1.90],
  [15, "P", "Phosphorus", "30.974", "15", 15, 3, "nonmetal", 2.19],
  [16, "S", "Sulfur", "32.06", "16", 16, 3, "nonmetal", 2.58],
  [17, "Cl", "Chlorine", "35.45", "17", 17, 3, "halogen", 3.16],
  [18, "Ar", "Argon", "39.948", "18", 18, 3, "noble", null],
  [19, "K", "Potassium", "39.098", "1", 1, 4, "alkali", 0.82],
  [20, "Ca", "Calcium", "40.078", "2", 2, 4, "alkaline", 1.00],
  [21, "Sc", "Scandium", "44.956", "3", 3, 4, "transition", 1.36],
  [22, "Ti", "Titanium", "47.867", "4", 4, 4, "transition", 1.54],
  [23, "V", "Vanadium", "50.942", "5", 5, 4, "transition", 1.63],
  [24, "Cr", "Chromium", "51.996", "6", 6, 4, "transition", 1.66],
  [25, "Mn", "Manganese", "54.938", "7", 7, 4, "transition", 1.55],
  [26, "Fe", "Iron", "55.845", "8", 8, 4, "transition", 1.83],
  [27, "Co", "Cobalt", "58.933", "9", 9, 4, "transition", 1.88],
  [28, "Ni", "Nickel", "58.693", "10", 10, 4, "transition", 1.91],
  [29, "Cu", "Copper", "63.546", "11", 11, 4, "transition", 1.90],
  [30, "Zn", "Zinc", "65.38", "12", 12, 4, "transition", 1.65],
  [31, "Ga", "Gallium", "69.723", "13", 13, 4, "post", 1.81],
  [32, "Ge", "Germanium", "72.630", "14", 14, 4, "metalloid", 2.01],
  [33, "As", "Arsenic", "74.922", "15", 15, 4, "metalloid", 2.18],
  [34, "Se", "Selenium", "78.971", "16", 16, 4, "nonmetal", 2.55],
  [35, "Br", "Bromine", "79.904", "17", 17, 4, "halogen", 2.96],
  [36, "Kr", "Krypton", "83.798", "18", 18, 4, "noble", 3.00],
  [37, "Rb", "Rubidium", "85.468", "1", 1, 5, "alkali", 0.82],
  [38, "Sr", "Strontium", "87.62", "2", 2, 5, "alkaline", 0.95],
  [39, "Y", "Yttrium", "88.906", "3", 3, 5, "transition", 1.22],
  [40, "Zr", "Zirconium", "91.224", "4", 4, 5, "transition", 1.33],
  [41, "Nb", "Niobium", "92.906", "5", 5, 5, "transition", 1.60],
  [42, "Mo", "Molybdenum", "95.95", "6", 6, 5, "transition", 2.16],
  [43, "Tc", "Technetium", "[98]", "7", 7, 5, "transition", 1.90],
  [44, "Ru", "Ruthenium", "101.07", "8", 8, 5, "transition", 2.20],
  [45, "Rh", "Rhodium", "102.91", "9", 9, 5, "transition", 2.28],
  [46, "Pd", "Palladium", "106.42", "10", 10, 5, "transition", 2.20],
  [47, "Ag", "Silver", "107.87", "11", 11, 5, "transition", 1.93],
  [48, "Cd", "Cadmium", "112.41", "12", 12, 5, "transition", 1.69],
  [49, "In", "Indium", "114.82", "13", 13, 5, "post", 1.78],
  [50, "Sn", "Tin", "118.71", "14", 14, 5, "post", 1.96],
  [51, "Sb", "Antimony", "121.76", "15", 15, 5, "metalloid", 2.05],
  [52, "Te", "Tellurium", "127.60", "16", 16, 5, "metalloid", 2.10],
  [53, "I", "Iodine", "126.90", "17", 17, 5, "halogen", 2.66],
  [54, "Xe", "Xenon", "131.29", "18", 18, 5, "noble", 2.60],
  [55, "Cs", "Caesium", "132.91", "1", 1, 6, "alkali", 0.79],
  [56, "Ba", "Barium", "137.33", "2", 2, 6, "alkaline", 0.89],
  [57, "La", "Lanthanum", "138.91", "-", 3, 9, "lanthanide", 1.10],
  [58, "Ce", "Cerium", "140.12", "-", 4, 9, "lanthanide", 1.12],
  [59, "Pr", "Praseodymium", "140.91", "-", 5, 9, "lanthanide", 1.13],
  [60, "Nd", "Neodymium", "144.24", "-", 6, 9, "lanthanide", 1.14],
  [61, "Pm", "Promethium", "[145]", "-", 7, 9, "lanthanide", 1.13],
  [62, "Sm", "Samarium", "150.36", "-", 8, 9, "lanthanide", 1.17],
  [63, "Eu", "Europium", "151.96", "-", 9, 9, "lanthanide", 1.20],
  [64, "Gd", "Gadolinium", "157.25", "-", 10, 9, "lanthanide", 1.20],
  [65, "Tb", "Terbium", "158.93", "-", 11, 9, "lanthanide", 1.10],
  [66, "Dy", "Dysprosium", "162.50", "-", 12, 9, "lanthanide", 1.22],
  [67, "Ho", "Holmium", "164.93", "-", 13, 9, "lanthanide", 1.23],
  [68, "Er", "Erbium", "167.26", "-", 14, 9, "lanthanide", 1.24],
  [69, "Tm", "Thulium", "168.93", "-", 15, 9, "lanthanide", 1.25],
  [70, "Yb", "Ytterbium", "173.05", "-", 16, 9, "lanthanide", 1.10],
  [71, "Lu", "Lutetium", "174.97", "-", 17, 9, "lanthanide", 1.27],
  [72, "Hf", "Hafnium", "178.49", "4", 4, 6, "transition", 1.30],
  [73, "Ta", "Tantalum", "180.95", "5", 5, 6, "transition", 1.50],
  [74, "W", "Tungsten", "183.84", "6", 6, 6, "transition", 2.36],
  [75, "Re", "Rhenium", "186.21", "7", 7, 6, "transition", 1.90],
  [76, "Os", "Osmium", "190.23", "8", 8, 6, "transition", 2.20],
  [77, "Ir", "Iridium", "192.22", "9", 9, 6, "transition", 2.20],
  [78, "Pt", "Platinum", "195.08", "10", 10, 6, "transition", 2.28],
  [79, "Au", "Gold", "196.97", "11", 11, 6, "transition", 2.54],
  [80, "Hg", "Mercury", "200.59", "12", 12, 6, "transition", 2.00],
  [81, "Tl", "Thallium", "204.38", "13", 13, 6, "post", 1.62],
  [82, "Pb", "Lead", "207.2", "14", 14, 6, "post", 2.33],
  [83, "Bi", "Bismuth", "208.98", "15", 15, 6, "post", 2.02],
  [84, "Po", "Polonium", "[209]", "16", 16, 6, "post", 2.00],
  [85, "At", "Astatine", "[210]", "17", 17, 6, "metalloid", 2.20],
  [86, "Rn", "Radon", "[222]", "18", 18, 6, "noble", 2.20],
  [87, "Fr", "Francium", "[223]", "1", 1, 7, "alkali", 0.70],
  [88, "Ra", "Radium", "[226]", "2", 2, 7, "alkaline", 0.90],
  [89, "Ac", "Actinium", "[227]", "-", 3, 10, "actinide", 1.10],
  [90, "Th", "Thorium", "232.04", "-", 4, 10, "actinide", 1.30],
  [91, "Pa", "Protactinium", "231.04", "-", 5, 10, "actinide", 1.50],
  [92, "U", "Uranium", "238.03", "-", 6, 10, "actinide", 1.38],
  [93, "Np", "Neptunium", "[237]", "-", 7, 10, "actinide", 1.36],
  [94, "Pu", "Plutonium", "[244]", "-", 8, 10, "actinide", 1.28],
  [95, "Am", "Americium", "[243]", "-", 9, 10, "actinide", 1.30],
  [96, "Cm", "Curium", "[247]", "-", 10, 10, "actinide", 1.30],
  [97, "Bk", "Berkelium", "[247]", "-", 11, 10, "actinide", 1.30],
  [98, "Cf", "Californium", "[251]", "-", 12, 10, "actinide", 1.30],
  [99, "Es", "Einsteinium", "[252]", "-", 13, 10, "actinide", 1.30],
  [100, "Fm", "Fermium", "[257]", "-", 14, 10, "actinide", 1.30],
  [101, "Md", "Mendelevium", "[258]", "-", 15, 10, "actinide", 1.30],
  [102, "No", "Nobelium", "[259]", "-", 16, 10, "actinide", 1.30],
  [103, "Lr", "Lawrencium", "[266]", "-", 17, 10, "actinide", null],
  [104, "Rf", "Rutherfordium", "[267]", "4", 4, 7, "transition", null],
  [105, "Db", "Dubnium", "[268]", "5", 5, 7, "transition", null],
  [106, "Sg", "Seaborgium", "[269]", "6", 6, 7, "transition", null],
  [107, "Bh", "Bohrium", "[270]", "7", 7, 7, "transition", null],
  [108, "Hs", "Hassium", "[277]", "8", 8, 7, "transition", null],
  [109, "Mt", "Meitnerium", "[278]", "9", 9, 7, "transition", null],
  [110, "Ds", "Darmstadtium", "[281]", "10", 10, 7, "transition", null],
  [111, "Rg", "Roentgenium", "[282]", "11", 11, 7, "transition", null],
  [112, "Cn", "Copernicium", "[285]", "12", 12, 7, "transition", null],
  [113, "Nh", "Nihonium", "[286]", "13", 13, 7, "post", null],
  [114, "Fl", "Flerovium", "[289]", "14", 14, 7, "post", null],
  [115, "Mc", "Moscovium", "[290]", "15", 15, 7, "post", null],
  [116, "Lv", "Livermorium", "[293]", "16", 16, 7, "post", null],
  [117, "Ts", "Tennessine", "[294]", "17", 17, 7, "halogen", null],
  [118, "Og", "Oganesson", "[294]", "18", 18, 7, "noble", null],
];

const ELEMENTS: El[] = RAW.map(([n, sym, name, mass, grp, col, row, cat, en]) => ({
  n, sym, name, mass, grp, col, row, cat, en,
}));

const CAT_STYLE: Record<Category, { label: string; cell: string }> = {
  alkali: { label: "Alkali metal", cell: "bg-red-500/15 text-red-600 border-red-500/40" },
  alkaline: { label: "Alkaline earth", cell: "bg-orange-500/15 text-orange-600 border-orange-500/40" },
  transition: { label: "Transition metal", cell: "bg-amber-500/15 text-amber-700 border-amber-500/40" },
  post: { label: "Post-transition metal", cell: "bg-teal-500/15 text-teal-600 border-teal-500/40" },
  metalloid: { label: "Metalloid", cell: "bg-lime-500/15 text-lime-700 border-lime-500/40" },
  nonmetal: { label: "Reactive nonmetal", cell: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40" },
  halogen: { label: "Halogen", cell: "bg-cyan-500/15 text-cyan-600 border-cyan-500/40" },
  noble: { label: "Noble gas", cell: "bg-sky-500/15 text-sky-600 border-sky-500/40" },
  lanthanide: { label: "Lanthanide", cell: "bg-violet-500/15 text-violet-600 border-violet-500/40" },
  actinide: { label: "Actinide", cell: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/40" },
};

function PeriodicTableTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("periodic-table", isPro);
  const seo = toolSeo;

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<El>(ELEMENTS[5]!); // Carbon

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ELEMENTS.filter(
      (e) => e.name.toLowerCase().includes(q) || e.sym.toLowerCase() === q || e.sym.toLowerCase().startsWith(q) || String(e.n) === q,
    ).slice(0, 8);
  }, [query]);

  const copyElement = async () => {
    if (!trial.canUse) return;
    const text = [
      `${selected.name} (${selected.sym}) - atomic number ${selected.n}`,
      `Atomic mass: ${selected.mass} u`,
      `Group: ${selected.grp}, Period: ${selected.row <= 7 ? selected.row : selected.row === 9 ? 6 : 7}`,
      `Category: ${CAT_STYLE[selected.cat].label}`,
      `Electronegativity (Pauling): ${selected.en === null ? "unknown" : selected.en}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(`Copied ${selected.name} data`);
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="periodic-table" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Periodic Table" left={trial.left} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, symbol or number, e.g. gold"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-9 text-sm outline-none focus:border-primary"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            {matches && matches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                {matches.map((e) => (
                  <button
                    key={e.n}
                    type="button"
                    onClick={() => { setSelected(e); setQuery(""); }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <span className={cn("w-10 rounded border px-1 py-0.5 text-center font-bold", CAT_STYLE[e.cat].cell)}>{e.sym}</span>
                    <span className="font-medium">{e.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{e.n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gap: 3 }}>
              {ELEMENTS.map((e) => (
                <button
                  key={e.n}
                  type="button"
                  onClick={() => setSelected(e)}
                  title={`${e.name} (${e.n})`}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-md border p-0.5 transition hover:scale-110",
                    CAT_STYLE[e.cat].cell,
                    selected.n === e.n && "ring-2 ring-primary ring-offset-1",
                  )}
                  style={{ gridColumn: e.col, gridRow: e.row }}
                >
                  <span className="text-[9px] font-medium leading-none opacity-70">{e.n}</span>
                  <span className="text-xs font-bold leading-tight sm:text-sm">{e.sym}</span>
                </button>
              ))}
              <div className="col-start-3 row-start-6 col-span-10 flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                57-71
              </div>
              <div className="col-start-3 row-start-7 col-span-10 flex items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                89-103
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(CAT_STYLE) as Category[]).map((c) => (
              <span key={c} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", CAT_STYLE[c].cell)}>
                {CAT_STYLE[c].label}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            <div className={cn("flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border-2", CAT_STYLE[selected.cat].cell)}>
              <span className="text-xs opacity-70">{selected.n}</span>
              <span className="text-2xl font-bold">{selected.sym}</span>
            </div>
            <div className="flex-1">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Atom className="h-5 w-5 text-primary" /> {selected.name}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{CAT_STYLE[selected.cat].label}</p>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <div><dt className="text-xs text-muted-foreground">Atomic mass</dt><dd className="font-semibold">{selected.mass} u</dd></div>
                <div><dt className="text-xs text-muted-foreground">Group</dt><dd className="font-semibold">{selected.grp}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Period</dt><dd className="font-semibold">{selected.row <= 7 ? selected.row : selected.row === 9 ? 6 : 7}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Electronegativity</dt><dd className="font-semibold">{selected.en === null ? "Unknown" : `${selected.en} (Pauling)`}</dd></div>
              </dl>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <ActionButton disabled={!trial.canUse} onClick={copyElement}>
              <Copy className="h-4 w-4" /> Copy element data
            </ActionButton>
            {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Atomic masses are standard values; [bracketed] masses are the most stable known isotope. Electronegativity values are Pauling scale estimates; unknown for most synthetic elements.
          </p>
        </section>
      </div>
    </ToolPageShell>
  );
}
