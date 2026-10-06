// /tools/terraform-generator - Visual Terraform builder. Provider select
// (AWS, GCP, Azure), resource pickers with key fields, custom variables,
// live HCL output with an honest starter-scaffold note. Copy + download.
// 100% client-side.

import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Download, Plus, TriangleAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/terraform-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/terraform-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/terraform-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/terraform-generator";
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
  component: TerraformTool,
});

type Provider = "aws" | "gcp" | "azure";

interface FieldDef { key: string; label: string; placeholder: string; bool?: boolean; }
interface ResourceDef { id: string; label: string; desc: string; fields: FieldDef[]; }
interface VarDef { id: number; name: string; def: string; desc: string; }

const PROVIDERS: Record<Provider, { label: string; note: string }> = {
  aws: { label: "AWS", note: "Amazon Web Services, using the hashicorp/aws provider." },
  gcp: { label: "Google Cloud", note: "Google Cloud Platform, using the hashicorp/google provider." },
  azure: { label: "Azure", note: "Microsoft Azure, using the hashicorp/azurerm provider." },
};

const RESOURCES: Record<Provider, ResourceDef[]> = {
  aws: [
    { id: "instance", label: "EC2 instance", desc: "A virtual server", fields: [
      { key: "name", label: "Name tag", placeholder: "my-app" },
      { key: "ami", label: "AMI", placeholder: "ami-0c55b159cbfafe1f0" },
      { key: "instance_type", label: "Instance type", placeholder: "t3.micro" },
    ]},
    { id: "bucket", label: "S3 bucket", desc: "Object storage", fields: [
      { key: "bucket", label: "Bucket name", placeholder: "my-app-assets" },
      { key: "versioning", label: "Versioning", placeholder: "", bool: true },
    ]},
    { id: "db", label: "RDS database", desc: "Managed relational database", fields: [
      { key: "identifier", label: "Identifier", placeholder: "myapp-db" },
      { key: "engine", label: "Engine", placeholder: "postgres" },
      { key: "instance_class", label: "Instance class", placeholder: "db.t3.micro" },
      { key: "db_name", label: "Database name", placeholder: "myapp" },
    ]},
  ],
  gcp: [
    { id: "instance", label: "Compute Engine VM", desc: "A virtual machine", fields: [
      { key: "name", label: "Name", placeholder: "my-app" },
      { key: "machine_type", label: "Machine type", placeholder: "e2-micro" },
      { key: "zone", label: "Zone", placeholder: "us-central1-a" },
    ]},
    { id: "bucket", label: "Cloud Storage bucket", desc: "Object storage", fields: [
      { key: "name", label: "Bucket name", placeholder: "my-app-assets" },
      { key: "location", label: "Location", placeholder: "US" },
    ]},
    { id: "sql", label: "Cloud SQL instance", desc: "Managed database", fields: [
      { key: "name", label: "Name", placeholder: "myapp-db" },
      { key: "database_version", label: "Database version", placeholder: "POSTGRES_15" },
      { key: "tier", label: "Tier", placeholder: "db-f1-micro" },
    ]},
  ],
  azure: [
    { id: "rg", label: "Resource group", desc: "Container for all resources", fields: [
      { key: "name", label: "Name", placeholder: "my-app-rg" },
    ]},
    { id: "vm", label: "Linux virtual machine", desc: "A virtual server", fields: [
      { key: "name", label: "Name", placeholder: "my-app-vm" },
      { key: "size", label: "Size", placeholder: "Standard_B1s" },
      { key: "admin_username", label: "Admin username", placeholder: "azureuser" },
    ]},
    { id: "storage", label: "Storage account", desc: "Blob and file storage", fields: [
      { key: "name", label: "Name (lowercase, no dashes)", placeholder: "myappstorage" },
    ]},
  ],
};

