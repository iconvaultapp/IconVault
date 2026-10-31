import { useState } from "react";
import { Link } from "@tanstack/react-router";
import JSZip from "jszip";
import { usePlan } from "@/hooks/usePlan";
import { downloadWithGate } from "@/lib/download-guard";

/**
 * IconVault v55 — download helpers for the templates / animated-icons sections.
 * Downloads are fully client-side (fetch static files + JSZip); there are no
 * new API routes and no server work per request, so the sections stay static.
 * Premium ("Pro pick") items: downloads are gated on the existing usePlan /
 * isPro pattern — free visitors see an honest upgrade prompt, never a fake
 * download. Browsing and previews are free for everyone.
 */

export function ProPickBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
      Pro pick
    </span>
  );
}

export function PremiumGate({
  premium,
  children,
  label,
}: {
  premium: boolean;
  children: React.ReactNode;
  label: string;
}) {
  const { isPro } = usePlan();
  if (premium && !isPro) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        <span className="text-xs text-muted-foreground">
          {label} is a curated Pro pick — upgrade to download it.
        </span>
        <Link
          to="/pro"
          className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          See Pro — $19 lifetime
        </Link>
      </span>
    );
  }
  return <>{children}</>;
}

export function ZipDownloadButton({
  slug,
  files,
  basePath,
  label = "Download all files (.zip)",
}: {
  slug: string;
  files: string[];
  basePath: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const zip = new JSZip();
      for (const file of files) {
        const res = await fetch(`${basePath}/${slug}/${file}`);
        if (!res.ok) throw new Error(`Could not fetch ${file} (HTTP ${res.status})`);
        zip.file(file, await res.blob());
      }
      const blob = await zip.generateAsync({ type: "blob" });
      // v55 download gate: anonymous users park the zip + get the sign-in
      // prompt; it resumes automatically after login.
      downloadWithGate(blob, `${slug}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void download()}
        disabled={busy}
        className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Preparing…" : label}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
