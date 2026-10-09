import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { navSections } from "@/components/nav-data";
import type { IconifyCollection } from "@/lib/iconify";
import { cn } from "@/lib/utils";

interface IconifySidebarProps {
  collections: Record<string, IconifyCollection>;
  activePrefix: string | null;
  onPrefixClick: (prefix: string | null) => void;
}

export const IconifySidebar = ({ collections, activePrefix, onPrefixClick }: IconifySidebarProps) => {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const sorted = Object.entries(collections).sort((a, b) => b[1].total - a[1].total);

  return (
    <aside className="font-balloon sticky top-[4.25rem] hidden h-[calc(100vh-4.25rem)] w-64 shrink-0 overflow-y-auto overflow-x-hidden overscroll-contain border-r border-white/10 bg-[#111113] px-3 py-5 text-white lg:block">
      {navSections.map((section) => (
        <div key={section.label} className="mb-5">
          <p className="eyebrow px-2 pb-2 text-white/50">{section.label}</p>
          <div className="grid gap-0.5">
            {section.links.map((link) => {
              const active = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-200",
                    active
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-white/65 hover:translate-x-0.5 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="border-t border-white/10 pt-4">
        <p className="eyebrow px-2 pb-2 text-white/50">Icon sets ({sorted.length})</p>
        <div className="grid gap-0.5">
          <button
            onClick={() => {
              onPrefixClick(null);
              void navigate({ to: "/" });
            }}
            className={cn(
              "flex w-full min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
              activePrefix === null && pathname === "/"
                ? "bg-primary font-medium text-primary-foreground"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <Package className="h-4 w-4 shrink-0" /> <span className="truncate">All icon sets</span>
          </button>
          {sorted.map(([prefix, col]) => (
            <button
              key={prefix}
              onClick={() => {
                onPrefixClick(prefix);
                void navigate({ to: "/" });
              }}
              className={cn(
                "flex w-full min-w-0 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors",
                activePrefix === prefix
                  ? "bg-primary font-medium text-primary-foreground"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              <span className="truncate">{col.name}</span>
              <span className="shrink-0 font-mono text-[10px] opacity-70">{col.total.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default IconifySidebar;
