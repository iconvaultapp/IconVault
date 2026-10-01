import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, FolderOpen, Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Browse", path: "/app" },
  { icon: Wrench, label: "Tools", path: "/tools", center: true },
  { icon: FolderOpen, label: "Saved", path: "/collections" },
  { icon: User, label: "Account", path: "/profile" },
] as const;

/**
 * Fixed bottom navigation for small screens only. The root layout reserves
 * matching bottom padding so it never covers page content.
 */
export const MobileTabBar = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {tabs.map((tab) => {
          const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
          const isCenter = "center" in tab && tab.center;
          return (
            <li key={tab.path} className="flex-1">
              <Link
                to={tab.path}
                aria-current={active ? "page" : undefined}
                aria-label={tab.label}
                className={cn(
                  "focus-ring flex flex-col items-center gap-1 rounded-xl px-1 pb-2.5 pt-1 text-[10px] font-medium transition-all duration-200 active:scale-95",
                  active && !isCenter ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid place-items-center transition-all duration-300 ease-out",
                    isCenter
                      ? "-translate-y-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-background"
                      : "h-8 w-8 rounded-xl",
                    !isCenter && (active ? "scale-105 bg-primary-soft" : "scale-100 bg-transparent"),
                    isCenter && active && "scale-105",
                  )}
                >
                  <tab.icon className={isCenter ? "h-6 w-6" : "h-4.5 w-4.5"} />
                </span>
                <span className={cn(isCenter && "-mt-3 font-bold", isCenter && active && "text-primary")}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
