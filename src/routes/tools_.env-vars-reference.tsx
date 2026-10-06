// /tools/env-vars-reference - Searchable reference of 80+ environment
// variables across Node.js, AWS, GCP and Docker. Click to copy, build a
// .env template from selected vars. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Search, Terminal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/env-vars-reference";
import toolSeoMeta from "@/lib/tool-seo-meta-data/env-vars-reference";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/env-vars-reference")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/env-vars-reference";
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
  component: EnvVarsReference,
});

type Category = "node" | "aws" | "gcp" | "docker";

interface EnvVar {
  name: string;
  cat: Category;
  desc: string;
  example?: string;
}

const CATS: { id: Category | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "node", label: "Node.js" },
  { id: "aws", label: "AWS" },
  { id: "gcp", label: "GCP" },
  { id: "docker", label: "Docker" },
];

const VARS: EnvVar[] = [
  // Node.js
  { name: "NODE_ENV", cat: "node", desc: "Runtime mode: development, production or test. Frameworks toggle optimizations and error verbosity on it.", example: "production" },
  { name: "PORT", cat: "node", desc: "Port your server listens on. Platforms like Heroku and Cloud Run inject this.", example: "8080" },
  { name: "HOST", cat: "node", desc: "Network interface to bind, e.g. 0.0.0.0 inside containers.", example: "0.0.0.0" },
  { name: "DEBUG", cat: "node", desc: "Enables debug package namespaces, comma separated with wildcards.", example: "app:*" },
  { name: "NODE_OPTIONS", cat: "node", desc: "CLI flags passed to every node process, e.g. memory or loader flags.", example: "--max-old-space-size=4096" },
  { name: "NODE_PATH", cat: "node", desc: "Extra directories searched when resolving modules (legacy, prefer bundler aliases)." },
  { name: "NODE_NO_WARNINGS", cat: "node", desc: "Set to 1 to silence all Node.js process warnings." },
  { name: "NODE_EXTRA_CA_CERTS", cat: "node", desc: "Path to an extra CA bundle file for TLS verification.", example: "/etc/ssl/certs/ca.pem" },
  { name: "NODE_TLS_REJECT_UNAUTHORIZED", cat: "node", desc: "Set to 0 to accept self-signed certs. Dangerous, dev only." },
  { name: "NODE_DEBUG", cat: "node", desc: "Comma separated list of core modules to debug (http, net, tls...)." },
  { name: "NODE_DISABLE_COLORS", cat: "node", desc: "Set to 1 to strip ANSI colors from Node.js output." },
  { name: "FORCE_COLOR", cat: "node", desc: "Force colored output even when piped: 0, 1, 2 or 3." },
  { name: "NO_COLOR", cat: "node", desc: "When present, CLIs should disable colored output." },
  { name: "TZ", cat: "node", desc: "Timezone for the process, e.g. UTC or Asia/Kolkata.", example: "UTC" },
  { name: "UV_THREADPOOL_SIZE", cat: "node", desc: "Size of libuv thread pool for crypto, fs and DNS work. Default 4.", example: "8" },
  { name: "NODE_V8_COVERAGE", cat: "node", desc: "Directory where V8 writes coverage JSON at exit." },
  { name: "NODE_REPL_HISTORY", cat: "node", desc: "Path of the REPL history file." },
  { name: "NODE_INSPECT_RESUME_ON_START", cat: "node", desc: "Set to 1 so the inspector does not break on start." },
  { name: "npm_config_registry", cat: "node", desc: "Custom npm registry URL for installs.", example: "https://registry.npmjs.org/" },
  { name: "npm_config_cache", cat: "node", desc: "Override the npm cache directory.", example: "/tmp/npm-cache" },
  { name: "NPM_TOKEN", cat: "node", desc: "Auth token for private registries, referenced from .npmrc as ${NPM_TOKEN}." },
  { name: "CI", cat: "node", desc: "Set to true on CI servers; CLIs disable interactivity and watch modes." },
  { name: "CONTINUOUS_INTEGRATION", cat: "node", desc: "Legacy CI flag honored by some older tools." },
  // AWS
  { name: "AWS_ACCESS_KEY_ID", cat: "aws", desc: "Access key for programmatic AWS access. Prefer roles over static keys." },
  { name: "AWS_SECRET_ACCESS_KEY", cat: "aws", desc: "Secret paired with the access key. Never commit this." },
  { name: "AWS_SESSION_TOKEN", cat: "aws", desc: "Temporary session token for assumed roles and federated access." },
  { name: "AWS_REGION", cat: "aws", desc: "Region SDKs target when no region is configured in code.", example: "ap-south-1" },
  { name: "AWS_DEFAULT_REGION", cat: "aws", desc: "Legacy fallback region used by older SDKs and the CLI.", example: "us-east-1" },
  { name: "AWS_PROFILE", cat: "aws", desc: "Named profile from ~/.aws/config to use instead of default." },
  { name: "AWS_DEFAULT_PROFILE", cat: "aws", desc: "Legacy equivalent of AWS_PROFILE." },
  { name: "AWS_ENDPOINT_URL", cat: "aws", desc: "Override the endpoint for all services (LocalStack, MinIO).", example: "http://localhost:4566" },
  { name: "AWS_ENDPOINT_URL_S3", cat: "aws", desc: "Override the endpoint for S3 only." },
  { name: "AWS_MAX_ATTEMPTS", cat: "aws", desc: "Maximum SDK retry attempts for throttled or failed calls.", example: "5" },
  { name: "AWS_RETRY_MODE", cat: "aws", desc: "Retry strategy: legacy, standard or adaptive.", example: "adaptive" },
  { name: "AWS_CA_BUNDLE", cat: "aws", desc: "Custom CA bundle path for SDK TLS connections." },
  { name: "AWS_CONFIG_FILE", cat: "aws", desc: "Alternate path to the AWS config file.", example: "~/.aws/config" },
  { name: "AWS_SHARED_CREDENTIALS_FILE", cat: "aws", desc: "Alternate path to the shared credentials file." },
  { name: "AWS_EC2_METADATA_DISABLED", cat: "aws", desc: "Set to true to skip the EC2 instance metadata lookup (faster local runs)." },
  { name: "AWS_CONTAINER_CREDENTIALS_FULL_URI", cat: "aws", desc: "URI the SDK polls for container task role credentials." },
  { name: "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI", cat: "aws", desc: "Relative URI variant used inside ECS tasks." },
  { name: "AWS_LAMBDA_FUNCTION_NAME", cat: "aws", desc: "Name of the running Lambda function (set by the runtime)." },
  { name: "AWS_LAMBDA_FUNCTION_VERSION", cat: "aws", desc: "Published version or $LATEST of the running Lambda." },
  { name: "AWS_LAMBDA_FUNCTION_MEMORY_SIZE", cat: "aws", desc: "Memory in MB configured for the function.", example: "512" },
  { name: "AWS_LAMBDA_LOG_GROUP_NAME", cat: "aws", desc: "CloudWatch log group receiving function logs." },
  { name: "AWS_LAMBDA_LOG_STREAM_NAME", cat: "aws", desc: "CloudWatch log stream for this execution environment." },
  { name: "AWS_EXECUTION_ENV", cat: "aws", desc: "Runtime identifier, e.g. AWS_Lambda_nodejs20.x." },
  { name: "LAMBDA_TASK_ROOT", cat: "aws", desc: "Directory containing your function code inside Lambda.", example: "/var/task" },
  { name: "LAMBDA_RUNTIME_DIR", cat: "aws", desc: "Directory with runtime bootstrap helpers.", example: "/var/runtime" },
  // GCP
  { name: "GOOGLE_APPLICATION_CREDENTIALS", cat: "gcp", desc: "Path to a service account JSON key for Application Default Credentials.", example: "/secrets/gcp-key.json" },
  { name: "GCLOUD_PROJECT", cat: "gcp", desc: "Default project for gcloud commands." },
  { name: "GOOGLE_CLOUD_PROJECT", cat: "gcp", desc: "Project ID injected into Cloud Run, Functions and App Engine.", example: "my-project-123" },
  { name: "GOOGLE_CLOUD_REGION", cat: "gcp", desc: "Region of the running Cloud Run or Functions instance.", example: "asia-south1" },
  { name: "GOOGLE_CLOUD_ZONE", cat: "gcp", desc: "Zone for zonal resources like GCE VMs." },
  { name: "GOOGLE_CLOUD_QUOTA_PROJECT", cat: "gcp", desc: "Project billed for quota when authenticating as a user." },
  { name: "CLOUDSDK_CORE_PROJECT", cat: "gcp", desc: "gcloud config property override for the core project." },
  { name: "CLOUDSDK_COMPUTE_REGION", cat: "gcp", desc: "gcloud config property override for the compute region." },
  { name: "K_SERVICE", cat: "gcp", desc: "Name of the Cloud Run service (set by the platform)." },
  { name: "K_REVISION", cat: "gcp", desc: "Cloud Run revision serving this request." },
  { name: "K_CONFIGURATION", cat: "gcp", desc: "Cloud Run configuration name." },
  { name: "FUNCTION_NAME", cat: "gcp", desc: "Name of the deployed Cloud Function (1st gen)." },
  { name: "FUNCTION_TARGET", cat: "gcp", desc: "Entry point handler of a Cloud Function." },
  { name: "FUNCTION_REGION", cat: "gcp", desc: "Region of the deployed Cloud Function." },
  { name: "CLOUD_RUN_JOB", cat: "gcp", desc: "Name of the Cloud Run job for job executions." },
  { name: "CLOUD_RUN_EXECUTION", cat: "gcp", desc: "Execution ID of the current Cloud Run job run." },
  { name: "TASK_INDEX", cat: "gcp", desc: "Zero-based index of this task within a Cloud Run job." },
  // Docker
  { name: "DOCKER_HOST", cat: "docker", desc: "Daemon socket or TCP address the CLI talks to.", example: "tcp://192.168.1.10:2376" },
  { name: "DOCKER_TLS_VERIFY", cat: "docker", desc: "Set to 1 to verify TLS against a remote daemon." },
  { name: "DOCKER_CERT_PATH", cat: "docker", desc: "Directory holding client certs for the remote daemon.", example: "~/.docker/certs" },
  { name: "DOCKER_CONFIG", cat: "docker", desc: "Alternate Docker CLI config directory.", example: "~/.docker" },
  { name: "DOCKER_CONTEXT", cat: "docker", desc: "Default context (daemon) for CLI commands." },
  { name: "DOCKER_DEFAULT_PLATFORM", cat: "docker", desc: "Default image platform for pulls and builds.", example: "linux/amd64" },
  { name: "DOCKER_BUILDKIT", cat: "docker", desc: "Set to 1 to use BuildKit for docker build." },
  { name: "BUILDKIT_PROGRESS", cat: "docker", desc: "BuildKit output style: auto, plain or tty.", example: "plain" },
  { name: "DOCKER_API_VERSION", cat: "docker", desc: "Pin the API version the CLI negotiates.", example: "1.43" },
  { name: "DOCKER_TIMEOUT", cat: "docker", desc: "Seconds before CLI HTTP requests time out.", example: "60" },
  { name: "DOCKER_CONTENT_TRUST", cat: "docker", desc: "Set to 1 to enforce signed images on pull and push." },
  { name: "DOCKER_CONTENT_TRUST_SERVER", cat: "docker", desc: "Notary server URL for content trust.", example: "https://notary.docker.io" },
  { name: "COMPOSE_PROJECT_NAME", cat: "docker", desc: "Project name prefixing Compose container and network names.", example: "myapp" },
  { name: "COMPOSE_FILE", cat: "docker", desc: "Colon separated list of compose files to merge.", example: "compose.yml:compose.prod.yml" },
  { name: "COMPOSE_PROFILES", cat: "docker", desc: "Comma separated profiles to enable.", example: "debug,metrics" },
  { name: "COMPOSE_PARALLEL_LIMIT", cat: "docker", desc: "Max parallel operations Compose runs.", example: "4" },
  { name: "COMPOSE_IGNORE_ORPHANS", cat: "docker", desc: "Set to true so Compose keeps containers not in the compose file." },
  { name: "COMPOSE_MENU", cat: "docker", desc: "Set to 0 to disable the interactive Compose menu." },
  { name: "COMPOSE_COMPATIBILITY", cat: "docker", desc: "Set to true for v2 to mimic v1 container naming." },
];

