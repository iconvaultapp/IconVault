// /tools/wasm-inspector - Upload a .wasm file and inspect its sections plus a
// simple WAT-style disassembly of the code section. Hand-written parser, in-browser.

import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import toolSeo from "@/lib/tool-seo-data/wasm-inspector";
import toolSeoMeta from "@/lib/tool-seo-meta-data/wasm-inspector";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/wasm-inspector")({
  head: () => {
    const seo = toolSeoMeta;
    const canonical = "https://iconvault.site/tools/wasm-inspector";
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
  component: WasmTool,
});

const SECTION_NAMES: Record<number, string> = {
  0: "custom", 1: "type", 2: "import", 3: "function", 4: "table",
  5: "memory", 6: "global", 7: "export", 8: "start", 9: "element",
  10: "code", 11: "data", 12: "data count",
};

interface SectionInfo {
  id: number;
  name: string;
  size: number;
  offset: number;
}

interface Instruction {
  offset: number;
  opcode: number;
  name: string;
  operands: string;
  unknown: boolean;
}

interface FuncInfo {
  index: number;
  locals: string;
  bodySize: number;
  instructions: Instruction[];
}

interface WasmReport {
  fileName: string;
  fileSize: number;
  version: number;
  sections: SectionInfo[];
  functions: FuncInfo[];
  truncated: boolean;
}

