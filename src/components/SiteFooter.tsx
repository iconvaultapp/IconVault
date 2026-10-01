import { Link } from "@tanstack/react-router";
import { Twitter, Github, Linkedin, Youtube, Instagram } from "lucide-react";
import { Brand } from "@/components/SiteHeader";
import { navSections, type NavItem } from "@/components/nav-data";
import { openCookieSettings } from "@/lib/cookie-consent";

// TODO(Sameer): replace "#" with real social URLs
const SOCIALS = [
  { icon: Twitter, label: "IconVault on X", href: "#" },
  { icon: Github, label: "IconVault on GitHub", href: "#" },
  { icon: Linkedin, label: "IconVault on LinkedIn", href: "#" },
  { icon: Youtube, label: "IconVault on YouTube", href: "#" },
  { icon: Instagram, label: "IconVault on Instagram", href: "#" },
];

/** Tool category entry: icon + label + short description, mirroring the header Tools menu. */
function ToolLink({ link }: { link: NavItem }) {
  const Icon = link.icon;
  return (
    <Link
      to={link.path}
      className="group flex items-start gap-2.5 rounded-xl p-2 transition-all duration-200 hover:bg-muted/60"
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform duration-200 group-hover:scale-110">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug transition-colors group-hover:text-primary">
          {link.label}
        </span>
        {link.desc && (
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground line-clamp-2">
            {link.desc}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Simple label + link list column (Collections, Developers, Account). */
function LinkColumn({ label, links }: { label: string; links: NavItem[] }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <ul className="mt-5 space-y-1">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className="inline-block py-1 text-sm text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:text-primary"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const SiteFooter = () => {
  const toolsSection = navSections.find((s) => s.label === "Tools");
  const otherSections = navSections.filter((s) => s.label !== "Tools");

  return (
    <footer className="bg-surface-2">
      {/* Subtle gradient hairline: the premium top accent. */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-3 lg:grid-cols-[1.1fr_2.1fr_0.9fr_0.9fr_0.9fr]">
          {/* Brand + socials */}
          <div className="max-w-xs">
            <Brand />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              One search box for every open-source icon set. Preview, recolour and export in the
              format your codebase already speaks.
            </p>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:text-primary"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              Powered by the Iconify open-source index
            </p>
          </div>

          {/* Tools mega-column: same icon + label + desc data as the header menu. */}
          {toolsSection && (
            <div className="md:col-span-2 lg:col-span-1">
              <p className="eyebrow">{toolsSection.label}</p>
              <div className="mt-3 grid grid-cols-1 gap-0.5 min-[420px]:grid-cols-2">
                {toolsSection.links.map((link) => (
                  <ToolLink key={link.path} link={link} />
                ))}
              </div>
            </div>
          )}

          {otherSections.map((section) => (
            <LinkColumn key={section.label} label={section.label} links={section.links} />
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} IconVault. Icons remain under their original licences.{" "}
            <button
              type="button"
              onClick={openCookieSettings}
              className="underline underline-offset-2 transition-colors hover:text-primary"
            >
              Cookie settings
            </button>
          </p>
          <p className="font-mono">Built for designers and engineers who move fast.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="transition-colors hover:text-primary">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-primary">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
