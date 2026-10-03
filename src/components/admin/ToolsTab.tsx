import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { listToolSettings, setToolSetting, type ToolSettingRow } from "@/lib/admin.tabs.functions";
import { DataTable } from "@/components/dashboard/DataTable";
import { cn } from "@/lib/utils";

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "focus-ring relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

function FreeLimitInput({
  row,
  saveLimit,
}: {
  row: ToolSettingRow;
  saveLimit: (v: number | null) => Promise<boolean>;
}) {
  const [value, setValue] = useState(row.free_limit == null ? "" : String(row.free_limit));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(row.free_limit == null ? "" : String(row.free_limit));
  }, [row.free_limit]);

  const save = async () => {
    const trimmed = value.trim();
    if (trimmed !== "" && (!Number.isFinite(Number(trimmed)) || Number(trimmed) < 0)) {
      toast.error("Free limit must be a positive number or empty");
      return;
    }
    const next = trimmed === "" ? null : Math.max(0, Math.round(Number(trimmed)));
    if (next === row.free_limit) return;
    setSaving(true);
    try {
      const ok = await saveLimit(next);
      if (ok) toast.success(`Free limit updated for ${row.name}`);
      else toast.error("Could not save free limit");
    } catch {
      toast.error("Could not save free limit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        value={value}
        placeholder="Default"
        aria-label={`Free limit for ${row.name}`}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
        }}
        className="w-24 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm tabular-nums outline-none transition-colors focus:border-primary/50"
      />
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </span>
  );
}

/** Per-tool kill switches and free-tier limits. */
export function ToolsTab() {
  const [settings, setSettings] = useState<ToolSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const fetchAll = useServerFn(listToolSettings);
  const saveFn = useServerFn(setToolSetting);

  const load = async () => {
    setLoading(true);
    try {
      const { settings } = await fetchAll({ data: undefined });
      setSettings(settings);
    } catch {
      toast.error("Could not load tool settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (id: string, patch: { enabled?: boolean; free_limit?: number | null }) => {
    const res = await saveFn({ data: { id, ...patch } });
    return res;
  };

  const toggle = async (row: ToolSettingRow) => {
    try {
      const res = await save(row.id, { enabled: !row.enabled });
      if (res.ok) {
        setSettings((prev) =>
          prev.map((x) => (x.id === row.id ? { ...x, enabled: !row.enabled } : x)),
        );
        toast.success(row.enabled ? `${row.name} disabled` : `${row.name} enabled`);
      } else toast.error("Could not update tool");
    } catch {
      toast.error("Could not update tool");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return settings;
    return settings.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    );
  }, [settings, query]);

  const enabledCount = settings.filter((s) => s.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading tool settings…
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50"
          />
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          {enabledCount} of {settings.length} enabled
        </p>
      </div>

      <div className="mt-4">
        <DataTable<ToolSettingRow>
          minWidth={720}
          emptyText="No tools match your search."
          columns={[
            {
              key: "name",
              header: "Tool",
              render: (r) => <span className="font-medium">{r.name}</span>,
            },
            { key: "category", header: "Category", render: (r) => r.category },
            {
              key: "enabled",
              header: "Enabled",
              render: (r) => (
                <Toggle on={r.enabled} onChange={() => void toggle(r)} label={`Toggle ${r.name}`} />
              ),
            },
            {
              key: "limit",
              header: "Free limit",
              render: (r) => (
                <FreeLimitInput
                  row={r}
                  saveLimit={async (v) => {
                    try {
                      const res = await save(r.id, { free_limit: v });
                      if (res.ok) {
                        setSettings((prev) =>
                          prev.map((x) => (x.id === r.id ? { ...x, free_limit: v } : x)),
                        );
                        return true;
                      }
                      return false;
                    } catch {
                      return false;
                    }
                  }}
                />
              ),
            },
          ]}
          rows={filtered}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Free limit is the number of free uses per month. Leave empty to use the site default.
      </p>
    </div>
  );
}
