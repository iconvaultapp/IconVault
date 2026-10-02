import { Link } from "@tanstack/react-router";
import { Twitter, Github, Linkedin, Youtube, Instagram } from "lucide-react";
import { Brand } from "@/components/SiteHeader";
import { navSections, type NavItem } from "@/components/nav-data";
import { ToolIcon } from "@/components/ToolIcon";
import { openCookieSettings } from "@/lib/cookie-consent";

// TODO(Sameer): replace "#" with real social URLs
const SOCIALS = [
  { icon: Twitter, label: "IconVault on X", href: "#" },
  { icon: Github, label: "IconVault on GitHub", href: "#" },
  { icon: Linkedin, label: "IconVault on LinkedIn", href: "#" },
  { icon: Youtube, label: "IconVault on YouTube", href: "#" },
  { icon: Instagram, label: "IconVault on Instagram", href: "#" },
];

/**
 * The 9 most popular tools. Hardcoded (not pulled from the tool catalog) so
 * the footer stays light on every page. Slugs verified against the catalog.
 */
const BEST_TOOLS = [
  { id: "image-to-svg", name: "Image to SVG", path: "/tools/image-to-svg", icon: "shapes" },
  { id: "qr-generator", name: "QR Code Generator", path: "/tools/qr-generator", icon: "qr" },
  { id: "background-remover", name: "Background Remover", path: "/tools/background-remover", icon: "eraser" },
  { id: "json-formatter", name: "JSON Formatter", path: "/tools/json-formatter", icon: "braces" },
  { id: "password-generator", name: "Password Generator", path: "/tools/password-generator", icon: "lock" },
  { id: "image-compressor", name: "Image Compressor", path: "/tools/image-compressor", icon: "minimize" },
  { id: "image-color-picker", name: "Image Color Picker", path: "/tools/image-color-picker", icon: "pipette" },
  { id: "unit-converter", name: "Unit Converter", path: "/tools/unit-converter", icon: "scaling" },
  { id: "word-counter", name: "Word Counter", path: "/tools/word-counter", icon: "text" },
];

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
  const otherSections = navSections.filter((s) => s.label !== "Tools");

  return (
    <footer className="bg-surface-2">
      {/* Subtle gradient hairline: the premium top accent. */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-5 pt-16 lg:px-8 lg:pt-20">
        <div className="grid gap-12 md:grid-cols-3 lg:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr]">
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

          {/* Tools column: All Tools + the 9 most popular tools. */}
          <nav aria-label="Popular tools">
            <p className="eyebrow">Tools</p>
            <ul className="mt-5 space-y-1">
              <li>
                <Link
                  to="/tools"
                  className="inline-block py-1 text-sm font-semibold text-foreground transition-all duration-200 hover:translate-x-0.5 hover:text-primary"
                >
                  All Tools
                </Link>
              </li>
              {BEST_TOOLS.map((t) => (
                <li key={t.id}>
                  <Link
                    to={t.path}
                    className="group inline-flex items-center gap-2 py-1 text-sm text-muted-foreground transition-all duration-200 hover:translate-x-0.5 hover:text-primary"
                  >
                    <ToolIcon
                      iconKey={t.icon}
                      className="h-3.5 w-3.5 text-primary/50 transition-colors group-hover:text-primary"
                    />
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {otherSections.map((section) => (
            <LinkColumn key={section.label} label={section.label} links={section.links} />
          ))}
        </div>

        {/* Giant brand wordmark: oversized, low-opacity, gradient-faded. */}
        <div aria-hidden="true" className="pointer-events-none mt-20 mb-10 select-none overflow-hidden sm:mt-28 sm:mb-14">
          <p className="bg-gradient-to-b from-primary/20 via-primary/[0.07] to-transparent bg-clip-text text-center font-display text-[19vw] font-extrabold leading-[0.8] tracking-tighter text-transparent lg:text-[12rem]">
            IconVault
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-border py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