class Reader {
  data: Uint8Array;
  pos = 0;
  constructor(data: Uint8Array) { this.data = data; }
  get remaining() { return this.data.length - this.pos; }
  u8(): number {
    if (this.pos >= this.data.length) throw new Error("Unexpected end of file");
    return this.data[this.pos++]!;
  }
  u32(): number {
    let result = 0, shift = 0;
    for (let i = 0; i < 5; i++) {
      const b = this.u8();
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) return result >>> 0;
      shift += 7;
    }
    throw new Error("LEB128 too long");
  }
  s32(): number {
    let result = 0, shift = 0, b = 0;
    for (let i = 0; i < 5; i++) {
      b = this.u8();
      result |= (b & 0x7f) << shift;
      shift += 7;
      if ((b & 0x80) === 0) break;
    }
    if (shift < 32 && (b & 0x40)) result |= -(1 << shift);
    return result;
  }
  s64(): bigint {
    let result = 0n, shift = 0n, b = 0;
    for (let i = 0; i < 10; i++) {
      b = this.u8();
      result |= BigInt(b & 0x7f) << shift;
      shift += 7n;
      if ((b & 0x80) === 0) break;
    }
    if (shift < 64n && (b & 0x40)) result |= -(1n << shift);
    return result;
  }
  bytes(n: number): Uint8Array {
    if (this.pos + n > this.data.length) throw new Error("Unexpected end of file");
    const out = this.data.slice(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  str(): string {
    const len = this.u32();
    const bytes = this.bytes(len);
    return new TextDecoder().decode(bytes);
  }
}

// opcode -> [name, operandKind]  operandKind: 0 none, 1 u32, 2 s32, 3 i64, 4 f32, 5 f64, 6 memarg, 7 blocktype
const OPCODES: Record<number, [string, number]> = {
  0x00: ["unreachable", 0], 0x01: ["nop", 0],
  0x02: ["block", 7], 0x03: ["loop", 7], 0x04: ["if", 7], 0x05: ["else", 0],
  0x0b: ["end", 0], 0x0c: ["br", 1], 0x0d: ["br_if", 1], 0x0e: ["br_table", 8],
  0x0f: ["return", 0], 0x10: ["call", 1], 0x11: ["call_indirect", 9],
  0x1a: ["drop", 0], 0x1b: ["select", 0],
  0x20: ["local.get", 1], 0x21: ["local.set", 1], 0x22: ["local.tee", 1],
  0x23: ["global.get", 1], 0x24: ["global.set", 1],
  0x28: ["i32.load", 6], 0x29: ["i64.load", 6], 0x2a: ["f32.load", 6], 0x2b: ["f64.load", 6],
  0x2c: ["i32.load8_s", 6], 0x2d: ["i32.load8_u", 6], 0x2e: ["i32.load16_s", 6], 0x2f: ["i32.load16_u", 6],
  0x30: ["i64.load8_s", 6], 0x31: ["i64.load8_u", 6], 0x32: ["i64.load16_s", 6], 0x33: ["i64.load16_u", 6],
  0x34: ["i64.load32_s", 6], 0x35: ["i64.load32_u", 6],
  0x36: ["i32.store", 6], 0x37: ["i64.store", 6], 0x38: ["f32.store", 6], 0x39: ["f64.store", 6],
  0x3a: ["i32.store8", 6], 0x3b: ["i32.store16", 6], 0x3c: ["i64.store8", 6],
  0x3d: ["i64.store16", 6], 0x3e: ["i64.store32", 6],
  0x3f: ["memory.size", 0], 0x40: ["memory.grow", 0],
  0x41: ["i32.const", 2], 0x42: ["i64.const", 3], 0x43: ["f32.const", 4], 0x44: ["f64.const", 5],
  0x45: ["i32.eqz", 0], 0x46: ["i32.eq", 0], 0x47: ["i32.ne", 0],
  0x48: ["i32.lt_s", 0], 0x49: ["i32.lt_u", 0], 0x4a: ["i32.gt_s", 0],
  0x4b: ["i32.gt_u", 0], 0x4c: ["i32.le_s", 0], 0x4d: ["i32.le_u", 0],
  0x4e: ["i32.ge_s", 0], 0x4f: ["i32.ge_u", 0],
  0x50: ["i64.eqz", 0], 0x51: ["i64.eq", 0], 0x52: ["i64.ne", 0],
  0x53: ["i64.lt_s", 0], 0x54: ["i64.lt_u", 0], 0x55: ["i64.gt_s", 0],
  0x56: ["i64.gt_u", 0], 0x57: ["i64.le_s", 0], 0x58: ["i64.le_u", 0],
  0x59: ["i64.ge_s", 0], 0x5a: ["i64.ge_u", 0],
  0x5b: ["f32.eq", 0], 0x5c: ["f32.ne", 0], 0x5d: ["f32.lt", 0],
  0x5e: ["f32.gt", 0], 0x5f: ["f32.le", 0], 0x60: ["f32.ge", 0],
  0x61: ["f64.eq", 0], 0x62: ["f64.ne", 0], 0x63: ["f64.lt", 0],
  0x64: ["f64.gt", 0], 0x65: ["f64.le", 0], 0x66: ["f64.ge", 0],
  0x67: ["i32.clz", 0], 0x68: ["i32.ctz", 0], 0x69: ["i32.popcnt", 0],
  0x6a: ["i32.add", 0], 0x6b: ["i32.sub", 0], 0x6c: ["i32.mul", 0],
  0x6d: ["i32.div_s", 0], 0x6e: ["i32.div_u", 0], 0x6f: ["i32.rem_s", 0], 0x70: ["i32.rem_u", 0],
  0x71: ["i32.and", 0], 0x72: ["i32.or", 0], 0x73: ["i32.xor", 0],
  0x74: ["i32.shl", 0], 0x75: ["i32.shr_s", 0], 0x76: ["i32.shr_u", 0],
  0x77: ["i32.rotl", 0], 0x78: ["i32.rotr", 0],
  0x79: ["i64.clz", 0], 0x7a: ["i64.ctz", 0], 0x7b: ["i64.popcnt", 0],
  0x7c: ["i64.add", 0], 0x7d: ["i64.sub", 0], 0x7e: ["i64.mul", 0],
  0x7f: ["i64.div_s", 0], 0x80: ["i64.div_u", 0], 0x81: ["i64.rem_s", 0], 0x82: ["i64.rem_u", 0],
  0x83: ["i64.and", 0], 0x84: ["i64.or", 0], 0x85: ["i64.xor", 0],
  0x86: ["i64.shl", 0], 0x87: ["i64.shr_s", 0], 0x88: ["i64.shr_u", 0],
  0x89: ["i64.rotl", 0], 0x8a: ["i64.rotr", 0],
  0xa7: ["i32.wrap_i64", 0], 0xa8: ["i32.trunc_f32_s", 0], 0xa9: ["i32.trunc_f32_u", 0],
  0xaa: ["i32.trunc_f64_s", 0], 0xab: ["i32.trunc_f64_u", 0],
  0xac: ["i64.extend_i32_s", 0], 0xad: ["i64.extend_i32_u", 0],
  0xb2: ["f32.convert_i32_s", 0], 0xb3: ["f32.convert_i32_u", 0],
  0xb7: ["f64.convert_i32_s", 0], 0xb8: ["f64.convert_i32_u", 0],
  0xbb: ["f32.demote_f64", 0], 0xbc: ["f64.promote_f32", 0],
};

const VALUE_TYPES: Record<number, string> = { 0x7f: "i32", 0x7e: "i64", 0x7d: "f32", 0x7c: "f64", 0x70: "v128" };

function disassembleFunction(bytes: Uint8Array, baseOffset: number): { locals: string; instructions: Instruction[] } {
  const r = new Reader(bytes);
  const localCount = r.u32();
  const locals: string[] = [];
  for (let i = 0; i < localCount; i++) {
    const n = r.u32();
    const vt = r.u8();
    locals.push(`${n}x${VALUE_TYPES[vt] ?? `0x${vt.toString(16)}`}`);
  }
  const instructions: Instruction[] = [];
  const MAX_INSTR = 400;
  while (r.pos < bytes.length && instructions.length < MAX_INSTR) {
    const offset = baseOffset + r.pos;
    const opcode = r.u8();
    const entry = OPCODES[opcode];
    if (!entry) {
      instructions.push({ offset, opcode, name: "unknown", operands: "", unknown: true });
      break; // cannot safely continue past an unknown opcode
    }
    const [name, kind] = entry;
    let operands = "";
    try {
      if (kind === 1) operands = String(r.u32());
      else if (kind === 2) operands = String(r.s32());
      else if (kind === 3) operands = String(r.s64());
      else if (kind === 4) { const b = r.bytes(4); operands = String(new DataView(b.buffer, b.byteOffset, 4).getFloat32(0, true)); }
      else if (kind === 5) { const b = r.bytes(8); operands = String(new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, true)); }
      else if (kind === 6) { const align = r.u32(); const memOff = r.u32(); operands = `align=${align} offset=${memOff}`; }
      else if (kind === 7) { const bt = r.s32(); operands = bt === -64 ? "empty" : String(bt); }
      else if (kind === 8) { const n = r.u32(); const labels = Array.from({ length: n }, () => String(r.u32())); labels.push(String(r.u32())); operands = labels.join(", "); }
      else if (kind === 9) { const ti = r.u32(); const tbl = r.u32(); operands = `type=${ti} table=${tbl}`; }
    } catch {
      operands = "(truncated)";
    }
    instructions.push({ offset, opcode, name, operands, unknown: false });
    if (opcode === 0x0b && r.pos >= bytes.length) break;
  }
  return { locals: locals.join(", ") || "none", instructions };
}

