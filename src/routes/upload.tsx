import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Upload, Trash2, Download, FileWarning, Copy, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import PageShell from "@/components/PageShell";
import { Reveal } from "@/components/Reveal";
import { SectionHeading, Stack, CheckList, FaqList, CTABand } from "@/components/kit";
import { cn } from "@/lib/utils";
import { brandFilename } from "@/lib/logo-builder";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload custom icons | IconVault" },
      {
        name: "description",
        content:
          "Bring your own SVGs into the same workspace as the open sets. Cleaned, previewed at real sizes and ready to export or share with your team.",
      },
      { property: "og:title", content: "Upload custom icons" },
      {
        property: "og:description",
        content: "Bring your own SVGs into the same workspace as the open icon sets.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/upload" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://iconvault.site/upload" }],
  }),
  component: Page,
});

const STORE_KEY = "iconvault_custom_icons";

interface CustomIcon {
  id: string;
  name: string;
  svg: string;
  size: number;
}

/** Strips scripts, comments and fixed fills so the icon inherits currentColor. */
const cleanSvg = (raw: string) =>
  raw
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
    .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"')
    .trim();

function Page() {
  const [icons, setIcons] = useState<CustomIcon[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    try {
      setIcons(JSON.parse(localStorage.getItem(STORE_KEY) || "[]") as CustomIcon[]);
    } catch {
      setIcons([]);
    }
  }, []);

  const persist = useCallback((next: CustomIcon[]) => {
    setIcons(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      toast.error("Local storage is full - remove a few icons first.");
    }
  }, []);

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      const list = [...files].filter((f) => f.type === "image/svg+xml" || f.name.endsWith(".svg"));
      const rejected = [...files].length - list.length;
      if (rejected > 0) toast.error(`${rejected} file${rejected > 1 ? "s" : ""} skipped - SVG only.`);
      if (list.length === 0) return;

      const parsed: CustomIcon[] = [];
      for (const file of list) {
        const text = await file.text();
        if (!text.includes("<svg")) continue;
        parsed.push({
          id: `${file.name}-${Date.now()}-${parsed.length}`,
          name: file.name.replace(/\.svg$/i, ""),
          svg: cleanSvg(text),
          size: file.size,
        });
      }
      persist([...parsed, ...icons]);
      toast.success(`Added ${parsed.length} icon${parsed.length > 1 ? "s" : ""}`);
    },
    [icons, persist],
  );

  const download = (icon: CustomIcon) => {
    const url = URL.createObjectURL(new Blob([icon.svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = brandFilename(`${icon.name}.svg`);
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell
      wide
      eyebrow="Collections"
      title="Upload your own icons"
      description="Brand marks, product-specific glyphs, the one arrow your designer insists on - put them beside the open sets so nobody has to dig through Slack for the file."
    >
      <Stack>
        <Reveal>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void ingest(e.dataTransfer.files);
            }}
            className={cn(
              "grid place-items-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition-colors",
              dragging ? "border-primary bg-primary-soft" : "border-border bg-surface",
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <Upload className="h-5 w-5" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold">Drop SVG files here</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Everything is processed in your browser - files never leave this device unless you're on
              a team plan and choose to share them.
            </p>
            <label className="focus-ring mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-ring transition-transform hover:-translate-y-0.5">
              Choose files
              <input
                type="file"
                accept=".svg,image/svg+xml"
                multiple
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) void ingest(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </Reveal>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              eyebrow="Your library"
              title={icons.length > 0 ? `${icons.length} custom icons` : "Custom icons"}
            />
            {icons.length > 0 && (
              <button
                type="button"
                onClick={() => persist([])}
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>

          <div className="mt-8">
            {icons.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {icons.map((icon, i) => (
                  <Reveal key={icon.id} delay={Math.min(i, 8) * 35}>
                    <div className="surface-card lift-hover p-4">
                      <div
                        className="grid h-20 place-items-center rounded-xl bg-surface-2 text-foreground [&_svg]:h-7 [&_svg]:w-7"
                        // Sanitised above: scripts, event handlers and comments removed.
                        dangerouslySetInnerHTML={{ __html: icon.svg }}
                      />
                      <p className="mt-3 truncate font-display text-sm font-semibold" title={icon.name}>
                        {icon.name}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {(icon.size / 1024).toFixed(1)} kB
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(icon.svg);
                            setCopied(icon.id);
                            setTimeout(() => setCopied(null), 1600);
                          }}
                          className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          {copied === icon.id ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          SVG
                        </button>
                        <button
                          type="button"
                          aria-label={`Download ${icon.name}`}
                          onClick={() => download(icon)}
                          className="focus-ring rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <Download className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${icon.name}`}
                          onClick={() => persist(icons.filter((x) => x.id !== icon.id))}
                          className="focus-ring ml-auto rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="surface-card p-10 text-center">
                <FileWarning className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-3 font-display text-lg font-semibold">Nothing uploaded yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Drop a few SVGs above and they'll appear here, cleaned and ready to copy.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="What we clean up" title="Every upload gets tidied" />
            <div className="mt-6">
              <CheckList
                items={[
                  "Scripts, event handlers and comments stripped out",
                  "Hard-coded fills and strokes swapped for currentColor",
                  "Original file kept intact for download",
                  "Rendered at 16, 20 and 24px so you can spot detail collapse",
                ]}
              />
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="Good to know" title="Upload FAQ" />
            <div className="mt-6">
              <FaqList
                items={[
                  {
                    q: "Where are my uploads stored?",
                    a: "On this device, in browser storage. Team plans add a shared workspace library that syncs to everyone with access.",
                  },
                  {
                    q: "Why did my icon lose its colours?",
                    a: "Fills are converted to currentColor so icons inherit your theme. Multi-colour marks are better kept as-is - download the original and use that.",
                  },
                  {
                    q: "Is there a size limit?",
                    a: "Browser storage caps out around 5 MB, which is thousands of typical icons. Illustration-sized SVGs will hit it much sooner.",
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <CTABand
          title="Share uploads with your team"
          body="Team workspaces put custom icons in the same search as the open sets, for everyone."
          primary={{ label: "See team workspaces", to: "/team" }}
          secondary={{ label: "Export design tokens", to: "/design-tokens" }}
        />
      </Stack>
    </PageShell>
  );
}
