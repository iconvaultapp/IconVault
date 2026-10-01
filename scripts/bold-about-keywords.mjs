// Adds **bold** markers around SEO keywords inside tool-seo.ts `about`
// paragraphs. Keywords come from each tool's title words + top tags.
// Run: bun scripts/bold-about-keywords.mjs (skips paragraphs that already
// contain ** markers, so it is safe to re-run)
import { readFileSync, writeFileSync } from "node:fs";

const FILE = new URL("../src/lib/tool-seo.ts", import.meta.url);

const STOP = new Set(
  "the and for with from that this your you its are was were has have had will would can could should all any our out more most than then them they their there these those what when where which while who whom also just like many such only other some each every both few between through during before after above below down into over again once here how why not no is it in on at by of to a an as be been being do does did done if or but so because until via vs get gets getting without within across among along behind plus app web new top".split(
    " ",
  ),
);

const titleWords = (title) =>
  title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

function tagKeywords(tags) {
  const out = [];
  for (const t of tags.slice(0, 14)) {
    const low = t.toLowerCase().trim();
    const words = low.split(/[^a-z0-9]+/).filter(Boolean);
    if (words.length >= 2 && words.length <= 4 && low.length <= 28) out.push(low);
    for (const w of words) if (w.length > 3 && !STOP.has(w)) out.push(w);
  }
  return out;
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function boldify(raw, keywords) {
  if (raw.includes("**")) return raw;
  const uniq = [...new Set(keywords)].sort((a, b) => b.length - a.length);
  if (!uniq.length) return raw;
  const re = new RegExp(`(?<!\\w)(${uniq.map(esc).join("|")})(?!\\w)`, "gi");
  return raw.replace(re, (mm) => `**${mm}**`);
}

let text = readFileSync(FILE, "utf8");

// collect edits first (end -> start application so offsets stay valid)
const edits = []; // {start, end, raw, toolKey}
const aboutRe = /about:\s*\[/g;
let m;
while ((m = aboutRe.exec(text))) {
  const before = text.slice(0, m.index);
  let toolKey = null;
  const idx = before.lastIndexOf('": {');
  if (idx > 0) {
    const q = before.lastIndexOf('"', idx - 1);
    toolKey = before.slice(q + 1, idx);
  }
  let i = aboutRe.lastIndex;
  const n = text.length;
  while (i < n && /[\s,]/.test(text[i])) i++;
  while (i < n && text[i] === '"') {
    const start = i;
    i++;
    let raw = "";
    while (i < n) {
      if (text[i] === "\\") {
        raw += text[i] + text[i + 1];
        i += 2;
        continue;
      }
      if (text[i] === '"') break;
      raw += text[i];
      i++;
    }
    edits.push({ start, end: i, raw, toolKey });
    i++;
    while (i < n && /[\s,]/.test(text[i])) i++;
    if (text[i] === "]") break;
  }
}

// group edits per tool to build keyword lists
const byTool = new Map();
for (const e of edits) {
  if (!byTool.has(e.toolKey)) byTool.set(e.toolKey, []);
  byTool.get(e.toolKey).push(e);
}

let changed = 0;
const applied = [];
for (const [toolKey, lits] of byTool) {
  // title: first title:"..." after the tool key
  const keyIdx = text.indexOf(`"${toolKey}": {`);
  const titleM = text.slice(keyIdx, keyIdx + 4000).match(/title:\s*"((?:[^"\\]|\\.)*)"/);
  const title = titleM ? titleM[1] : toolKey || "";
  // tags: first tags: [ ... ] after the key
  const tagsIdx = text.indexOf("tags:", keyIdx);
  const tags = [];
  if (tagsIdx > 0) {
    let j = text.indexOf("[", tagsIdx) + 1;
    let depth = 0;
    let inStr = false;
    let cur = "";
    while (j < text.length) {
      const c = text[j];
      if (inStr) {
        if (c === "\\") {
          cur += c + text[j + 1];
          j += 2;
          continue;
        }
        if (c === '"') {
          inStr = false;
          tags.push(cur);
          cur = "";
        } else cur += c;
      } else if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]") {
        if (depth === 0) break;
        depth--;
      }
      j++;
    }
  }
  const keywords = [...titleWords(title), ...tagKeywords(tags)];
  for (const lit of lits) {
    const out = boldify(lit.raw, keywords);
    if (out !== lit.raw) {
      applied.push({ start: lit.start + 1, end: lit.end, out });
      changed++;
    }
  }
}

applied.sort((a, b) => b.start - a.start);
for (const a of applied) text = text.slice(0, a.start) + a.out + text.slice(a.end);
writeFileSync(FILE, text);
console.log(`done. paragraphs updated: ${changed} across ${byTool.size} tools`);
