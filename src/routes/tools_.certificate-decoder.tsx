// /tools/certificate-decoder - Decode X.509 certificates and CSRs with a
// hand-written ASN.1/DER parser. No dependencies, everything local.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileBadge, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/certificate-decoder";
import toolSeoMeta from "@/lib/tool-seo-meta-data/certificate-decoder";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/certificate-decoder")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/certificate-decoder";
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
  component: CertTool,
});

// ---------- ASN.1/DER parser ----------

interface Asn1Node {
  tagByte: number;
  cls: number;
  constructed: boolean;
  tagNum: number;
  value: Uint8Array;
  children: Asn1Node[];
}

function parseNode(buf: Uint8Array, pos: number): { node: Asn1Node; next: number } {
  if (pos >= buf.length) throw new Error("Unexpected end of data.");
  const tagByte = buf[pos]!;
  const cls = (tagByte & 0xc0) >> 6;
  const constructed = (tagByte & 0x20) !== 0;
  let tagNum = tagByte & 0x1f;
  let p = pos + 1;
  if (tagNum === 0x1f) {
    tagNum = 0;
    for (;;) {
      if (p >= buf.length) throw new Error("Truncated high-tag-number form.");
      const b = buf[p++];
      tagNum = (tagNum << 7) | (b! & 0x7f);
      if ((b! & 0x80) === 0) break;
    }
  }
  if (p >= buf.length) throw new Error("Truncated length.");
  const lenByte = buf[p++];
  let length = 0;
  if ((lenByte! & 0x80) === 0) {
    length = lenByte!;
  } else {
    const n = lenByte! & 0x7f;
    if (n === 0 || n > 4) throw new Error("Unsupported length form.");
    for (let i = 0; i < n; i++) {
      if (p >= buf.length) throw new Error("Truncated long-form length.");
      length = (length << 8) | buf![p++]!;
    }
  }
  if (p + length > buf.length) throw new Error("Declared length exceeds data.");
  const value = buf.slice(p, p + length);
  const next = p + length;
  const node: Asn1Node = { tagByte, cls, constructed, tagNum, value, children: [] };
  // Constructed content parses to children, except BIT STRING (tag 3) whose
  // first content byte is the unused-bits count.
  if (constructed && tagNum !== 3) {
    let cp = 0;
    while (cp < value.length) {
      const r = parseNode(value, cp);
      node.children.push(r.node);
      cp = r.next;
    }
  }
  return { node, next };
}

function parseDer(buf: Uint8Array): Asn1Node {
  const { node, next } = parseNode(buf, 0);
  if (next !== buf.length) throw new Error("Trailing data after top-level element.");
  return node;
}

function oidToString(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const parts = [Math.floor(bytes![0]! / 40), bytes![0]! % 40];
  let v = 0;
  for (let i = 1; i < bytes.length; i++) {
    v = (v << 7) | (bytes![i]! & 0x7f);
    if ((bytes![i]! & 0x80) === 0) { parts.push(v); v = 0; }
  }
  return parts.join(".");
}

function integerToHex(bytes: Uint8Array): string {
  let hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.startsWith("00")) hex = hex.slice(2);
  return hex.replace(/(.{2})/g, "$1:").replace(/:$/, "").toUpperCase();
}

const OID_NAMES: Record<string, string> = {
  "2.5.4.3": "CN", "2.5.4.10": "O", "2.5.4.11": "OU", "2.5.4.6": "C", "2.5.4.7": "L",
  "2.5.4.8": "ST", "2.5.4.9": "STREET", "2.5.4.12": "T", "2.5.4.42": "G", "2.5.4.4": "SN",
  "2.5.4.5": "serialNumber", "1.2.840.113549.1.9.1": "emailAddress", "0.9.2342.19200300.100.1.25": "DC",
  "0.9.2342.19200300.100.1.1": "UID",
};

const SIG_NAMES: Record<string, string> = {
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption", "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption", "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.113549.1.1.4": "md5WithRSAEncryption", "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.2.840.10045.4.3.3": "ecdsa-with-SHA384", "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
  "1.3.101.112": "Ed25519", "1.3.101.113": "Ed448",
};

const KEY_NAMES: Record<string, string> = {
  "1.2.840.113549.1.1.1": "RSA", "1.2.840.10045.2.1": "ECDSA",
  "1.3.101.112": "Ed25519", "1.3.101.113": "Ed448",
};

const EXT_NAMES: Record<string, string> = {
  "2.5.29.17": "Subject Alternative Name", "2.5.29.19": "Basic Constraints", "2.5.29.15": "Key Usage",
  "2.5.29.14": "Subject Key Identifier", "2.5.29.35": "Authority Key Identifier",
  "2.5.29.37": "Extended Key Usage", "2.5.29.31": "CRL Distribution Points",
  "2.5.29.32": "Certificate Policies", "2.5.29.30": "Name Constraints", "2.5.29.18": "Issuer Alternative Name",
};

