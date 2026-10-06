// /tools/hex-converter - Text to hex, hex to text, and a hex to ASCII
// table view. Uppercase/lowercase and delimiter options. 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Hexagon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/hex-converter";
import toolSeoMeta from "@/lib/tool-seo-meta-data/hex-converter";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/hex-converter")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/hex-converter";
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
  component: HexConverterTool,
});

type Tab = "toHex" | "toText" | "table";
type CaseOpt = "lower" | "upper";
type Delim = "none" | "space" | "colon" | "dash" | "backslash-x" | "0x" | "comma";

const DELIMS: { id: Delim; label: string }[] = [
  { id: "none", label: "None" },
  { id: "space", label: "Space" },
  { id: "colon", label: "Colon :" },
  { id: "dash", label: "Dash -" },
  { id: "backslash-x", label: "\\x" },
  { id: "0x", label: "0x" },
  { id: "comma", label: "Comma ," },
];

function textToHex(text: string, c: CaseOpt, d: Delim): string {
  const bytes = new TextEncoder().encode(text);
  const hexes = Array.from(bytes, (b) => {
    const h = b.toString(16).padStart(2, "0");
    return c === "upper" ? h.toUpperCase() : h;
  });
  switch (d) {
    case "none": return hexes.join("");
    case "space": return hexes.join(" ");
    case "colon": return hexes.join(":");
    case "dash": return hexes.join("-");
    case "backslash-x": return hexes.map((h) => `\\x${h}`).join("");
    case "0x": return hexes.map((h) => `0x${h}`).join(" ");
    case "comma": return hexes.join(", ");
  }
}

/** Parse forgiving hex: strips 0x prefixes, \x escapes, spaces, colons, dashes, commas. */
function parseHex(s: string): Uint8Array {
  const clean = s
    .replace(/\\x/gi, "")
    .replace(/0x/gi, "")
    .replace(/[\s:,\-;]/g, "");
  if (clean.length === 0) return new Uint8Array(0);
  if (!/^[0-9a-fA-F]+$/.test(clean)) throw new Error("Invalid hex: only 0-9 and A-F allowed.");
  if (clean.length % 2 !== 0) throw new Error("Invalid hex: needs an even number of digits.");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

interface TableRow {
  offset: string;
  hex: string[];
  ascii: string;
}

function hexTable(bytes: Uint8Array): TableRow[] {
  const rows: TableRow[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const slice = bytes.slice(i, i + 16);
    rows.push({
      offset: i.toString(16).padStart(8, "0"),
      hex: Array.from(slice, (b) => b.toString(16).padStart(2, "0")),
      ascii: Array.from(slice, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join(""),
    });
  }
  return rows;
}

function HexConverterTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("hex-converter", isPro);
  const seo = toolSeo;

  const [tab, setTab] = useState<Tab>("toHex");
  const [input, setInput] = useState("");
  const [caseOpt, setCaseOpt] = useState<CaseOpt>("lower");
  const [delim, setDelim] = useState<Delim>("space");
  const [result, setResult] = useState<string | null>(null);
  const [rows, setRows] = useState<TableRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = () => {
    if (!trial.canUse || busy || !input.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (tab === "toHex") {
        setResult(textToHex(input, caseOpt, delim));
        setRows(null);
      } else if (tab === "toText") {
        setResult(new TextDecoder().decode(parseHex(input)));
        setRows(null);
      } else {
        setRows(hexTable(parseHex(input)));
        setResult(null);
      }
      trial.recordUse();
      toast.success("Converted");
    } catch (e) {
      setResult(null);
      setRows(null);
      setError(e instanceof Error ? e.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "toHex", label: "Text to Hex" },
    { id: "toText", label: "Hex to Text" },
    { id: "table", label: "Hex to ASCII table" },
  ];

  return (
    <ToolPageShell toolId="hex-converter" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Hex Converter" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTab(t.id); setResult(null); setRows(null); setError(null); }}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-bold transition",
                  tab === t.id ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "toHex" && (
            <>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Letter case</p>
                <div className="flex gap-2">
                  {(["lower", "upper"] as CaseOpt[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCaseOpt(c)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-bold capitalize transition",
                        caseOpt === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {c === "lower" ? "4a 6f" : "4A 6F"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium text-foreground/80">Delimiter</p>
                <div className="flex flex-wrap gap-2">
                  {DELIMS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDelim(d.id)}
                      className={cn(
                        "rounded-xl border px-3 py-2 font-mono text-sm font-bold transition",
                        delim === d.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(tab === "toText" || tab === "table") && (
            <div className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Accepts hex with or without <code className="font-mono">0x</code> prefixes,{" "}
              <code className="font-mono">\x</code> escapes, spaces, colons, dashes or commas.
            </div>
          )}

          <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={run}>
            <Hexagon className="h-4 w-4" /> {busy ? "Working…" : "Convert"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - all local, no uploads.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-2 block text-sm font-bold">
              {tab === "toHex" ? "Text input" : "Hex input"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={5}
              placeholder={tab === "toHex" ? "Type or paste text…" : "Paste hex, e.g. 48 65 6c 6c 6f…"}
              className="w-full rounded-xl border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-primary"
            />
          </div>

          {tab === "table" ? (
            <div>
              <label className="mb-2 block text-sm font-bold">ASCII table</label>
              {rows && rows.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/60 text-left">
                        <th className="px-3 py-2 font-semibold">Offset</th>
                        <th className="px-3 py-2 font-semibold">Hex bytes</th>
                        <th className="px-3 py-2 font-semibold">ASCII</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.offset} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-1.5 text-primary">{r.offset}</td>
                          <td className="px-3 py-1.5">
                            <span className="mr-2">{r.hex.slice(0, 8).join(" ")}</span>
                            <span>{r.hex.slice(8).join(" ")}</span>
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.ascii}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
                  Paste hex and press Convert to see the classic hexdump view.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-bold">Result</label>
              <textarea
                readOnly
                value={result ?? ""}
                rows={5}
                placeholder="Result appears here…"
                className="w-full rounded-xl border border-border bg-muted/50 p-3 font-mono text-[13px] outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
