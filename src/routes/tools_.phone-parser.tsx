// /tools/phone-parser - Best-effort phone number parsing with a built-in
// country dial-code table: E.164, international and national formats.
// Not a full libphonenumber port; runs 100% in-browser.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Eraser, Phone } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/phone-parser";
import toolSeoMeta from "@/lib/tool-seo-meta-data/phone-parser";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/phone-parser")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/phone-parser";
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
  component: PhoneParserTool,
});

interface DialCode {
  code: string;
  country: string;
  trunk: string; // national trunk prefix to re-add for national format
}

// Top ~40 dial codes by usage. Best-effort: NANP (+1) covers US, Canada and the Caribbean.
const DIAL_CODES: DialCode[] = [
  { code: "1", country: "United States / Canada (NANP)", trunk: "1" },
  { code: "7", country: "Russia / Kazakhstan", trunk: "8" },
  { code: "20", country: "Egypt", trunk: "0" },
  { code: "27", country: "South Africa", trunk: "0" },
  { code: "30", country: "Greece", trunk: "" },
  { code: "31", country: "Netherlands", trunk: "0" },
  { code: "32", country: "Belgium", trunk: "0" },
  { code: "33", country: "France", trunk: "0" },
  { code: "34", country: "Spain", trunk: "" },
  { code: "36", country: "Hungary", trunk: "06" },
  { code: "39", country: "Italy", trunk: "" },
  { code: "40", country: "Romania", trunk: "0" },
  { code: "41", country: "Switzerland", trunk: "0" },
  { code: "43", country: "Austria", trunk: "0" },
  { code: "44", country: "United Kingdom", trunk: "0" },
  { code: "45", country: "Denmark", trunk: "" },
  { code: "46", country: "Sweden", trunk: "0" },
  { code: "47", country: "Norway", trunk: "" },
  { code: "48", country: "Poland", trunk: "" },
  { code: "49", country: "Germany", trunk: "0" },
  { code: "52", country: "Mexico", trunk: "01" },
  { code: "54", country: "Argentina", trunk: "0" },
  { code: "55", country: "Brazil", trunk: "0" },
  { code: "56", country: "Chile", trunk: "" },
  { code: "57", country: "Colombia", trunk: "0" },
  { code: "58", country: "Venezuela", trunk: "0" },
  { code: "60", country: "Malaysia", trunk: "0" },
  { code: "61", country: "Australia", trunk: "0" },
  { code: "62", country: "Indonesia", trunk: "0" },
  { code: "63", country: "Philippines", trunk: "0" },
  { code: "64", country: "New Zealand", trunk: "0" },
  { code: "65", country: "Singapore", trunk: "" },
  { code: "66", country: "Thailand", trunk: "0" },
  { code: "81", country: "Japan", trunk: "0" },
  { code: "82", country: "South Korea", trunk: "0" },
  { code: "84", country: "Vietnam", trunk: "0" },
  { code: "86", country: "China", trunk: "" },
  { code: "90", country: "Turkey", trunk: "0" },
  { code: "91", country: "India", trunk: "0" },
  { code: "92", country: "Pakistan", trunk: "0" },
  { code: "93", country: "Afghanistan", trunk: "0" },
  { code: "94", country: "Sri Lanka", trunk: "0" },
  { code: "95", country: "Myanmar", trunk: "0" },
  { code: "98", country: "Iran", trunk: "0" },
  { code: "212", country: "Morocco", trunk: "0" },
  { code: "234", country: "Nigeria", trunk: "0" },
  { code: "254", country: "Kenya", trunk: "0" },
  { code: "351", country: "Portugal", trunk: "" },
  { code: "352", country: "Luxembourg", trunk: "" },
  { code: "353", country: "Ireland", trunk: "0" },
  { code: "354", country: "Iceland", trunk: "" },
  { code: "355", country: "Albania", trunk: "0" },
  { code: "359", country: "Bulgaria", trunk: "0" },
  { code: "370", country: "Lithuania", trunk: "8" },
  { code: "371", country: "Latvia", trunk: "" },
  { code: "372", country: "Estonia", trunk: "" },
  { code: "373", country: "Moldova", trunk: "0" },
  { code: "374", country: "Armenia", trunk: "0" },
  { code: "375", country: "Belarus", trunk: "8" },
  { code: "380", country: "Ukraine", trunk: "0" },
  { code: "381", country: "Serbia", trunk: "0" },
  { code: "385", country: "Croatia", trunk: "0" },
  { code: "386", country: "Slovenia", trunk: "0" },
  { code: "420", country: "Czech Republic", trunk: "" },
  { code: "421", country: "Slovakia", trunk: "0" },
  { code: "852", country: "Hong Kong", trunk: "" },
  { code: "853", country: "Macau", trunk: "" },
  { code: "855", country: "Cambodia", trunk: "0" },
  { code: "856", country: "Laos", trunk: "0" },
  { code: "880", country: "Bangladesh", trunk: "0" },
  { code: "886", country: "Taiwan", trunk: "0" },
  { code: "961", country: "Lebanon", trunk: "0" },
  { code: "962", country: "Jordan", trunk: "0" },
  { code: "963", country: "Syria", trunk: "0" },
  { code: "964", country: "Iraq", trunk: "0" },
  { code: "965", country: "Kuwait", trunk: "" },
  { code: "966", country: "Saudi Arabia", trunk: "0" },
  { code: "971", country: "United Arab Emirates", trunk: "0" },
  { code: "972", country: "Israel", trunk: "0" },
  { code: "974", country: "Qatar", trunk: "" },
  { code: "975", country: "Bhutan", trunk: "" },
  { code: "976", country: "Mongolia", trunk: "0" },
  { code: "977", country: "Nepal", trunk: "0" },
];