const EC_CURVE_BITS: Record<string, number> = {
  "1.2.840.10045.3.1.7": 256, "1.3.132.0.34": 384, "1.3.132.0.35": 521,
};

const KEY_USAGE_BITS = ["digitalSignature", "nonRepudiation", "keyEncipherment", "dataEncipherment", "keyAgreement", "keyCertSign", "cRLSign", "encipherOnly", "decipherOnly"];

function decodeStringValue(node: Asn1Node): string {
  try {
    // PrintableString, UTF8String, IA5String, TeletexString, BMPString
    if (node.tagNum === 30) {
      const v = node.value;
      let s = "";
      for (let i = 0; i + 1 < v.length; i += 2) s += String.fromCharCode((v![i]! << 8) | v![i + 1]!);
      return s;
    }
    return new TextDecoder().decode(node.value);
  } catch {
    return "";
  }
}

function parseName(nameNode: Asn1Node): { short: string; pairs: string[] } {
  const pairs: string[] = [];
  for (const rdn of nameNode.children) {
    for (const atv of rdn.children) {
      if (atv.children.length >= 2) {
        const oid = oidToString(atv!.children![0]!.value!);
        const label = OID_NAMES[oid] ?? oid;
        const val = decodeStringValue(atv!.children![1]!);
        pairs.push(`${label}=${val}`);
      }
    }
  }
  return { short: pairs.join(", ") || "(empty)", pairs };
}

function parseTime(node: Asn1Node): string {
  const s = new TextDecoder().decode(node.value);
  let year: number, rest: string;
  if (node.tagNum === 23) {
    const yy = parseInt(s.slice(0, 2), 10);
    year = yy >= 50 ? 1900 + yy : 2000 + yy;
    rest = s.slice(2);
  } else {
    year = parseInt(s.slice(0, 4), 10);
    rest = s.slice(4);
  }
  const mo = parseInt(rest.slice(0, 2), 10) - 1;
  const d = parseInt(rest.slice(2, 4), 10);
  const h = parseInt(rest.slice(4, 6), 10);
  const mi = parseInt(rest.slice(6, 8), 10);
  const se = parseInt(rest.slice(8, 10), 10) || 0;
  const dt = new Date(Date.UTC(year, mo, d, h, mi, se));
  return dt.toUTCString();
}

function parseSans(extValue: Uint8Array): string[] {
  const seq = parseDer(extValue);
  const out: string[] = [];
  for (const gn of seq.children) {
    if (gn.tagNum === 2 && gn.cls === 2) out.push(`DNS: ${new TextDecoder().decode(gn.value)}`);
    else if (gn.tagNum === 7 && gn.cls === 2) {
      out.push(gn.value.length === 4
        ? `IP: ${Array.from(gn.value).join(".")}`
        : `IP: ${Array.from(gn.value).map((b) => b.toString(16).padStart(2, "0")).join(":")}`);
    } else if (gn.tagNum === 1 && gn.cls === 2) out.push(`Email: ${new TextDecoder().decode(gn.value)}`);
    else if (gn.tagNum === 6 && gn.cls === 2) out.push(`URI: ${new TextDecoder().decode(gn.value)}`);
    else out.push(`Other[${gn.tagNum}]: ${new TextDecoder().decode(gn.value)}`);
  }
  return out;
}

function parseKeyUsage(extValue: Uint8Array): string {
  const { node } = parseNode(extValue, 0); // BIT STRING
  const unused = node.value[0] ?? 0;
  const bits = node.value.slice(1);
  const names: string[] = [];
  for (let i = 0; i < KEY_USAGE_BITS.length; i++) {
    const byte = bits[i >> 3] ?? 0;
    if (byte & (0x80 >> (i % 8))) names.push(KEY_USAGE_BITS![i]!);
  }
  void unused;
  return names.join(", ") || "(none)";
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64.replace(/\s/g, ""));
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ---------- certificate model ----------

interface CertInfo {
  kind: "certificate" | "csr";
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  daysLeft: number | null;
  sigAlg: string;
  keyAlg: string;
  keyBits: string;
  sans: string[];
  extensions: { name: string; detail: string }[];
  fingerprint: string;
}

function algOid(seq: Asn1Node): string {
  return seq.children.length > 0 ? oidToString(seq!.children![0]!.value!) : "";
}

