// Shared layout for every /tools/* page: hero with trial status, the tool
// UI itself, then About / FAQ (with JSON-LD) / tags / related tools - the
// same SEO playbook the /packs pages use.

import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Atom,
  Barcode,
  Binary,
  Blocks,
  Blend,
  Bot,
  Braces,
  Camera,
  CaseUpper,
  ChevronDown,
  Chrome,
  Circle,
  ClipboardPaste,
  Clock,
  Code,
  Columns2,
  Columns3,
  Contrast,
  Crop,
  Crown,
  Diff,
  Eraser,
  EyeOff,
  Figma,
  FileImage,
  FileText,
  Film,
  Fingerprint,
  Frame,
  GraduationCap,
  Grid2x2,
  Hash,
  IdCard,
  Image as ImageIcon,
  Key,
  Layers,
  LayoutGrid,
  Link as LinkIcon,
  ListX,
  Loader2,
  Lock,
  MapPin,
  Minimize2,
  Network,
  Package,
  Palette,
  BarChart3,
  PenLine,
  Pilcrow,
  Pipette,
  QrCode,
  RefreshCcw,
  Regex,
  RotateCw,
  Scaling,
  ScanLine,
  Scissors,
  Search,
  Shapes,
  Share2,
  Smile,
  Space,
  Sparkles,
  Square,
  Stamp,
  Tags,
  Terminal,
  Text,
  Type,
  Users,
  Video,
  Wand2,
  Youtube,
  Zap,
  Activity,
  AppWindow,
  ArrowDownUp,
  ArrowRightLeft,
  ArrowUpFromLine,
  AudioLines,
  AudioWaveform,
  Battery,
  Bell,
  Bug,
  Calculator,
  Compass,
  Cookie,
  CreditCard,
  CupSoda,
  Database,
  Dices,
  Flag,
  FolderOpen,
  Gamepad2,
  GitCommitHorizontal,
  Globe,
  Grid3x3,
  HardDrive,
  Languages,
  LayoutDashboard,
  Mail,
  Maximize,
  MessageCircle,
  Mic,
  MousePointer,
  Move,
  Music,
  Paintbrush,
  Piano,
  PictureInPicture2,
  Play,
  Pointer,
  Radio,
  Rocket,
  Shuffle,
  Sprout,
  TriangleAlert,
  Volume2,
  Waves
} from "lucide-react";
import PageShell from "@/components/PageShell";
import { cn } from "@/lib/utils";
import { relatedTools, SOON_TOOLS, getTool, type ToolDef } from "@/lib/tool-catalog";
import { TOOL_TRIAL_LIMIT, type TrialState } from "@/lib/tool-trial";
import type { ToolSeo } from "@/lib/tool-seo";
import { ToolIcon } from "./ToolIcon";

/** Render **bold** markers inside about paragraphs as <strong> (SEO emphasis). */
function renderRich(text: string): ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-semibold"
      >
        <span>{q}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>}
    </div>
  );
}

/** Upsell shown when the 5 free uses are exhausted. */
export function TrialUpsell({ toolName, left }: { toolName: string; left: number }) {
  if (left > 0) return null;
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-50 p-6 text-center dark:bg-amber-950/20">
      <Crown className="mx-auto mb-2 h-8 w-8 text-amber-500" />
      <h3 className="text-lg font-extrabold">You've used your 5 free {toolName} runs</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Go Pro for unlimited runs, HD exports and every template - $12/year, cancel anytime.
      </p>
      <Link
        to="/pro"
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
      >
        <Crown className="h-4 w-4" /> Get Pro - $12/yr
      </Link>
    </div>
  );
}

interface Props {
  toolId: string;
  seo: ToolSeo;
  trial: TrialState;
  isPro: boolean;
  children: ReactNode;
}

export default function ToolPageShell({ toolId, seo, trial, isPro, children }: Props) {
  const tool = getTool(toolId);
  const related = relatedTools(toolId, 4);
  const soon = SOON_TOOLS.slice(0, 8);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seo.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <PageShell title={seo.title} description={seo.metaDescription} fullWidth>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <div className="w-full">
        <Link
          to="/tools"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> All tools
        </Link>

        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 sm:mb-8 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-14 sm:w-14">
              <ToolIcon iconKey={tool?.icon ?? "shapes"} className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <div>
              <h1 className="text-balance text-xl font-extrabold tracking-tight sm:text-3xl">{tool?.name}</h1>
              <p className="mt-1 max-w-xl text-[13px] text-muted-foreground sm:text-sm">{tool?.tagline}</p>
            </div>
          </div>
          <div
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold",
              isPro
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-primary/10 text-primary",
            )}
          >
            {isPro ? (
              <span className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Pro - unlimited
              </span>
            ) : (
              `${trial.left} of ${TOOL_TRIAL_LIMIT} free uses left`
            )}
          </div>
        </div>

        <div className="mb-10 sm:mb-14">{children}</div>

        {/* About / FAQ / tags / more tools: single column like before, but wider
            (max-w-7xl) so the side gaps stay small. */}
        <div className="mx-auto w-full max-w-7xl">
        {/* About */}
        <section className="mb-12">
          <h2 className="mb-4 text-balance text-xl font-extrabold">About this tool</h2>
          <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            {seo.about.map((p, i) => (
              <p key={i}>{renderRich(p)}</p>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-4 text-balance text-xl font-extrabold">Frequently asked questions</h2>
          <div className="space-y-3">
            {seo.faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>

        {/* Tags: hidden entirely when a tool has none, so the heading
            never renders above an empty chip row. */}
        {seo.tags.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-balance text-xl font-extrabold">Popular searches</h2>
            <div className="flex flex-wrap items-center justify-start gap-2">
              {seo.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* More tools */}
        <section>
          <h2 className="mb-4 text-balance text-xl font-extrabold">More tools</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((t: ToolDef) => (
              <Link
                key={t.id}
                to={t.path!}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ToolIcon iconKey={t.icon} className="h-5 w-5" />
                </span>
                <h3 className="font-bold">{t.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.tagline}</p>
              </Link>
            ))}
          </div>
          <h3 className="mb-3 mt-8 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Coming soon
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {soon.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 opacity-75">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ToolIcon iconKey={t.icon} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">Coming soon</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/tools" className="mt-4 inline-block text-sm font-bold text-primary hover:underline">
            View all {related.length + soon.length}+ tools →
          </Link>
        </section>
        </div>
      </div>
    </PageShell>
  );
}

/** Small busy button used by the tools. */
export function ActionButton({
  busy,
  disabled,
  onClick,
  children,
}: {
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// __ICONVAULT_470_INTEGRATED__
