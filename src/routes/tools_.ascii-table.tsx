// /tools/ascii-table - The full 0-127 ASCII table: decimal, hex, octal, binary,
// character and HTML entity, with search and click-to-copy. 100% in-browser.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Search, Table2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/ascii-table";
import toolSeoMeta from "@/lib/tool-seo-meta-data/ascii-table";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ascii-table")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/ascii-table";
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
  component: AsciiTableTool,
});

const CTRL_NAMES: Record<number, string> = {
  0: "NUL", 1: "SOH", 2: "STX", 3: "ETX", 4: "EOT", 5: "ENQ", 6: "ACK", 7: "BEL",
  8: "BS", 9: "HT", 10: "LF", 11: "VT", 12: "FF", 13: "CR", 14: "SO", 15: "SI",
  16: "DLE", 17: "DC1", 18: "DC2", 19: "DC3", 20: "DC4", 21: "NAK", 22: "SYN",
  23: "ETB", 24: "CAN", 25: "EM", 26: "SUB", 27: "ESC", 28: "FS", 29: "GS",
  30: "RS", 31: "US", 127: "DEL",
};

interface AsciiRow {
  dec: number;
  hex: string;
  oct: string;
  bin: string;
  char: string | null;
  name: string;
  entity: string;
}

const ROWS: AsciiRow[] = Array.from({ length: 128 }, (_, dec) => {
  const name = CTRL_NAMES[dec] ?? (dec === 32 ? "Space" : String.fromCharCode(dec));
  return {
    dec,
    hex: dec.toString(16).toUpperCase().padStart(2, "0"),
    oct: dec.toString(8).padStart(3, "0"),
    bin: dec.toString(2).padStart(8, "0"),
    char: CTRL_NAMES[dec] || dec === 32 ? null : String.fromCharCode(dec),
    name,
    entity: `&#${dec};`,
  };
});

function AsciiTableTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ascii-table", isPro);
  const seo = toolSeo;

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROWS;
    return ROWS.filter(
      (r) =>
        String(r.dec).includes(q) ||
        r.hex.toLowerCase().includes(q) ||
        r.oct.includes(q) ||
        r.bin.includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.char ?? "").toLowerCase().includes(q),
    );
  }, [query]);

  const copy = async (text: string, what: string) => {
    if (!trial.canUse) {
      toast.error(`Free trial used up - ${TOOL_TRIAL_LIMIT} copies per tool. Go Pro for unlimited.`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success(`${what} copied`);
    } catch {
      toast.error("Copy failed - select and copy manually.");
    }
  };

  return (
    <ToolPageShell toolId="ascii-table" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="ASCII Table" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, char, dec, hex, oct, bin..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of 128 entries - click any row to copy its character, or the entity button to copy the HTML code.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
            <Table2 className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">No matches</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try a decimal number, a hex code like 41, or a name like LF.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Dec</th>
                  <th className="px-3 py-2 font-medium">Hex</th>
                  <th className="px-3 py-2 font-medium">Oct</th>
                  <th className="px-3 py-2 font-medium">Bin</th>
                  <th className="px-3 py-2 font-medium">Char</th>
                  <th className="px-3 py-2 font-medium">HTML entity</th>
                  <th className="px-3 py-2 text-right font-medium">Copy</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const copyText = r.char ?? r.entity;
                  const copyWhat = r.char ? `character "${r.char}"` : `${r.name} entity`;
                  return (
                    <tr
                      key={r.dec}
                      onClick={() => void copy(copyText, copyWhat)}
                      className="cursor-pointer border-b border-border/60 transition last:border-0 hover:bg-primary/5"
                      title={`Click to copy ${copyWhat}`}
                    >
                      <td className="px-3 py-2 font-mono font-bold">{r.dec}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.hex}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.oct}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.bin}</td>
                      <td className="px-3 py-2">
                        {r.char ? (
                          <span className="font-mono text-base font-bold text-primary">{r.char}</span>
                        ) : (
                          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold text-muted-foreground">
                            {r.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground">{r.entity}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void copy(r.entity, `${r.name} entity`);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-bold hover:border-primary/40"
                        >
                          <ClipboardCopy className="h-3 w-3" /> Entity
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">
            {trial.left} of {TOOL_TRIAL_LIMIT} free copies left - runs fully on your device.
          </p>
        )}
      </div>
    </ToolPageShell>
  );
}
