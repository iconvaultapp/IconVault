// /tools/web-storage-quota - Test real browser storage limits: estimate(),
// persist(), and 5 live fill experiments for localStorage, sessionStorage, IndexedDB.

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Database, FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/web-storage-quota")({
  head: () => {
    const seo = getToolSeoMeta("web-storage-quota");
    const canonical = "https://iconvault.site/tools/web-storage-quota";
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
  component: StorageQuotaTool,
});

type ExpState = "idle" | "running" | "done";

function fmt(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const LS_KEY = "iv_quota_test_";
const IDB_NAME = "iv_quota_test";

function StorageQuotaTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("web-storage-quota", isPro);
  const seo = getToolSeo("web-storage-quota");

  const [usage, setUsage] = useState<number | null>(null);
  const [quota, setQuota] = useState<number | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lsState, setLsState] = useState<ExpState>("idle");
  const [lsResult, setLsResult] = useState("");
  const [ssState, setSsState] = useState<ExpState>("idle");
  const [ssResult, setSsResult] = useState("");
  const [idbState, setIdbState] = useState<ExpState>("idle");
  const [idbResult, setIdbResult] = useState("");

  const refreshEstimate = async () => {
    if (!("storage" in navigator) || !navigator.storage.estimate) return;
    try {
      const e = await navigator.storage.estimate();
      setUsage(e.usage ?? null);
      setQuota(e.quota ?? null);
      if ("persisted" in navigator.storage) setPersisted(await navigator.storage.persisted());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refreshEstimate();
  }, []);

  const clearLocal = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LS_KEY)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
      setLsState("idle");
      setLsResult("");
      void refreshEstimate();
      toast.success(`Removed ${keys.length} test keys`);
    } catch {
      toast.error("Could not clear test data.");
    }
  };

  const clearSession = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(LS_KEY)) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
      setSsState("idle");
      setSsResult("");
      toast.success(`Removed ${keys.length} test keys`);
    } catch {
      toast.error("Could not clear test data.");
    }
  };

  const clearIdb = () => {
    const req = indexedDB.deleteDatabase(IDB_NAME);
    req.onsuccess = () => {
      setIdbState("idle");
      setIdbResult("");
      void refreshEstimate();
      toast.success("Test database deleted");
    };
    req.onerror = () => toast.error("Could not delete the test database.");
  };

  /** Fill a web Storage (localStorage/sessionStorage) with 100KB chunks until it throws. */
  const fillStorage = async (store: Storage, which: "localStorage" | "sessionStorage") => {
    const chunk = "x".repeat(100 * 1024);
    let i = 0;
    let written = 0;
    try {
      for (;;) {
        store.setItem(`${LS_KEY}${i}`, chunk);
        i++;
        written += chunk.length;
        if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } catch (e) {
      const kind = e instanceof DOMException ? e.name : "error";
      return { written, kind };
    }
  };

  const runLocalFill = async () => {
    if (lsState === "running" || !trial.canUse) return;
    setLsState("running");
    trial.recordUse();
    const { written, kind } = await fillStorage(localStorage, "localStorage");
    setLsResult(`Wrote ${fmt(written)} across ${Math.round(written / (100 * 1024))} chunks, then stopped: ${kind}. Use Clear to remove the test data.`);
    setLsState("done");
    void refreshEstimate();
  };

  const runSessionFill = async () => {
    if (ssState === "running" || !trial.canUse) return;
    setSsState("running");
    trial.recordUse();
    const { written, kind } = await fillStorage(sessionStorage, "sessionStorage");
    setSsResult(`Wrote ${fmt(written)}, then stopped: ${kind}. Data lives only in this tab's session.`);
    setSsState("done");
  };

  const runIdbFill = async () => {
    if (idbState === "running" || !trial.canUse) return;
    setIdbState("running");
    trial.recordUse();
    let written = 0;
    let blobs = 0;
    try {
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore("chunks");
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      const blob1mb = new Uint8Array(1024 * 1024);
      for (let i = 0; ; i++) {
        await new Promise<void>((res, rej) => {
          const tx = db.transaction("chunks", "readwrite");
          tx.objectStore("chunks").put(blob1mb, i);
          tx.oncomplete = () => res();
          tx.onerror = () => rej(tx.error);
          tx.onabort = () => rej(tx.error);
        });
        blobs++;
        written += blob1mb.length;
        if (blobs % 50 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    } catch (e) {
      const kind = e instanceof DOMException ? e.name : "error";
      setIdbResult(`Stored ${blobs} x 1MB blobs (${fmt(written)}), then stopped: ${kind}. Use Clear to delete the test database.`);
    }
    setIdbState("done");
    void refreshEstimate();
  };

  const requestPersist = async () => {
    if (!trial.canUse) return;
    try {
      const ok = await navigator.storage.persist();
      setPersisted(ok);
      trial.recordUse();
      toast.success(ok ? "Storage will persist" : "Browser declined persistence");
    } catch {
      toast.error("persist() is not available here.");
    }
  };

  const pct = usage !== null && quota ? Math.min(100, (usage / quota) * 100) : 0;

  const expCard = (
    n: number,
    title: string,
    desc: string,
    state: ExpState,
    result: string,
    onRun: () => void,
    onClear: () => void,
    canClear: boolean,
  ) => (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-primary">Experiment {n}</p>
      <h2 className="mt-1 text-base font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton busy={state === "running"} disabled={state === "running" || !trial.canUse} onClick={onRun}>
          <FlaskConical className="h-4 w-4" /> {state === "running" ? "Writing…" : state === "done" ? "Run again" : "Run experiment"}
        </ActionButton>
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:border-primary/40"
          >
            <Trash2 className="h-4 w-4" /> Clear test data
          </button>
        )}
      </div>
      {result && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{result}</p>}
    </div>
  );

  return (
    <ToolPageShell toolId="web-storage-quota" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Storage Quota" left={trial.left} />

      <div className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Database className="h-5 w-5 text-primary" /> Live storage estimate
          </h2>
          <button
            type="button"
            onClick={() => { void refreshEstimate(); toast.success("Estimate refreshed"); }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(pct, 1)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span><strong>Used:</strong> {usage === null ? "…" : fmt(usage)}</span>
          <span><strong>Quota:</strong> {quota === null ? "…" : fmt(quota)}</span>
          <span><strong>Persisted:</strong> {persisted === null ? "unknown" : persisted ? "yes" : "no"}</span>
        </div>
        <div className="mt-3">
          <ActionButton disabled={!trial.canUse} onClick={requestPersist}>
            Request persistent storage
          </ActionButton>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          navigator.storage.estimate() is real data for this origin. Quota is shared across IndexedDB, Cache API and
          localStorage, and the browser may evict it under pressure unless persistence is granted.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {expCard(
          1,
          "localStorage fill",
          "Writes 100KB chunks until the browser throws QuotaExceededError. Test keys are prefixed and removable.",
          lsState,
          lsResult,
          runLocalFill,
          clearLocal,
          lsState === "done",
        )}
        {expCard(
          2,
          "sessionStorage fill",
          "Same test against sessionStorage. Expect a similar (usually 5-10MB) ceiling, scoped to this tab.",
          ssState,
          ssResult,
          runSessionFill,
          clearSession,
          ssState === "done",
        )}
        {expCard(
          3,
          "IndexedDB fill",
          "Stores 1MB blobs until the transaction aborts. IndexedDB usually gets the lion's share of the quota.",
          idbState,
          idbResult,
          runIdbFill,
          clearIdb,
          idbState === "done",
        )}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Experiments 4 and 5</p>
          <h2 className="mt-1 text-base font-bold">estimate() and persist()</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The panel above already runs both: <strong>estimate()</strong> reads the real usage and quota for this
            origin, and <strong>persist()</strong> asks the browser not to evict the data. Watch the usage bar move
            after you run a fill experiment.
          </p>
          <p className={cn("mt-3 text-sm font-semibold", persisted ? "text-emerald-500" : "text-muted-foreground")}>
            {persisted === null ? "Persistence not yet checked." : persisted ? "Persistence granted - data is protected from eviction." : "Persistence not granted - the browser may evict data under pressure."}
          </p>
        </div>
      </div>

      {!isPro && (
        <p className="mt-6 text-xs text-muted-foreground">
          {trial.left} of {TOOL_TRIAL_LIMIT} free experiments left.
        </p>
      )}
    </ToolPageShell>
  );
}
