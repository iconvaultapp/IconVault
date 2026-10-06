// /tools/docker-run-to-compose - Paste a `docker run` command and get a
// ready-to-use docker-compose.yml. 100% client-side; nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/docker-run-to-compose";
import toolSeoMeta from "@/lib/tool-seo-meta-data/docker-run-to-compose";
import { downloadBlob } from "@/lib/logo-builder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/tools_/docker-run-to-compose")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/docker-run-to-compose";
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
  component: DockerToComposeTool,
});

const SAMPLE =
  "docker run -d --name web -p 8080:80 -e NODE_ENV=production -v /data:/app/data --restart unless-stopped nginx:alpine";

interface Parsed {
  image: string;
  command: string[];
  service: Record<string, unknown>;
  notes: string[];
}

/** Split a shell command line into tokens, honoring single/double quotes. */
function tokenize(cmd: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i] ?? "";
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && i + 1 < cmd.length) {
        cur += cmd[i + 1] ?? "";
        i++;
      } else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "\\" && i + 1 < cmd.length) {
      cur += cmd[i + 1] ?? "";
      i++;
    } else if (/\s/.test(c)) {
      if (cur) {
        tokens.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

const VALUE_FLAGS = new Set([
  "--name", "-p", "--publish", "-v", "--volume", "-e", "--env", "--env-file",
  "--network", "--restart", "--hostname", "-w", "--workdir", "-u", "--user",
  "--entrypoint", "--cap-add", "--label", "-m", "--memory", "--cpus",
  "--network-alias", "--dns",
]);

function parseDockerRun(raw: string): Parsed {
  const tokens = tokenize(raw.trim().replace(/\s*\\\n\s*/g, " "));
  let i = 0;
  if (tokens[0] === "sudo") i++;
  if (tokens[i] !== "docker" || tokens[i + 1] !== "run") {
    throw new Error('The command should start with "docker run".');
  }
  i += 2;

  const svc: Record<string, unknown> = {};
  const notes: string[] = [];
  const push = (key: string, v: unknown) => {
    const cur = svc[key];
    if (Array.isArray(cur)) cur.push(v);
    else if (cur === undefined) svc[key] = [v];
    else svc[key] = [cur, v];
  };

  let image = "";
  const command: string[] = [];

  while (i < tokens.length) {
    const t = tokens[i] ?? "";
    if (!t.startsWith("-") && !image) {
      image = t;
      command.push(...tokens.slice(i + 1));
      break;
    }
    if (VALUE_FLAGS.has(t)) {
      const v = tokens[i + 1];
      if (v === undefined) throw new Error(`Flag ${t} needs a value.`);
      switch (t) {
        case "--name":
          svc["container_name"] = v;
          break;
        case "-p":
        case "--publish":
          push("ports", v);
          break;
        case "-v":
        case "--volume":
          push("volumes", v);
          break;
        case "-e":
        case "--env":
          push("environment", v);
          break;
        case "--env-file":
          push("env_file", v);
          break;
        case "--network":
          push("networks", v);
          break;
        case "--restart":
          svc["restart"] = v;
          break;
        case "--hostname":
          svc["hostname"] = v;
          break;
        case "-w":
        case "--workdir":
          svc["working_dir"] = v;
          break;
        case "-u":
        case "--user":
          svc["user"] = v;
          break;
        case "--entrypoint":
          svc["entrypoint"] = v;
          break;
        case "--cap-add":
          push("cap_add", v);
          break;
        case "--label":
          push("labels", v);
          break;
        case "-m":
        case "--memory":
          svc["mem_limit"] = v;
          break;
        case "--cpus":
          svc["cpus"] = v;
          break;
        case "--network-alias":
          notes.push(`network alias "${v}" was dropped (set it under the network entry if needed)`);
          break;
        case "--dns":
          push("dns", v);
          break;
      }
      i += 2;
      continue;
    }
    switch (t) {
      case "-d":
      case "--detach":
        notes.push("-d is the default when you run compose detached with -d");
        break;
      case "--rm":
        notes.push("--rm has no compose equivalent; use docker compose down to remove containers");
        break;
      case "-i":
      case "--interactive":
        svc["stdin_open"] = true;
        break;
      case "-t":
      case "--tty":
        svc["tty"] = true;
        break;
      case "--privileged":
        svc["privileged"] = true;
        break;
      default:
        if (t.startsWith("--")) {
          const eq = t.indexOf("=");
          if (eq > 2) {
            const flag = t.slice(0, eq);
            const val = t.slice(eq + 1);
            if (VALUE_FLAGS.has(flag)) {
              tokens.splice(i + 1, 0, val);
              tokens[i] = flag;
              continue;
            }
          }
          throw new Error(`Unsupported flag "${t}". Remove it or run a simpler command.`);
        }
        if (/^-[a-zA-Z]+$/.test(t)) {
          // combined short flags like -it
          for (const ch of t.slice(1)) {
            if (ch === "i") svc["stdin_open"] = true;
            else if (ch === "t") svc["tty"] = true;
            else if (ch === "d") notes.push("-d is the default when you run compose detached with -d");
            else throw new Error(`Unsupported short flag "-${ch}".`);
          }
          i++;
          continue;
        }
        throw new Error(`Unexpected token "${t}". The image name may be missing.`);
    }
    i++;
  }

  if (!image) throw new Error("No image found. Paste a full docker run command including the image name.");

  const serviceName = String(svc["container_name"] ?? image)
    .split("/").pop()!
    .split(":")[0]!
    .replace(/[^a-z0-9_.-]/gi, "-")
    .toLowerCase() || "app";

  const service: Record<string, unknown> = { image, ...svc };
  if (command.length) service["command"] = command.length === 1 ? command[0] : command;

  return { image, command, service: { [serviceName]: service }, notes };
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function DockerToComposeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("docker-run-to-compose", isPro);
  const seo = toolSeo;

  const [input, setInput] = useState(SAMPLE);
  const [yaml, setYaml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const convert = async () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = parseDockerRun(input);
      const mod = await import("yaml");
      const body = mod.stringify({ services: parsed.service }).trimEnd();
      const header = ["# Generated by IconVault Docker to Compose", "# Runs in your browser, nothing was uploaded."];
      for (const n of parsed.notes) header.push(`# Note: ${n}`);
      setYaml(`${header.join("\n")}\n${body}\n`);
      trial.recordUse();
      toast.success("docker-compose.yml generated.");
    } catch (e) {
      setYaml(null);
      setError(e instanceof Error ? e.message : "Could not parse that command.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!yaml) return;
    const ok = await copyToClipboard(yaml);
    if (ok) toast.success("Compose file copied.");
    else toast.error("Could not copy to clipboard.");
  };

  const download = () => {
    if (!yaml) return;
    downloadBlob(new Blob([yaml], { type: "text/yaml" }), "compose.yaml");
    toast.success("compose.yaml downloaded.");
  };

  return (
    <ToolPageShell toolId="docker-run-to-compose" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Docker to Compose" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div>
            <Label className="mb-2 block text-[13px] font-medium text-foreground/80">docker run command</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              spellCheck={false}
              className="font-mono text-[13px]"
              placeholder="docker run -d --name web -p 8080:80 nginx:alpine"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton busy={busy} disabled={!trial.canUse || !input.trim()} onClick={convert}>
              <FileUp className="h-4 w-4" /> {busy ? "Converting…" : "Convert to compose"}
            </ActionButton>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Load sample
            </button>
          </div>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free conversions left - runs fully in your browser, nothing is uploaded.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          <p className="text-xs text-muted-foreground">
            Supports -p, -v, -e, --env-file, --name, --network, --restart, -d, --rm, -it, --privileged, --hostname, --workdir,
            --user, --entrypoint, --cap-add, --label, --memory, --cpus, --dns and the image command.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">compose.yaml</p>
            {yaml && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </div>
            )}
          </div>
          {yaml ? (
            <pre className="max-h-[480px] overflow-auto rounded-xl bg-muted p-4 font-mono text-[13px] leading-relaxed">{yaml}</pre>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <p className="font-semibold">Your compose file appears here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste a docker run command on the left and convert it into a ready-to-use compose file.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
