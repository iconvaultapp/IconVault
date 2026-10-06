import type { ToolSeo } from "../tool-seo";

const seo: ToolSeo = {
    title: "WASM Inspector - Free Online WebAssembly Tool | IconVault",
    metaDescription: "Upload a .wasm file to inspect its sections and read a WAT-style disassembly of the code. Free, private, runs in your browser.",
    about: [
      "**IconVault**'s **WASM Inspector** opens up any **WebAssembly (.wasm) binary** right in your browser. Upload a file and it lists every **section** (type, import, function, memory, export, code and custom sections) with sizes and offsets, then shows a simple **WAT-style disassembly** of the code section so you can read the actual instructions.",
      "The binary is parsed with a hand-written, in-browser parser: nothing is uploaded, nothing is executed, and the tool is **free** with no signup. It is a safe way to peek inside Rust, C++ or AssemblyScript builds."
    ],
    faqs: [
      { q: "What is a WASM file?", a: "WASM stands for WebAssembly, a binary format that runs at near-native speed in browsers and other runtimes. It is usually compiled from languages like Rust, C, C++ or AssemblyScript." },
      { q: "What can I inspect with this tool?", a: "The section list of the module, including imports, exports, functions, memories, tables, globals and custom sections, plus a WAT-style disassembly of function bodies." },
      { q: "Is this a decompiler?", a: "No. It disassembles the bytecode into readable instructions in WAT text format. It does not reconstruct the original source code." },
      { q: "Does it run the WASM module?", a: "No, it only parses and displays the binary. Nothing in the module is executed, so inspecting an untrusted file is safe." },
      { q: "Are my uploaded files sent anywhere?", a: "No. Files are parsed fully in your browser and never leave your device." },
      { q: "Is the WASM inspector free?", a: "Yes, free with no signup. Inspect as many .wasm files as you like." }
    ],
    tags: [
      "wasm inspector", "webassembly inspector", "wasm analyzer", "inspect wasm file",
      "wasm file viewer", "webassembly disassembler", "wasm disassembly online",
      "wat disassembler", "wasm to wat", "wasm sections viewer", "wasm module inspector",
      "webassembly binary parser", "analyze wasm binary", "wasm code section",
      "wasm imports exports viewer", "wasm function list", "online wasm tool",
      "free wasm analyzer", "wasm reverse engineering", "wasm binary format",
      "view wasm contents", "wasm file parser", "webassembly debugging tool",
      "wasm module structure", "wasm custom sections", "wasm type section",
      "wasm memory section", "wasm table section", "wasm global section",
      "upload wasm inspect", "wasm file online viewer", "webassembly developer tools",
      "wasm bytecode viewer", "wasm instruction list", "wasm opcodes viewer",
      "wasm text format converter", "wat style disassembly", "wasm internals explorer",
      "learn webassembly binary", "wasm section headers", "wasm magic number checker",
      "validate wasm file", "wasm file info", "webassembly module analyzer",
      "rust wasm inspector", "emscripten wasm viewer", "wasm size analyzer",
      "wasm export list",
      "wasm disassembler online", "webassembly section viewer",
      "inspect webassembly module", "wasm binary inspector free",
      "wasm file analyzer online"
    ],
  };

export default seo;
