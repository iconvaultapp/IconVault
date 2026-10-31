import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSignInPrompt } from "@/hooks/useSignInPrompt";
import { usePlan } from "@/hooks/usePlan";
import {
  REQUIRE_AUTH_EVENT,
  drainPendingDownload,
  takePendingAction,
} from "@/lib/download-guard";
import { parseIconId, fetchIconSvg } from "@/lib/iconify";
import { brandFilename } from "@/lib/logo-builder";

/**
 * IconVault v55 — mounts once in __root (inside Auth + SignInPrompt providers).
 * - Opens the existing sign-in prompt whenever any gated download asks for auth.
 * - When the user becomes signed in, drains a parked download exactly once so
 *   it resumes automatically (blob from IndexedDB, static-file URL, or a
 *   rebuilt bulk/collection export — bulk quota is consumed on the rebuild).
 */

const svgToPngBlob = (svg: string, px: number) =>
  new Promise<Blob | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, px, px);
      canvas.toBlob((b) => resolve(b), "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

const triggerBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = brandFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

export function DownloadGateListener() {
  const { user } = useAuth();
  const { prompt } = useSignInPrompt();
  const { recordBulkDownload } = usePlan();
  const recordRef = useRef(recordBulkDownload);
  recordRef.current = recordBulkDownload;
  const wasAuthed = useRef(false);
  const drained = useRef(false);

  useEffect(() => {
    const onRequire = () => prompt("Sign in to download — it's free.");
    window.addEventListener(REQUIRE_AUTH_EVENT, onRequire);
    return () => window.removeEventListener(REQUIRE_AUTH_EVENT, onRequire);
  }, [prompt]);

  useEffect(() => {
    if (user && !wasAuthed.current && !drained.current) {
      drained.current = true;
      void (async () => {
        const kind = await drainPendingDownload();
        if (kind === "blob" || kind === "url") {
          toast.success("You're signed in — your download is resuming.");
          return;
        }
        if (kind === "unstored") {
          toast.info("You're signed in — tap download again to get your file.");
          return;
        }
        const action = takePendingAction();
        if (!action) return;
        try {
          if (action.kind === "bulk") {
            const { default: JSZip } = await import("jszip");
            const zip = new JSZip();
            let ok = 0;
            for (const id of action.ids) {
              const { prefix, name } = parseIconId(id);
              try {
                const svg = await fetchIconSvg(prefix, name);
                if (action.mode === "svg") {
                  zip.file(`${prefix}/${name}.svg`, svg);
                } else {
                  const blob = await svgToPngBlob(svg, action.pngSize);
                  if (blob) zip.file(`${prefix}/${name}-${action.pngSize}.png`, blob);
                }
                ok++;
              } catch {
                /* skip failures */
              }
            }
            if (ok > 0) {
              const blob = await zip.generateAsync({ type: "blob" });
              triggerBlob(blob, `iconvault-${ok}-${action.mode}.zip`);
              await recordRef.current({ iconCount: ok, format: action.mode });
              toast.success(`You're signed in — your bulk export of ${ok} icons is resuming.`);
            }
          } else if (action.kind === "collection") {
            for (const iconId of action.ids) {
              const { prefix, name } = parseIconId(iconId);
              try {
                const svg = await fetchIconSvg(prefix, name);
                triggerBlob(new Blob([svg], { type: "image/svg+xml" }), `${prefix}-${name}.svg`);
              } catch {
                /* skip failures */
              }
            }
            toast.success(`You're signed in — your "${action.label}" export is resuming.`);
          }
        } catch {
          toast.info("You're signed in — tap download again to get your files.");
        }
      })();
    }
    wasAuthed.current = !!user;
    if (!user) drained.current = false;
  }, [user]);

  return null;
}
