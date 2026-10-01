import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, Lightbulb } from "lucide-react";
import PageShell from "@/components/PageShell";
import { cn } from "@/lib/utils";
import { DOC_SECTIONS, type DocBlock } from "@/lib/docs-data";

const Block = ({ block }: { block: DocBlock }) => {
  switch (block.type) {
    case "p":
      return <p className="leading-relaxed text-foreground/80">{block.text}</p>;
    case "h":
      return <h3 className="pt-2 text-lg font-bold">{block.text}</h3>;
    case "list":
      return (
        <ul className="space-y-2">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2.5 leading-relaxed text-foreground/80">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {it}
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <div className="overflow-hidden rounded-xl border border-border bg-[#0d1117]">
          {block.label && (
            <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              {block.label}
            </div>
          )}
          <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-green-300">
            {block.code}
          </pre>
        </div>
      );
    case "tip":
      return (
        <div className="flex gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <Lightbulb className="h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-foreground/80">{block.text}</p>
        </div>
      );
  }
};

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation - IconVault" },
      {
        name: "description",
        content:
          "Guides for every corner of IconVault: search, exports, Logo Builder, REST API, Pro billing and more.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  const [active, setActive] = useState(DOC_SECTIONS[0]?.id ?? "");

  useEffect(() => {
    const onScroll = () => {
      let current = DOC_SECTIONS[0]?.id ?? "";
      for (const s of DOC_SECTIONS) {
        const el = document.getElementById(`doc-${s.id}`);
        if (el && el.getBoundingClientRect().top < 140) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <PageShell
      title="Documentation"
      description="Guides for every corner of IconVault - search, exports, Logo Builder, API, Pro and more."
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Documentation</h1>
            <p className="text-sm text-muted-foreground">Everything IconVault can do, in one place.</p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* sidebar */}
          <aside className="hidden w-56 shrink-0 md:block">
            <nav className="sticky top-24 space-y-1">
              {DOC_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#doc-${s.id}`}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active === s.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {s.title}
                </a>
              ))}
              <Link
                to="/tools"
                className="mt-4 flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
              >
                Open the Tools hub <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          </aside>

          {/* content */}
          <div className="min-w-0 flex-1 space-y-12 pb-16">
            {/* mobile section picker */}
            <div className="md:hidden">
              <select
                value={active}
                onChange={(e) => document.getElementById(`doc-${e.target.value}`)?.scrollIntoView({ behavior: "smooth" })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium"
              >
                {DOC_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            {DOC_SECTIONS.map((s) => (
              <section key={s.id} id={`doc-${s.id}`} className="scroll-mt-28">
                <h2 className="mb-4 text-xl font-extrabold tracking-tight">{s.title}</h2>
                <div className="space-y-4">
                  {s.blocks.map((b, i) => (
                    <Block key={i} block={b} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