function EnvVarsReference() {
  const { isPro } = usePlan();
  const trial = useToolTrial("env-vars-reference", isPro);
  const seo = toolSeo;

  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return VARS.filter(
      (v) =>
        (cat === "all" || v.cat === cat) &&
        (!q || v.name.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q)),
    );
  }, [query, cat]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: VARS.length };
    for (const v of VARS) c[v.cat] = (c[v.cat] ?? 0) + 1;
    return c;
  }, []);

  const copyName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      toast.success(`${name} copied`);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      toast.error("Copy failed");
    }
  };

  const toggle = (name: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const copyEnvTemplate = async () => {
    if (!trial.canUse || selected.size === 0) return;
    const lines = [...selected]
      .map((name) => {
        const v = VARS.find((x) => x.name === name);
        return `# ${v?.desc ?? ""}\n${name}=${v?.example ?? ""}`;
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(`# Generated with IconVault Env Vars Reference\n\n${lines}\n`);
      trial.recordUse();
      toast.success(`${selected.size} vars copied as .env template`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const catColor = (c: Category) =>
    c === "node" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
    : c === "aws" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
    : c === "gcp" ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
    : "bg-violet-500/15 text-violet-600 dark:text-violet-300";

  return (
    <ToolPageShell toolId="env-vars-reference" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Env Vars Reference" left={trial.left} />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 80+ variables, e.g. region, token, port"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold transition",
                  cat === c.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                )}
              >
                {c.label} <span className="text-muted-foreground">({counts[c.id] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {filtered.length} variable{filtered.length === 1 ? "" : "s"} shown. Tick rows, then copy them as a .env template.
          </p>
          <ActionButton disabled={!trial.canUse || selected.size === 0} onClick={copyEnvTemplate}>
            <Terminal className="h-4 w-4" /> Copy .env ({selected.size})
          </ActionButton>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-2" />
                <th className="px-3 py-2 font-semibold">Variable</th>
                <th className="hidden px-3 py-2 font-semibold md:table-cell">Platform</th>
                <th className="px-3 py-2 font-semibold">What it does</th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.name} className="border-t border-border align-top">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(v.name)}
                      onChange={() => toggle(v.name)}
                      className="mt-1 accent-primary"
                      aria-label={`Select ${v.name}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[13px] font-bold">{v.name}</td>
                  <td className="hidden px-3 py-2.5 md:table-cell">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", catColor(v.cat))}>
                      {v.cat.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                    {v.desc}
                    {v.example && <span className="mt-0.5 block font-mono text-[11px] text-foreground/70">e.g. {v.example}</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => copyName(v.name)}
                      className="rounded-md border border-border p-1.5 hover:border-primary/50"
                      aria-label={`Copy ${v.name}`}
                    >
                      {copied === v.name ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No variables match "{query}".</p>
          )}
        </div>

        {!isPro && (
          <p className="mt-3 text-xs text-muted-foreground">{trial.left} of 5 free .env copies left.</p>
        )}
      </div>
    </ToolPageShell>
  );
}
