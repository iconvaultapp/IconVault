// "Coding with an agent?" strip for the homepage hero area.
// IconVault has no MCP server, so this promotes the two real developer
// surfaces an agent can drive: the CLI (`iconvault add …`) and the REST API.
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Terminal } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/Reveal";

const CLI_COMMAND = "iconvault add lucide:rocket";

export default function AgentStrip() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setCopied(true);
      toast.success("Command copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed - select the command and copy it manually");
    }
  };

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-5 py-7 lg:px-8">
        <Reveal>
          <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-center">
            <div className="shrink-0 md:max-w-56">
              <p className="flex items-center gap-2 font-display text-base font-semibold">
                <Terminal className="h-4.5 w-4.5 text-primary" /> Coding with an agent?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                It can search here too, through the CLI and API.
              </p>
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-background shadow-soft">
              <code className="min-w-0 flex-1 truncate font-mono text-[13px] sm:text-sm">
                <span className="mr-2 text-primary">$</span>
                {CLI_COMMAND}
              </code>
              <button
                type="button"
                onClick={() => void copy()}
                aria-label="Copy CLI command"
                className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-background/70 transition-colors hover:bg-white/10 hover:text-background"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Link
              to="/api-access"
              className="focus-ring group inline-flex shrink-0 items-center justify-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              API &amp; CLI docs
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
