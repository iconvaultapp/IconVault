// /tools/dockerfile-generator - Build a correct, best-practice Dockerfile
// for 10 languages with multi-stage toggle, ports, workdir and env vars.
// Live preview, copy + download. 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/tools_/dockerfile-generator")({
  head: () => {
    const seo = getToolSeoMeta("dockerfile-generator");
    const canonical = "https://iconvault.site/tools/dockerfile-generator";
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
  component: DockerfileGeneratorTool,
});

interface LangPreset {
  id: string;
  label: string;
  base: string;
  builder?: string;
  install: string[];
  build?: string[];
  run: string;
  port: number;
  workdir: string;
  copyFirst?: boolean;
}

const LANGS: LangPreset[] = [
  { id: "node", label: "Node.js", base: "node:22-alpine", builder: "node:22-alpine", install: ["COPY package*.json ./", "RUN npm ci --omit=dev"], build: ["COPY . .", "RUN npm run build"], run: 'CMD ["node", "dist/index.js"]', port: 3000, workdir: "/app" },
  { id: "python", label: "Python", base: "python:3.12-slim", builder: "python:3.12-slim", install: ["COPY requirements.txt .", "RUN pip install --no-cache-dir -r requirements.txt"], build: ["COPY . ."], run: 'CMD ["python", "app.py"]', port: 8000, workdir: "/app" },
  { id: "go", label: "Go", base: "alpine:3.20", builder: "golang:1.23-alpine", install: ["COPY go.mod go.sum ./", "RUN go mod download"], build: ["COPY . .", "RUN CGO_ENABLED=0 go build -o /app/server ."], run: 'CMD ["/app/server"]', port: 8080, workdir: "/app" },
  { id: "rust", label: "Rust", base: "debian:bookworm-slim", builder: "rust:1.83-slim-bookworm", install: ["COPY Cargo.toml Cargo.lock ./", "RUN mkdir src && echo 'fn main() {}' > src/main.rs && cargo build --release && rm -rf src"], build: ["COPY . .", "RUN cargo build --release"], run: 'CMD ["/app/target/release/app"]', port: 8080, workdir: "/app" },
  { id: "java", label: "Java", base: "eclipse-temurin:21-jre-alpine", builder: "maven:3.9-eclipse-temurin-21-alpine", install: ["COPY pom.xml .", "RUN mvn -q dependency:go-offline"], build: ["COPY src ./src", "RUN mvn -q package -DskipTests"], run: 'CMD ["java", "-jar", "target/app.jar"]', port: 8080, workdir: "/app" },
  { id: "ruby", label: "Ruby", base: "ruby:3.4-slim", builder: "ruby:3.4-slim", install: ["COPY Gemfile Gemfile.lock ./", "RUN bundle install --without development test"], build: ["COPY . ."], run: 'CMD ["ruby", "app.rb"]', port: 4567, workdir: "/app" },
  { id: "php", label: "PHP", base: "php:8.3-apache", install: ["COPY --from=composer:2 /usr/bin/composer /usr/bin/composer", "COPY composer.json composer.lock ./", "RUN composer install --no-dev --optimize-autoloader"], build: ["COPY . /var/www/html/"], run: "", port: 80, workdir: "/var/www/html" },
  { id: "dotnet", label: ".NET", base: "mcr.microsoft.com/dotnet/aspnet:9.0-alpine", builder: "mcr.microsoft.com/dotnet/sdk:9.0-alpine", install: ["COPY *.csproj ./", "RUN dotnet restore"], build: ["COPY . .", "RUN dotnet publish -c Release -o /app/publish"], run: 'ENTRYPOINT ["dotnet", "/app/app.dll"]', port: 8080, workdir: "/app" },
  { id: "deno", label: "Deno", base: "denoland/deno:2.1.4", install: ["COPY deno.json deno.lock* ./", "RUN deno cache --frozen main.ts"], build: ["COPY . .", "RUN deno cache main.ts"], run: 'CMD ["run", "--allow-net", "main.ts"]', port: 8000, workdir: "/app" },
  { id: "bun", label: "Bun", base: "oven/bun:1.2-alpine", builder: "oven/bun:1.2-alpine", install: ["COPY package.json bun.lock* ./", "RUN bun install --frozen-lockfile --production"], build: ["COPY . ."], run: 'CMD ["bun", "run", "index.ts"]', port: 3000, workdir: "/app" },
];

interface EnvVar {
  id: number;
  key: string;
  value: string;
}

let envSeq = 1;