function spkiInfo(spki: Asn1Node): { keyAlg: string; keyBits: string } {
  const oid = spki.children.length > 0 ? algOid(spki!.children![0]!) : "";
  const keyAlg = KEY_NAMES[oid] ?? oid;
  let keyBits = "";
  try {
    const bitStr = spki.children[1];
    const keyBytes = bitStr!.value.slice(1); // skip unused-bits byte
    if (oid === "1.2.840.113549.1.1.1") {
      const rsa = parseDer(keyBytes); // RSAPublicKey: modulus, exponent
      const modulus = rsa!.children![0]!.value!;
      let bits = modulus.length * 8;
      if (modulus[0] === 0) bits -= 8;
      let leading = 0;
      for (const b of modulus) {
        const lz = 8 - b.toString(2).length;
        if (lz === 8) leading += 8; else { leading += lz; break; }
      }
      keyBits = `${bits - leading} bit`;
    } else if (oid === "1.2.840.10045.2.1") {
      const params = spki!.children![0]!.children![1]!;
      const bits = EC_CURVE_BITS[oidToString(params!.value)];
      keyBits = bits ? `${bits} bit` : "EC key";
    } else if (oid === "1.3.101.112") keyBits = "256 bit";
  } catch { /* leave keyBits blank */ }
  return { keyAlg, keyBits };
}

async function decodePem(pem: string): Promise<CertInfo> {
  const m = pem.match(/-----BEGIN ([A-Z0-9 ]+)-----/);
  if (!m) throw new Error("No PEM header found. Paste a PEM block (-----BEGIN ...-----).");
  const label = m![1]!.trim();
  const isCsr = label.includes("CERTIFICATE REQUEST");
  if (!label.includes("CERTIFICATE")) throw new Error(`Unsupported PEM type "${label}". Paste a certificate or CSR.`);
  const body = pem.slice(pem.indexOf(m[0]) + m[0].length);
  const end = body.indexOf("-----END");
  if (end < 0) throw new Error("PEM footer missing.");
  const der = b64ToU8(body.slice(0, end));

  const fpBuf = await crypto.subtle.digest("SHA-256", der as BufferSource);
  const fingerprint = integerToHex(new Uint8Array(fpBuf));

  const root = parseDer(der);
  if (root.tagNum !== 16 || root.children.length < 3) throw new Error("Top-level structure is not a certificate or CSR.");

  const info: CertInfo = {
    kind: isCsr ? "csr" : "certificate",
    subject: "", issuer: "", serial: "", notBefore: "", notAfter: "",
    daysLeft: null, sigAlg: "", keyAlg: "", keyBits: "",
    sans: [], extensions: [], fingerprint,
  };

  if (isCsr) {
    const cri = root.children[0];
    info.sigAlg = SIG_NAMES[algOid(root!.children![1]!)] ?? algOid(root!.children![1]!);
    info.subject = parseName(cri!.children![1]!).short;
    info.issuer = "(CSR has no issuer - it is signed by the subject)";
    const { keyAlg, keyBits } = spkiInfo(cri!.children![2]!);
    info.keyAlg = keyAlg; info.keyBits = keyBits;
    info.serial = "(not assigned until the CA signs it)";
  } else {
    const tbs = root.children[0];
    info.sigAlg = SIG_NAMES[algOid(root!.children![1]!)] ?? algOid(root!.children![1]!);
    let i = 0;
    if (tbs!.children![i]!.cls! === 2 && tbs!.children![i]!.tagNum! === 0) i++; // [0] version
    info.serial = integerToHex(tbs!.children![i++]!.value!);
    i++; // signature
    info.issuer = parseName(tbs!.children![i++]!).short;
    const validity = tbs!.children[i++];
    info.notBefore = parseTime(validity!.children![0]!);
    info.notAfter = parseTime(validity!.children![1]!);
    const diff = new Date(info.notAfter).getTime() - Date.now();
    info.daysLeft = Math.floor(diff / 86_400_000);
    info.subject = parseName(tbs!.children![i++]!).short;
    const { keyAlg, keyBits } = spkiInfo(tbs!.children![i++]!);
    info.keyAlg = keyAlg; info.keyBits = keyBits;

    const extContainer = tbs!.children.find((c) => c.cls === 2 && c.tagNum === 3);
    const extSeq = extContainer?.children[0];
    if (extSeq) {
      for (const ext of extSeq.children) {
        const eOid = oidToString(ext!.children![0]!.value!);
        let k = 1;
        if (ext.children[1]?.tagNum === 1) k = 2; // BOOLEAN critical
        const eName = EXT_NAMES[eOid] ?? eOid;
        const eVal = ext!.children![k]!.value!; // OCTET STRING
        let detail = "";
        if (eOid === "2.5.29.17") {
          info.sans = parseSans(eVal);
          detail = info.sans.join(", ");
        } else if (eOid === "2.5.29.15") detail = parseKeyUsage(eVal);
        else if (eOid === "2.5.29.19") {
          const bc = parseDer(eVal);
          const parts: string[] = [];
          if (bc.children[0]?.tagNum === 1 && bc.children[0].value[0]) parts.push("CA: TRUE");
          if (bc.children[1]?.tagNum === 2) parts.push(`pathLen: ${parseInt(integerToHex(bc.children[1].value).replace(/:/g, ""), 16)}`);
          detail = parts.join(", ") || "CA: FALSE";
        } else if (eOid === "2.5.29.14") {
          const inner = parseDer(eVal); // inner OCTET STRING holds the key id
          detail = integerToHex(inner.children[0]?.value ?? inner.value);
        } else if (eOid === "2.5.29.35") {
          const inner = parseDer(eVal); // SEQUENCE with [0] keyIdentifier
          const keyId = inner.children.find((c) => c.cls === 2 && c.tagNum === 0);
          detail = keyId ? integerToHex(keyId.value) : "";
        }
        info.extensions.push({ name: eName, detail });
      }
    }
  }
  return info;
}

