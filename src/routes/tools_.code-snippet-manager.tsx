// /tools/code-snippet-manager - Save, search and organize reusable code
// snippets with syntax highlighting. Stored in your browser's localStorage.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search, Copy, Pencil, Trash2, Download, Upload, X, Tag, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "highlight.js/styles/github-dark.css";

export const Route = createFileRoute("/tools_/code-snippet-manager")({
  head: () => {
    const seo = getToolSeoMeta("code-snippet-manager");
    const canonical = "https://iconvault.site/tools/code-snippet-manager";
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
  component: SnippetManagerTool,
});

const STORAGE_KEY = "iconvault.snippets.v1";

const LANGUAGES = [
  "javascript", "typescript", "python", "html", "css", "json", "bash",
  "sql", "java", "go", "rust", "php", "ruby", "csharp", "yaml", "markdown", "plaintext",
] as const;

type Snippet = {
  id: string;
  title: string;
  language: string;
  code: string;
  tags: string[];
  updated: number;
};

function loadSnippets(): Snippet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Snippet[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

let hljsPromise: Promise<any> | null = null;
function getHljs(): Promise<any> {
  if (!hljsPromise) hljsPromise = import("highlight.js").then((m: any) => m.default ?? m);
  return hljsPromise;
}

function Highlighted({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getHljs().then((hljs) => {
      if (!alive) return;
      try {
        const lang = hljs.getLanguage(language) ? language : "plaintext";
        setHtml(hljs.highlight(code, { language: lang }).value);
      } catch {
        setHtml(null);
      }
    });
    return () => { alive = false; };
  }, [code, language]);
  if (html === null) {
    return <pre className="overflow-auto rounded-xl bg-[#0d1117] p-4 font-mono text-[13px] leading-relaxed text-slate-200"><code>{code}</code></pre>;
  }
  return (
    <pre className="overflow-auto rounded-xl bg-[#0d1117] p-4 font-mono text-[13px] leading-relaxed">
      <code className="hljs" dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}

const emptyForm = { title: "", language: "javascript", code: "", tags: "" };

function SnippetManagerTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("code-snippet-manager", isPro);
  const seo = getToolSeo("code-snippet-manager");

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSnippets(loadSnippets()); }, []);

  const persist = useCallback((next: Snippet[]) => {
    setSnippets(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      toast.error("Browser storage is full. Delete some snippets first.");
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...snippets].sort((a, b) => b.updated - a.updated);
    if (!q) return list;
    return list.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [snippets, query]);

  const selected = snippets.find((s) => s.id === selectedId) ?? filtered[0] ?? null;

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (s: Snippet) => {
    setEditingId(s.id);
    setForm({ title: s.title, language: s.language, code: s.code, tags: s.tags.join(", ") });
    setFormOpen(true);
  };

  const save = () => {
    if (!form.title.trim() || !form.code.trim()) {
      toast.error("Give the snippet a title and some code.");
      return;
    }
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10);
    if (editingId) {
      persist(snippets.map((s) => s.id === editingId ? { ...s, title: form.title.trim(), language: form.language, code: form.code, tags, updated: Date.now() } : s));
      toast.success("Snippet updated");
    } else {
      const s: Snippet = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: form.title.trim(),
        language: form.language,
        code: form.code,
        tags,
        updated: Date.now(),
      };
      persist([s, ...snippets]);
      setSelectedId(s.id);
      toast.success("Snippet saved");
    }
    setFormOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const remove = (id: string) => {
    if (!window.confirm("Delete this snippet?")) return;
    persist(snippets.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const copy = useCallback(async (s: Snippet) => {
    if (!trial.canUse) return;
    try {
      await navigator.clipboard.writeText(s.code);
      trial.recordUse();
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Clipboard blocked by the browser.");
    }
  }, [trial]);

  const exportJson = useCallback(() => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([JSON.stringify(snippets, null, 2)], { type: "application/json" }), "snippets.json");
    trial.recordUse();
    toast.success("Snippets exported");
  }, [snippets, trial]);

  const importJson = useCallback(async (f: File) => {
    try {
      const arr = JSON.parse(await f.text()) as Snippet[];
      if (!Array.isArray(arr)) throw new Error("bad");
      const valid = arr.filter((s) => s && typeof s.title === "string" && typeof s.code === "string").map((s) => ({
        id: typeof s.id === "string" ? s.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: s.title,
        language: typeof s.language === "string" ? s.language : "plaintext",
        code: s.code,
        tags: Array.isArray(s.tags) ? s.tags.filter((t) => typeof t === "string") : [],
        updated: typeof s.updated === "number" ? s.updated : Date.now(),
      }));
      persist([...valid, ...snippets]);
      toast.success(`Imported ${valid.length} snippets`);
    } catch {
      toast.error("That file is not a valid snippets export.");
    }
  }, [persist, snippets]);

  return (
    <ToolPageShell toolId="code-snippet-manager" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Snippet Manager" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, code, tags…" className="pl-9" />
            </div>
            <button type="button" onClick={openNew} title="New snippet" className="rounded-xl bg-primary p-2.5 text-primary-foreground transition hover:opacity-90">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={exportJson} disabled={snippets.length === 0 || !trial.canUse} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
              <Download className="h-4 w-4" /> Export
            </button>
            <button type="button" onClick={() => importRef.current?.click()} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold transition hover:border-primary/40">
              <Upload className="h-4 w-4" /> Import
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }} />
          </div>
          <p className="text-xs text-muted-foreground">Snippets live in this browser's localStorage. Nothing is uploaded.</p>

          <ul className="max-h-[440px] space-y-1.5 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {snippets.length === 0 ? "No snippets yet. Hit + to save your first one." : "No matches for this search."}
              </li>
            )}
            {filtered.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-left transition",
                    selected?.id === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="truncate text-sm font-semibold">{s.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{s.language}</span>
                    {s.tags.slice(0, 3).map((t) => (
                      <span key={t} className="inline-flex items-center gap-0.5"><Tag className="h-3 w-3" />{t}</span>
                    ))}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {!isPro && (
            <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copy/export uses left.</p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          {formOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">{editingId ? "Edit snippet" : "New snippet"}</h2>
                <button type="button" onClick={() => setFormOpen(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Debounce helper" />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="utils, performance" />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Textarea value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Paste your code here…" className="min-h-[240px] font-mono text-[13px]" spellCheck={false} />
              </div>
              <ActionButton busy={false} disabled={false} onClick={save}>
                {editingId ? "Save changes" : "Save snippet"}
              </ActionButton>
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selected.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono">{selected.language}</span>
                    {selected.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5"><Tag className="h-3 w-3" />{t}</span>
                    ))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void copy(selected)} disabled={!trial.canUse} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-40">
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                  <button type="button" onClick={() => openEdit(selected)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:border-primary/40">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button type="button" onClick={() => remove(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-red-500 transition hover:border-red-500/50">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
              <Highlighted code={selected.code} language={selected.language} />
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <FileUp className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">Your snippet library is empty</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Save reusable code with syntax highlighting, tags and instant search. Everything stays in your browser.</p>
              <button type="button" onClick={openNew} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90">
                <Plus className="h-4 w-4" /> New snippet
              </button>
            </div>
          )}
        </div>
      </div>
    </ToolPageShell>
  );
}