function buildDockerfile(lang: LangPreset, multi: boolean, port: number, workdir: string, env: EnvVar[], expose: boolean): string {
  const L: string[] = [];
  L.push("# Generated by IconVault Dockerfile Generator");
  L.push(`# Build: docker build -t myapp .`);
  L.push(`# Run:   docker run -p ${port}:${port} myapp`);
  L.push("");

  const stage = multi && lang.builder ? "builder" : null;

  if (stage) {
    L.push(`# ---- Build stage (${lang.label}) ----`);
    L.push(`FROM ${lang.builder} AS ${stage}`);
    L.push(`WORKDIR ${workdir}`);
    L.push(...lang.install);
    L.push(...(lang.build ?? []));
    L.push("");
    L.push(`# ---- Runtime stage ----`);
    L.push(`FROM ${lang.base}`);
    L.push(`WORKDIR ${workdir}`);
    for (const e of env) {
      if (e.key.trim()) L.push(`ENV ${e.key.trim()}=${e.value}`);
    }
    if (lang.id === "go") L.push("COPY --from=builder /app/server /app/server");
    else if (lang.id === "rust") L.push("COPY --from=builder /app/target/release/app /app/target/release/app");
    else if (lang.id === "java") L.push("COPY --from=builder /app/target/app.jar /app/target/app.jar");
    else if (lang.id === "dotnet") L.push("COPY --from=builder /app/publish /app");
    else L.push(`COPY --from=builder ${workdir} ${workdir}`);
  } else {
    L.push(`# ${lang.label} on ${lang.base}`);
    L.push(`FROM ${lang.base}`);
    L.push(`WORKDIR ${workdir}`);
    L.push(...lang.install);
    L.push(...(lang.build ?? []));
    for (const e of env) {
      if (e.key.trim()) L.push(`ENV ${e.key.trim()}=${e.value}`);
    }
  }

  if (expose) {
    L.push("");
    L.push(`EXPOSE ${port}`);
  }
  if (lang.run) {
    L.push("");
    L.push(lang.run);
  }
  L.push("");
  return L.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function DockerfileGeneratorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("dockerfile-generator", isPro);
  const seo = getToolSeo("dockerfile-generator");

  const [langId, setLangId] = useState("node");
  const [multi, setMulti] = useState(true);
  const [expose, setExpose] = useState(true);
  const [port, setPort] = useState(3000);
  const [workdir, setWorkdir] = useState("/app");
  const [env, setEnv] = useState<EnvVar[]>([{ id: envSeq++, key: "NODE_ENV", value: "production" }]);

  const lang = LANGS.find((l) => l.id === langId) ?? LANGS[0]!;

  const pickLang = (id: string) => {
    const l = LANGS.find((x) => x.id === id);
    if (!l) return;
    setLangId(id);
    setPort(l.port);
    setWorkdir(l.workdir);
    if (id === "php") setMulti(false);
  };

  const dockerfile = useMemo(
    () => buildDockerfile(lang, lang.id === "php" ? false : multi, port, workdir.trim() || "/app", env, expose),
    [lang, multi, port, workdir, env, expose],
  );

  const copy = async () => {
    if (!trial.canUse) return;
    const ok = await copyToClipboard(dockerfile);
    if (ok) {
      trial.recordUse();
      toast.success("Dockerfile copied.");
    } else toast.error("Could not copy to clipboard.");
  };

  const download = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([dockerfile], { type: "text/plain" }), "Dockerfile");
    trial.recordUse();
    toast.success("Dockerfile downloaded.");
  };

  return (
    <ToolPageShell toolId="dockerfile-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Dockerfile Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Language</Label>
            <Select value={langId} onValueChange={pickLang}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Port</Label>
              <Input type="number" min={1} max={65535} value={port} onChange={(e) => setPort(parseInt(e.target.value || "3000", 10))} className="font-mono" />
            </div>
            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Workdir</Label>
              <Input value={workdir} onChange={(e) => setWorkdir(e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="divide-y divide-border/60 rounded-xl border border-border px-4">
            <div className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-[13px] font-medium">Multi-stage build</p>
                <p className="text-xs text-muted-foreground">Smaller runtime image, no build tools shipped</p>
              </div>
              <Switch checked={multi} onCheckedChange={setMulti} disabled={langId === "php"} />
            </div>
            <div className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="text-[13px] font-medium">EXPOSE port</p>
                <p className="text-xs text-muted-foreground">Document which port the app listens on</p>
              </div>
              <Switch checked={expose} onCheckedChange={setExpose} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-[13px] font-medium text-foreground/80">Environment variables</Label>
              <button
                type="button"
                onClick={() => setEnv((p) => [...p, { id: envSeq++, key: "", value: "" }])}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            <div className="max-h-44 space-y-2 overflow-y-auto">
              {env.map((e) => (
                <div key={e.id} className="flex items-center gap-2">
                  <Input
                    value={e.key}
                    onChange={(ev) => setEnv((p) => p.map((x) => (x.id === e.id ? { ...x, key: ev.target.value } : x)))}
                    placeholder="KEY"
                    className="font-mono text-xs"
                  />
                  <Input
                    value={e.value}
                    onChange={(ev) => setEnv((p) => p.map((x) => (x.id === e.id ? { ...x, value: ev.target.value } : x)))}
                    placeholder="value"
                    className="font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setEnv((p) => p.filter((x) => x.id !== e.id))}
                    aria-label="Remove variable"
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <ActionButton busy={false} disabled={!trial.canUse} onClick={download}>
            <Download className="h-4 w-4" /> Download Dockerfile
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free generations left - runs fully in your browser, nothing is uploaded.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[13px] font-medium text-foreground/80">Live preview: {lang.label}{multi && langId !== "php" ? " (multi-stage)" : ""}</p>
            <button
              type="button"
              onClick={copy}
              disabled={!trial.canUse}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground",
                !trial.canUse && "cursor-not-allowed opacity-50",
              )}
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
          <pre className="max-h-[640px] overflow-auto whitespace-pre rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
            {dockerfile}
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Builds use layer caching: dependency files are copied and installed before the source so rebuilds stay fast.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
