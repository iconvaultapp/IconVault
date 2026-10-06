// /tools/ssh-config-generator - Visual ~/.ssh/config builder. Add, edit
// and remove Host entries (hostname, user, port, identity file, ProxyJump,
// forwarding toggles) with a live config preview. Copy + download.
// 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/ssh-config-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/ssh-config-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/ssh-config-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/ssh-config-generator";
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
  component: SshConfigTool,
});

interface HostEntry {
  id: number;
  host: string;
  hostname: string;
  user: string;
  port: string;
  identityFile: string;
  proxyJump: string;
  forwardAgent: boolean;
  addKeysToAgent: boolean;
  compression: boolean;
  serverAlive: string;
}

function makeHost(id: number, over: Partial<HostEntry> = {}): HostEntry {
  return {
    id,
    host: "",
    hostname: "",
    user: "",
    port: "",
    identityFile: "",
    proxyJump: "",
    forwardAgent: false,
    addKeysToAgent: false,
    compression: false,
    serverAlive: "",
    ...over,
  };
}

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary", mono && "font-mono")}
      />
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-left transition hover:border-primary/40"
    >
      <span>
        <span className="block font-mono text-[12px] font-bold">{label}</span>
        {desc && <span className="block text-xs text-muted-foreground">{desc}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

async function copyText(s: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function SshConfigTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("ssh-config-generator", isPro);
  const seo = toolSeo;

  const idRef = useRef(3);
  const [hosts, setHosts] = useState<HostEntry[]>([
    makeHost(1, { host: "web", hostname: "203.0.113.10", user: "deploy", port: "2222", identityFile: "~/.ssh/id_ed25519" }),
    makeHost(2, { host: "bastion", hostname: "bastion.example.com", user: "deploy" }),
  ]);
  const [copied, setCopied] = useState(false);

  const patch = (id: number, p: Partial<HostEntry>) =>
    setHosts((prev) => prev.map((h) => (h.id === id ? { ...h, ...p } : h)));

  const addHost = () => {
    const id = idRef.current++;
    setHosts((prev) => [...prev, makeHost(id, { host: `host${id}` })]);
  };

  const removeHost = (id: number) =>
    setHosts((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));

  const output = useMemo(() => {
    const lines: string[] = [];
    lines.push("# Generated with IconVault's SSH Config Generator");
    lines.push("# Paste into ~/.ssh/config");
    for (const h of hosts) {
      const name = h.host.trim() || "unnamed";
      lines.push("");
      lines.push(`Host ${name}`);
      if (h.hostname.trim()) lines.push(`    HostName ${h.hostname.trim()}`);
      if (h.user.trim()) lines.push(`    User ${h.user.trim()}`);
      if (h.port.trim()) lines.push(`    Port ${h.port.trim()}`);
      if (h.identityFile.trim()) lines.push(`    IdentityFile ${h.identityFile.trim()}`);
      if (h.proxyJump.trim()) lines.push(`    ProxyJump ${h.proxyJump.trim()}`);
      if (h.forwardAgent) lines.push("    ForwardAgent yes");
      if (h.addKeysToAgent) lines.push("    AddKeysToAgent yes");
      if (h.compression) lines.push("    Compression yes");
      if (h.serverAlive.trim()) lines.push(`    ServerAliveInterval ${h.serverAlive.trim()}`);
    }
    return lines.join("\n");
  }, [hosts]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("SSH config copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "text/plain" }), "ssh-config");
    trial.recordUse();
    toast.success("Config downloaded. Save it as ~/.ssh/config");
  };

  return (
    <ToolPageShell toolId="ssh-config-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="SSH Config Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="space-y-4">
          {hosts.map((h, i) => (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">Host entry {i + 1}</p>
                <button
                  type="button"
                  onClick={() => removeHost(h.id)}
                  aria-label="Remove host"
                  className="rounded-xl border border-border p-2.5 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field label="Host (alias)" mono value={h.host} onChange={(v) => patch(h.id, { host: v })} placeholder="web" />
                <Field label="HostName" mono value={h.hostname} onChange={(v) => patch(h.id, { hostname: v })} placeholder="203.0.113.10 or example.com" />
                <Field label="User" value={h.user} onChange={(v) => patch(h.id, { user: v })} placeholder="deploy" />
                <Field label="Port" value={h.port} onChange={(v) => patch(h.id, { port: v.replace(/[^0-9]/g, "") })} placeholder="22 (blank = default)" />
                <Field label="IdentityFile" mono value={h.identityFile} onChange={(v) => patch(h.id, { identityFile: v })} placeholder="~/.ssh/id_ed25519" />
                <Field label="ProxyJump" mono value={h.proxyJump} onChange={(v) => patch(h.id, { proxyJump: v })} placeholder="bastion" />
                <Field label="ServerAliveInterval" value={h.serverAlive} onChange={(v) => patch(h.id, { serverAlive: v.replace(/[^0-9]/g, "") })} placeholder="seconds, e.g. 60" />
              </div>
              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                <Toggle label="ForwardAgent" desc="Forward your SSH agent" checked={h.forwardAgent} onChange={(v) => patch(h.id, { forwardAgent: v })} />
                <Toggle label="AddKeysToAgent" desc="Add keys to ssh-agent" checked={h.addKeysToAgent} onChange={(v) => patch(h.id, { addKeysToAgent: v })} />
                <Toggle label="Compression" desc="Compress all data" checked={h.compression} onChange={(v) => patch(h.id, { compression: v })} />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addHost}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-4 py-3.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Plus className="h-4 w-4" /> Add a host
          </button>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">~/.ssh/config - live preview</p>
            <pre className="max-h-[560px] overflow-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
              {output}
            </pre>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <ActionButton disabled={!trial.canUse} onClick={() => void doCopy()}>
                {copied ? <Check className="h-4 w-4 text-green-200" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </ActionButton>
              <ActionButton disabled={!trial.canUse} onClick={doDownload}>
                <Download className="h-4 w-4" /> Download
              </ActionButton>
            </div>
            {!isPro && (
              <p className="mt-3 text-xs text-muted-foreground">
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left. Everything runs in your browser, nothing is uploaded.
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
