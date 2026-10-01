#!/usr/bin/env node
/**
 * iconvault - search and download icons from the IconVault library.
 *
 * Only Node built-ins are used (fetch is global since Node 18), so there is
 * nothing to install besides the package itself.
 *
 *   iconvault search <query> [--limit N] [--api URL]
 *   iconvault add <prefix:name> [--out ./icons] [--api URL]
 *   iconvault --help | --version
 *
 * Env:
 *   ICONVAULT_API   base URL, default https://iconvault.site (same as --api)
 *   ICONVAULT_KEY   API key, sent as x-api-key (avoids per-minute IP limits)
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let VERSION = "0.0.0";
try {
  VERSION = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version ?? VERSION;
} catch {
  // version stays unknown; --version still prints something honest
}

const DEFAULT_API = "https://iconvault.site";

const die = (message, code = 1) => {
  process.stderr.write(`iconvault: ${message}\n`);
  process.exit(code);
};

const help = () => {
  process.stdout.write(`iconvault v${VERSION} - icons without leaving the terminal

Usage:
  iconvault search <query> [--limit N] [--api URL]
      Search the IconVault library. Prints one prefix:name per line.

  iconvault add <prefix:name> [--out ./icons] [--api URL]
      Download one icon as an optimised SVG into the output directory.

  iconvault --help | --version

Options:
  --limit N   results for search (default 20, max 999)
  --out DIR   output directory for add (default ./icons)
  --api URL   API base URL (default https://iconvault.site)

Environment:
  ICONVAULT_API   same as --api
  ICONVAULT_KEY   API key, sent as the x-api-key header

Examples:
  iconvault search "shopping cart"
  iconvault search arrow --limit 5
  iconvault add mdi:cart
  iconvault add lucide:heart --out ./src/icons
`);
};

const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { command: "help", positional, flags };
    if (a === "--version" || a === "-v" || a === "-V") return { command: "version", positional, flags };
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { command: positional[0], positional: positional.slice(1), flags };
};

const apiBase = (flags) => {
  const raw = flags.api ?? process.env.ICONVAULT_API ?? DEFAULT_API;
  return String(raw).replace(/\/+$/, "");
};

const apiHeaders = () => {
  const headers = { Accept: "application/json" };
  if (process.env.ICONVAULT_KEY) headers["x-api-key"] = process.env.ICONVAULT_KEY;
  return headers;
};

const failForStatus = (res, what) => {
  if (res.status === 401) die("API key rejected (401). Check ICONVAULT_KEY.");
  if (res.status === 429) die("Rate limited (429). Slow down or set ICONVAULT_KEY.");
  die(`${what} failed with HTTP ${res.status}.`);
};

const checkOk = async (res, what) => {
  if (!res.ok) failForStatus(res, what);
};

const cmdSearch = async (positional, flags) => {
  const query = positional.join(" ").trim();
  if (!query) die("missing <query>. Example: iconvault search \"shopping cart\"");
  const limitRaw = Number(flags.limit ?? 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(999, Math.max(1, Math.floor(limitRaw))) : 20;
  const url = `${apiBase(flags)}/api/iconify/search?query=${encodeURIComponent(query)}&limit=${limit}`;
  let res;
  try {
    res = await fetch(url, { headers: apiHeaders() });
  } catch (err) {
    die(`could not reach ${apiBase(flags)} (${err.message}).`);
  }
  await checkOk(res, "search");
  let data;
  try {
    data = await res.json();
  } catch {
    die("search returned invalid JSON.");
  }
  const icons = Array.isArray(data.icons) ? data.icons : [];
  for (const id of icons) process.stdout.write(`${id}\n`);
  if (icons.length === 0) {
    process.stderr.write(`no icons found for "${query}".\n`);
  } else if (typeof data.total === "number" && data.total > icons.length) {
    process.stderr.write(`${icons.length} of ${data.total} shown. Use --limit to see more.\n`);
  }
};

const ICON_ID = /^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/i;

const cmdAdd = async (positional, flags) => {
  const ids = positional.map((s) => String(s).trim()).filter(Boolean);
  if (ids.length === 0) die("missing <prefix:name>. Example: iconvault add mdi:cart");
  for (const id of ids) {
    if (!ICON_ID.test(id)) die(`"${id}" is not a valid icon id. Expected prefix:name, e.g. mdi:cart`);
  }
  const outDir = resolve(process.cwd(), String(flags.out ?? "./icons"));
  mkdirSync(outDir, { recursive: true });
  const base = apiBase(flags);
  let failed = false;
  for (const id of ids) {
    const [prefix, name] = id.split(":");
    const url = `${base}/api/icon/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`;
    let res;
    try {
      res = await fetch(url, { headers: { Accept: "image/svg+xml" } });
    } catch (err) {
      process.stderr.write(`iconvault: could not reach ${base} (${err.message}).\n`);
      failed = true;
      continue;
    }
    if (res.status === 404 || res.status === 502) {
      process.stderr.write(`iconvault: icon "${id}" not found.\n`);
      failed = true;
      continue;
    }
    if (!res.ok) {
      if (res.status === 401) process.stderr.write("iconvault: API key rejected (401). Check ICONVAULT_KEY.\n");
      else if (res.status === 429) process.stderr.write("iconvault: rate limited (429). Slow down or set ICONVAULT_KEY.\n");
      else process.stderr.write(`iconvault: download of ${id} failed with HTTP ${res.status}.\n`);
      failed = true;
      continue;
    }
    const svg = (await res.text()).trim();
    if (!svg.startsWith("<svg")) {
      process.stderr.write(`iconvault: download of ${id} did not return SVG.\n`);
      failed = true;
      continue;
    }
    const fileName = `${prefix}-${name}.svg`;
    const filePath = join(outDir, fileName);
    writeFileSync(filePath, svg + "\n", "utf8");
    const kb = (Buffer.byteLength(svg, "utf8") / 1024).toFixed(1);
    process.stdout.write(`saved ${filePath} (${kb} kB)\n`);
  }
  if (failed) process.exit(1);
};

const main = async () => {
  const { command, positional, flags } = parseArgs(process.argv.slice(2));
  if (command === "help" || command === undefined) {
    help();
    process.exit(command === undefined ? 1 : 0);
  }
  if (command === "version") {
    process.stdout.write(`iconvault v${VERSION}\n`);
    return;
  }
  if (command === "search") return cmdSearch(positional, flags);
  if (command === "add") return cmdAdd(positional, flags);
  die(`unknown command "${command}". Run iconvault --help.`);
};

main().catch((err) => die(err.message ?? String(err)));
