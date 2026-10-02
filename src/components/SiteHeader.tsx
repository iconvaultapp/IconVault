import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logoUrl from "@/assets/iconvault-logo.svg";
import { navSections } from "@/components/nav-data";
import UserMenu from "@/components/UserMenu";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { label: "Browse icons", path: "/app" },
  { label: "Collections", path: "/collections" },
  { label: "Pricing", path: "/pro" },
  { label: "Changelog", path: "/changelog" },
];

export const Brand = ({ className }: { className?: string }) => {
  // Re-mount the mark on every route change so the two-spin animation replays
  // when the site opens and when the user moves between tabs/menus.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Link
      to="/"
      onClick={() => window.scrollTo(0, 0)}
      className={cn("group flex items-center gap-2.5", className)}
    >      <span key={pathname} className="brand-spin inline-flex shrink-0">
        <img
          src={logoUrl}
          alt="IconVault logo"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-contain transition-transform duration-300 group-hover:-rotate-6"
        />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">
        Icon<span className="text-primary">Vault</span>
      </span>
    </Link>
  );
};

export const SiteHeader = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMobileMenu = () => {
    if (mobileOpen) {
      // Play the close animation before unmounting the panel.
      setMenuClosing(true);
      window.setTimeout(() => {
        setMobileOpen(false);
        setMenuClosing(false);
      }, 170);
    } else {
      setMobileOpen(true);
    }
  };
  const closeMobileMenu = () => {
    setMenuClosing(true);
    window.setTimeout(() => {
      setMobileOpen(false);
      setMenuClosing(false);
    }, 170);
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Brand />
          <nav className="hidden items-center gap-1 lg:flex">
            {primaryLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="focus-ring rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "text-foreground bg-muted" }}
              >
                {link.label}
              </Link>
            ))}

            {navSections
              .filter((s) => s.label === "Tools" || s.label === "Developers")
              .map((section) => (
                <div
                  key={section.label}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(section.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  {section.label === "Tools" ? (
                    <Link
                      to="/tools"
                      className="focus-ring rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      activeProps={{ className: "text-foreground bg-muted" }}
                    >
                      {section.label}
                    </Link>
                  ) : (
                    <button className="focus-ring rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      {section.label}
                    </button>
                  )}
                  {openMenu === section.label && (
                    <div
                      className={cn(
                        "animate-pop absolute top-full pt-2",
                        section.label === "Tools"
                          ? "left-1/2 w-[36rem] [translate:-50%_0]"
                          : "left-0 w-[26rem]",
                      )}
                    >
                      <div
                        className={cn(
                          "grid max-h-[70vh] gap-1 overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-lift",
                          section.label === "Tools" ? "grid-cols-3" : "grid-cols-2",
                        )}
                      >
                        {section.links.map((link) => (
                          <Link
                            key={link.path}
                            to={link.path}
                            className="group flex items-start gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-muted"
                          >
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:scale-110">
                              <link.icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{link.label}</span>
                              <span className="block truncate text-xs text-muted-foreground">{link.desc}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app"
            className="focus-ring hidden rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03] sm:inline-flex"
          >
            Open the vault
          </Link>
          <UserMenu />
          <button
            onClick={toggleMobileMenu}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-border transition-transform duration-200 active:scale-95 lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <span className="relative grid h-4.5 w-4.5 place-items-center">
              <Menu
                className={cn(
                  "absolute h-4.5 w-4.5 transition-all duration-300 ease-out",
                  mobileOpen ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100",
                )}
              />
              <X
                className={cn(
                  "absolute h-4.5 w-4.5 transition-all duration-300 ease-out",
                  mobileOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0",
                )}
              />
            </span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          className={cn(
            "max-h-[70vh] overflow-y-auto overscroll-contain border-t border-border bg-background px-5 pb-6 pt-3 [-webkit-overflow-scrolling:touch] lg:hidden",
            menuClosing ? "animate-menu-close" : "animate-slide-down",
          )}
        >
          <div className="grid gap-1">
            {primaryLinks.map((link, i) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMobileMenu}
                style={{ animationDelay: `${Math.min(i * 30, 120)}ms` }}
                className="animate-fade-up rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {navSections.map((section, si) => (
            <div key={section.label} className="mt-4">
              <p
                className="eyebrow animate-fade-up px-3"
                style={{ animationDelay: `${Math.min((si + 1) * 40, 160)}ms` }}
              >
                {section.label}
              </p>
              <div className="mt-1 grid gap-0.5">
                {section.links.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <link.icon className="h-4 w-4 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
