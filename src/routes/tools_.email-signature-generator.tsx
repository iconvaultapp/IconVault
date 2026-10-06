// /tools/email-signature-generator - Design a professional email signature
// with logo upload and style presets, 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/email-signature-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/email-signature-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/email-signature-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/email-signature-generator";
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
  component: SignatureTool,
});

type PresetId = "modern" | "classic" | "minimal";

const PRESETS: { id: PresetId; name: string; desc: string }[] = [
  { id: "modern", name: "Modern", desc: "Colored left border, bold name" },
  { id: "classic", name: "Classic", desc: "Logo on the left, details right" },
  { id: "minimal", name: "Minimal", desc: "Simple stacked lines" },
];

const COLORS = ["#0F766E", "#1d4ed8", "#7c3aed", "#db2777", "#0f172a", "#b45309"];

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHtml(o: {
  name: string; title: string; company: string; phone: string; website: string;
  email: string; color: string; preset: PresetId; logo: string;
}): string {
  const { name, title, company, phone, website, email, color, preset, logo } = o;
  const n = esc(name || "Your Name");
  const t = esc(title);
  const c = esc(company);
  const ph = esc(phone);
  const wb = esc(website.replace(/^https?:\/\//, ""));
  const wlink = esc(website);
  const em = esc(email);
  const logoImg = logo ? `<img src="${logo}" alt="" width="72" style="display:block;max-width:72px;height:auto;border-radius:6px;">` : "";
  const contactLine = [ph && `<a href="tel:${esc(phone)}" style="color:${color};text-decoration:none;">${ph}</a>`, em && `<a href="mailto:${em}" style="color:${color};text-decoration:none;">${em}</a>`, wlink && `<a href="${wlink}" style="color:${color};text-decoration:none;">${wb}</a>`]
    .filter(Boolean).join(` <span style="color:#9ca3af;">|</span> `);

  if (preset === "classic") {
    return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;"><tr>${logo ? `<td valign="top" style="padding-right:14px;">${logoImg}</td>` : ""}<td valign="top"><div style="font-size:16px;font-weight:bold;color:#111827;">${n}</div>${t ? `<div style="color:#6b7280;">${t}</div>` : ""}${c ? `<div style="color:${color};font-weight:bold;">${c}</div>` : ""}<div style="margin-top:6px;">${contactLine}</div></td></tr></table>`;
  }
  if (preset === "minimal") {
    return `<div style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;"><div style="font-size:15px;font-weight:bold;">${n}</div>${t ? `<div>${t}</div>` : ""}${c ? `<div>${c}</div>` : ""}${ph || em || wlink ? `<div style="margin-top:4px;color:#6b7280;">${contactLine}</div>` : ""}</div>`;
  }
  return `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#1f2937;"><tr><td style="border-left:4px solid ${color};padding-left:14px;">${logo ? `<div style="margin-bottom:6px;">${logoImg}</div>` : ""}<div style="font-size:16px;font-weight:bold;color:#111827;">${n}</div>${t ? `<div style="color:#4b5563;">${t}${c ? ` at ${c}` : ""}</div>` : c ? `<div style="color:#4b5563;">${c}</div>` : ""}<div style="margin-top:6px;">${contactLine}</div></td></tr></table>`;
}

function SignatureTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("email-signature-generator", isPro);
  const seo = toolSeo;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [preset, setPreset] = useState<PresetId>("modern");
  const [logo, setLogo] = useState("");

  const html = useMemo(
    () => buildHtml({ name, title, company, phone, website, email, color, preset, logo }),
    [name, title, company, phone, website, email, color, preset, logo],
  );

  const onLogo = (f: File | undefined) => {
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(f);
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(html);
      trial.recordUse();
      toast.success("Signature HTML copied");
    } catch {
      toast.error("Copy failed. Your browser blocked clipboard access.");
    }
  };

  const copyRich = async () => {
    try {
      const item = new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) });
      await navigator.clipboard.write([item]);
      trial.recordUse();
      toast.success("Rich signature copied. Paste it straight into Gmail/Outlook settings.");
    } catch {
      toast.error("Rich copy failed. Try the HTML copy instead.");
    }
  };

  return (
    <ToolPageShell toolId="email-signature-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Email Signature Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Details</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" className={inputCls} />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputCls} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
            </div>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website (https://...)" className={inputCls} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Logo (embedded as data URL, no hosting needed)</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm font-medium transition hover:border-primary/40"
              >
                <ImagePlus className="h-4 w-4" /> {logo ? "Replace logo" : "Upload logo"}
              </button>
              {logo && (
                <button
                  type="button"
                  onClick={() => setLogo("")}
                  title="Remove logo"
                  className="rounded-xl border border-border p-3 text-muted-foreground transition hover:border-red-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            </div>
            {logo && <img src={logo} alt="Logo" className="mt-2 h-12 rounded" />}
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Style preset</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id)}
                  title={p.desc}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    preset === p.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Accent color</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className={cn(
                    "h-9 w-9 rounded-full border-2 transition",
                    color === c ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <ActionButton onClick={copyRich}>
              <Copy className="h-4 w-4" /> Copy rich
            </ActionButton>
            <ActionButton onClick={copyHtml}>
              <Copy className="h-4 w-4" /> Copy HTML
            </ActionButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy rich pastes formatted text into Gmail or Outlook signature settings. Copy HTML is for editors that take raw code.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[13px] font-medium text-foreground/80">Live preview (as your recipients see it)</p>
          <div className="rounded-xl bg-white p-6">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <details className="mt-4 rounded-xl bg-muted/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold">View HTML source</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">{html}</pre>
          </details>
        </div>
      </div>
    </ToolPageShell>
  );
}
