// /tools/kubernetes-generator - Visual Kubernetes YAML builder. Resource
// tabs for Deployment, Service, Ingress and CronJob with a live multi-doc
// YAML preview. Copy + download. 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/kubernetes-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/kubernetes-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/kubernetes-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/kubernetes-generator";
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
  component: K8sTool,
});

type Tab = "deployment" | "service" | "ingress" | "cronjob";
interface EnvVar { id: number; key: string; value: string; }

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: "deployment", label: "Deployment", desc: "Run N replicas of your container image" },
  { id: "service", label: "Service", desc: "Stable networking in front of the pods" },
  { id: "ingress", label: "Ingress", desc: "Route external HTTP(S) traffic by hostname" },
  { id: "cronjob", label: "CronJob", desc: "Run a container on a cron schedule" },
];

function sanitize(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "app";
}

function Field({ label, value, onChange, placeholder, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] outline-none focus:border-primary", mono && "font-mono")}
      />
    </label>
  );
}

function Sel({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[13px] outline-none focus:border-primary"
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

function K8sTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("kubernetes-generator", isPro);
  const seo = toolSeo;

  const envId = useRef(2);
  const [tab, setTab] = useState<Tab>("deployment");
  const [include, setInclude] = useState<Record<Tab, boolean>>({
    deployment: true,
    service: true,
    ingress: false,
    cronjob: false,
  });

  const [app, setApp] = useState("myapp");
  const [namespace, setNamespace] = useState("default");
  const [image, setImage] = useState("nginx:1.25");
  const [replicas, setReplicas] = useState("3");
  const [containerPort, setContainerPort] = useState("80");
  const [env, setEnv] = useState<EnvVar[]>([{ id: 1, key: "NODE_ENV", value: "production" }]);
  const [useResources, setUseResources] = useState(true);
  const [cpuReq, setCpuReq] = useState("250m");
  const [memReq, setMemReq] = useState("128Mi");
  const [cpuLim, setCpuLim] = useState("500m");
  const [memLim, setMemLim] = useState("256Mi");

  const [svcType, setSvcType] = useState("ClusterIP");
  const [svcPort, setSvcPort] = useState("80");

  const [ingHost, setIngHost] = useState("app.example.com");
  const [ingPath, setIngPath] = useState("/");
  const [ingTls, setIngTls] = useState(true);

  const [cronSchedule, setCronSchedule] = useState("*/15 * * * *");
  const [cronCommand, setCronCommand] = useState("echo hello");
  const [copied, setCopied] = useState(false);

  const patchEnv = (id: number, p: Partial<EnvVar>) =>
    setEnv((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)));

  const yaml = useMemo(() => {
    const name = sanitize(app);
    const ns = namespace.trim() || "default";
    const port = containerPort.replace(/[^0-9]/g, "") || "80";
    const reps = replicas.replace(/[^0-9]/g, "") || "1";
    const img = image.trim() || "nginx:latest";
    const envItems = env.filter((e) => e.key.trim());
    const docs: string[] = [];

    if (include.deployment) {
      const d = [
        "apiVersion: apps/v1",
        "kind: Deployment",
        "metadata:",
        `  name: ${name}`,
        `  namespace: ${ns}`,
        "spec:",
        `  replicas: ${reps}`,
        "  selector:",
        "    matchLabels:",
        `      app: ${name}`,
        "  template:",
        "    metadata:",
        "      labels:",
        `        app: ${name}`,
        "    spec:",
        "      containers:",
        `        - name: ${name}`,
        `          image: ${img}`,
        "          ports:",
        `            - containerPort: ${port}`,
      ];
      if (envItems.length) {
        d.push("          env:");
        for (const e of envItems) {
          d.push(`            - name: ${e.key.trim()}`);
          d.push(`              value: "${e.value.replace(/"/g, '\\"')}"`);
        }
      }
      if (useResources) {
        d.push("          resources:");
        d.push("            requests:");
        d.push(`              cpu: "${cpuReq.trim() || "250m"}"`);
        d.push(`              memory: "${memReq.trim() || "128Mi"}"`);
        d.push("            limits:");
        d.push(`              cpu: "${cpuLim.trim() || "500m"}"`);
        d.push(`              memory: "${memLim.trim() || "256Mi"}"`);
      }
      docs.push(d.join("\n"));
    }

    if (include.service) {
      const svcPortNum = svcPort.replace(/[^0-9]/g, "") || port;
      docs.push([
        "apiVersion: v1",
        "kind: Service",
        "metadata:",
        `  name: ${name}-svc`,
        `  namespace: ${ns}`,
        "spec:",
        `  type: ${svcType}`,
        "  selector:",
        `    app: ${name}`,
        "  ports:",
        `    - port: ${svcPortNum}`,
        `      targetPort: ${port}`,
      ].join("\n"));
    }

    if (include.ingress) {
      const host = ingHost.trim() || "example.com";
      const path = ingPath.trim() || "/";
      const g = [
        "apiVersion: networking.k8s.io/v1",
        "kind: Ingress",
        "metadata:",
        `  name: ${name}-ingress`,
        `  namespace: ${ns}`,
        "spec:",
      ];
      if (ingTls) {
        g.push("  tls:");
        g.push("    - hosts:");
        g.push(`        - ${host}`);
      }
      g.push("  rules:");
      g.push(`    - host: ${host}`);
      g.push("      http:");
      g.push("        paths:");
      g.push(`          - path: ${path}`);
      g.push("            pathType: Prefix");
      g.push("            backend:");
      g.push("              service:");
      g.push(`                name: ${name}-svc`);
      g.push("                port:");
      g.push(`                  number: ${svcPort.replace(/[^0-9]/g, "") || port}`);
      docs.push(g.join("\n"));
    }

    if (include.cronjob) {
      docs.push([
        "apiVersion: batch/v1",
        "kind: CronJob",
        "metadata:",
        `  name: ${name}-cron`,
        `  namespace: ${ns}`,
        "spec:",
        `  schedule: "${cronSchedule.trim() || "0 * * * *"}"`,
        "  jobTemplate:",
        "    spec:",
        "      template:",
        "        spec:",
        "          containers:",
        `            - name: ${name}-cron`,
        `              image: ${img}`,
        `              command: ["sh", "-c", "${(cronCommand.trim() || "echo hello").replace(/"/g, '\\"')}"]`,
        "          restartPolicy: OnFailure",
      ].join("\n"));
    }

    return docs.length ? docs.join("\n---\n") : "# Enable at least one resource tab.";
  }, [app, namespace, image, replicas, containerPort, env, useResources, cpuReq, memReq, cpuLim, memLim, svcType, svcPort, ingHost, ingPath, ingTls, cronSchedule, cronCommand, include]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(yaml);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("YAML copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([yaml + "\n"], { type: "text/yaml" }), "k8s.yaml");
    trial.recordUse();
    toast.success("k8s.yaml downloaded");
  };

  return (
    <ToolPageShell toolId="kubernetes-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Kubernetes YAML Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
        <div className="space-y-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="App name" mono value={app} onChange={setApp} placeholder="myapp" />
            <Field label="Namespace" mono value={namespace} onChange={setNamespace} placeholder="default" />
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Resource tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                title={t.desc}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-bold transition",
                  tab === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:text-primary",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4">
              <Toggle
                label={`Include ${TABS.find((t) => t.id === tab)!.label} in output`}
                checked={include[tab]}
                onChange={(v) => setInclude((p) => ({ ...p, [tab]: v }))}
              />
            </div>

            {tab === "deployment" && (
              <div className="space-y-4">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Image" mono value={image} onChange={setImage} placeholder="nginx:1.25" />
                  <Field label="Replicas" value={replicas} onChange={(v) => setReplicas(v.replace(/[^0-9]/g, ""))} placeholder="3" />
                  <Field label="Container port" value={containerPort} onChange={(v) => setContainerPort(v.replace(/[^0-9]/g, ""))} placeholder="80" />
                </div>
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
                          className="w-1/3 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                        />
                        <input
                          value={e.value}
                          onChange={(ev) => patchEnv(e.id, { value: ev.target.value })}
                          placeholder="value"
                          aria-label="Variable value"
                          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
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
                      onClick={() => setEnv((prev) => [...prev, { id: envId.current++, key: "", value: "" }])}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                    >
                      <Plus className="h-4 w-4" /> Add variable
                    </button>
                  </div>
                </div>
                <div>
                  <Toggle label="Resource requests and limits" desc="CPU and memory guards for the pod" checked={useResources} onChange={setUseResources} />
                  {useResources && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <Field label="CPU request" mono value={cpuReq} onChange={setCpuReq} placeholder="250m" />
                      <Field label="Mem request" mono value={memReq} onChange={setMemReq} placeholder="128Mi" />
                      <Field label="CPU limit" mono value={cpuLim} onChange={setCpuLim} placeholder="500m" />
                      <Field label="Mem limit" mono value={memLim} onChange={setMemLim} placeholder="256Mi" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "service" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Sel label="Type" value={svcType} options={["ClusterIP", "NodePort", "LoadBalancer"]} onChange={setSvcType} />
                <Field label="Port" value={svcPort} onChange={(v) => setSvcPort(v.replace(/[^0-9]/g, ""))} placeholder="80" />
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  The Service selects the Deployment's pods by the app label and forwards traffic to the container port. Service name: {sanitize(app)}-svc.
                </p>
              </div>
            )}

            {tab === "ingress" && (
              <div className="space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Field label="Host" mono value={ingHost} onChange={setIngHost} placeholder="app.example.com" />
                  <Field label="Path" mono value={ingPath} onChange={setIngPath} placeholder="/" />
                </div>
                <Toggle label="TLS section" desc="Adds a tls block so you can attach a certificate secret" checked={ingTls} onChange={setIngTls} />
                <p className="text-xs text-muted-foreground">
                  The Ingress routes to {sanitize(app)}-svc, so keep the Service enabled in the output for it to work.
                </p>
              </div>
            )}

            {tab === "cronjob" && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field label="Schedule (cron)" mono value={cronSchedule} onChange={setCronSchedule} placeholder="*/15 * * * *" />
                <Field label="Command" mono value={cronCommand} onChange={setCronCommand} placeholder="echo hello" />
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Runs the same image as the Deployment on the schedule above. Command runs as sh -c inside the container.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">k8s.yaml - live multi-doc preview</p>
            <pre className="max-h-[600px] overflow-auto whitespace-pre rounded-xl bg-muted p-4 font-mono text-[12px] leading-relaxed">
              {yaml}
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
              Apply with kubectl apply -f k8s.yaml. Names are sanitized to valid lowercase DNS names automatically.
            </p>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
