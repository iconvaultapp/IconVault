// /tools/csr-generator - Generate a PKCS#10 Certificate Signing Request plus
// the private key, with a hand-written DER encoder. WebCrypto RSA underneath.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileBadge } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/csr-generator";
import toolSeoMeta from "@/lib/tool-seo-meta-data/csr-generator";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/csr-generator")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/csr-generator";
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
  component: CsrTool,
});

const enc = new TextEncoder();

// ---------- DER writer ----------

function tlv(tagByte: number, content: Uint8Array): Uint8Array {
  const len = content.length;
  let lenBytes: Uint8Array;
  if (len < 128) {
    lenBytes = new Uint8Array([len]);
  } else {
    const tmp: number[] = [];
    let n = len;
    while (n > 0) { tmp.unshift(n & 0xff); n >>>= 8; }
    lenBytes = new Uint8Array([0x80 | tmp.length, ...tmp]);
  }
  const out = new Uint8Array(1 + lenBytes.length + len);
  out[0] = tagByte;
  out.set(lenBytes, 1);
  out.set(content, 1 + lenBytes.length);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

const seq = (...children: Uint8Array[]) => tlv(0x30, concat(...children));
const asn1Set = (...children: Uint8Array[]) => tlv(0x31, concat(...children));
const NULL_DER = tlv(0x05, new Uint8Array(0));

function oid(oidStr: string): Uint8Array {
  const parts = oidStr.split(".").map(Number);
  const out: number[] = [40 * parts![0]! + parts![1]!];
  for (let i = 2; i < parts.length; i++) {
    let v = parts[i];
    const stack = [v! & 0x7f];
    v! >>>= 7;
    while (v! > 0) { stack.unshift((v! & 0x7f) | 0x80); v! >>>= 7; }
    out.push(...stack);
  }
  return tlv(0x06, new Uint8Array(out));
}

const utf8 = (s: string) => tlv(0x0c, enc.encode(s));
const printable = (s: string) => tlv(0x13, enc.encode(s));
const ia5 = (s: string) => tlv(0x16, enc.encode(s));
const integer = (bytes: Uint8Array) => tlv(0x02, bytes);
const bitString = (bytes: Uint8Array) => tlv(0x03, concat(new Uint8Array([0]), bytes));

const OID_RSA_ENCRYPTION = "1.2.840.113549.1.1.1";
const OID_SHA256_WITH_RSA = "1.2.840.113549.1.1.11";
const OID_CN = "2.5.4.3";
const OID_O = "2.5.4.10";
const OID_OU = "2.5.4.11";
const OID_C = "2.5.4.6";
const OID_L = "2.5.4.7";
const OID_ST = "2.5.4.8";
const OID_EMAIL = "1.2.840.113549.1.9.1";

function u8ToB64(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

function toPem(bytes: Uint8Array, label: string): string {
  const lines = u8ToB64(bytes).match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

// ---------- component ----------

interface SubjectFields {
  cn: string; o: string; ou: string; c: string; l: string; st: string; email: string;
}

function CsrTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("csr-generator", isPro);
  const seo = toolSeo;

  const [fields, setFields] = useState<SubjectFields>({ cn: "", o: "", ou: "", c: "", l: "", st: "", email: "" });
  const [csrPem, setCsrPem] = useState("");
  const [keyPem, setKeyPem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (k: keyof SubjectFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((p) => ({ ...p, [k]: e.target.value }));

  const generate = async () => {
    if (!trial.canUse || busy) return;
    if (!fields.cn.trim()) { setError("Common Name (CN) is required - usually your domain."); return; }
    if (fields.c.trim() && !/^[A-Za-z]{2}$/.test(fields.c.trim())) { setError("Country (C) must be a 2-letter code like US or IN."); return; }
    if (fields.email.trim() && !/^\S+@\S+\.\S+$/.test(fields.email.trim())) { setError("Email address looks invalid."); return; }
    setBusy(true);
    setError(null);
    try {
      const pair = await crypto.subtle.generateKey(
        { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: "SHA-256" },
        true,
        ["sign", "verify"],
      );
      const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
      const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));

      const rdns: Uint8Array[] = [];
      const add = (o: string, v: string, encFn: (s: string) => Uint8Array) => {
        if (v.trim()) rdns.push(asn1Set(seq(oid(o), encFn(v.trim()))));
      };
      add(OID_CN, fields.cn, utf8);
      add(OID_O, fields.o, utf8);
      add(OID_OU, fields.ou, utf8);
      add(OID_L, fields.l, utf8);
      add(OID_ST, fields.st, utf8);
      add(OID_C, fields.c.toUpperCase(), printable);
      add(OID_EMAIL, fields.email, ia5);

      const cri = seq(
        integer(new Uint8Array([0])),            // version v1
        seq(...rdns),                            // subject
        spki,                                    // subjectPublicKeyInfo (already DER)
        tlv(0xa0, new Uint8Array(0)),            // [0] attributes (empty)
      );
      const signAlg = seq(oid(OID_SHA256_WITH_RSA), NULL_DER);
      const signature = new Uint8Array(
        await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, pair.privateKey, cri as BufferSource),
      );
      const csr = seq(cri, signAlg, bitString(signature));

      setCsrPem(toPem(csr, "CERTIFICATE REQUEST"));
      setKeyPem(toPem(pkcs8, "PRIVATE KEY"));
      trial.recordUse();
      toast.success("CSR and private key generated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSR generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Clipboard blocked by the browser");
    }
  };

  const download = (text: string, filename: string) => {
    downloadBlob(new Blob([text], { type: "application/x-pem-file" }), filename);
    toast.success(`${filename} downloaded`);
  };

  const fieldDefs: { key: keyof SubjectFields; label: string; placeholder: string; hint?: string }[] = [
    { key: "cn", label: "Common Name (CN) *", placeholder: "example.com", hint: "Fully qualified domain name" },
    { key: "o", label: "Organization (O)", placeholder: "Acme Inc" },
    { key: "ou", label: "Organizational Unit (OU)", placeholder: "IT" },
    { key: "l", label: "City / Locality (L)", placeholder: "Bengaluru" },
    { key: "st", label: "State / Province (ST)", placeholder: "Karnataka" },
    { key: "c", label: "Country (C)", placeholder: "IN", hint: "2-letter code" },
    { key: "email", label: "Email address", placeholder: "admin@example.com" },
  ];

  return (
    <ToolPageShell toolId="csr-generator" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="CSR Generator" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          {fieldDefs.map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">{f.label}</label>
              <input
                value={fields[f.key]}
                onChange={setField(f.key)}
                maxLength={f.key === "c" ? 2 : 128}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
                placeholder={f.placeholder}
                autoComplete="off"
              />
              {f.hint && <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
          <ActionButton busy={busy} disabled={!fields.cn.trim() || !trial.canUse} onClick={() => void generate()}>
            <FileBadge className="h-4 w-4" /> {busy ? "Generating…" : "Generate CSR + key"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - keys are generated locally, never sent anywhere.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="space-y-5">
          {[
            { title: "Certificate Signing Request (PKCS#10)", pem: csrPem, file: "request.csr", copyLabel: "CSR" },
            { title: "Private key (PKCS#8)", pem: keyPem, file: "private.pem", copyLabel: "Private key" },
          ].map((k) => (
            <div key={k.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">{k.title}</h3>
                {k.pem && (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void copy(k.pem, k.copyLabel)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button type="button" onClick={() => download(k.pem, k.file)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-primary/50">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                )}
              </div>
              {!k.pem ? (
                <div className="flex min-h-[100px] flex-col items-center justify-center text-center">
                  <FileBadge className="mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Fill in the subject and generate to see the {k.copyLabel.toLowerCase()}</p>
                </div>
              ) : (
                <textarea
                  value={k.pem}
                  readOnly
                  rows={k.copyLabel === "CSR" ? 9 : 6}
                  spellCheck={false}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3.5 py-3 font-mono text-xs break-all outline-none"
                />
              )}
            </div>
          ))}
          <p className="rounded-xl border border-amber-400/40 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            Keep the private key secret and store it safely - it was generated in your browser and we never see it.
            Send the CSR (not the private key) to your certificate authority. 2048-bit RSA is the standard choice for
            publicly trusted certificates.
          </p>
        </div>
      </div>
    </ToolPageShell>
  );
}
