// /tools/contact-picker-playground - Real Contact Picker API playground:
// getProperties() capability check plus a genuine contacts.select() flow
// with honest platform-support notes (Chrome for Android only).

import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IdCard, Users, X, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/contact-picker-playground")({
  head: () => {
    const seo = getToolSeoMeta("contact-picker-playground");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: ContactPickerTool,
});

interface ContactInfoLike {
  name?: string[];
  email?: string[];
  tel?: string[];
  address?: Array<{ city?: string; country?: string }>;
}

interface ContactsManagerLike {
  getProperties(): Promise<string[]>;
  select(props: string[], options?: { multiple?: boolean }): Promise<ContactInfoLike[]>;
}

declare global {
  interface Navigator {
    contacts?: ContactsManagerLike;
  }
}

function ContactPickerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("contact-picker-playground", isPro);
  const seo = getToolSeo("contact-picker-playground");

  const [supported] = useState<boolean>(
    () =>
      typeof navigator !== "undefined" &&
      typeof navigator.contacts !== "undefined" &&
      typeof window !== "undefined" &&
      "ContactsManager" in window,
  );
  const [available, setAvailable] = useState<string[] | null>(null);
  const [wanted, setWanted] = useState<string[]>(["name", "email", "tel"]);
  const [multiple, setMultiple] = useState(true);
  const [busy, setBusy] = useState(false);
  const [contacts, setContacts] = useState<ContactInfoLike[]>([]);
  const [picked, setPicked] = useState(false);

  const checkProperties = useCallback(async () => {
    if (!supported || !navigator.contacts) {
      toast.error("Contact Picker is not available in this browser.");
      return;
    }
    try {
      const props = await navigator.contacts.getProperties();
      setAvailable(props);
      setWanted((w) => w.filter((p) => props.includes(p)));
      toast.success(`Available properties: ${props.join(", ") || "(none)"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "getProperties() failed.");
    }
  }, [supported]);

  useEffect(() => {
    if (supported) void checkProperties();
  }, [supported, checkProperties]);

  const toggleWanted = (p: string) =>
    setWanted((w) => (w.includes(p) ? w.filter((x) => x !== p) : [...w, p]));

  const pick = useCallback(async () => {
    if (busy || !trial.canUse) return;
    if (!supported || !navigator.contacts) {
      toast.error("Contact Picker is not available in this browser.");
      return;
    }
    if (wanted.length === 0) {
      toast.error("Select at least one property to request.");
      return;
    }
    setBusy(true);
    try {
      const result = await navigator.contacts.select(wanted, { multiple });
      setContacts(result);
      setPicked(true);
      trial.recordUse();
      if (result.length === 0) {
        toast.info("Picker closed with no contacts selected.");
      } else {
        toast.success(`Picked ${result.length} contact(s).`);
      }
    } catch (e) {
      const name = e instanceof Error ? e.name : "Error";
      if (name === "AbortError" || (e instanceof Error && e.name === "NotAllowedError")) {
        toast.info("Picker was dismissed or permission denied. No data was read.");
      } else {
        toast.error(e instanceof Error ? `${name}: ${e.message}` : "Pick failed.");
      }
    } finally {
      setBusy(false);
    }
  }, [busy, trial, supported, wanted, multiple]);

  const clearAll = useCallback(() => {
    setContacts([]);
    setPicked(false);
  }, []);

  return (
    <ToolPageShell toolId="contact-picker-playground" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Contact Picker" left={trial.left} />

      {!supported && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm">
            <strong>The Contact Picker API is not available here.</strong> It only exists in Chrome
            for Android 80+ (served over HTTPS), and desktop browsers do not implement it at all.
            The controls below call the real API and report the outcome honestly; nothing is
            simulated and no fake contact list is shown.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Picker options</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold",
                supported ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600",
              )}
            >
              {supported ? "API present" : "API missing"}
            </span>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Properties to request{" "}
              <span className="font-normal">(from getProperties())</span>
            </p>
            {available === null ? (
              <p className="text-xs text-muted-foreground">
                {supported ? "Querying getProperties()…" : "Unavailable on this device."}
              </p>
            ) : available.length === 0 ? (
              <p className="text-xs text-muted-foreground">No properties reported.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {available.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleWanted(p)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 font-mono text-xs font-bold transition",
                      wanted.includes(p)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm font-semibold">
              Allow multiple selection
              <span className="block text-xs font-normal text-muted-foreground">
                Off limits the picker to a single contact.
              </span>
            </span>
          </label>

          <ActionButton busy={busy} disabled={!supported || !trial.canUse} onClick={() => void pick()}>
            <Users className="h-4 w-4" /> {busy ? "Picker open…" : "Pick contacts"}
          </ActionButton>

          {contacts.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear results (data never leaves this page)
            </button>
          )}

          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free picks left. Contacts are never uploaded.
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Privacy by design: your app never sees the address book. The user picks explicitly,
              and you receive only the requested fields of the chosen contacts.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <IdCard className="h-4 w-4 text-primary" /> Picked contacts
            </h2>
            {!picked ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">No picker session yet</p>
                <p className="mt-1">
                  On a supported Android device this opens the system contact picker.
                </p>
              </div>
            ) : contacts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                The picker closed without a selection. That is a normal, honest result.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {contacts.map((c, i) => (
                  <div key={i} className="rounded-xl border border-border p-4">
                    <p className="font-bold">
                      {(c.name ?? []).join(", ") || <span className="text-muted-foreground">Unnamed contact</span>}
                    </p>
                    {(c.tel ?? []).length > 0 && (
                      <p className="mt-1 font-mono text-xs">
                        <span className="font-semibold text-muted-foreground">tel: </span>
                        {(c.tel ?? []).join(", ")}
                      </p>
                    )}
                    {(c.email ?? []).length > 0 && (
                      <p className="mt-1 font-mono text-xs">
                        <span className="font-semibold text-muted-foreground">email: </span>
                        {(c.email ?? []).join(", ")}
                      </p>
                    )}
                    {(c.address ?? []).length > 0 && (
                      <p className="mt-1 font-mono text-xs">
                        <span className="font-semibold text-muted-foreground">address: </span>
                        {(c.address ?? [])
                          .map((a) => [a.city, a.country].filter(Boolean).join(", "))
                          .join(" | ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-2 text-sm font-semibold">The real code</h2>
            <pre className="overflow-x-auto rounded-xl bg-muted/60 p-4 font-mono text-xs leading-relaxed">
{`// 1. Ask what the device can share (returns e.g. ["name","email","tel"])
const available = await navigator.contacts.getProperties();

// 2. Open the system picker. Must run in a user gesture, over HTTPS.
try {
  const picked = await navigator.contacts.select(
    ["name", "email", "tel"],
    { multiple: true }
  );
  console.log(picked); // only the chosen contacts, only requested fields
} catch (err) {
  // AbortError: user dismissed. NotAllowedError: permission denied.
}`}
            </pre>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
