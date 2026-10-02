// /tools/punnett-square - Interactive Punnett square lab: enter parent
// genotypes, see the square fill in, genotype/phenotype ratios and step
// explanations. Complete dominance model. Client-side only.

import { Fragment, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Grid2x2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePlan } from "@/hooks/usePlan";
import { useToolTrial, TOOL_TRIAL_LIMIT } from "@/lib/tool-trial";
import { getToolSeo } from "@/lib/tool-seo";
import { getToolSeoMeta } from "@/lib/tool-seo-meta";
import ToolPageShell, { ActionButton, TrialUpsell } from "@/components/ToolPageShell";

export const Route = createFileRoute("/tools_/punnett-square")({
  head: () => {
    const seo = getToolSeoMeta("punnett-square");
    const canonical = "https://iconvault.site/tools/punnett-square";
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
  component: PunnettSquareTool,
});

const GENOTYPES = ["AA", "Aa", "aa"] as const;
type Geno = (typeof GENOTYPES)[number];

function gametes(g: Geno): [string, string] {
  if (g === "AA") return ["A", "A"];
  if (g === "aa") return ["a", "a"];
  return ["A", "a"];
}

function normalize(offspring: string): string {
  // canonical order: dominant allele first
  const chars = offspring.split("").sort((a, b) => (a === "A" ? -1 : 1));
  return chars.join("");
}

function PunnettSquareTool() {
  const { isPro } = usePlan();
  const trial = useToolTrial("punnett-square", isPro);
  const seo = getToolSeo("punnett-square");

  const [p1, setP1] = useState<Geno>("Aa");
  const [p2, setP2] = useState<Geno>("Aa");

  const square = useMemo(() => {
    const g1 = gametes(p1);
    const g2 = gametes(p2);
    return g2.map((r) => g1.map((c) => normalize(r + c)));
  }, [p1, p2]);

  const genoCounts = useMemo(() => {
    const counts: Record<string, number> = { AA: 0, Aa: 0, aa: 0 };
    for (const row of square) for (const cell of row) counts[cell] = (counts[cell] ?? 0) + 1;
    return counts;
  }, [square]);

  const pheno = useMemo(() => {
    const dom = genoCounts["AA"]! + genoCounts["Aa"]!;
    const rec = genoCounts["aa"]!;
    return { dom, rec };
  }, [genoCounts]);

  const steps = useMemo(() => [
    `Write the parent genotypes: Parent 1 is ${p1}, Parent 2 is ${p2}.`,
    `Split each parent into its two gametes. Parent 1 makes ${gametes(p1).join(" and ")}; Parent 2 makes ${gametes(p2).join(" and ")}.`,
    `Fill the 2x2 grid: each box combines one gamete from each parent.`,
    `Count genotypes: ${["AA", "Aa", "aa"].filter((g) => genoCounts[g]! > 0).map((g) => `${g} appears ${genoCounts[g]}/4`).join(", ")}.`,
    `Apply complete dominance: any genotype with A shows the dominant trait, so ${pheno.dom}/4 dominant and ${pheno.rec}/4 recessive.`,
    `As ratios, that is ${simplify(genoCounts["AA"]!, genoCounts["Aa"]!, genoCounts["aa"]!)} genotypic and ${simplify(pheno.dom, pheno.rec)} phenotypic.`,
  ], [p1, p2, genoCounts, pheno]);

  const copy = async () => {
    if (!trial.canUse) return;
    const text = [
      `Punnett square: ${p1} x ${p2}`,
      "",
      `Genotypes: AA ${genoCounts["AA"]}/4, Aa ${genoCounts["Aa"]}/4, aa ${genoCounts["aa"]}/4`,
      `Phenotypes (complete dominance): dominant ${pheno.dom}/4, recessive ${pheno.rec}/4`,
      "",
      ...steps.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      trial.recordUse();
      toast.success("Punnett square copied");
    } catch {
      toast.error("Copy failed - clipboard not available.");
    }
  };

  return (
    <ToolPageShell toolId="punnett-square" seo={seo} trial={trial} isPro={isPro}>
      <TrialUpsell toolName="Punnett Square" left={trial.left} />

      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-end gap-4">
            {([{ label: "Parent 1", value: p1, set: setP1 }, { label: "Parent 2", value: p2, set: setP2 }] as const).map((p) => (
              <div key={p.label}>
                <label className="mb-1.5 block text-sm font-medium">{p.label}</label>
                <div className="flex gap-2">
                  {GENOTYPES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => p.set(g)}
                      className={cn(
                        "rounded-xl border px-5 py-2.5 font-mono text-lg font-bold transition",
                        p.value === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="pb-2 text-xs text-muted-foreground">A = dominant allele, a = recessive allele</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <Grid2x2 className="h-4 w-4" /> The square
            </h2>
            <div className="mx-auto mt-4 max-w-xs">
              <div className="grid grid-cols-3 gap-1.5">
                <div />
                {gametes(p1).map((g, i) => (
                  <div key={i} className="flex h-14 items-center justify-center rounded-xl bg-sky-500/10 font-mono text-xl font-bold text-sky-600">{g}</div>
                ))}
                {square.map((row, r) => (
                  <Fragment key={`row-${r}`}>
                    <div className="flex h-14 items-center justify-center rounded-xl bg-violet-500/10 font-mono text-xl font-bold text-violet-600">{gametes(p2)[r]}</div>
                    {row.map((cell, c) => (
                      <div key={`${r}${c}`} className={cn(
                        "flex h-14 items-center justify-center rounded-xl border-2 font-mono text-xl font-bold",
                        cell.includes("A") ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700" : "border-amber-500/50 bg-amber-500/10 text-amber-700",
                      )}>
                        {cell}
                      </div>
                    ))}
                  </Fragment>
                ))}
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">Green boxes show the dominant trait, amber shows the recessive trait.</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Ratios</h2>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Genotypic ratio</p>
                  <div className="mt-1.5 flex gap-2">
                    {["AA", "Aa", "aa"].map((g) => (
                      <div key={g} className="flex-1 rounded-xl bg-muted/60 p-3 text-center">
                        <p className="font-mono text-lg font-bold">{g}</p>
                        <p className="text-sm font-semibold tabular-nums">{genoCounts[g]}/4</p>
                        <p className="text-xs text-muted-foreground tabular-nums">{((genoCounts[g]! / 4) * 100).toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Phenotypic ratio</p>
                  <div className="mt-1.5 flex gap-2">
                    <div className="flex-1 rounded-xl bg-emerald-500/10 p-3 text-center">
                      <p className="text-sm font-bold text-emerald-700">Dominant</p>
                      <p className="text-lg font-bold tabular-nums">{pheno.dom}/4</p>
                    </div>
                    <div className="flex-1 rounded-xl bg-amber-500/10 p-3 text-center">
                      <p className="text-sm font-bold text-amber-700">Recessive</p>
                      <p className="text-lg font-bold tabular-nums">{pheno.rec}/4</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">How it works</h2>
              <ol className="mt-3 space-y-2.5 text-sm">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <span className="text-muted-foreground">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex items-center gap-3">
                <ActionButton disabled={!trial.canUse} onClick={copy}>
                  <Copy className="h-4 w-4" /> Copy results
                </ActionButton>
                {!isPro && <p className="text-xs text-muted-foreground">{trial.left} of {TOOL_TRIAL_LIMIT} free copies left.</p>}
              </div>
            </div>
          </div>
        </section>

        <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
          Simplified model: this lab assumes complete dominance of one gene with two alleles. Real traits often involve
          incomplete dominance, codominance, multiple genes or environmental effects.
        </p>
      </div>
    </ToolPageShell>
  );
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function simplify(...nums: number[]): string {
  const g = nums.reduce((a, b) => gcd(a, b));
  return nums.map((n) => (g === 0 ? 0 : n / g)).join(" : ");
}
