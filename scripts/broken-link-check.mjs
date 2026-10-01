// Broken internal link checker for IconVault.
// Run with: bun scripts/broken-link-check.mjs
// - Extracts every `to=` target from <Link> in src/ (including tools_* routes, read-only)
// - Also checks internal <a href="/..."> links and navigate({ to: "..." }) calls
// - Builds the set of valid route paths from src/routes filenames
//   (tools_.foo-bar.tsx -> /tools/foo-bar, tools.tsx -> /tools, index.tsx -> /,
//    [.] -> ., $param -> dynamic segment)
// - Also treats files under public/ as valid (e.g. /favicon.ico)
// - Reports any target that matches no route and no public file.
// External targets (http, mailto:, tel:) and pure fragments (#...) are skipped.

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const ROUTES_DIR = join(ROOT, "src", "routes");
const PUBLIC_DIR = join(ROOT, "public");

// ---------------------------------------------------------------- routes ---
function routeFileToPath(file) {
  // strip extension
  let p = file.replace(/\.(tsx?|ts)$/, "");
  // [.] -> .  (escaped dot)
  p = p.replace(/\[\.\]/g, ".");
  // split on literal dots into segments
  let segs = p.split(".");
  // handle tools_ prefix: tools_foo -> /tools/foo (underscore = path separator)
  const out = [];
  for (const s of segs) {
    if (s.startsWith("tools_")) {
      out.push("tools", s.slice("tools_".length));
    } else {
      out.push(s);
    }
  }
  segs = out.filter((s) => s.length > 0);
  if (segs.length === 0 || (segs.length === 1 && segs[0] === "index")) return "/";
  // drop trailing "index" (foo.index -> /foo)
  if (segs[segs.length - 1] === "index") segs.pop();
  return "/" + segs.join("/");
}

const routePaths = [];
for (const f of readdirSync(ROUTES_DIR)) {
  const full = join(ROUTES_DIR, f);
  if (!statSync(full).isFile()) continue;
  if (f === "README.md") continue;
  routePaths.push(routeFileToPath(f));
}

// route path -> regex (dynamic $param segments match one path segment)
function routeToRegex(routePath) {
  const parts = routePath.split("/").map((seg) => {
    if (seg.startsWith("$")) return "[^/]+";
    return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });
  return new RegExp("^" + parts.join("/") + "/?$");
}
const routeRegexes = routePaths.map(routeToRegex);

// ------------------------------------------------------------- public ------
const publicPaths = new Set();
function walkPublic(dir, base) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walkPublic(full, base + "/" + e);
    else publicPaths.add(base + "/" + e);
  }
}
if (existsSync(PUBLIC_DIR)) walkPublic(PUBLIC_DIR, "");

// ------------------------------------------------------- link extraction ----
function* tsxFiles(dir) {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const st = statSync(full);
    if (st.isDirectory()) yield* tsxFiles(full);
    else if (/\.(tsx?|jsx?)$/.test(e)) yield full;
  }
}

const SRC = join(ROOT, "src");
const findings = []; // { file, line, target, kind, via }

for (const file of tsxFiles(SRC)) {
  const rel = file.slice(ROOT.length + 1);
  const src = readFileSync(file, "utf8");

  // --- <Link to=...>
  const linkRe = /<Link\b([\s\S]*?)>/g;
  let m;
  while ((m = linkRe.exec(src))) {
    const attrs = m[1];
    const line = src.slice(0, m.index).split("\n").length;
    // to="..." | to={'...'} | to={`...`} | to={var}
    let target = null;
    let kind = null;
    let mm;
    if ((mm = attrs.match(/\bto\s*=\s*"([^"]*)"/))) {
      target = mm[1];
      kind = "string";
    } else if ((mm = attrs.match(/\bto\s*=\s*\{['"]([^'"]*)['"]\}/))) {
      target = mm[1];
      kind = "string";
    } else if ((mm = attrs.match(/\bto\s*=\s*\{`([^`]*)`\}/))) {
      target = mm[1].replace(/\$\{[^}]*\}/g, "*"); // template expr -> wildcard
      kind = "template";
    } else if ((mm = attrs.match(/\bto\s*=\s*\{([^}]*)\}/))) {
      target = mm[1].trim();
      kind = "dynamic";
    }
    if (target !== null)
      findings.push({ file: rel, line, target, kind, via: "Link" });
  }

  // --- <a href="/internal">
  const aRe = /<a\b([\s\S]*?)>/g;
  while ((m = aRe.exec(src))) {
    const attrs = m[1];
    const line = src.slice(0, m.index).split("\n").length;
    const mm = attrs.match(/\bhref\s*=\s*"([^"]*)"/);
    if (mm && mm[1].startsWith("/"))
      findings.push({ file: rel, line, target: mm[1], kind: "string", via: "a" });
  }

  // --- navigate({ to: "..." }) / navigate({ to: `...` })
  const navRe = /navigate\(\s*\{([^{}]*?)\}\s*\)/g;
  while ((m = navRe.exec(src))) {
    const attrs = m[1];
    const line = src.slice(0, m.index).split("\n").length;
    let mm;
    if ((mm = attrs.match(/\bto\s*:\s*"([^"]*)"/)))
      findings.push({ file: rel, line, target: mm[1], kind: "string", via: "navigate" });
    else if ((mm = attrs.match(/\bto\s*:\s*`([^`]*)`/)))
      findings.push({
        file: rel,
        line,
        target: mm[1].replace(/\$\{[^}]*\}/g, "*"),
        kind: "template",
        via: "navigate",
      });
  }
}

// ----------------------------------------------------------------- check ----
const SKIP = /^(https?:|mailto:|tel:|#)/i;
let dead = 0;
let skippedExternal = 0;
let skippedDynamic = 0;

for (const f of findings) {
  if (SKIP.test(f.target)) {
    skippedExternal++;
    continue;
  }
  if (f.kind === "dynamic") {
    skippedDynamic++;
    continue; // variable target, cannot resolve statically
  }
  // strip query + hash, trailing slash
  const t = f.target.split("?")[0].split("#")[0];
  const targetNorm = t.length > 1 ? t.replace(/\/+$/, "") : t;
  const matchesRoute =
    f.kind === "template"
      ? routeRegexes.some((rr) =>
          rr.test(targetNorm.replace(/\*/g, "placeholder-seg")),
        )
      : routeRegexes.some((rr) => rr.test(targetNorm));
  const matchesPublic = publicPaths.has(targetNorm);
  if (!matchesRoute && !matchesPublic) {
    dead++;
    console.log(
      `DEAD  ${f.file}:${f.line}  via=${f.via}  target=${JSON.stringify(f.target)}`,
    );
  }
}

console.log("---");
console.log(`routes: ${routePaths.length}, public files: ${publicPaths.size}`);
console.log(
  `links checked: ${findings.length} (external/fragment skipped: ${skippedExternal}, dynamic skipped: ${skippedDynamic})`,
);
console.log(dead === 0 ? "OK: zero dead internal links" : `DEAD LINKS: ${dead}`);
process.exit(dead === 0 ? 0 : 1);
