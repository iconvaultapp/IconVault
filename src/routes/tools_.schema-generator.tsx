// /tools/schema-generator - build schema.org JSON-LD snippets for FAQ,
// Article, Product, LocalBusiness, Organization and BreadcrumbList pages.
// 100% client-side.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/schema-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/schema-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/schema-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/schema-generator";
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
  component: SchemaGeneratorTool,
});

const TYPES = ["FAQPage", "Article", "Product", "LocalBusiness", "Organization", "BreadcrumbList"] as const;
type SchemaType = (typeof TYPES)[number];

const AVAILABILITY = ["InStock", "OutOfStock", "PreOrder"] as const;

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
      />
    </label>
  );
}

interface FaqRow {
  q: string;
  a: string;
}

interface CrumbRow {
  name: string;
  url: string;
}

type BuildResult = { data: Record<string, unknown> } | { error: string };

function SchemaGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("schema-generator", isPro);
  const seo = toolSeo;

  const [schemaType, setSchemaType] = useState<SchemaType>("FAQPage");
  const [fields, setFields] = useState<Record<string, string>>({ currency: "USD", availability: "InStock" });
  const [faqRows, setFaqRows] = useState<FaqRow[]>([{ q: "", a: "" }]);
  const [crumbs, setCrumbs] = useState<CrumbRow[]>([{ name: "", url: "" }]);
  const [output, setOutput] = useState("");

  const set = (key: string) => (v: string) => setFields((f) => ({ ...f, [key]: v }));
  const val = (key: string): string => fields[key] ?? "";

  const buildSchema = (): BuildResult => {
    const base = { "@context": "https://schema.org" as const };
    const nonEmpty = (v: string) => v.trim().length > 0;

    if (schemaType === "FAQPage") {
      const rows = faqRows.filter((r) => nonEmpty(r.q) && nonEmpty(r.a));
      if (rows.length === 0) return { error: "Add at least one question with an answer." };
      return {
        data: {
          ...base,
          "@type": "FAQPage",
          mainEntity: rows.map((r) => ({
            "@type": "Question",
            name: r.q.trim(),
            acceptedAnswer: { "@type": "Answer", text: r.a.trim() },
          })),
        },
      };
    }

    if (schemaType === "Article") {
      if (!nonEmpty(val("headline"))) return { error: "Headline is required." };
      const data: Record<string, unknown> = { ...base, "@type": "Article", headline: val("headline").trim() };
      if (nonEmpty(val("description"))) data["description"] = val("description").trim();
      if (nonEmpty(val("author"))) data["author"] = { "@type": "Person", name: val("author").trim() };
      if (nonEmpty(val("datePublished"))) data["datePublished"] = val("datePublished").trim();
      if (nonEmpty(val("image"))) data["image"] = val("image").trim();
      return { data };
    }

    if (schemaType === "Product") {
      if (!nonEmpty(val("name"))) return { error: "Product name is required." };
      if (!nonEmpty(val("price"))) return { error: "Price is required." };
      const availability = (["InStock", "OutOfStock", "PreOrder"] as string[]).includes(val("availability"))
        ? val("availability")
        : "InStock";
      const data: Record<string, unknown> = {
        ...base,
        "@type": "Product",
        name: val("name").trim(),
        offers: {
          "@type": "Offer",
          price: val("price").trim(),
          priceCurrency: val("currency").trim() || "USD",
          availability: `https://schema.org/${availability}`,
        },
      };
      if (nonEmpty(val("description"))) data["description"] = val("description").trim();
      if (nonEmpty(val("image"))) data["image"] = val("image").trim();
      if (nonEmpty(val("brand"))) data["brand"] = { "@type": "Brand", name: val("brand").trim() };
      return { data };
    }

    if (schemaType === "LocalBusiness") {
      if (!nonEmpty(val("name"))) return { error: "Business name is required." };
      const data: Record<string, unknown> = { ...base, "@type": "LocalBusiness", name: val("name").trim() };
      const address: Record<string, string> = {};
      if (nonEmpty(val("streetAddress"))) address["streetAddress"] = val("streetAddress").trim();
      if (nonEmpty(val("city"))) address["addressLocality"] = val("city").trim();
      if (Object.keys(address).length > 0) {
        address["@type"] = "PostalAddress";
        data["address"] = address;
      }
      if (nonEmpty(val("phone"))) data["telephone"] = val("phone").trim();
      if (nonEmpty(val("openingHours"))) data["openingHours"] = val("openingHours").trim();
      if (nonEmpty(val("url"))) data["url"] = val("url").trim();
      return { data };
    }

    if (schemaType === "Organization") {
      if (!nonEmpty(val("name"))) return { error: "Organization name is required." };
      const data: Record<string, unknown> = { ...base, "@type": "Organization", name: val("name").trim() };
      if (nonEmpty(val("url"))) data["url"] = val("url").trim();
      if (nonEmpty(val("logo"))) data["logo"] = val("logo").trim();
      return { data };
    }

    const rows = crumbs.filter((c) => nonEmpty(c.name));
    if (rows.length === 0) return { error: "Add at least one breadcrumb with a name." };
    return {
      data: {
        ...base,
        "@type": "BreadcrumbList",
        itemListElement: rows.map((c, i) => {
          const item: Record<string, unknown> = {
            "@type": "ListItem",
            position: i + 1,
            name: c.name.trim(),
          };
          if (nonEmpty(c.url)) item["item"] = c.url.trim();
          return item;
        }),
      },
    };
  };

  const generate = () => {
    if (!trial.canUse) return;
    const result = buildSchema();
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setOutput(JSON.stringify(result.data, null, 2));
    trial.recordUse();
    toast.success("JSON-LD generated");
  };

  const copy = () => {
    if (!output) return;
    const snippet = `<script type="application/ld+json">\n${output}\n</script>`;
    navigator.clipboard
      .writeText(snippet)
      .then(() => toast.success("JSON-LD copied"))
      .catch(() => toast.error("Copy failed"));
  };

  const switchType = (t: SchemaType) => {
    setSchemaType(t);
    setOutput("");
  };

  return (
    <ToolPageShell toolId="schema-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Schema Generator" left={trial.left} />

      <div className="mb-5 flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchType(t)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition ${
              schemaType === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {schemaType === "FAQPage" && (
            <div className="space-y-4">
              {faqRows.map((row, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Question {i + 1}</p>
                    {faqRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFaqRows((r) => r.filter((_, j) => j !== i))}
                        aria-label={`Remove question ${i + 1}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <TextField label="Question" value={row.q} placeholder="e.g. Is this free to use?"
                    onChange={(v) => setFaqRows((r) => r.map((row2, j) => (j === i ? { ...row2, q: v } : row2)))} />
                  <TextAreaField label="Answer" value={row.a} placeholder="Yes, ..." rows={2}
                    onChange={(v) => setFaqRows((r) => r.map((row2, j) => (j === i ? { ...row2, a: v } : row2)))} />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFaqRows((r) => [...r, { q: "", a: "" }])}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add question
              </button>
            </div>
          )}

          {schemaType === "Article" && (
            <>
              <TextField label="Headline *" value={val("headline")} onChange={set("headline")} placeholder="Article title" />
              <TextAreaField label="Description" value={val("description")} onChange={set("description")} placeholder="Short summary" />
              <TextField label="Author" value={val("author")} onChange={set("author")} placeholder="Jane Doe" />
              <TextField label="Date published" type="date" value={val("datePublished")} onChange={set("datePublished")} />
              <TextField label="Image URL" value={val("image")} onChange={set("image")} placeholder="https://..." />
            </>
          )}

          {schemaType === "Product" && (
            <>
              <TextField label="Product name *" value={val("name")} onChange={set("name")} placeholder="e.g. Wireless Headphones" />
              <TextAreaField label="Description" value={val("description")} onChange={set("description")} placeholder="What it is" />
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Price *" value={val("price")} onChange={set("price")} placeholder="49.99" />
                <TextField label="Currency" value={val("currency")} onChange={set("currency")} placeholder="USD" />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-foreground/80">Availability</span>
                <select
                  value={val("availability") || "InStock"}
                  onChange={(e) => set("availability")(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary/60"
                >
                  {AVAILABILITY.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
              <TextField label="Image URL" value={val("image")} onChange={set("image")} placeholder="https://..." />
              <TextField label="Brand" value={val("brand")} onChange={set("brand")} placeholder="Brand name" />
            </>
          )}

          {schemaType === "LocalBusiness" && (
            <>
              <TextField label="Business name *" value={val("name")} onChange={set("name")} placeholder="e.g. Sunrise Bakery" />
              <TextField label="Street address" value={val("streetAddress")} onChange={set("streetAddress")} placeholder="12 Main Street" />
              <TextField label="City" value={val("city")} onChange={set("city")} placeholder="Mumbai" />
              <TextField label="Phone" value={val("phone")} onChange={set("phone")} placeholder="+91 98765 43210" />
              <TextField label="Opening hours" value={val("openingHours")} onChange={set("openingHours")} placeholder="Mo-Fr 09:00-18:00" />
              <TextField label="Website URL" value={val("url")} onChange={set("url")} placeholder="https://..." />
            </>
          )}

          {schemaType === "Organization" && (
            <>
              <TextField label="Organization name *" value={val("name")} onChange={set("name")} placeholder="e.g. IconVault" />
              <TextField label="Website URL" value={val("url")} onChange={set("url")} placeholder="https://..." />
              <TextField label="Logo URL" value={val("logo")} onChange={set("logo")} placeholder="https://.../logo.png" />
            </>
          )}

          {schemaType === "BreadcrumbList" && (
            <div className="space-y-4">
              {crumbs.map((crumb, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-border/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">Item {i + 1}</p>
                    {crumbs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCrumbs((c) => c.filter((_, j) => j !== i))}
                        aria-label={`Remove breadcrumb ${i + 1}`}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <TextField label="Name" value={crumb.name} placeholder="e.g. Blog"
                    onChange={(v) => setCrumbs((c) => c.map((crumb2, j) => (j === i ? { ...crumb2, name: v } : crumb2)))} />
                  <TextField label="URL" value={crumb.url} placeholder="https://..."
                    onChange={(v) => setCrumbs((c) => c.map((crumb2, j) => (j === i ? { ...crumb2, url: v } : crumb2)))} />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCrumbs((c) => [...c, { name: "", url: "" }])}
                className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-2 text-sm font-bold text-muted-foreground hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add breadcrumb
              </button>
            </div>
          )}

          <ActionButton disabled={!trial.canUse} onClick={generate}>
            <Braces className="h-4 w-4" /> Generate JSON-LD
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - everything runs in your browser.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!output ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <Braces className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your JSON-LD appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Fill in the fields for a {schemaType} and hit Generate to get a
                schema.org snippet ready to paste into your page.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">&lt;script type="application/ld+json"&gt;</p>
                <button
                  type="button"
                  onClick={copy}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
                >
                  <Copy className="h-4 w-4" /> Copy
                </button>
              </div>
              <textarea
                readOnly
                value={output}
                rows={20}
                className="w-full resize-y rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed outline-none"
              />
              <p className="mt-3 font-mono text-xs text-muted-foreground">&lt;/script&gt;</p>
            </>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
