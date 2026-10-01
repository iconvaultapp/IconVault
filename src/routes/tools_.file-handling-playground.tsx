// /tools/file-handling-playground - Real File Handling API lab: launchQueue
// consumer, simulated file launches, and a file_handlers manifest snippet builder.

import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileInput, Rocket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/file-handling-playground")({
  head: () => {
    const seo = getToolSeoMeta("file-handling-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: FileHandlingTool,
});

type LaunchedFile = { name: string; kind: string; size: number; preview: string };

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function FileHandlingTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("file-handling-playground", isPro);
  const seo = getToolSeo("file-handling-playground");

  const [launchQueueOk] = useState(() => typeof window !== "undefined" && "launchQueue" in window);
  const [pickerOk] = useState(() => typeof window !== "undefined" && "showOpenFilePicker" in window);
  const [listening, setListening] = useState(false);
  const [launched, setLaunched] = useState<LaunchedFile[]>([]);
  const [appName, setAppName] = useState("My PWA");
  const [action, setAction] = useState("/open");
  const [extensions, setExtensions] = useState(".png, .jpg, .md, .txt");
  const [busy, setBusy] = useState(false);
  const listeningRef = useRef(false);

  const consume = useCallback(async (handles: FileSystemHandle[]) => {
    const out: LaunchedFile[] = [];
    for (const h of handles) {
      let size = 0;
      let preview = "";
      try {
        if (h.kind === "file") {
          const file = await (h as FileSystemFileHandle).getFile();
          size = file.size;
          if (file.type.startsWith("text/") || /\.(txt|md|json|js|ts|css|html)$/i.test(file.name)) {
            preview = (await file.text()).slice(0, 400);
          }
        }
      } catch {
        preview = "(could not read file)";
      }
      out.push({ name: h.name, kind: h.kind, size, preview });
    }
    setLaunched((p) => [...out, ...p].slice(0, 20));
  }, []);

  const startListening = useCallback(() => {
    if (!launchQueueOk || listeningRef.current) return;
    const lq = (window as unknown as {
      launchQueue: { setConsumer: (cb: (params: { files?: FileSystemHandle[] }) => void) => void };
    }).launchQueue;
    lq.setConsumer((params) => {
      if (params.files && params.files.length > 0) {
        toast.success(`Launch received: ${params.files.length} file(s)`);
        void consume(params.files);
      }
    });
    listeningRef.current = true;
    setListening(true);
  }, [launchQueueOk, consume]);

  useEffect(() => {
    startListening();
  }, [startListening]);

  const simulateLaunch = useCallback(async () => {
    if (!trial.canUse || busy) return;
    if (!pickerOk) {
      toast.error("showOpenFilePicker is not supported in this browser (needs Chromium).");
      return;
    }
    setBusy(true);
    try {
      const handles = (await (window as unknown as {
        showOpenFilePicker: (o: object) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({ multiple: true })) as FileSystemFileHandle[];
      trial.recordUse();
      toast.success(`Simulating a launch with ${handles.length} file(s)`);
      await consume(handles);
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        toast.error(e instanceof Error ? e.message : "Picker failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [trial, busy, pickerOk, consume]);

  const extList = extensions
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.startsWith("."));
  const acceptMap: Record<string, string[]> = {};
  if (extList.length > 0) acceptMap["application/octet-stream"] = extList;

  const snippet = JSON.stringify(
    {
      name: appName,
      file_handlers: [
        {
          action,
          accept: acceptMap,
        },
      ],
    },
    null,
    2,
  );

  const copySnippet = useCallback(() => {
    void navigator.clipboard.writeText(snippet);
    toast.success("Manifest snippet copied");
  }, [snippet]);

  const downloadSnippet = useCallback(() => {
    downloadBlob(new Blob([snippet], { type: "application/json" }), "manifest-snippet.json");
    toast.success("Snippet downloaded");
  }, [snippet]);

  return (
    <ToolPageShell toolId="file-handling-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="File Handling" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Launch simulation</h3>
            </div>
            <div className="rounded-xl bg-background p-3 font-mono text-xs">
              <p className="text-muted-foreground">
                launchQueue:{" "}
                <span className={launchQueueOk ? "font-bold text-emerald-500" : "font-bold text-red-500"}>
                  {launchQueueOk ? "supported" : "not supported"}
                </span>
              </p>
              <p className="text-muted-foreground">
                consumer:{" "}
                <span className={listening ? "font-bold text-emerald-500" : "font-bold text-amber-500"}>
                  {listening ? "listening" : "not attached"}
                </span>
              </p>
            </div>
            <ActionButton busy={busy} disabled={!trial.canUse || !pickerOk} onClick={() => void simulateLaunch()}>
              <FileInput className="h-4 w-4" /> {busy ? "Picking..." : "Simulate file launch"}
            </ActionButton>
            <p className="text-xs text-muted-foreground">
              A real launch only happens when an installed PWA declares file_handlers and the OS opens a file with it. This page is not an installed PWA, so the picker stands in: chosen files flow through the same consumer code a real launch would use.
            </p>
            {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of 5 free simulations left.</p>}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <h3 className="font-bold">file_handlers snippet builder</h3>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground/80">App name</p>
              <input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Action URL</p>
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-foreground/80">Extensions (comma separated)</p>
              <input
                value={extensions}
                onChange={(e) => setExtensions(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
              >
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button
                type="button"
                onClick={downloadSnippet}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:border-primary/40"
              >
                <Download className="h-4 w-4" /> .json
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Launched files ({launched.length})</h3>
              {launched.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLaunched([])}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
            {launched.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Files opened with your PWA would arrive here through launchQueue. Run a simulation to see the flow.
              </p>
            ) : (
              <div className="space-y-3">
                {launched.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{f.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{f.kind} - {fmtBytes(f.size)}</p>
                    </div>
                    {f.preview && (
                      <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-card p-3 font-mono text-xs text-foreground/80">{f.preview}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Generated manifest snippet</h3>
            <pre className="max-h-72 overflow-auto rounded-xl bg-background p-4 font-mono text-xs text-foreground/90">{snippet}</pre>
            <p className="mt-3 text-xs text-muted-foreground">
              Paste <span className="font-mono">file_handlers</span> into your web app manifest, then install the PWA. After that, opening one of these file types from the OS offers your app, and the files arrive in <span className="font-mono">launchQueue</span> exactly like the simulation above.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
