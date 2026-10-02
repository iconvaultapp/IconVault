// /tools/mime-types - Two-way lookup between file extensions and MIME types.
// 150+ static entries, search, click to copy. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, File, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/mime-types")({
  head: () => {
    const seo = getToolSeoMeta("mime-types");
    const canonical = "https://iconvault.site/tools/mime-types";
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
  component: MimeTypesTool,
});

/** [extension, mime] pairs. */
const MIME_TABLE: [string, string][] = [
  // Images
  ["jpg", "image/jpeg"], ["jpeg", "image/jpeg"], ["png", "image/png"], ["gif", "image/gif"],
  ["webp", "image/webp"], ["avif", "image/avif"], ["svg", "image/svg+xml"], ["ico", "image/x-icon"],
  ["bmp", "image/bmp"], ["tif", "image/tiff"], ["tiff", "image/tiff"], ["heic", "image/heic"],
  ["heif", "image/heif"], ["apng", "image/apng"], ["jxl", "image/jxl"], ["psd", "image/vnd.adobe.photoshop"],
  ["xcf", "image/x-xcf"], ["dng", "image/x-adobe-dng"], ["djvu", "image/vnd.djvu"],
  // Video
  ["mp4", "video/mp4"], ["webm", "video/webm"], ["ogv", "video/ogg"], ["mov", "video/quicktime"],
  ["avi", "video/x-msvideo"], ["mkv", "video/x-matroska"], ["3gp", "video/3gpp"], ["wmv", "video/x-ms-wmv"],
  ["flv", "video/x-flv"], ["m3u8", "application/vnd.apple.mpegurl"], ["ts", "video/mp2t"],
  // Audio
  ["mp3", "audio/mpeg"], ["wav", "audio/wav"], ["ogg", "audio/ogg"], ["oga", "audio/ogg"],
  ["opus", "audio/opus"], ["m4a", "audio/mp4"], ["aac", "audio/aac"], ["flac", "audio/flac"],
  ["mid", "audio/midi"], ["midi", "audio/midi"], ["weba", "audio/webm"], ["wma", "audio/x-ms-wma"],
  ["amr", "audio/amr"],
  // Text and code
  ["html", "text/html"], ["htm", "text/html"], ["css", "text/css"], ["js", "text/javascript"],
  ["mjs", "text/javascript"], ["cjs", "text/javascript"], ["json", "application/json"], ["json5", "application/json5"],
  ["txt", "text/plain"], ["xml", "application/xml"], ["csv", "text/csv"], ["tsv", "text/tab-separated-values"],
  ["md", "text/markdown"], ["markdown", "text/markdown"], ["yaml", "application/x-yaml"], ["yml", "application/x-yaml"],
  ["toml", "application/toml"], ["sql", "application/sql"], ["sh", "application/x-sh"], ["bat", "text/plain"],
  // Fonts
  ["woff", "font/woff"], ["woff2", "font/woff2"], ["ttf", "font/ttf"], ["otf", "font/otf"],
  ["eot", "application/vnd.ms-fontobject"],
  // Documents
  ["pdf", "application/pdf"], ["doc", "application/msword"],
  ["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ["xls", "application/vnd.ms-excel"],
  ["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ["ppt", "application/vnd.ms-powerpoint"],
  ["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ["odt", "application/vnd.oasis.opendocument.text"], ["ods", "application/vnd.oasis.opendocument.spreadsheet"],
  ["odp", "application/vnd.oasis.opendocument.presentation"], ["rtf", "application/rtf"],
  ["epub", "application/epub+zip"], ["mobi", "application/x-mobipocket-ebook"], ["tex", "application/x-tex"],
  ["bib", "application/x-bibtex"],
  // Archives
  ["zip", "application/zip"], ["rar", "application/vnd.rar"], ["7z", "application/x-7z-compressed"],
  ["tar", "application/x-tar"], ["gz", "application/gzip"], ["tgz", "application/gzip"],
  ["bz2", "application/x-bzip2"], ["xz", "application/x-xz"], ["zst", "application/zstd"],
  ["cab", "application/vnd.ms-cab-compressed"],
  // Data and web
  ["wasm", "application/wasm"], ["ics", "text/calendar"], ["vcf", "text/vcard"],
  ["geojson", "application/geo+json"], ["ndjson", "application/x-ndjson"], ["webmanifest", "application/manifest+json"],
  ["rss", "application/rss+xml"], ["atom", "application/atom+xml"], ["opml", "text/x-opml"],
  ["graphql", "application/graphql"], ["proto", "application/x-protobuf"], ["msgpack", "application/x-msgpack"],
  ["bson", "application/bson"], ["parquet", "application/vnd.apache.parquet"], ["avro", "application/avro"],
  // Executables and disk images
  ["exe", "application/vnd.microsoft.portable-executable"], ["msi", "application/x-msi"],
  ["apk", "application/vnd.android.package-archive"], ["deb", "application/vnd.debian.binary-package"],
  ["rpm", "application/x-rpm"], ["dmg", "application/x-apple-diskimage"], ["iso", "application/x-iso9660-image"],
  ["img", "application/x-raw-disk-image"], ["jar", "application/java-archive"], ["class", "application/java-vm"],
  ["bin", "application/octet-stream"], ["dll", "application/vnd.microsoft.portable-executable"],
  // 3D and design
  ["ps", "application/postscript"], ["eps", "application/postscript"], ["swf", "application/x-shockwave-flash"],
  ["glb", "model/gltf-binary"], ["gltf", "model/gltf+json"], ["obj", "model/obj"], ["stl", "model/stl"],
  ["usdz", "model/vnd.usdz+zip"], ["fbx", "application/octet-stream"], ["blend", "application/x-blender"],
  ["skp", "application/vnd.sketchup.skp"],
  // Misc
  ["torrent", "application/x-bittorrent"], ["m3u", "audio/x-mpegurl"], ["pls", "application/pls+xml"],
  ["srt", "application/x-subrip"], ["vtt", "text/vtt"], ["eml", "message/rfc822"],
  ["sig", "application/pgp-signature"], ["pgp", "application/pgp-encrypted"], ["pem", "application/x-pem-file"],
  ["crt", "application/x-x509-ca-cert"], ["cer", "application/x-x509-ca-cert"], ["p12", "application/x-pkcs12"],
  ["crx", "application/x-chrome-extension"], ["log", "text/plain"], ["env", "text/plain"],
  ["gitignore", "text/plain"], ["dockerfile", "text/plain"],
  ["urlencoded", "application/x-www-form-urlencoded"], ["multipart", "multipart/form-data"],
];

async function doCopy(text: string, label: string, trial: { canUse: boolean; recordUse: () => void }) {
  if (!trial.canUse) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
    trial.recordUse();
  } catch {
    toast.error("Copy failed");
  }
}

function MimeTypesTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("mime-types", isPro);
  const seo = getToolSeo("mime-types");

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, "");
    if (!q) return MIME_TABLE;
    return MIME_TABLE.filter(([ext, mime]) => ext.includes(q) || mime.toLowerCase().includes(q));
  }, [query]);

  return (
    <ToolPageShell toolId="mime-types" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="MIME Types" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search an extension or MIME type, e.g. .webp or image/"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
            <File className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">No MIME types match</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different extension or media type.</p>
          </div>
        ) : (
          <div className="max-h-[560px] overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">Extension</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">MIME type</th>
                  <th className="w-24 px-4 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">Copy</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(([ext, mime]) => (
                  <tr key={`${ext}-${mime}`} className="border-t border-border/60 hover:bg-primary/5">
                    <td className="px-4 py-2.5 font-mono font-bold">.{ext}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-muted-foreground">{mime}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => doCopy(`.${ext}`, `Extension .${ext}`, trial)}
                          className={cn("rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground")}
                          aria-label={`Copy extension .${ext}`}
                          title={`Copy .${ext}`}
                        >
                          <span className="text-[11px] font-bold">EXT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => doCopy(mime, `MIME ${mime}`, trial)}
                          className={cn("rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground")}
                          aria-label={`Copy MIME ${mime}`}
                          title={`Copy ${mime}`}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          {MIME_TABLE.length} types listed. Click EXT to copy the extension or the copy icon to copy the MIME type.
        </p>
      </div>
    </ToolPageShell>
  );
}
