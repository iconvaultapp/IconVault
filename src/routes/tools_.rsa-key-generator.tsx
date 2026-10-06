// /tools/rsa-key-generator - Generate RSA key pairs in the browser via
// WebCrypto. Exports PKCS#8 private and SPKI public keys as PEM files.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/rsa-key-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/rsa-key-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/rsa-key-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/rsa-key-generator";
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
  component: RsaTool,
});

const SIZES = [2048, 4096] as const;

function u8ToB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function toPem(der: ArrayBuffer, label: string): string {
  const b64 = u8ToB64(new Uint8Array(der));
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

function RsaTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("rsa-key-generator", isPro);
  const seo = toolSeo;

  const [size, setSize] = useState<number>(2048);
  const [privatePem, setPrivatePem] = useState("");
  const [publicPem, setPublicPem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!trial.canUse || busy) return;
    setBusy(true);
    setError(null);
    try {
      const pair = await crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: size,
          publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"],
      );
      const priv = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
      const pub = await crypto.subtle.exportKey("spki", pair.publicKey);
      setPrivatePem(toPem(priv, "PRIVATE KEY"));
      setPublicPem(toPem(pub, "PUBLIC KEY"));
      trial.recordUse();
      toast.success(`${size}-bit RSA key pair generated`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Key generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (pem: string, label: string) => {
    try {
      await navigator.clipboard.writeText(pem);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const download = (pem: string, filename: string) => {
    downloadBlob(new Blob([pem], { type: "application/x-pem-file" }), filename);
    toast.success(`${filename} downloaded`);
  };

  return (
    <ToolPageShell toolId="rsa-key-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="RSA Key Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-foreground/80">Key size</p>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                    size === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {s}-bit
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              2048-bit is standard. 4096-bit is stronger but noticeably slower to generate.
            </p>
          </div>

          <ActionButton busy={busy} disabled={!trial.canUse} onClick={() => void generate()}>
            <KeyRound className="h-4 w-4" /> {busy ? "Generating…" : "Generate key pair"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - keys are generated locally, never sent anywhere.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          <p className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
            Keys are generated with the browser's WebCrypto API, a standard secure source of randomness. Keep your
            private key secret - anyone with it can decrypt data encrypted with the public key.
          </p>
        </div>

        <div className="space-y-5">
          {[
            { title: "Private key (PKCS#8)", pem: privatePem, file: "private.pem" },
            { title: "Public key (SPKI)", pem: publicPem, file: "public.pem" },
          ].map((k) => (
            <div key={k.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{k.title}</h3>
                {k.pem && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void copy(k.pem, k.title)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button type="button" onClick={() => download(k.pem, k.file)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                      <Download className="h-3.5 w-3.5" /> .pem
                    </button>
                  </div>
                )}
              </div>
              {!k.pem ? (
                <div className="flex min-h-[120px] flex-col items-center justify-center text-center">
                  <KeyRound className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Generate a key pair to see the {k.title.toLowerCase()}</p>
                </div>
              ) : (
                <textarea
                  value={k.pem}
                  readOnly
                  rows={6}
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 font-mono text-xs break-all outline-none"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </ToolPageShell>
  );
}
