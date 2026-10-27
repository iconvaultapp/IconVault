import { Fragment, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, ChevronDown, History, Layers, LayoutGrid, Menu, X } from "lucide-react";
import logoUrl from "@/assets/iconvault-logo.svg";
import { navSections } from "@/components/nav-data";
import UserMenu from "@/components/UserMenu";
import { cn } from "@/lib/utils";

const primaryLinks = [
  { label: "Browse icons", path: "/app" },
  { label: "Illustrations", path: "/illustrations" },
  { label: "UI Components", path: "/ui-components" },
  { label: "Collections", path: "/collections" },
  { label: "Pricing", path: "/pro" },
];
// Blog + Changelog as Developers-tab submenu items (Sameer 2026-10-26),
// not top-level tabs. Kept local to the header so the sidebar,
// footer and user menu are untouched.
const DEVELOPER_TAB_LINKS = [
  { icon: BookOpen, label: "Blog", path: "/blog", desc: "News & updates" },
  { icon: History, label: "Changelog", path: "/changelog", desc: "Latest releases" },
] as const;

// Hover sub-menu under "Browse icons" (Sameer 2026-10-23).
const BROWSE_SUBMENU = [
  { label: "Libraries", path: "/libraries", desc: "All 239 icon sets, side by side", icon: Layers },
  { label: "Browse by category", path: "/categories", desc: "215 curated categories", icon: LayoutGrid },
] as const;

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

  // "Open App" button is hidden on the three browse pages (Sameer 2026-10-27):
  // Browse icons (/app), Libraries (/libraries) and Browse by category
  // (/categories) — the user is already inside the app experience there.
  // It stays visible on every other page. Trailing slash tolerated.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const basePath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const hideOpenApp =
    basePath === "/app" || basePath === "/libraries" || basePath === "/categories";

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
    <header className="sticky top-3 z-[100] mx-auto mt-4 w-full max-w-[1440px] px-4 sm:px-6">
      <div className="flex items-center gap-4 rounded-full bg-white/90 px-5 py-2.5 shadow-[0_10px_40px_rgb(0_0_0/0.08)] ring-1 ring-black/[0.04] backdrop-blur-xl">
          <Brand />
          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
            {primaryLinks.slice(0, 3).map((link) =>
              link.path === "/app" ? (
                <div
                  key={link.path}
                  className="relative"
                  onMouseEnter={() => setOpenMenu("Browse")}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <Link
                    to={link.path}
                    className="focus-ring inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    activeProps={{ className: "text-foreground bg-muted" }}
                  >
                    {link.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-300",
                        openMenu === "Browse" && "rotate-180",
                      )}
                    />
                  </Link>
                  {openMenu === "Browse" && (
                    <div className="animate-pop absolute left-0 top-full w-72 pt-2">
                      <div className="grid gap-1 rounded-2xl border border-border bg-popover p-2 shadow-lift">
                        {BROWSE_SUBMENU.map((sub) => (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className="group flex items-start gap-2.5 rounded-xl p-2.5 transition-colors hover:bg-muted"
                          >
                            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:scale-110">
                              <sub.icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{sub.label}</span>
                              <span className="block truncate text-xs text-muted-foreground">{sub.desc}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className="focus-ring rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeProps={{ className: "text-foreground bg-muted" }}
                >
                  {link.label}
                </Link>
              ),
            )}

            {/* Tools sits after UI Components (Sameer 2026-10-26) and looks
                like every other menu item now: plain text + chevron, no teal
                pill. Its mega-menu dropdown is unchanged. */}
            <div
              className="relative"
              onMouseEnter={() => setOpenMenu("Tools")}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                to="/tools"
                className="focus-ring inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "text-foreground bg-muted" }}
              >
                Tools
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300",
                    openMenu === "Tools" && "rotate-180",
                  )}
                />
              </Link>
              {openMenu === "Tools" && (
                <div className="animate-pop absolute left-1/2 top-full w-[36rem] [translate:-50%_0] pt-2">
                  <div className="grid max-h-[70vh] grid-cols-3 gap-1 overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-lift">
                    {navSections
                      .find((s) => s.label === "Tools")
                      ?.links.map((link) => (
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

            {primaryLinks.slice(3).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="focus-ring rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "text-foreground bg-muted" }}
              >
                {link.label}
              </Link>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setOpenMenu("Developers")}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button className="focus-ring inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                Developers
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-300",
                    openMenu === "Developers" && "rotate-180",
                  )}
                />
              </button>
              {openMenu === "Developers" && (
                <div className="animate-pop absolute left-0 top-full w-[26rem] pt-2">
                  <div className="grid max-h-[70vh] grid-cols-2 gap-1 overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-lift">
                    {[
                      ...DEVELOPER_TAB_LINKS,
                      ...(navSections.find((s) => s.label === "Developers")?.links ?? []),
                    ].map((link) => (
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
          </nav>

        <div className="flex items-center gap-2">
          {!hideOpenApp && (
            <Link
              to="/app"
              className="focus-ring hidden rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-background transition-transform hover:scale-[1.03] sm:inline-flex"
            >
              Open App
            </Link>
          )}
          <UserMenu />
          <button
            onClick={toggleMobileMenu}
            className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-border transition-transform duration-200 active:scale-95 xl:hidden"
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
            "mt-2 max-h-[70vh] overflow-y-auto overscroll-contain rounded-[1.5rem] border border-border/70 bg-white/95 px-3 py-3 shadow-[0_16px_40px_rgb(0_0_0/0.10)] backdrop-blur-xl [-webkit-overflow-scrolling:touch] xl:hidden",
            menuClosing ? "animate-menu-close" : "animate-slide-down",
          )}
        >
          <div className="grid gap-1">
            {primaryLinks.map((link, i) => (
              <Fragment key={link.path}>
                <Link
                  to={link.path}
                  onClick={closeMobileMenu}
                  style={{ animationDelay: `${Math.min(i * 30, 120)}ms` }}
                  className="animate-fade-up rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {link.label}
                </Link>
                {link.path === "/app" &&
                  BROWSE_SUBMENU.map((sub) => (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2.5 rounded-xl py-2 pl-9 pr-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <sub.icon className="h-4 w-4 text-primary" />
                      {sub.label}
                    </Link>
                  ))}
              </Fragment>
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
                {section.label === "Developers" &&
                  DEVELOPER_TAB_LINKS.map((link) => (
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
