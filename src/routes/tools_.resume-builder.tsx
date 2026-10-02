// /tools/resume-builder - Build an ATS-friendly resume with live preview
// and export to PDF, Word or Markdown, 100% client-side.

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileText, FileUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/logo-builder";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/resume-builder")({
  head: () => {
    const seo = getToolSeoMeta("resume-builder");
    const canonical = "https://iconvault.site/tools/resume-builder";
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
  component: ResumeTool,
});

interface Job {
  id: number;
  title: string;
  company: string;
  dates: string;
  bullets: string;
}
interface Edu {
  id: number;
  degree: string;
  school: string;
  year: string;
}

let nextId = 1;

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/60";

function ResumeTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("resume-builder", isPro);
  const seo = getToolSeo("resume-builder");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [links, setLinks] = useState("");
  const [summary, setSummary] = useState("");
  const [jobs, setJobs] = useState<Job[]>([
    { id: nextId++, title: "", company: "", dates: "", bullets: "" },
  ]);
  const [edus, setEdus] = useState<Edu[]>([{ id: nextId++, degree: "", school: "", year: "" }]);
  const [skills, setSkills] = useState("");
  const [busy, setBusy] = useState(false);

  const updateJob = (id: number, patch: Partial<Job>) =>
    setJobs((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removeJob = (id: number) => setJobs((ps) => ps.filter((p) => p.id !== id));
  const updateEdu = (id: number, patch: Partial<Edu>) =>
    setEdus((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removeEdu = (id: number) => setEdus((ps) => ps.filter((p) => p.id !== id));

  const filledJobs = jobs.filter((j) => j.title || j.company);
  const filledEdus = edus.filter((e) => e.degree || e.school);
  const skillList = skills.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const contactLine = [email, phone, location, links].filter(Boolean).join(" | ");

  const markdown = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# ${name || "Your Name"}`);
    if (role) lines.push(`*${role}*`);
    if (contactLine) lines.push(contactLine);
    lines.push("");
    if (summary) lines.push("## Summary", summary, "");
    if (filledJobs.length) {
      lines.push("## Experience");
      for (const j of filledJobs) {
        lines.push(`### ${j.title}${j.company ? ` - ${j.company}` : ""}${j.dates ? ` (${j.dates})` : ""}`);
        for (const b of j.bullets.split("\n").map((x) => x.trim()).filter(Boolean)) lines.push(`- ${b}`);
        lines.push("");
      }
    }
    if (filledEdus.length) {
      lines.push("## Education");
      for (const e of filledEdus) lines.push(`- ${e.degree}${e.school ? `, ${e.school}` : ""}${e.year ? ` (${e.year})` : ""}`);
      lines.push("");
    }
    if (skillList.length) {
      lines.push("## Skills", skillList.join(", "));
    }
    return lines.join("\n").trimEnd() + "\n";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, role, contactLine, summary, jobs, edus, skills]);

  const exportPdf = async () => {
    if (!trial.canUse) return;
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const left = 15;
      let y = 18;
      const W = 180;
      const ensure = (h: number) => { if (y + h > 285) { doc.addPage(); y = 18; } };
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(name || "Your Name", left, y); y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (role) { doc.setFont("helvetica", "italic"); doc.text(role, left, y); y += 6; doc.setFont("helvetica", "normal"); }
      if (contactLine) { doc.text(contactLine, left, y); y += 8; }
      const section = (t: string) => { ensure(14); y += 2; doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(t, left, y); y += 7; doc.setFontSize(10); doc.setFont("helvetica", "normal"); };
      const para = (t: string) => { const ls = doc.splitTextToSize(t, W); ensure(ls.length * 5.5 + 2); doc.text(ls, left, y); y += ls.length * 5.5 + 3; };
      if (summary) { section("Summary"); para(summary); }
      if (filledJobs.length) {
        section("Experience");
        for (const j of filledJobs) {
          ensure(12);
          doc.setFont("helvetica", "bold");
          doc.text(`${j.title}${j.company ? ` - ${j.company}` : ""}${j.dates ? ` (${j.dates})` : ""}`, left, y);
          y += 5.5; doc.setFont("helvetica", "normal");
          for (const b of j.bullets.split("\n").map((x) => x.trim()).filter(Boolean)) para(`- ${b}`);
        }
      }
      if (filledEdus.length) {
        section("Education");
        for (const e of filledEdus) para(`- ${e.degree}${e.school ? `, ${e.school}` : ""}${e.year ? ` (${e.year})` : ""}`);
      }
      if (skillList.length) { section("Skills"); para(skillList.join(", ")); }
      doc.save(`${(name || "resume").replace(/\s+/g, "-").toLowerCase()}.pdf`);
      trial.recordUse();
      toast.success("Resume PDF downloaded");
    } catch {
      toast.error("PDF export failed.");
    } finally {
      setBusy(false);
    }
  };

  const exportWord = () => {
    if (!trial.canUse) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let html = `<html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif">`;
    html += `<h1>${esc(name || "Your Name")}</h1>`;
    if (role) html += `<p><i>${esc(role)}</i></p>`;
    if (contactLine) html += `<p>${esc(contactLine)}</p>`;
    if (summary) html += `<h2>Summary</h2><p>${esc(summary)}</p>`;
    if (filledJobs.length) {
      html += `<h2>Experience</h2>`;
      for (const j of filledJobs) {
        html += `<h3>${esc(j.title)}${j.company ? ` - ${esc(j.company)}` : ""}${j.dates ? ` (${esc(j.dates)})` : ""}</h3><ul>`;
        for (const b of j.bullets.split("\n").map((x) => x.trim()).filter(Boolean)) html += `<li>${esc(b)}</li>`;
        html += `</ul>`;
      }
    }
    if (filledEdus.length) {
      html += `<h2>Education</h2><ul>`;
      for (const e of filledEdus) html += `<li>${esc(e.degree)}${e.school ? `, ${esc(e.school)}` : ""}${e.year ? ` (${esc(e.year)})` : ""}</li>`;
      html += `</ul>`;
    }
    if (skillList.length) html += `<h2>Skills</h2><p>${esc(skillList.join(", "))}</p>`;
    html += `</body></html>`;
    downloadBlob(new Blob([html], { type: "application/msword" }), "resume.doc");
    trial.recordUse();
    toast.success("Resume .doc downloaded (HTML-based Word format)");
  };

  const exportMarkdown = () => {
    if (!trial.canUse) return;
    downloadBlob(new Blob([markdown], { type: "text/markdown" }), "resume.md");
    trial.recordUse();
    toast.success("Resume markdown downloaded");
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      trial.recordUse();
      toast.success("Resume markdown copied");
    } catch {
      toast.error("Copy failed. Your browser blocked clipboard access.");
    }
  };

  return (
    <ToolPageShell toolId="resume-builder" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Resume Builder" left={trial.left} />

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="max-h-[900px] space-y-5 overflow-y-auto rounded-2xl border border-border bg-card p-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold">Contact</p>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Professional title" className={inputCls} />
            <div className="grid grid-cols-2 gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className={inputCls} />
            </div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" className={inputCls} />
            <input value={links} onChange={(e) => setLinks(e.target.value)} placeholder="LinkedIn / portfolio URL" className={inputCls} />
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">Summary</p>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="2-3 sentences about you" className={cn(inputCls, "resize-y")} />
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Experience</p>
              <button type="button" onClick={() => setJobs((ps) => [...ps, { id: nextId++, title: "", company: "", dates: "", bullets: "" }])}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary/40">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {jobs.map((j) => (
              <div key={j.id} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex gap-2">
                  <input value={j.title} onChange={(e) => updateJob(j.id, { title: e.target.value })} placeholder="Job title" className={cn(inputCls, "flex-1")} />
                  <button type="button" onClick={() => removeJob(j.id)} title="Remove job" className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={j.company} onChange={(e) => updateJob(j.id, { company: e.target.value })} placeholder="Company" className={inputCls} />
                  <input value={j.dates} onChange={(e) => updateJob(j.id, { dates: e.target.value })} placeholder="2022 - 2024" className={inputCls} />
                </div>
                <textarea value={j.bullets} onChange={(e) => updateJob(j.id, { bullets: e.target.value })} rows={3} placeholder="Achievements, one per line" className={cn(inputCls, "resize-y")} />
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Education</p>
              <button type="button" onClick={() => setEdus((ps) => [...ps, { id: nextId++, degree: "", school: "", year: "" }])}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition hover:border-primary/40">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {edus.map((e) => (
              <div key={e.id} className="flex gap-2">
                <input value={e.degree} onChange={(e2) => updateEdu(e.id, { degree: e2.target.value })} placeholder="Degree" className={cn(inputCls, "flex-1")} />
                <input value={e.school} onChange={(e2) => updateEdu(e.id, { school: e2.target.value })} placeholder="School" className={inputCls} />
                <input value={e.year} onChange={(e2) => updateEdu(e.id, { year: e2.target.value })} placeholder="Year" className={cn(inputCls, "w-20")} />
                <button type="button" onClick={() => removeEdu(e.id)} title="Remove education" className="rounded-lg border border-border p-2 text-muted-foreground transition hover:border-red-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold">Skills (comma separated)</p>
            <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows={2} placeholder="React, TypeScript, Figma" className={cn(inputCls, "resize-y")} />
          </section>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton busy={busy} disabled={!trial.canUse} onClick={exportPdf}>
              <FileText className="h-4 w-4" /> {busy ? "Building…" : "Export PDF"}
            </ActionButton>
            <ActionButton disabled={!trial.canUse} onClick={exportWord}>
              <FileUp className="h-4 w-4" /> Export Word
            </ActionButton>
            <ActionButton disabled={!trial.canUse} onClick={exportMarkdown}>
              <Download className="h-4 w-4" /> Markdown
            </ActionButton>
            <ActionButton onClick={copyMarkdown}>
              <Copy className="h-4 w-4" /> Copy
            </ActionButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Word export uses an HTML-based .doc file: it opens in Word and Google Docs. The PDF uses a single-column ATS-friendly layout.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-[13px] font-medium text-foreground/80">Live preview (ATS-friendly, single column)</p>
          <div className="min-h-[500px] rounded-xl bg-white p-8 text-neutral-900 shadow-inner">
            <h1 className="text-3xl font-bold">{name || "Your Name"}</h1>
            {role && <p className="mt-1 text-sm italic text-neutral-600">{role}</p>}
            {contactLine && <p className="mt-2 text-xs text-neutral-600">{contactLine}</p>}
            {summary && (
              <div className="mt-5">
                <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">Summary</h2>
                <p className="mt-2 text-sm">{summary}</p>
              </div>
            )}
            {filledJobs.length > 0 && (
              <div className="mt-5">
                <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">Experience</h2>
                {filledJobs.map((j) => (
                  <div key={j.id} className="mt-3">
                    <p className="text-sm font-bold">
                      {j.title}{j.company ? ` - ${j.company}` : ""}{j.dates ? ` (${j.dates})` : ""}
                    </p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                      {j.bullets.split("\n").map((b) => b.trim()).filter(Boolean).map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {filledEdus.length > 0 && (
              <div className="mt-5">
                <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">Education</h2>
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
                  {filledEdus.map((e) => (
                    <li key={e.id}>{e.degree}{e.school ? `, ${e.school}` : ""}{e.year ? ` (${e.year})` : ""}</li>
                  ))}
                </ul>
              </div>
            )}
            {skillList.length > 0 && (
              <div className="mt-5">
                <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">Skills</h2>
                <p className="mt-2 text-sm">{skillList.join(", ")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolPageShell>
  );
}