const PROVIDER_BLOCK: Record<Provider, { required: string; variables: string; provider: string; varDefs: { key: string; label: string; placeholder: string }[] }> = {
  aws: {
    required: `    aws = {\n      source  = "hashicorp/aws"\n      version = "~> 5.0"\n    }`,
    variables: `variable "region" {\n  description = "AWS region"\n  type        = string\n  default     = "%REGION%"\n}`,
    provider: `provider "aws" {\n  region = var.region\n}`,
    varDefs: [{ key: "region", label: "Region", placeholder: "us-east-1" }],
  },
  gcp: {
    required: `    google = {\n      source  = "hashicorp/google"\n      version = "~> 5.0"\n    }`,
    variables: `variable "project" {\n  description = "GCP project ID"\n  type        = string\n  default     = "%PROJECT%"\n}\n\nvariable "region" {\n  description = "GCP region"\n  type        = string\n  default     = "%REGION%"\n}`,
    provider: `provider "google" {\n  project = var.project\n  region  = var.region\n}`,
    varDefs: [
      { key: "project", label: "Project ID", placeholder: "my-project-123" },
      { key: "region", label: "Region", placeholder: "us-central1" },
    ],
  },
  azure: {
    required: `    azurerm = {\n      source  = "hashicorp/azurerm"\n      version = "~> 3.0"\n    }`,
    variables: `variable "location" {\n  description = "Azure location"\n  type        = string\n  default     = "%REGION%"\n}`,
    provider: `provider "azurerm" {\n  features {}\n}`,
    varDefs: [{ key: "location", label: "Location", placeholder: "eastus" }],
  },
};

type Values = Record<string, string>;

function buildResource(p: Provider, id: string, v: Values): string {
  const q = (s: string | undefined, fb: string) => (s && s.trim() ? s.trim() : fb);
  if (p === "aws") {
    if (id === "instance") {
      return [
        'resource "aws_instance" "main" {',
        `  ami           = "${q(v["ami"], "ami-0c55b159cbfafe1f0")}"`,
        `  instance_type = "${q(v["instance_type"], "t3.micro")}"`,
        "",
        "  tags = {",
        `    Name = "${q(v["name"], "my-app")}"`,
        "  }",
        "}",
      ].join("\n");
    }
    if (id === "bucket") {
      const lines = [
        'resource "aws_s3_bucket" "main" {',
        `  bucket = "${q(v["bucket"], "my-app-assets")}"`,
        "}",
      ];
      if (v["versioning"] === "true") {
        lines.push(
          "",
          'resource "aws_s3_bucket_versioning" "main" {',
          "  bucket = aws_s3_bucket.main.id",
          "  versioning_configuration {",
          '    status = "Enabled"',
          "  }",
          "}",
        );
      }
      return lines.join("\n");
    }
    return [
      'resource "aws_db_instance" "main" {',
      `  identifier          = "${q(v["identifier"], "myapp-db")}"`,
      `  engine              = "${q(v["engine"], "postgres")}"`,
      `  instance_class      = "${q(v["instance_class"], "db.t3.micro")}"`,
      `  db_name             = "${q(v["db_name"], "myapp")}"`,
      "  allocated_storage   = 20",
      "  skip_final_snapshot = true",
      "}",
    ].join("\n");
  }
  if (p === "gcp") {
    if (id === "instance") {
      return [
        'resource "google_compute_instance" "main" {',
        `  name         = "${q(v["name"], "my-app")}"`,
        `  machine_type = "${q(v["machine_type"], "e2-micro")}"`,
        `  zone         = "${q(v["zone"], "us-central1-a")}"`,
        "",
        "  boot_disk {",
        "    initialize_params {",
        '      image = "debian-cloud/debian-12"',
        "    }",
        "  }",
        "",
        "  network_interface {",
        '    network = "default"',
        "  }",
        "}",
      ].join("\n");
    }
    if (id === "bucket") {
      return [
        'resource "google_storage_bucket" "main" {',
        `  name     = "${q(v["name"], "my-app-assets")}"`,
        `  location = "${q(v["location"], "US")}"`,
        "}",
      ].join("\n");
    }
    return [
      'resource "google_sql_database_instance" "main" {',
      `  name             = "${q(v["name"], "myapp-db")}"`,
      `  database_version = "${q(v["database_version"], "POSTGRES_15")}"`,
      "  region           = var.region",
      "",
      "  settings {",
      `    tier = "${q(v["tier"], "db-f1-micro")}"`,
      "  }",
      "}",
    ].join("\n");
  }
  if (id === "rg") {
    return [
      'resource "azurerm_resource_group" "main" {',
      `  name     = "${q(v["name"], "my-app-rg")}"`,
      "  location = var.location",
      "}",
    ].join("\n");
  }
  if (id === "vm") {
    const admin = q(v["admin_username"], "azureuser");
    return [
      'resource "azurerm_linux_virtual_machine" "main" {',
      `  name                = "${q(v["name"], "my-app-vm")}"`,
      "  resource_group_name = azurerm_resource_group.main.name",
      "  location            = var.location",
      `  size                = "${q(v["size"], "Standard_B1s")}"`,
      `  admin_username      = "${admin}"`,
      "",
      "  admin_ssh_key {",
      `    username   = "${admin}"`,
      '    public_key = file("~/.ssh/id_rsa.pub")',
      "  }",
      "",
      "  os_disk {",
      '    caching              = "ReadWrite"',
      '    storage_account_type = "Standard_LRS"',
      "  }",
      "",
      "  source_image_reference {",
      '    publisher = "Canonical"',
      '    offer     = "0001-com-ubuntu-server-jammy"',
      '    sku       = "22_04-lts"',
      '    version   = "latest"',
      "  }",
      "}",
    ].join("\n");
  }
  const stor = q(v["name"], "myappstorage").toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    'resource "azurerm_storage_account" "main" {',
    `  name                     = "${stor || "myappstorage"}"`,
    "  resource_group_name      = azurerm_resource_group.main.name",
    "  location                 = var.location",
    '  account_tier             = "Standard"',
    '  account_replication_type = "LRS"',
    "}",
  ].join("\n");
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

function TerraformTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("terraform-generator", isPro);
  const seo = toolSeo;

  const varId = useRef(2);
  const [provider, setProvider] = useState<Provider>("aws");
  const [locValues, setLocValues] = useState<Record<string, string>>({ region: "us-east-1", project: "my-project-123", location: "eastus" });
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ "aws.instance": true, "aws.bucket": false, "aws.db": false });
  const [values, setValues] = useState<Record<string, Values>>({});
  const [vars, setVars] = useState<VarDef[]>([{ id: 1, name: "environment", def: "dev", desc: "Deployment environment" }]);
  const [copied, setCopied] = useState(false);

  const resKey = (id: string) => `${provider}.${id}`;
  const getVals = (id: string): Values => values[resKey(id)] ?? {};
  const setVal = (id: string, key: string, v: string) =>
    setValues((p) => ({ ...p, [resKey(id)]: { ...getVals(id), [key]: v } }));

  const output = useMemo(() => {
    const pb = PROVIDER_BLOCK[provider];
    const parts: string[] = [];
    parts.push("# Generated with IconVault's Terraform Generator");
    parts.push("# STARTER SCAFFOLD - review every value before running terraform apply.");
    parts.push("");
    parts.push("terraform {");
    parts.push('  required_version = ">= 1.5.0"');
    parts.push("  required_providers {");
    parts.push(pb.required);
    parts.push("  }");
    parts.push("}");
    parts.push("");
    let varBlock = pb.variables;
    for (const vd of pb.varDefs) varBlock = varBlock.replace(`%${vd.key.toUpperCase()}%`, locValues[vd.key] || vd.placeholder);
    parts.push(varBlock);
    for (const v of vars) {
      const n = v.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") || "my_var";
      parts.push(
        "",
        `variable "${n}" {`,
        `  description = "${v.desc.trim() || n}"`,
        "  type        = string",
        `  default     = "${v.def.replace(/"/g, '\\"')}"`,
        "}",
      );
    }
    parts.push("");
    parts.push(pb.provider);
    const enabledRes = RESOURCES[provider].filter((r) => enabled[`${provider}.${r.id}`]);
    for (const r of enabledRes) {
      parts.push("");
      parts.push(buildResource(provider, r.id, getVals(r.id)));
    }
    if (!enabledRes.length) parts.push("", "# Enable at least one resource above.");
    return parts.join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, locValues, enabled, values, vars]);

  const doCopy = async () => {
    if (!trial.canUse) return;
    const ok = await copyText(output);
    if (ok) {
      setCopied(true);
      trial.recordUse();
      toast.success("Terraform config copied");
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast.error("Copy failed.");
    }
  };

  const doDownload = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([output + "\n"], { type: "text/plain" }), "main.tf");
    trial.recordUse();
    toast.success("main.tf downloaded");
  };

  return (
    <ToolPageShell toolId="terraform-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Terraform Generator" left={trial.left} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">Provider:</span>
        {(Object.keys(PROVIDERS) as Provider[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setProvider(p)}
            title={PROVIDERS[p].note}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm font-bold transition",
              provider === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:text-primary",
            )}
          >
            {PROVIDERS[p].label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
        <div className="space-y-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PROVIDER_BLOCK[provider].varDefs.map((vd) => (
              <label key={vd.key} className="block">
                <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{vd.label}</span>
                <input
                  value={locValues[vd.key] ?? ""}
                  onChange={(e) => setLocValues((p) => ({ ...p, [vd.key]: e.target.value }))}
                  placeholder={vd.placeholder}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                />
              </label>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold">Resources - enable the ones you need</p>
            {RESOURCES[provider].map((r) => {
              const key = `${provider}.${r.id}`;
              const on = enabled[key] ?? false;
              const vals = getVals(r.id);
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
                  <Toggle label={r.label} desc={r.desc} checked={on} onChange={(v) => setEnabled((p) => ({ ...p, [key]: v }))} />
                  {on && (
                    <div className="mt-3 space-y-2.5">
                      {r.fields.map((f) =>
                        f.bool ? (
                          <Toggle
                            key={f.key}
                            label={f.label}
                            checked={vals[f.key] === "true"}
                            onChange={(v) => setVal(r.id, f.key, v ? "true" : "false")}
                          />
                        ) : (
                          <label key={f.key} className="block">
                            <span className="mb-1 block font-mono text-[11px] font-bold text-muted-foreground">{f.label}</span>
                            <input
                              value={vals[f.key] ?? ""}
                              onChange={(e) => setVal(r.id, f.key, e.target.value)}
                              placeholder={f.placeholder}
                              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                            />
                          </label>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div>
            <p className="mb-2 text-sm font-bold">Custom variables</p>
            <div className="space-y-2">
              {vars.map((v) => (
                <div key={v.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    value={v.name}
                    onChange={(e) => setVars((prev) => prev.map((x) => (x.id === v.id ? { ...x, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") } : x)))}
                    placeholder="name"
                    aria-label="Variable name"
                    className="rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                  />
                  <input
                    value={v.def}
                    onChange={(e) => setVars((prev) => prev.map((x) => (x.id === v.id ? { ...x, def: e.target.value } : x)))}
                    placeholder="default"
                    aria-label="Variable default"
                    className="rounded-xl border border-border bg-card px-3 py-2.5 font-mono text-[13px] outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setVars((prev) => prev.filter((x) => x.id !== v.id))}
                    aria-label="Remove variable"
                    className="rounded-xl border border-border px-3 text-muted-foreground transition hover:border-red-500/40 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVars((prev) => [...prev, { id: varId.current++, name: "", def: "", desc: "" }])}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add variable
              </button>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-2 text-sm font-bold">main.tf - live preview</p>
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
            <div className="mt-4 flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
              <TriangleAlert className="h-4 w-4 shrink-0 text-amber-500" />
              <span>
                These are starter scaffolds with placeholder values (AMIs, sizes, tiers). Review and replace every value, then run terraform init, plan and apply.
              </span>
            </div>
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
