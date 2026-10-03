import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";
import logoUrl from "@/assets/iconvault-logo.svg";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string | undefined;
}

export interface DashboardNavSection {
  title?: string;
  items: DashboardNavItem[];
}

export interface DashboardUserMenu {
  name: string;
  email?: string | undefined;
  profileTo?: string;
  onSignOut: () => void;
}

interface DashboardShellProps {
  sidebarSections: DashboardNavSection[];
  activeId: string;
  onNavigate: (id: string) => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  userMenu: DashboardUserMenu;
  children: ReactNode;
  /** Where the logo links. Defaults to "/". */
  brandTo?: string;
}

function SidebarBody({
  sections,
  activeId,
  onNavigate,
  brandTo,
  onItemClick,
}: {
  sections: DashboardNavSection[];
  activeId: string;
  onNavigate: (id: string) => void;
  brandTo: string;
  onItemClick?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link
        to={brandTo}
        onClick={onItemClick}
        className="focus-ring flex items-center gap-2.5 px-5 pb-5 pt-6"
        aria-label="IconVault home"
      >
        <img src={logoUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-contain" />
        <span className="font-display text-lg font-semibold tracking-tight">
          Icon<span className="text-primary">Vault</span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Dashboard navigation">
        {sections.map((section, si) => (
          <div key={section.title ?? `section-${si}`} className={si > 0 ? "mt-6" : ""}>
            {section.title && (
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {section.title}
              </p>
            )}
            <ul className="grid gap-1">
              {section.items.map((item) => {
                const active = item.id === activeId;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        onItemClick?.();
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "focus-ring group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_4px_16px_-4px_var(--primary)]"
                          : "text-sidebar-foreground hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                            active
                              ? "bg-white/20 text-white"
                              : "bg-primary-soft text-primary",
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function UserMenuBlock({ userMenu }: { userMenu: DashboardUserMenu }) {
  const [open, setOpen] = useState(false);
  const initial = (userMenu.name || userMenu.email || "?").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open ]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="focus-ring flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-2.5 transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-sm"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/60 font-display text-sm font-semibold text-primary-foreground ring-2 ring-primary/20">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">
          {userMenu.name}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{userMenu.name}</p>
              {userMenu.email && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{userMenu.email}</p>
              )}
            </div>
            {userMenu.profileTo && (
              <Link
                to={userMenu.profileTo}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="focus-ring flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                <UserRound className="h-4 w-4 text-muted-foreground" /> Profile
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                userMenu.onSignOut();
              }}
              className="focus-ring flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Shared dashboard layout: fixed left sidebar, top bar with title and user
 * menu, card-based content area. The sidebar collapses into a drawer on
 * mobile, opened with the hamburger in the top bar.
 */
export function DashboardShell({
  sidebarSections,
  activeId,
  onNavigate,
  title,
  subtitle,
  actions,
  userMenu,
  children,
  brandTo = "/",
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarBody
          sections={sidebarSections}
          activeId={activeId}
          onNavigate={onNavigate}
          brandTo={brandTo}
        />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slide-up border-r border-sidebar-border bg-sidebar shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="focus-ring absolute right-3 top-5 rounded-full p-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody
              sections={sidebarSections}
              activeId={activeId}
              onNavigate={onNavigate}
              brandTo={brandTo}
              onItemClick={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          {/* Subtle brand gradient accent */}
          <div
            aria-hidden
            className="h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent"
          />
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="focus-ring rounded-full p-2 text-muted-foreground hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-semibold tracking-tight sm:text-xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
            <UserMenuBlock userMenu={userMenu} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
