// /tools/readme-generator - Build a polished README.md from sections, badges
// and inputs. 100% client-side with a live rendered preview (marked +
// DOMPurify, sanitized in the browser only so SSR never touches the DOM).

import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Copy, Download, Plus, Trash2 } from "lucide-react";
import { marked } from "marked";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/readme-generator")({
  head: () => {
    const seo = getToolSeoMeta("readme-generator");
    const canonical = "https://iconvault.site/tools/readme-generator";
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
  component: ReadmeGeneratorTool,
});

async function sanitize(html: string): Promise<string> {
  const { default: DOMPurify } = await import("dompurify");
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

interface ApiRow {
  id: number;
  name: string;
  desc: string;
}

const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "ISC", "MPL-2.0", "Unlicense"];

let rowId = 1;

function Toggle({ label, on, onFlip }: { label: string; on: boolean; onFlip: () => void }) {
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-pressed={on}
      className={cn(
        "flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition",
        on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          on ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            on ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

function Field({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary",
          mono && "font-mono",
        )}
      />
    </div>
  );
}

function ReadmeGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("readme-generator", isPro);
  const seo = getToolSeo("readme-generator");

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [pkg, setPkg] = useState("");
  const [license, setLicense] = useState("MIT");
  const [installCmd, setInstallCmd] = useState("npm install");
  const [usageCode, setUsageCode] = useState("");
  const [contrib, setContrib] = useState("Contributions are welcome! Open an issue or a pull request.");
  const [sections, setSections] = useState({ badges: true, install: true, usage: true, api: false, contributing: true, license: true });
  const [badges, setBadges] = useState({ npm: true, license: true, build: false });
  const [apiRows, setApiRows] = useState<ApiRow[]>([]);
  const [previewHtml, setPreviewHtml] = useState("");
  const [tab, setTab] = useState<"preview" | "markdown">("preview");

  const markdown = useMemo(() => {
    const lines: string[] = [];
    const title = name.trim() || "my-project";
    lines.push(`# ${title}`);
    if (desc.trim()) lines.push("", desc.trim());

    if (sections.badges) {
      const b: string[] = [];
      const npmPkg = pkg.trim();
      if (badges.npm && npmPkg) b.push(`[![npm version](https://img.shields.io/npm/v/${encodeURIComponent(npmPkg)}.svg)](https://www.npmjs.com/package/${encodeURIComponent(npmPkg)})`);
      if (badges.license) b.push(`[![license](https://img.shields.io/badge/license-${encodeURIComponent(license)}-blue.svg)](#license)`);
      if (badges.build) b.push(`[![build](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)`);
      if (b.length) lines.push("", b.join(" "));
    }

    if (sections.install) {
      lines.push("", "## Installation", "", "```bash", installCmd.trim() || "npm install", "```");
    }
    if (sections.usage) {
      lines.push("", "## Usage", "", "```js", usageCode.trim() || "// your code here", "```");
    }
    if (sections.api && apiRows.length) {
      lines.push("", "## API", "", "| Method | Description |", "| ------ | ----------- |");
      for (const r of apiRows) lines.push(`| \`${r.name.trim() || "method"}\` | ${r.desc.trim() || "-"} |`);
    }
    if (sections.contributing) {
      lines.push("", "## Contributing", "", contrib.trim() || "Contributions are welcome.");
    }
    if (sections.license) {
      lines.push("", "## License", "", `This project is licensed under the ${license} License.`);
    }
    return lines.join("\n") + "\n";
  }, [name, desc, pkg, license, installCmd, usageCode, contrib, sections, badges, apiRows]);

  useEffect(() => {
    let alive = true;
    void sanitize(marked.parse(markdown) as string).then((h) => {
      if (alive) setPreviewHtml(h);
    });
    return () => { alive = false; };
  }, [markdown]);

  const flipSection = (k: keyof typeof sections) => setSections((s) => ({ ...s, [k]: !s[k] }));
  const flipBadge = (k: keyof typeof badges) => setBadges((b) => ({ ...b, [k]: !b[k] }));

  const addApiRow = () => setApiRows((r) => [...r, { id: rowId++, name: "", desc: "" }]);
  const setApiRow = (id: number, patch: Partial<ApiRow>) =>
    setApiRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const delApiRow = (id: number) => setApiRows((r) => r.filter((x) => x.id !== id));

  const copyMd = async () => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(markdown);
      trial.recordUse();
      toast.success("README.md copied to clipboard");
    } catch {
      toast.error("Copy failed, select the text manually.");
    }
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "README.md");
    trial.recordUse();
    toast.success("README.md downloaded");
  };

  return (
    <ToolPageShell toolId="readme-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="README Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
            <BookOpen className="h-4 w-4" /> Project details
          </p>
          <Field label="Project name" value={name} onChange={setName} placeholder="my-awesome-project" />
          <Field label="Short description" value={desc} onChange={setDesc} placeholder="What does it do, in one line?" />
          <Field label="npm package (for badges)" value={pkg} onChange={setPkg} placeholder="my-awesome-project" mono />

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">License</label>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              {LICENSES.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Sections</p>
            <div className="grid grid-cols-2 gap-2">
              <Toggle label="Badges" on={sections.badges} onFlip={() => flipSection("badges")} />
              <Toggle label="Installation" on={sections.install} onFlip={() => flipSection("install")} />
              <Toggle label="Usage" on={sections.usage} onFlip={() => flipSection("usage")} />
              <Toggle label="API table" on={sections.api} onFlip={() => flipSection("api")} />
              <Toggle label="Contributing" on={sections.contributing} onFlip={() => flipSection("contributing")} />
              <Toggle label="License" on={sections.license} onFlip={() => flipSection("license")} />
            </div>
          </div>

          {sections.badges && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">Badges</p>
              <div className="grid grid-cols-3 gap-2">
                <Toggle label="npm" on={badges.npm} onFlip={() => flipBadge("npm")} />
                <Toggle label="License" on={badges.license} onFlip={() => flipBadge("license")} />
                <Toggle label="Build" on={badges.build} onFlip={() => flipBadge("build")} />
              </div>
              {!pkg.trim() && badges.npm && (
                <p className="mt-1.5 text-xs text-amber-600">Enter the npm package name to enable the version badge.</p>
              )}
            </div>
          )}

          {sections.install && (
            <Field label="Install command" value={installCmd} onChange={setInstallCmd} placeholder="npm install" mono />
          )}

          {sections.usage && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Usage snippet</label>
              <textarea
                value={usageCode}
                onChange={(e) => setUsageCode(e.target.value)}
                rows={4}
                placeholder={'import { thing } from "my-project";'}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          {sections.api && (
            <div>
              <p className="mb-2 text-[13px] font-medium text-foreground/80">API rows</p>
              <div className="space-y-2">
                {apiRows.map((r) => (
                  <div key={r.id} className="flex gap-2">
                    <input
                      value={r.name}
                      onChange={(e) => setApiRow(r.id, { name: e.target.value })}
                      placeholder="method()"
                      className="w-1/3 rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                    />
                    <input
                      value={r.desc}
                      onChange={(e) => setApiRow(r.id, { desc: e.target.value })}
                      placeholder="What it does"
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => delApiRow(r.id)}
                      aria-label="Remove API row"
                      className="rounded-xl border border-border px-2.5 text-muted-foreground transition hover:border-red-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addApiRow}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add API row
              </button>
            </div>
          )}

          {sections.contributing && (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Contributing text</label>
              <textarea
                value={contrib}
                onChange={(e) => setContrib(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton disabled={!trial.canUse} onClick={download}>
              <Download className="h-4 w-4" /> Download README.md
            </ActionButton>
            <button
              type="button"
              disabled={!trial.canUse}
              onClick={copyMd}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-2.5">
            {(["preview", "markdown"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition",
                  tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "markdown" ? "Markdown" : "Preview"}
              </button>
            ))}
          </div>
          {tab === "preview" ? (
            <div
              className="max-h-[640px] overflow-auto p-6 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mb-2 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-bold [&_img]:my-2 [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <pre className="max-h-[640px] overflow-auto whitespace-pre-wrap p-5 font-mono text-[13px] leading-relaxed">{markdown}</pre>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
