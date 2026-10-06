// /tools/websocket-frame-inspector - Build raw WebSocket frames byte by
// byte (RFC 6455) and decode hex frames back into their fields.
// 100% client-side; nothing is uploaded.

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/websocket-frame-inspector";
import toolSeoMeta from "@/lib/tool-seo-meta-data/websocket-frame-inspector";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/tools_/websocket-frame-inspector")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/websocket-frame-inspector";
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
  component: WsFrameInspectorTool,
});

const OPCODES = [
  { id: "0x0", label: "Continuation (0x0)" },
  { id: "0x1", label: "Text (0x1)" },
  { id: "0x2", label: "Binary (0x2)" },
  { id: "0x8", label: "Close (0x8)" },
  { id: "0x9", label: "Ping (0x9)" },
  { id: "0xA", label: "Pong (0xA)" },
] as const;

const OPCODE_NAMES: Record<number, string> = {
  0x0: "Continuation",
  0x1: "Text",
  0x2: "Binary",
  0x8: "Close",
  0x9: "Ping",
  0xa: "Pong",
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" ");

function parseHexInput(raw: string): Uint8Array {
  const cleaned = raw.trim().replace(/^(0x)/i, "").replace(/[\s,;:\-_]/g, "");
  if (!cleaned) throw new Error("Paste hex bytes first.");
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) throw new Error("Hex may only contain 0-9 and A-F.");
  if (cleaned.length % 2 !== 0) throw new Error("Hex must have an even number of digits (two per byte).");
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function buildFrame(opcode: number, fin: boolean, masked: boolean, maskKey: Uint8Array, payload: Uint8Array): Uint8Array {
  const isControl = opcode >= 0x8;
  if (isControl && payload.length > 125) {
    throw new Error("Control frames (close, ping, pong) may carry at most 125 payload bytes per RFC 6455.");
  }
  if (!fin && isControl) throw new Error("Control frames must not be fragmented, keep FIN on for close, ping and pong.");
  const header: number[] = [(fin ? 0x80 : 0x00) | opcode];
  let lenByte = masked ? 0x80 : 0x00;
  const ext: number[] = [];
  if (payload.length < 126) {
    lenByte |= payload.length;
  } else if (payload.length < 65536) {
    lenByte |= 126;
    ext.push((payload.length >> 8) & 0xff, payload.length & 0xff);
  } else {
    lenByte |= 127;
    const hi = Math.floor(payload.length / 4294967296);
    const lo = payload.length >>> 0;
    ext.push((hi >> 24) & 0xff, (hi >> 16) & 0xff, (hi >> 8) & 0xff, hi & 0xff, (lo >> 24) & 0xff, (lo >> 16) & 0xff, (lo >> 8) & 0xff, lo & 0xff);
  }
  header.push(lenByte, ...ext);
  const out = new Uint8Array(header.length + (masked ? 4 : 0) + payload.length);
  out.set(header, 0);
  let off = header.length;
  if (masked) {
    out.set(maskKey, off);
    off += 4;
    for (let i = 0; i < payload.length; i++) out[off + i] = (payload[i] as number) ^ (maskKey[i % 4] as number);
  } else {
    out.set(payload, off);
  }
  return out;
}

interface Decoded {
  fin: boolean;
  opcode: number;
  opcodeName: string;
  masked: boolean;
  payloadLength: number;
  headerBytes: number;
  maskKey: string | null;
  payloadText: string;
  payloadHex: string;
  binary: boolean;
}

