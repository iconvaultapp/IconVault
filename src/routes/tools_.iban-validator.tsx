// /tools/iban-validator - Mod-97 IBAN checksum validation with country,
// check digits and BBAN parsing, batch mode, print/electronic formats.
// 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, CreditCard, Eraser } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/iban-validator")({
  head: () => {
    const seo = getToolSeoMeta("iban-validator");
    const canonical = "https://iconvault.site/tools/iban-validator";
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
  component: IbanTool,
});

const COUNTRIES: Record<string, string> = {
  AL: "Albania", AD: "Andorra", AT: "Austria", AZ: "Azerbaijan", BH: "Bahrain", BE: "Belgium",
  BA: "Bosnia and Herzegovina", BR: "Brazil", BG: "Bulgaria", CR: "Costa Rica", HR: "Croatia",
  CY: "Cyprus", CZ: "Czech Republic", DK: "Denmark", DO: "Dominican Republic", EG: "Egypt",
  SV: "El Salvador", EE: "Estonia", FO: "Faroe Islands", FI: "Finland", FR: "France", GE: "Georgia",
  DE: "Germany", GI: "Gibraltar", GR: "Greece", GL: "Greenland", GT: "Guatemala", HU: "Hungary",
  IS: "Iceland", IQ: "Iraq", IE: "Ireland", IL: "Israel", IT: "Italy", JO: "Jordan", KZ: "Kazakhstan",
  XK: "Kosovo", KW: "Kuwait", LV: "Latvia", LB: "Lebanon", LI: "Liechtenstein", LT: "Lithuania",
  LU: "Luxembourg", MK: "North Macedonia", MT: "Malta", MR: "Mauritania", MU: "Mauritius",
  MD: "Moldova", MC: "Monaco", ME: "Montenegro", NL: "Netherlands", NO: "Norway", PK: "Pakistan",
  PS: "Palestine", PL: "Poland", PT: "Portugal", QA: "Qatar", RO: "Romania", SM: "San Marino",
  SA: "Saudi Arabia", RS: "Serbia", SK: "Slovakia", SI: "Slovenia", ES: "Spain", SE: "Sweden",
  CH: "Switzerland", TL: "Timor-Leste", TN: "Tunisia", TR: "Turkey", UA: "Ukraine",
  AE: "United Arab Emirates", GB: "United Kingdom",
};

interface IbanRow {
  raw: string;
  electronic: string;
  valid: boolean;
  country: string;
  check: string;
  bban: string;
  note: string;
}

function mod97Valid(iban: string): boolean {
  // Rearrange: BBAN + country + check, letters -> numbers (A=10 ... Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    if (ch >= "A" && ch <= "Z") {
      const n = ch.charCodeAt(0) - 55; // A=10..Z=35
      remainder = (remainder * 100 + n) % 97;
    } else if (ch >= "0" && ch <= "9") {
      remainder = (remainder * 10 + (ch.charCodeAt(0) - 48)) % 97;
    } else {
      return false;
    }
  }
  return remainder === 1;
}

function analyzeIban(line: string): IbanRow {
  const raw = line.trim();
  const electronic = raw.replace(/[\s-]+/g, "").toUpperCase();
  const base = { raw, electronic, valid: false, country: "-", check: "-", bban: "-", note: "" };
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(electronic)) {
    return { ...base, note: "Does not match the IBAN pattern (2 letters, 2 digits, 11-30 alphanumerics)" };
  }
  const cc = electronic.slice(0, 2);
  if (!COUNTRIES[cc]) {
    return { ...base, country: cc, note: "Unknown country code" };
  }
  const valid = mod97Valid(electronic);
  return {
    ...base,
    valid,
    country: `${cc} - ${COUNTRIES[cc]}`,
    check: electronic.slice(2, 4),
    bban: electronic.slice(4),
    note: valid ? "" : "Mod-97 checksum failed",
  };
}

function printFormat(electronic: string): string {
  return electronic.replace(/(.{4})(?=.)/g, "$1 ");
}

function IbanTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("iban-validator", isPro);
  const seo = getToolSeo("iban-validator");

  const [input, setInput] = useState("");
  const [format, setFormat] = useState<"print" | "electronic">("print");
  const [rows, setRows] = useState<IbanRow[] | null>(null);

  const validate = () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || !trial.canUse) return;
    setRows(lines.map(analyzeIban));
    trial.recordUse();
    toast.success("IBANs checked");
  };

  const copyOne = (electronic: string) => {
    const text = format === "print" ? printFormat(electronic) : electronic;
    void navigator.clipboard.writeText(text).then(() => toast.success(`Copied ${format === "print" ? "print" : "electronic"} format`));
  };

  return (
    <ToolPageShell toolId="iban-validator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="IBAN Validator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label htmlFor="iban-input" className="text-sm font-semibold">
            Enter IBANs, one per line
          </label>
          <textarea
            id="iban-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"DE89 3704 0044 0532 0130 00\nGB29 NWBK 6016 1331 9268 19"}
            rows={10}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Display format</p>
            <div className="flex gap-2">
              {([["print", "Print (spaced)"], ["electronic", "Electronic"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setFormat(v)}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    format === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Print format groups characters in fours with spaces; electronic is the compact no-space version used by banking software.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!input.trim() || !trial.canUse} onClick={validate}>
              <CreditCard className="h-4 w-4" /> Validate
            </ActionButton>
            <button
              type="button"
              onClick={() => { setInput(""); setRows(null); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free validations left - checks run fully in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!rows ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <CreditCard className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Verify IBANs with the mod-97 check</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                The same checksum banks use. See the country, check digits and BBAN behind every IBAN.
              </p>
            </div>
          ) : (
            <div className="max-h-[480px] space-y-3 overflow-auto">
              {rows.map((r, i) => (
                <div key={i} className={cn("rounded-xl border p-4", r.valid ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", r.valid ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500")}>
                      {r.valid ? "Valid" : "Invalid"}
                    </span>
                    <p className="break-all font-mono text-sm font-semibold">{format === "print" ? printFormat(r.electronic) : r.electronic}</p>
                    <button
                      type="button"
                      onClick={() => copyOne(r.electronic)}
                      className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-bold transition hover:border-primary/40"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                  {r.valid ? (
                    <div className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-3">
                      <span className="text-muted-foreground">Country: <span className="font-semibold text-foreground">{r.country}</span></span>
                      <span className="text-muted-foreground">Check digits: <span className="font-semibold text-foreground">{r.check}</span></span>
                      <span className="break-all text-muted-foreground">BBAN: <span className="font-mono font-semibold text-foreground">{r.bban}</span></span>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-red-500">{r.note}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