interface Parsed {
  input: string;
  ok: boolean;
  country: string;
  e164: string;
  international: string;
  national: string;
  note: string;
}

function groupDigits(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length === 10 && digits[0] === "1") return `${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  // Generic: 3-3-4 for 10 digits, else groups of 3-4 from the right
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  const out: string[] = [];
  let rest = digits;
  while (rest.length > 4) {
    out.unshift(rest.slice(-4));
    rest = rest.slice(0, -4);
  }
  out.unshift(rest);
  return out.join(" ");
}

function parsePhone(line: string): Parsed {
  const input = line.trim();
  const fail = (note: string): Parsed => ({ input, ok: false, country: "-", e164: "-", international: "-", national: "-", note });

  let digits = input.replace(/[^\d]/g, "");
  const hadPlus = input.trimStart().startsWith("+") || input.trimStart().startsWith("00");
  if (input.trimStart().startsWith("00")) digits = digits.slice(2);
  if (digits.length < 7 || digits.length > 15) return fail("Not enough or too many digits for a phone number (7-15 expected)");

  let matched: DialCode | null = null;
  let national = digits;

  if (hadPlus) {
    // Longest-prefix match against the table
    for (const d of [...DIAL_CODES].sort((a, b) => b.code.length - a.code.length)) {
      if (digits.startsWith(d.code) && digits.length > d.code.length) {
        matched = d;
        national = digits.slice(d.code.length);
        break;
      }
    }
    if (!matched) return fail("Country code not in the built-in table - check the digits and try again");
  } else {
    // Assume local number: try matching a trunk prefix from the table
    const candidates = DIAL_CODES.filter((d) => d.trunk && digits.startsWith(d.trunk));
    const first = candidates[0];
    if (first) {
      matched = first;
      national = digits.slice(first.trunk.length);
    }
  }

  if (!matched) return fail("Country not detected - add a +country code, e.g. +91 98765 43210");

  const e164 = `+${matched.code}${national}`;
  return {
    input,
    ok: true,
    country: matched.country,
    e164,
    international: `+${matched.code} ${groupDigits(national)}`,
    national: matched.trunk ? `${matched.trunk} ${groupDigits(national)}` : groupDigits(national),
    note: "",
  };
}

function PhoneParserTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("phone-parser", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Parsed[] | null>(null);

  const parse = () => {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0 || !trial.canUse) return;
    setRows(lines.map(parsePhone));
    trial.recordUse();
    toast.success("Numbers parsed");
  };

  return (
    <ToolPageShell toolId="phone-parser" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Phone Parser" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <label htmlFor="phone-input" className="text-sm font-semibold">
            Phone numbers, one per line
          </label>
          <textarea
            id="phone-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"+91 98765 43210\n+44 7700 900077\n+1 (415) 555-0132"}
            rows={10}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-background p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-primary"
          />
          <div className="flex flex-wrap gap-3">
            <ActionButton busy={false} disabled={!input.trim() || !trial.canUse} onClick={parse}>
              <Phone className="h-4 w-4" /> Parse
            </ActionButton>
            <button
              type="button"
              onClick={() => { setInput(""); setRows(null); }}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-muted-foreground transition hover:border-primary/40"
            >
              <Eraser className="h-4 w-4" /> Clear
            </button>
          </div>
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground/80">
            Best-effort parsing with a built-in dial-code table ({DIAL_CODES.length} codes), not a full libphonenumber port. Verify critical numbers before use.
          </p>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free parses left - everything runs in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!rows ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Phone className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Normalize phone numbers</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Detect the country from the dial code and get E.164, international and national formats for each number.
              </p>
            </div>
          ) : (
            <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60">
                    {["Input", "Country", "E.164", "International", "National"].map((h) => (
                      <th key={h} className="border-b border-border px-3 py-2 text-left font-bold text-foreground/80">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={cn(!r.ok ? "bg-red-500/5" : i % 2 === 1 ? "bg-muted/30" : undefined)}>
                      <td className="border-b border-border/60 px-3 py-2 font-mono text-foreground/70">{r.input}</td>
                      {r.ok ? (
                        <>
                          <td className="border-b border-border/60 px-3 py-2">{r.country}</td>
                          <td className="border-b border-border/60 px-3 py-2 font-mono font-semibold text-primary">{r.e164}</td>
                          <td className="border-b border-border/60 px-3 py-2 font-mono">{r.international}</td>
                          <td className="border-b border-border/60 px-3 py-2 font-mono">{r.national}</td>
                        </>
                      ) : (
                        <td colSpan={4} className="border-b border-border/60 px-3 py-2 font-semibold text-red-500">{r.note}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