function decodeFrame(bytes: Uint8Array): Decoded {
  if (bytes.length < 2) throw new Error("A frame needs at least 2 bytes.");
  const b0 = bytes[0] as number;
  const b1 = bytes[1] as number;
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let payloadLength = b1 & 0x7f;
  let off = 2;
  if (payloadLength === 126) {
    if (bytes.length < 4) throw new Error("Frame is truncated: 16-bit length needs 2 more bytes.");
    payloadLength = ((bytes[2] as number) << 8) | (bytes[3] as number);
    off = 4;
  } else if (payloadLength === 127) {
    if (bytes.length < 10) throw new Error("Frame is truncated: 64-bit length needs 8 more bytes.");
    const hi = ((bytes[2] as number) * 16777216 + (bytes[3] as number) * 65536 + (bytes[4] as number) * 256 + (bytes[5] as number));
    const lo = ((bytes[6] as number) * 16777216 + (bytes[7] as number) * 65536 + (bytes[8] as number) * 256 + (bytes[9] as number));
    const total = hi * 4294967296 + lo;
    if (!Number.isSafeInteger(total)) throw new Error("Payload length exceeds safe integer range.");
    payloadLength = total;
    off = 10;
  }
  let maskKey: Uint8Array | null = null;
  if (masked) {
    if (bytes.length < off + 4) throw new Error("Frame is truncated: mask key needs 4 bytes.");
    maskKey = bytes.slice(off, off + 4);
    off += 4;
  }
  if (bytes.length < off + payloadLength) {
    throw new Error(`Frame is truncated: payload says ${payloadLength} bytes but only ${bytes.length - off} remain.`);
  }
  const payload = bytes.slice(off, off + payloadLength);
  if (maskKey) {
    for (let i = 0; i < payload.length; i++) payload[i] = (payload[i] as number) ^ (maskKey[i % 4] as number);
  }
  let payloadText = "";
  let binary = false;
  if (opcode === 0x1 || opcode === 0x8) {
    try {
      payloadText = new TextDecoder("utf-8", { fatal: true }).decode(payload);
    } catch {
      binary = true;
    }
  } else {
    binary = true;
  }
  return {
    fin,
    opcode,
    opcodeName: OPCODE_NAMES[opcode] ?? `Reserved (0x${opcode.toString(16)})`,
    masked,
    payloadLength,
    headerBytes: off,
    maskKey: maskKey ? toHex(maskKey) : null,
    payloadText,
    payloadHex: toHex(payload),
    binary,
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function WsFrameInspectorTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("websocket-frame-inspector", isPro);
  const seo = toolSeo;

  const [opcode, setOpcode] = useState("0x1");
  const [fin, setFin] = useState(true);
  const [masked, setMasked] = useState(true);
  const [maskHex, setMaskHex] = useState("37fa213d");
  const [payload, setPayload] = useState("Hello");
  const [built, setBuilt] = useState<string | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  const [hexInput, setHexInput] = useState("");
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const doBuild = () => {
    if (!trial.canUse) return;
    setBuildError(null);
    try {
      const key = maskHex.replace(/[\s]/g, "");
      if (!/^[0-9a-fA-F]{8}$/.test(key)) throw new Error("Mask key must be exactly 8 hex digits (4 bytes).");
      const maskKey = new Uint8Array([0, 1, 2, 3].map((i) => parseInt(key.slice(i * 2, i * 2 + 2), 16)));
      const bytes = new TextEncoder().encode(payload);
      const frame = buildFrame(parseInt(opcode, 16), fin, masked, maskKey, bytes);
      setBuilt(toHex(frame));
      trial.recordUse();
      toast.success("Frame built.");
    } catch (e) {
      setBuilt(null);
      setBuildError(e instanceof Error ? e.message : "Could not build the frame.");
    }
  };

  const doDecode = () => {
    if (!trial.canUse) return;
    setDecodeError(null);
    try {
      const bytes = parseHexInput(hexInput);
      setDecoded(decodeFrame(bytes));
      trial.recordUse();
      toast.success("Frame decoded.");
    } catch (e) {
      setDecoded(null);
      setDecodeError(e instanceof Error ? e.message : "Could not decode those bytes.");
    }
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyToClipboard(text);
    if (ok) toast.success(`${label} copied.`);
    else toast.error("Could not copy to clipboard.");
  };

  const opcodeNum = parseInt(opcode, 16);

  return (
    <ToolPageShell toolId="websocket-frame-inspector" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WebSocket Frames" left={trial.left} />

      <Tabs defaultValue="build">
        <TabsList>
          <TabsTrigger value="build">Build frame</TabsTrigger>
          <TabsTrigger value="decode">Decode frame</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="pt-4">
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
              <div>
                <Label className="mb-2 block text-[13px] font-medium text-foreground/80">Opcode</Label>
                <Select value={opcode} onValueChange={setOpcode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OPCODES.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">FIN (final fragment)</Label>
                <Switch checked={fin} onCheckedChange={setFin} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Masked</Label>
                  <p className="text-xs text-muted-foreground">Client frames must be masked per RFC 6455.</p>
                </div>
                <Switch checked={masked} onCheckedChange={setMasked} />
              </div>

              {masked && (
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Mask key (8 hex digits)</Label>
                  <Input value={maskHex} onChange={(e) => setMaskHex(e.target.value)} spellCheck={false} className="font-mono" maxLength={8} />
                </div>
              )}

              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Payload (UTF-8 text)</Label>
                <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={3} spellCheck={false} />
              </div>

              <ActionButton busy={false} disabled={!trial.canUse} onClick={doBuild}>
                <Zap className="h-4 w-4" /> Build frame
              </ActionButton>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - runs fully in your browser, nothing is uploaded.
                </p>
              )}
              {buildError && <p className="text-sm font-medium text-red-500">{buildError}</p>}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[13px] font-medium text-foreground/80">Frame bytes (hex)</p>
                {built && (
                  <button
                    type="button"
                    onClick={() => copy(built.replace(/ /g, ""), "Hex frame")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                )}
              </div>
              {built ? (
                <div>
                  <pre className="break-all rounded-xl bg-muted p-4 font-mono text-[13px] leading-relaxed">{built}</pre>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {built.split(" ").length} bytes total: FIN={fin ? 1 : 0}, opcode 0x{opcodeNum.toString(16).toUpperCase()},
                    mask={masked ? 1 : 0}, payload {new TextEncoder().encode(payload).length} bytes.
                  </p>
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                  <p className="font-semibold">Your frame appears here</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Byte 0 carries FIN + opcode, byte 1 carries the mask bit + length, then the optional mask key and payload.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="decode" className="pt-4">
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-foreground/80">Frame bytes (hex)</Label>
                <Textarea
                  value={hexInput}
                  onChange={(e) => setHexInput(e.target.value)}
                  rows={5}
                  spellCheck={false}
                  className="font-mono text-[13px]"
                  placeholder="81 85 37 fa 21 3d 7f 9f 4d 51 58"
                />
              </div>
              <ActionButton busy={false} disabled={!trial.canUse || !hexInput.trim()} onClick={doDecode}>
                <Zap className="h-4 w-4" /> Decode frame
              </ActionButton>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free uses left - runs fully in your browser, nothing is uploaded.
                </p>
              )}
              {decodeError && <p className="text-sm font-medium text-red-500">{decodeError}</p>}
              <p className="text-xs text-muted-foreground">
                Tip: build a frame on the other tab, copy its hex and paste it here to see the round trip.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-3 text-[13px] font-medium text-foreground/80">Decoded fields</p>
              {!decoded ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                  <p className="font-semibold">Decoded fields appear here</p>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    FIN, opcode, mask flag, payload length and the decoded payload.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { label: "FIN", value: decoded.fin ? "1 (final)" : "0 (fragment)" },
                      { label: "Opcode", value: `${decoded.opcodeName} (0x${decoded.opcode.toString(16).toUpperCase()})` },
                      { label: "Masked", value: decoded.masked ? "yes" : "no" },
                      { label: "Payload length", value: String(decoded.payloadLength) },
                      { label: "Header bytes", value: String(decoded.headerBytes) },
                      { label: "Mask key", value: decoded.maskKey ?? "(none)" },
                    ].map((f) => (
                      <div key={f.label} className="rounded-xl bg-muted p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</p>
                        <p className="mt-0.5 break-all font-mono text-sm font-semibold">{f.value}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 text-[13px] font-medium text-foreground/80">Payload</p>
                    <pre className={cn(
                      "max-h-48 overflow-auto break-all rounded-xl bg-muted p-4 font-mono text-[13px] leading-relaxed",
                      decoded.binary && "text-muted-foreground",
                    )}>
                      {decoded.binary ? decoded.payloadHex : decoded.payloadText || "(empty)"}
                    </pre>
                    {decoded.binary && (
                      <p className="mt-1.5 text-xs text-muted-foreground">Binary payload shown as hex.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-sm font-semibold">RFC 6455 note</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          WebSocket frames start with a 2 byte header: FIN bit + 4 bit opcode, then the mask bit + 7 bit length
          (126 means a 16 bit length follows, 127 means a 64 bit length follows). Frames sent by clients must be
          masked with a 4 byte key; server frames are not masked. Control frames (close, ping, pong) are always
          final and carry at most 125 payload bytes. This tool builds and decodes exactly that layout.
        </p>
      </div>
    </ToolPageShell>
  );
}
