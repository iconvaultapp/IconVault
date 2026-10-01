// /tools/systemd-generator - Visual systemd unit builder. Description,
// Exec commands, user, restart policy, environment variables and security
// hardening toggles, with a live .service preview. Copy + download.
// 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/systemd-generator")({
  head: () => {
    const seo = getToolSeoMeta("systemd-generator");
    return { meta: [{ title: seo.title }, { name: "description", content: seo.metaDescription }] };
  },
  component: SystemdTool,
});

interface EnvVar { id: number; key: string; value: string; }

const RESTARTS = ["no", "on-success", "on-failure", "on-abnormal", "on-watchdog", "always"];
const TYPES = ["simple", "exec", "notify", "forking", "oneshot"];
const PROTECT_SYSTEM = ["no", "true", "full", "strict"];
const PROTECT_HOME = ["no", "read-only", "yes"];

function Field({ label, value, onChange, placeholder, mono, required }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] outline-none focus:border-primary", mono && "font-mono")}
      />
    </label>
  );
}

function Sel({ label, value, options, onChange, hint }: { label: string; value: string; options: string[]; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={hint}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
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
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-left transition hover:border-primary/40"
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

function SystemdTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("systemd-generator", isPro);
  const seo = getToolSeo("systemd-generator");

  const envId = useRef(3);
  const [serviceName, setServiceName] = useState("myapp");
  const [description, setDescription] = useState("My app service");
  const [type, setType] = useState("simple");
  const [execStart, setExecStart] = useState("/usr/bin/node /opt/myapp/server.js");
  const [execStop, setExecStop] = useState("");
  const [execReload, setExecReload] = useState("");
  const [user, setUser] = useState("www-data");
  const [group, setGroup] = useState("www-data");
  const [workDir, setWorkDir] = useState("/opt/myapp");
  const [restart, setRestart] = useState("on-failure");
  const [restartSec, setRestartSec] = useState("5");
  const [after, setAfter] = useState("network.target");
  const [wantedBy, setWantedBy] = useState("multi-user.target");
  const [env, setEnv] = useState<EnvVar[]>([
    { id: 1, key: "PORT", value: "3000" },
    { id: 2, key: "NODE_ENV", value: "production" },
  ]);
  const [noNewPrivileges, setNoNewPrivileges] = useState(true);
  const [privateTmp, setPrivateTmp] = useState(true);
  const [protectSystem, setProtectSystem] = useState("full");
  const [protectHome, setProtectHome] = useState("read-only");
  const [protectKernelTunables, setProtectKernelTunables] = useState(false);
  const [protectControlGroups, setProtectControlGroups] = useState(false);
  const [privateDevices, setPrivateDevices] = useState(false);
  const [copied, setCopied] = useState(false);

  const patchEnv = (id: number, p: Partial<EnvVar>) =>
    setEnv((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const addEnv = () => {
    const id = envId.current++;
    setEnv((prev) => [...prev, { id, key: "", value: "" }]);
  };

  const output = useMemo(() => {
    const name = serviceName.trim() || "app";
    const lines: string[] = [];
    lines.push("# Generated with IconVault's systemd Generator");
    lines.push(`# Save as /etc/systemd/system/${name}.service, then:`);
    lines.push("#   systemctl daemon-reload && systemctl enable --now " + name);
    lines.push("");
    lines.push("[Unit]");
    lines.push(`Description=${description.trim() || "Custom service"}`);
    if (after.trim()) lines.push(`After=${after.trim()}`);
    lines.push("");
    lines.push("[Service]");
    lines.push(`Type=${type}`);
    if (user.trim()) lines.push(`User=${user.trim()}`);
    if (group.trim()) lines.push(`Group=${group.trim()}`);
    if (workDir.trim()) lines.push(`WorkingDirectory=${workDir.trim()}`);
    lines.push(`ExecStart=${execStart.trim() || "/usr/bin/true"}`);
    if (execStop.trim()) lines.push(`ExecStop=${execStop.trim()}`);
    if (execReload.trim()) lines.push(`ExecReload=${execReload.trim()}`);
    lines.push(`Restart=${restart}`);
    if (restart !== "no" && restartSec.trim()) lines.push(`RestartSec=${restartSec.trim()}`);
    for (const e of env) {
      const k = e.key.trim();
      if (k) lines.push(`Environment="${k}=${e.value.replace(/"/g, '\\"')}"`);
    }
    if (noNewPrivileges) lines.push("NoNewPrivileges=true");
    if (privateTmp) lines.push("PrivateTmp=true");
    if (privateDevices) lines.push("PrivateDevices=true");
    if (protectSystem !== "no") lines.push(`ProtectSystem=${protectSystem}`);
    if (protectHome !== "no") lines.push(`ProtectHome=${protectHome}`);
    if (protectKernelTunables) lines.push("ProtectKernelTunables=true");
    if (protectControlGroups) lines.push("ProtectControlGroups=true");
    lines.push("");
    lines.push("[Install]");
    lines.push(`WantedBy=${wantedBy.trim() || "multi-user.target"}`);
    return lines.join("\n");
  }, [serviceName, description, type, execStart, execStop, execReload, user, group, workDir, restart, restartSec, after, wantedBy, env, noNewPrivileges, privateTmp, privateDevices, protectSystem, protectHome, protectKernelTunables, protectControlGroups]);

  const fileName = `${serviceName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "app"}.service`;

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("Unit file copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "text/plain" }), fileName);
    trial.recordUse();
    toast.success(`${fileName} downloaded`);
  };

  return (
    <ToolPageShell toolId="systemd-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="systemd Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
        <div className="space-y-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Service name" mono value={serviceName} onChange={setServiceName} placeholder="myapp" required />
            <Field label="Description" value={description} onChange={setDescription} placeholder="My app service" />
            <Sel label="Type" value={type} options={TYPES} onChange={setType} />
            <Field label="User" mono value={user} onChange={setUser} placeholder="www-data" />
            <Field label="Group" mono value={group} onChange={setGroup} placeholder="www-data" />
            <Field label="WorkingDirectory" mono value={workDir} onChange={setWorkDir} placeholder="/opt/myapp" />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="ExecStart" mono value={execStart} onChange={setExecStart} placeholder="/usr/bin/node /opt/app/server.js" required />
            <Field label="ExecStop" mono value={execStop} onChange={setExecStop} placeholder="/bin/kill -TERM $MAINPID" />
            <Field label="ExecReload" mono value={execReload} onChange={setExecReload} placeholder="/bin/kill -HUP $MAINPID" />
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <Sel label="Restart" value={restart} options={RESTARTS} onChange={setRestart} hint="When systemd restarts the service after it exits" />
            <Field label="RestartSec" mono value={restartSec} onChange={(v) => setRestartSec(v.replace(/[^0-9]/g, ""))} placeholder="5" />
            <Field label="WantedBy" mono value={wantedBy} onChange={setWantedBy} placeholder="multi-user.target" />
          </div>
          <Field label="After" mono value={after} onChange={setAfter} placeholder="network.target" />

          <div>
            <p className="mb-2 text-sm font-bold">Environment variables</p>
            <div className="space-y-2">
              {env.map((e) => (
                <div key={e.id} className="flex gap-2">
                  <input
                    value={e.key}
                    onChange={(ev) => patchEnv(e.id, { key: ev.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                    placeholder="KEY"
                    aria-label="Variable name"
                    className="w-1/3 rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                  />
                  <input
                    value={e.value}
                    onChange={(ev) => patchEnv(e.id, { value: ev.target.value })}
                    placeholder="value"
                    aria-label="Variable value"
                    className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setEnv((prev) => prev.filter((x) => x.id !== e.id))}
                    aria-label="Remove variable"
                    className="rounded-xl border border-border px-3 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addEnv}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add variable
              </button>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Security hardening
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Toggle label="NoNewPrivileges" desc="Block privilege escalation" checked={noNewPrivileges} onChange={setNoNewPrivileges} />
              <Toggle label="PrivateTmp" desc="Private /tmp and /var/tmp" checked={privateTmp} onChange={setPrivateTmp} />
              <Toggle label="PrivateDevices" desc="Hide physical devices in /dev" checked={privateDevices} onChange={setPrivateDevices} />
              <Toggle label="ProtectKernelTunables" desc="Make /proc/sys and /sys read-only" checked={protectKernelTunables} onChange={setProtectKernelTunables} />
              <Toggle label="ProtectControlGroups" desc="Make the cgroup tree read-only" checked={protectControlGroups} onChange={setProtectControlGroups} />
            </div>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              <Sel label="ProtectSystem" value={protectSystem} options={PROTECT_SYSTEM} onChange={setProtectSystem} hint="Make /usr, /boot and /etc read-only" />
              <Sel label="ProtectHome" value={protectHome} options={PROTECT_HOME} onChange={setProtectHome} hint="Hide or lock /home, /root, /run/user" />
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">{fileName} - live preview</p>
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
                {trial.left} of {TOOL_TRIAL_LIMIT} free copies left.
              </p>
            )}
            <p className="mt-4 rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Review the paths, user and ExecStart before enabling. Units live in /etc/systemd/system/ and need root to install.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
