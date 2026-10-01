// /tools/web-share-playground - Learn the Web Share API with real share
// calls, file sharing checks, honest fallback, and a share-target manifest builder.

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, Download, FileUp, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-share-playground")({
  head: () => {
    const seo = getToolSeoMeta("web-share-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: WebShareTool,
});

function WebShareTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-share-playground", isPro);
  const seo = getToolSeo("web-share-playground");

  const [shareOk, setShareOk] = useState<boolean | null>(null);
  const [title, setTitle] = useState("IconVault");
  const [text, setText] = useState("Free online tools that run entirely in your browser.");
  const [url, setUrl] = useState("https://iconvault.site");
  const [files, setFiles] = useState<File[]>([]);
  const [fileShareOk, setFileShareOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [appName, setAppName] = useState("My PWA");
  const [action, setAction] = useState("/share");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShareOk(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const pickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = [...list];
    setFiles(arr);
    if ("canShare" in navigator) {
      try {
        setFileShareOk(navigator.canShare({ files: arr }));
      } catch {
        setFileShareOk(false);
      }
    } else {
      setFileShareOk(null);
    }
  };

  const shareNow = async () => {
    if (!shareOk || busy || !trial.canUse) return;
    setBusy(true);
    try {
      await navigator.share({ title, text, url });
      trial.recordUse();
      toast.success("Share sheet opened");
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const shareFiles = async () => {
    if (!shareOk || busy || files.length === 0 || !trial.canUse) return;
    setBusy(true);
    try {
      await navigator.share({ files, title: "Shared files" });
      trial.recordUse();
      toast.success("Files shared");
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (t: string, label: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked - select and copy manually.");
    }
  };

  const manifest = {
    name: appName || "My PWA",
    short_name: (appName || "My PWA").slice(0, 12),
    start_url: "/",
    display: "standalone",
    share_target: {
      action,
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: { title: "title", text: "text", url: "url" },
    },
  };
  const manifestJson = JSON.stringify(manifest, null, 2);

  return (
    <ToolPageShell toolId="web-share-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Web Share" left={trial.left} />

      {shareOk === false && (
        <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
          <p className="font-bold">Web Share is not supported on this device or browser.</p>
          <p className="mt-1 text-muted-foreground">
            navigator.share needs a mobile browser (or a desktop browser with a share target, like Edge/Safari) and a
            secure context. The buttons below are disabled on purpose - this page will not pretend the share sheet works
            here. Use the copy fallback or open this page on your phone to try the real thing.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Share2 className="h-5 w-5 text-primary" /> Share text and links
          </h2>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Text</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton busy={busy} disabled={!shareOk || busy || !trial.canUse} onClick={shareNow}>
              <Share2 className="h-4 w-4" /> Share now
            </ActionButton>
            <button
              type="button"
              onClick={() => void copy(`${title}\n${text}\n${url}`, "Share text")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy fallback
            </button>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold">Share files</h3>
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition hover:border-primary/40"
            >
              <FileUp className="h-5 w-5" />
              {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""} selected` : "Pick files to share"}
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => pickFiles(e.target.files)}
              />
            </div>
            {fileShareOk !== null && files.length > 0 && (
              <p className={cn("mt-2 text-xs font-semibold", fileShareOk ? "text-emerald-500" : "text-amber-500")}>
                {fileShareOk
                  ? "This browser can share these files."
                  : "This browser refuses these files (type or size) - navigator.canShare said no."}
              </p>
            )}
            <div className="mt-2">
              <ActionButton busy={busy} disabled={!shareOk || busy || files.length === 0 || !trial.canUse} onClick={shareFiles}>
                <Share2 className="h-4 w-4" /> Share {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "files"}
              </ActionButton>
            </div>
          </div>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free shares left.
            </p>
          )}
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold">Share-target manifest builder</h2>
          <p className="text-sm text-muted-foreground">
            Want your PWA to <em>receive</em> shares? Add a <code>share_target</code> block to your web app manifest, then
            read <code>title</code>, <code>text</code> and <code>url</code> query params on the action page.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">App name</label>
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Share action URL</label>
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <pre className="max-h-72 overflow-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed">{manifestJson}</pre>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={!trial.canUse}
              onClick={() => {
                trial.recordUse();
                downloadBlob(new Blob([manifestJson], { type: "application/json" }), "manifest.webmanifest");
                toast.success("Manifest downloaded");
              }}
            >
              <Download className="h-4 w-4" /> Download manifest
            </ActionButton>
            <button
              type="button"
              onClick={() => void copy(manifestJson, "Manifest JSON")}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
            >
              <ClipboardCopy className="h-4 w-4" /> Copy JSON
            </button>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