function parseWasm(fileName: string, data: Uint8Array): WasmReport {
  const r = new Reader(data);
  const magic = Array.from(r.bytes(4));
  if (!(magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d)) {
    throw new Error("Not a WebAssembly binary: bad magic bytes.");
  }
  const version = new DataView(data.buffer, data.byteOffset, 8).getUint32(4, true);
  const sections: SectionInfo[] = [];
  let codeBytes: Uint8Array | null = null;
  while (r.pos < data.length) {
    const offset = r.pos;
    const id = r.u8();
    const size = r.u32();
    const start = r.pos;
    const name = SECTION_NAMES[id] ?? `unknown(${id})`;
    if (id === 0) {
      const customName = r.str();
      sections.push({ id, name: `custom "${customName}"`, size, offset });
    } else {
      sections.push({ id, name, size, offset });
      if (id === 10) codeBytes = r.bytes(size);
      else r.bytes(size);
    }
    // skip leftover (custom section name bytes already consumed)
    if (id === 0) r.pos = start + size;
  }
  const functions: FuncInfo[] = [];
  let truncated = false;
  if (codeBytes) {
    const cr = new Reader(codeBytes);
    const count = cr.u32();
    for (let i = 0; i < count; i++) {
      if (functions.length >= 60) { truncated = true; break; }
      const bodySize = cr.u32();
      const body = cr.bytes(bodySize);
      const { locals, instructions } = disassembleFunction(body, 0);
      functions.push({ index: i, locals, bodySize, instructions });
    }
  }
  return { fileName, fileSize: data.length, version, sections, functions, truncated };
}

function WasmTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("wasm-inspector", isPro);
  const seo = toolSeo;

  const [report, setReport] = useState<WasmReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeFunc, setActiveFunc] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = async (f: File) => {
    if (busy || !trial.canUse) return;
    setBusy(true);
    setError(null);
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const rep = parseWasm(f.name, buf);
      setReport(rep);
      setActiveFunc(0);
      toast.success(`Parsed ${rep.sections.length} sections`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse that file.");
    } finally {
      setBusy(false);
    }
  };

  const copyReport = async () => {
    if (!report || !trial.canUse) return;
    const lines: string[] = [
      `WASM report: ${report.fileName}`,
      `size: ${report.fileSize} bytes, version: ${report.version}`,
      "",
      "Sections:",
      ...report.sections.map((s) => `  [${s.id}] ${s.name} - ${s.size} bytes @ 0x${s.offset.toString(16)}`),
      "",
      `Code section: ${report.functions.length} function(s)${report.truncated ? " (truncated)" : ""}`,
    ];
    for (const fn of report.functions) {
      lines.push("", `func ${fn.index} (locals: ${fn.locals}):`);
      for (const ins of fn.instructions) {
        lines.push(
          `  0x${ins.offset.toString(16).padStart(4, "0")}  ${ins.name}${ins.operands ? " " + ins.operands : ""}${ins.unknown ? " (unknown opcode, disassembly stopped)" : ""}`,
        );
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      trial.recordUse();
      toast.success("Report copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  };

  const func = report?.functions[activeFunc];

  return (
    <ToolPageShell toolId="wasm-inspector" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="WASM Inspector" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void acceptFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
            )}
          >
            <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-semibold">{report?.fileName ?? "Drop a .wasm file"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Parsed entirely in your browser</p>
            <input
              ref={inputRef}
              type="file"
              accept=".wasm,application/wasm"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void acceptFile(f); }}
            />
          </div>

          {busy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
            </p>
          )}

          {report && (
            <>
              <div className="space-y-1.5">
                <p className="text-[13px] font-bold uppercase tracking-wide text-foreground/70">Sections</p>
                {report.sections.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 font-mono text-xs">
                    <span className="font-bold text-primary">[{s.id}] {s.name}</span>
                    <span className="text-muted-foreground">{s.size} B</span>
                  </div>
                ))}
              </div>
              <ActionButton disabled={!trial.canUse} onClick={copyReport}>
                <Copy className="h-4 w-4" /> Copy report
              </ActionButton>
              {!isPro && (
                <p className="text-xs text-muted-foreground">
                  {trial.left} of {TOOL_TRIAL_LIMIT} free report copies left.
                </p>
              )}
            </>
          )}
          {error && <p className="text-sm font-medium text-red-500">{error}</p>}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {!report ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <FileUp className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Upload a .wasm file to inspect it</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                You will see the magic, version, every section with its size, and a simple disassembly of the code section.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline gap-x-4 text-sm">
                <p className="font-bold">{report.fileName}</p>
                <p className="text-muted-foreground">
                  {(report.fileSize / 1024).toFixed(1)} KB · version {report.version} · {report.sections.length} sections
                </p>
              </div>
              {report.functions.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {report.functions.map((f) => (
                      <button
                        key={f.index}
                        type="button"
                        onClick={() => setActiveFunc(f.index)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 font-mono text-xs font-bold transition",
                          activeFunc === f.index ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/70 hover:bg-primary/10",
                        )}
                      >
                        fn {f.index}
                      </button>
                    ))}
                  </div>
                  {func && (
                    <div>
                      <p className="mb-2 font-mono text-xs text-muted-foreground">
                        func {func.index} · body {func.bodySize} bytes · locals: {func.locals}
                        {report.truncated && " · list truncated at 60 functions"}
                      </p>
                      <pre className="max-h-[420px] overflow-auto rounded-xl border border-border bg-background p-4 font-mono text-[12px] leading-relaxed">
                        {func.instructions.map((ins, i) => (
                          <div key={i} className={cn("flex gap-3", ins.unknown && "text-red-500")}>
                            <span className="w-16 shrink-0 text-muted-foreground">
                              0x{ins.offset.toString(16).padStart(4, "0")}
                            </span>
                            <span className="font-bold text-primary">{ins.name}</span>
                            <span className="text-foreground/80">{ins.operands}</span>
                          </div>
                        ))}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  No code section found (this file has no function bodies to disassemble).
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
