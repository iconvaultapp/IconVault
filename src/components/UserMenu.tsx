import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { navSections } from "@/components/nav-data";
import { cn } from "@/lib/utils";

export const UserMenu = ({ compact = false }: { compact?: boolean }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) {
    return (
      <Link
        to="/auth"
        className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-all hover:border-primary/40 hover:text-primary"
      >
        <LogIn className="h-4 w-4" />
        {compact ? "" : "Sign in"}
      </Link>
    );
  }

  const initial = (user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-3 transition-colors hover:border-primary/40"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
          {initial}
        </span>
        <span className="hidden max-w-[110px] truncate text-sm text-muted-foreground sm:block">
          {user.email?.split("@")[0]}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="animate-pop absolute right-0 top-full z-50 mt-2 max-h-[75vh] w-64 overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-lift">
          <button
            onClick={() => {
              void navigate({ to: "/profile" });
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
          >
            <UserIcon className="h-4 w-4 text-muted-foreground" /> My profile
          </button>

          {navSections.map((section) => (
            <div key={section.label} className="mt-1 border-t border-border pt-1">
              <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {section.label}
              </p>
              {section.links.map((link) => (
                <button
                  key={link.path}
                  onClick={() => {
                    void navigate({ to: link.path });
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <link.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{link.label}</span>
                </button>
              ))}
            </div>
          ))}

          <div className="mt-1 border-t border-border pt-1">
            <button
              onClick={() => {
                void signOut();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