// ---------- UI ----------

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-2.5 last:border-0 sm:grid-cols-[190px_1fr] sm:gap-4">
      <dt className="text-[13px] font-semibold text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm break-all", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}

function CertTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("certificate-decoder", isPro);
  const seo = toolSeo;

  const [pem, setPem] = useState("");
  const [info, setInfo] = useState<CertInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decode = async () => {
    if (!trial.canUse || busy) return;
    if (!pem.trim()) { setError("Paste a PEM certificate or CSR first."); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await decodePem(pem);
      setInfo(res);
      trial.recordUse();
      toast.success("Certificate decoded");
    } catch (e) {
      setInfo(null);
      setError(e instanceof Error ? e.message : "Could not decode this input.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolPageShell toolId="certificate-decoder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Certificate Decoder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-foreground/80">PEM input</label>
            <textarea
              value={pem}
              onChange={(e) => setPem(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/60"
              placeholder={"-----BEGIN CERTIFICATE-----\nMIID…\n-----END CERTIFICATE-----\nor a -----BEGIN CERTIFICATE REQUEST----- block"}
            />
          </div>
          <ActionButton busy={busy} disabled={!pem.trim() || !trial.canUse} onClick={() => void decode()}>
            <ScanSearch className="h-4 w-4" /> {busy ? "Parsing…" : "Decode"}
          </ActionButton>
          {!isPro && (
            <p className="text-xs text-muted-foreground">
              {trial.left} of {TOOL_TRIAL_LIMIT} free runs left - everything stays in your browser.
            </p>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!info ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center text-center">
              <FileBadge className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Decoded fields appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Paste a PEM certificate or CSR to see subject, issuer, validity, SANs, serial and signature algorithm.
              </p>
            </div>
          ) : (
            <div>
              <h3 className="mb-1 font-bold">{info.kind === "csr" ? "Certificate Signing Request" : "X.509 Certificate"}</h3>
              <dl>
                <Row label="Subject" value={info.subject} mono />
                <Row label="Issuer" value={info.issuer} mono />
                {info.notBefore && <Row label="Not before" value={info.notBefore} />}
                {info.notAfter && (
                  <Row
                    label="Not after"
                    value={`${info.notAfter}${info.daysLeft !== null ? ` (${info.daysLeft < 0 ? "expired " + Math.abs(info.daysLeft) + " days ago" : info.daysLeft + " days left"})` : ""}`}
                  />
                )}
                <Row label="Serial number" value={info.serial} mono />
                <Row label="Signature algorithm" value={info.sigAlg} />
                <Row label="Public key" value={info.keyAlg + (info.keyBits ? `, ${info.keyBits}` : "")} />
                {info.sans.length > 0 && (
                  <div className="grid gap-1 border-b border-border/60 py-2.5 sm:grid-cols-[190px_1fr] sm:gap-4">
                    <dt className="text-[13px] font-semibold text-muted-foreground">Subject alt names</dt>
                    <dd>
                      <ul className="space-y-1">
                        {info.sans.map((s) => (
                          <li key={s} className="font-mono text-[13px] break-all">{s}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {info.extensions.length > 0 && (
                  <div className="grid gap-1 border-b border-border/60 py-2.5 sm:grid-cols-[190px_1fr] sm:gap-4">
                    <dt className="text-[13px] font-semibold text-muted-foreground">Extensions</dt>
                    <dd>
                      <ul className="space-y-1.5">
                        {info.extensions.map((e) => (
                          <li key={e.name} className="text-[13px]">
                            <span className="font-semibold">{e.name}</span>
                            {e.detail && <span className="text-muted-foreground"> - {e.detail}</span>}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                <Row label="SHA-256 fingerprint" value={info.fingerprint} mono />
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Parsed with a hand-written DER reader - the common fields above are decoded, including SANs, key usage
                and basic constraints. Exotic extensions are listed by name. This tool does not verify the signature
                chain or trust status.
              </p>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
