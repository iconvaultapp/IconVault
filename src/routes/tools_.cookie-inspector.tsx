// /tools/cookie-inspector - View, add, edit and delete cookies for the
// current site. Runs fully in your browser. Honest limits: HttpOnly cookies
// are invisible to JavaScript and cannot be shown, and Secure/SameSite flags
// are not exposed to JS either.

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, RefreshCw, ShieldAlert, Info, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/tools_/cookie-inspector")({
  head: () => {
    const seo = getToolSeoMeta("cookie-inspector");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: CookieInspectorTool,
});

type Cookie = { name: string; value: string };

function readCookies(): Cookie[] {
  const raw = document.cookie;
  if (!raw) return [];
  return raw.split(";").map((part) => {
    const eq = part.indexOf("=");
    const name = part.slice(0, eq).trim();
    const value = eq >= 0 ? decodeURIComponentSafe(part.slice(eq + 1).trim()) : "";
    return { name, value };
  }).filter((c) => c.name);
}

function decodeURIComponentSafe(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

/** Heuristic: does this value look like a session/auth token? */
function looksSensitive(c: Cookie): boolean {
  const n = c.name.toLowerCase();
  const v = c.value;
  const nameHit = /session|token|auth|jwt|sid|csrf|login|remember/i.test(n);
  const valueHit = v.length >= 24 && /^[A-Za-z0-9\-_+/=.,~]+$/.test(v);
  return nameHit || valueHit;
}

function CookieInspectorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("cookie-inspector", isPro);
  const seo = getToolSeo("cookie-inspector");

  const [cookies, setCookies] = useState<Cookie[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cookie | null>(null);
  const [form, setForm] = useState({ name: "", value: "", days: "7", path: "/", secure: true, sameSite: "Lax" });
  const secureContext = typeof window !== "undefined" ? window.isSecureContext : false;

  const refresh = useCallback(() => setCookies(readCookies()), []);
  useEffect(refresh, [refresh]);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", value: "", days: "7", path: "/", secure: true, sameSite: "Lax" });
    setDialogOpen(true);
  };

  const openEdit = (c: Cookie) => {
    setEditing(c);
    setForm({ name: c.name, value: c.value, days: "7", path: "/", secure: true, sameSite: "Lax" });
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Cookie name is required.");
      return;
    }
    if (!trial.canUse) return;
    const days = Math.max(0, parseInt(form.days, 10) || 0);
    let str = `${encodeURIComponent(form.name.trim())}=${encodeURIComponent(form.value)}`;
    str += `; path=${form.path || "/"}`;
    if (days > 0) str += `; max-age=${days * 86400}`;
    if (form.secure && secureContext) str += "; Secure";
    if (form.secure && !secureContext) toast("Secure flag skipped: this page is not served over HTTPS.");
    str += `; SameSite=${form.sameSite}`;
    document.cookie = str;
    trial.recordUse();
    setDialogOpen(false);
    refresh();
    toast.success(editing ? "Cookie updated" : "Cookie added");
  };

  const remove = (name: string) => {
    if (!window.confirm(`Delete cookie "${name}"?`)) return;
    if (!trial.canUse) return;
    document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0`;
    document.cookie = `${encodeURIComponent(name)}=; max-age=0`;
    trial.recordUse();
    refresh();
    toast.success("Cookie deleted");
  };

  return (
    <ToolPageShell toolId="cookie-inspector" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Cookie Inspector" left={trial.left} />

      <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-muted-foreground">
          Shows cookies for <span className="font-semibold text-foreground">this site only</span>.{" "}
          <span className="font-semibold text-foreground">HttpOnly cookies are invisible to JavaScript</span> and cannot be shown here. Secure and SameSite flags are also not readable from JavaScript, so the audit column can only advise, not verify.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">{cookies.length} cookie{cookies.length === 1 ? "" : "s"} on this origin</h2>
            <p className="text-xs text-muted-foreground">{typeof window !== "undefined" ? window.location.hostname : ""} - runs in your browser, nothing is uploaded</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={refresh} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button type="button" onClick={openAdd} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add cookie
            </button>
          </div>
        </div>

        {cookies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="font-semibold">No JavaScript-visible cookies</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              This site sets no cookies readable by JavaScript. It may still use HttpOnly cookies (for example for login sessions), which browsers deliberately hide from scripts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Security audit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cookies.map((c) => {
                  const sensitive = looksSensitive(c);
                  return (
                    <TableRow key={c.name}>
                      <TableCell className="font-mono text-[13px] font-semibold">{c.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate font-mono text-[13px] text-muted-foreground" title={c.value}>
                        {c.value.length > 48 ? `${c.value.slice(0, 48)}…` : c.value}
                      </TableCell>
                      <TableCell>
                        {sensitive ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                            <ShieldAlert className="mr-1 h-3 w-3" /> Looks sensitive
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">No flags found</Badge>
                        )}
                        <p className="mt-1 max-w-[260px] text-[11px] leading-snug text-muted-foreground">
                          {sensitive
                            ? "Name or value resembles a session token. Make sure the server sets it with HttpOnly, Secure and SameSite. This cannot be verified from JavaScript."
                            : "Flags like Secure and SameSite are not exposed to JavaScript, so they cannot be checked here."}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <button type="button" onClick={() => openEdit(c)} disabled={!trial.canUse} title="Edit" className="rounded-lg p-2 hover:bg-muted disabled:opacity-40">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => remove(c.name)} disabled={!trial.canUse} title="Delete" className="rounded-lg p-2 text-red-500 hover:bg-muted disabled:opacity-40">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {!isPro && (
          <p className="mt-4 text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free add/edit/delete uses left. Viewing is unlimited.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit cookie" : "Add cookie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!!editing} placeholder="theme" className={cn(editing && "opacity-60")} />
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="dark" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expires in (days)</Label>
                <Input value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} inputMode="numeric" placeholder="7" />
              </div>
              <div className="space-y-2">
                <Label>Path</Label>
                <Input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>SameSite</Label>
              <Select value={form.sameSite} onValueChange={(v) => setForm({ ...form, sameSite: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lax">Lax</SelectItem>
                  <SelectItem value="Strict">Strict</SelectItem>
                  <SelectItem value="None">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={form.secure} onCheckedChange={(v) => setForm({ ...form, secure: v === true })} />
              Secure flag {secureContext ? "" : "(unavailable: page is not HTTPS)"}
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setDialogOpen(false)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
              <X className="h-4 w-4" /> Cancel
            </button>
            <ActionButton busy={false} disabled={!form.name.trim()} onClick={save}>
              {editing ? "Save changes" : "Add cookie"}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ToolPageShell>
  );
}
