// /tools/privacy-policy-generator - Build a tailored privacy policy draft from
// your company details. 100% client-side. Review with a lawyer before publishing.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/privacy-policy-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/privacy-policy-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/privacy-policy-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/privacy-policy-generator";
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
  component: PrivacyPolicyTool,
});

interface DataOption { id: string; label: string; blurb: string; }

const DATA_OPTIONS: DataOption[] = [
  { id: "analytics", label: "Analytics", blurb: "traffic and usage statistics" },
  { id: "cookies", label: "Cookies", blurb: "browser cookies and local storage" },
  { id: "accounts", label: "User accounts", blurb: "names, emails and passwords" },
  { id: "payments", label: "Payments", blurb: "billing details processed by a third party" },
  { id: "newsletter", label: "Newsletter", blurb: "email addresses for marketing updates" },
];

function PrivacyPolicyTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("privacy-policy-generator", isPro);
  const seo = toolSeo;

  const [company, setCompany] = useState("Example Inc.");
  const [website, setWebsite] = useState("https://example.com");
  const [email, setEmail] = useState("privacy@example.com");
  const [selected, setSelected] = useState<string[]>(["analytics", "cookies"]);

  const today = useMemo(
    () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    [],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const policy = useMemo(() => {
    const name = company.trim() || "Your Company";
    const url = website.trim() || "your website";
    const contact = email.trim() || "your contact email";
    const chosen = DATA_OPTIONS.filter((o) => selected.includes(o.id));

    const lines: string[] = [
      `# Privacy Policy`,
      ``,
      `Last updated: ${today}`,
      ``,
      `${name} ("we", "our", or "us") operates ${url} (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.`,
      ``,
      `## Information We Collect`,
      ``,
    ];

    if (chosen.length === 0) {
      lines.push(`We do not collect personal data beyond what is strictly necessary to operate the Service.`);
      lines.push(``);
    } else {
      lines.push(`We may collect the following categories of data:`);
      lines.push(``);
      for (const c of chosen) {
        lines.push(`- **${c.label}:** ${c.blurb}.`);
      }
      lines.push(``);
    }

    lines.push(
      `## How We Use Information`,
      ``,
      `We use the data we collect to operate and improve the Service, communicate with you, process transactions where applicable, and comply with legal obligations. We do not sell your personal information.`,
      ``,
      `## Cookies`,
    );
    if (selected.includes("cookies")) {
      lines.push(``, `We use cookies and similar tracking technologies to remember your preferences and analyse usage. You can instruct your browser to refuse cookies, though some parts of the Service may not work as intended.`);
    } else {
      lines.push(``, `The Service does not use cookies for tracking purposes.`);
    }
    lines.push(
      ``,
      `## Third-Party Services`,
      ``,
      `The Service may use third-party providers (such as analytics, payment, or email providers) that process data on our behalf under their own privacy policies.`,
      ``,
      `## Your Rights`,
      ``,
      `Depending on your jurisdiction, you may have the right to access, correct, delete, or export your personal data, and to withdraw consent at any time. To exercise these rights, contact us at ${contact}.`,
      ``,
      `## Security`,
      ``,
      `We take reasonable measures to protect your data, but no method of transmission over the internet is 100% secure.`,
      ``,
      `## Changes to This Policy`,
      ``,
      `We may update this policy from time to time. We will note the "Last updated" date at the top of this page when changes are made.`,
      ``,
      `## Contact Us`,
      ``,
      `If you have questions about this Privacy Policy, contact us at ${contact}.`,
      ``,
      `---`,
      ``,
      `*This document was generated as a starting template. It is not legal advice. Have it reviewed by a qualified professional before publishing.*`,
    );
    return lines.join("\n");
  }, [company, website, email, selected, today]);

  const downloadMd = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([policy], { type: "text/markdown" }), "privacy-policy.md");
    trial.recordUse();
    toast.success("Privacy policy downloaded as Markdown");
  };

  const renderPreview = () => {
    const blocks = policy.split(/\n\n+/);
    return blocks.map((b, i) => {
      if (b.startsWith("# ")) return <h3 key={i} className="pt-2 text-lg font-extrabold">{b.slice(2)}</h3>;
      if (b.startsWith("## ")) return <h4 key={i} className="pt-3 text-[15px] font-bold text-primary">{b.slice(3)}</h4>;
      if (b.startsWith("- ")) {
        return (
          <ul key={i} className="list-disc space-y-1 pl-5 text-sm text-foreground/80">
            {b.split("\n").map((li, j) => (
              <li key={j}>{li.replace(/^- /, "").replace(/\*\*(.+?)\*\*/g, "$1")}</li>
            ))}
          </ul>
        );
      }
      if (b === "---") return <hr key={i} className="border-border" />;
      return (
        <p key={i} className={cn("text-sm leading-relaxed", b.startsWith("*") ? "text-muted-foreground italic" : "text-foreground/80")}>
          {b.replace(/\*/g, "")}
        </p>
      );
    });
  };

  return (
    <ToolPageShell toolId="privacy-policy-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Privacy Policy Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <FileText className="h-5 w-5 text-primary" /> Your details
          </h2>
          {[
            { label: "Company name", value: company, set: setCompany, ph: "Example Inc." },
            { label: "Website URL", value: website, set: setWebsite, ph: "https://example.com" },
            { label: "Contact email", value: email, set: setEmail, ph: "privacy@example.com" },
          ].map((f) => (
            <div key={f.label}>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{f.label}</label>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.ph}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          ))}

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Data you collect</p>
            <div className="space-y-2">
              {DATA_OPTIONS.map((o) => (
                <label key={o.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 transition hover:border-primary/40">
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    onChange={() => toggle(o.id)}
                    className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                  <span>
                    <span className="block text-sm font-semibold">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <ActionButton disabled={!trial.canUse} onClick={downloadMd}>
            <Download className="h-4 w-4" /> Download .md
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left.
            </p>
          )}
          <p className="flex gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            A starting template, not legal advice. Have it reviewed before publishing.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-bold">Live preview</h2>
          <div className="space-y-3">{renderPreview()}</div>
        </div>
      </div>
    </ToolPageShell>
  );
}
