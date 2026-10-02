// /tools/notification-builder - Real Notifications API lab: permission flow,
// title/body/options builder, actions and a fired-notification log.

import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/notification-builder")({
  head: () => {
    const seo = getToolSeoMeta("notification-builder");
    const canonical = "https://iconvault.site/tools/notification-builder";
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
  component: NotifyTool,
});

interface FiredNote {
  t: number;
  title: string;
  body: string;
  outcome: string;
}

function NotifyTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("notification-builder", isPro);
  const seo = getToolSeo("notification-builder");

  const [supported] = useState(() => typeof window !== "undefined" && "Notification" in window);
  const [perm, setPerm] = useState<string>(() => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"));
  const [title, setTitle] = useState("IconVault demo");
  const [body, setBody] = useState("This is a real notification fired from your browser.");
  const [tag, setTag] = useState("iconvault-demo");
  const [requireInteraction, setRequireInteraction] = useState(false);
  const [silent, setSilent] = useState(false);
  const [renotify, setRenotify] = useState(false);
  const [actions, setActions] = useState<{ action: string; title: string }[]>([
    { action: "open", title: "Open" },
    { action: "dismiss", title: "Dismiss" },
  ]);
  const [newAction, setNewAction] = useState("");
  const [fired, setFired] = useState<FiredNote[]>([]);

  const requestPerm = useCallback(async () => {
    if (!supported) return;
    try {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p === "granted") toast.success("Notification permission granted");
      else toast.warning(p === "denied" ? "Notifications are blocked - enable them in site settings" : "Permission dismissed");
    } catch {
      toast.error("Permission request failed");
    }
  }, [supported]);

  const fire = useCallback(() => {
    if (!supported) { toast.error("Notifications are not supported in this browser"); return; }
    if (perm !== "granted") { toast.error("Grant notification permission first"); return; }
    if (!trial.canUse) { toast.error("Free trial exhausted - go Pro for unlimited runs"); return; }
    try {
      const opts: NotificationOptions & { actions?: { action: string; title: string }[]; renotify?: boolean } = {
        ...(body ? { body } : {}),
        ...(tag ? { tag } : {}),
        requireInteraction,
        silent,
        renotify: renotify && !!tag,
        icon: "/favicon.png",
        badge: "/favicon.png",
      };
      if (actions.length > 0) opts.actions = actions.map((a) => ({ action: a.action, title: a.title }));
      const n = new Notification(title || "Notification", opts);
      trial.recordUse();
      const stamp = { t: Date.now(), title: title || "Notification", body, outcome: "shown" };
      setFired((p) => [stamp, ...p].slice(0, 30));
      n.onclick = () => {
        setFired((p) => [{ t: Date.now(), title: stamp.title, body, outcome: "clicked" }, ...p].slice(0, 30));
        n.close();
        window.focus();
      };
      n.onclose = () => {
        setFired((p) => [{ t: Date.now(), title: stamp.title, body, outcome: "closed" }, ...p].slice(0, 30));
      };
      n.onerror = () => {
        setFired((p) => [{ t: Date.now(), title: stamp.title, body, outcome: "error" }, ...p].slice(0, 30));
      };
    } catch (e) {
      toast.error("Could not fire notification", { description: e instanceof Error ? e.message : undefined });
    }
  }, [supported, perm, trial, title, body, tag, requireInteraction, silent, renotify, actions]);

  const addAction = () => {
    const v = newAction.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!v) return;
    if (actions.length >= 4) { toast.error("Browsers show at most a few actions - keep it to 4"); return; }
    setActions((p) => [...p, { action: v, title: newAction.trim() }]);
    setNewAction("");
  };

  const previewActions = actions.slice(0, 4);

  return (
    <ToolPageShell toolId="notification-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Notification Builder" left={trial.left} />

      {!supported && (
        <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
          <strong>Notifications are not available here.</strong> Use a modern browser over HTTPS. The builder still documents every NotificationOptions field.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Permission</h3>
            <span className={cn(
              "rounded-full px-2.5 py-1 text-xs font-bold",
              perm === "granted" ? "bg-green-500/15 text-green-600" : perm === "denied" ? "bg-red-500/15 text-red-500" : "bg-muted text-muted-foreground",
            )}>
              {perm}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void requestPerm()}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50"
          >
            <Bell className="mr-2 inline h-4 w-4" /> Request permission
          </button>
          <p className="text-xs text-muted-foreground">requestPermission() must be called from a user gesture. If you dismissed it before, use the lock icon in the address bar to reset.</p>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Body</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60" />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-foreground/80">Tag (groups replaces)</label>
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="optional" className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm outline-none focus:border-primary/60" />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {[
              ["requireInteraction", requireInteraction, setRequireInteraction, "stays until the user acts"],
              ["silent", silent, setSilent, "no sound or vibration"],
              ["renotify", renotify, setRenotify, "re-alert when a tagged notification is replaced"],
            ].map(([label, val, setter, hint]) => (
              <label key={label as string} className="flex items-start gap-2">
                <input type="checkbox" checked={val as boolean} onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
                <span><strong className="font-mono text-xs">{label as string}</strong><br /><span className="text-xs text-muted-foreground">{hint as string}</span></span>
              </label>
            ))}
          </div>

          <ActionButton disabled={!supported || perm !== "granted" || !trial.canUse} onClick={fire}>
            <Bell className="h-4 w-4" /> Fire real notification
          </ActionButton>

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free notifications left.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Actions</h3>
            <div className="mb-2 flex gap-2">
              <input
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addAction(); }}
                placeholder="Add action title, e.g. Reply"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60"
              />
              <button type="button" onClick={addAction} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:border-primary/50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <span key={a.action} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">
                  {a.title}
                  <button type="button" onClick={() => setActions((p) => p.filter((x) => x.action !== a.action))} aria-label="Remove action">
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </span>
              ))}
              {actions.length === 0 && <span className="text-xs text-muted-foreground">No actions - notification will have none.</span>}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Actions appear as buttons on supported platforms (Android, desktop Chrome with service-worker-less page notifications limited). Action clicks surface in the log as click events.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="mb-3 font-bold">Live preview (approximates the OS card)</h3>
            <div className="max-w-sm rounded-xl border border-border bg-background p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <img src="/favicon.png" alt="" className="h-10 w-10 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{title || "Notification"}</p>
                  <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{body}</p>
                </div>
              </div>
              {previewActions.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {previewActions.map((a) => (
                    <span key={a.action} className="rounded-lg bg-muted px-3 py-1.5 text-xs font-bold">{a.title}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">Fired notifications</h3>
              <button type="button" onClick={() => setFired([])} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
            {fired.length === 0 ? (
              <p className="text-sm text-muted-foreground">Fire a notification, then click or dismiss it - the outcome lands here.</p>
            ) : (
              <ul className="max-h-56 space-y-1.5 overflow-auto text-sm">
                {fired.map((f, i) => (
                  <li key={i} className="flex gap-2 rounded-lg bg-muted/60 px-3 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{new Date(f.t).toLocaleTimeString()}</span>
                    <span className={cn("text-xs", f.outcome === "clicked" && "font-bold text-green-600", f.outcome === "error" && "text-red-500")}>
                      "{f.title}" - {f.outcome}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}

export default NotifyTool;
