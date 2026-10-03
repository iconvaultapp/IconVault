import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyStateIllustration } from "./EmptyState";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

/**
 * Styled table wrapper: sticky-ish header row, hover rows, horizontal scroll
 * on small screens. Pass columns + rows; render functions control cells.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyText = "Nothing here yet.",
  emptyHint,
  minWidth = 640,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyText?: string;
  emptyHint?: string;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-4 py-3 font-semibold", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6">
                <div className="flex flex-col items-center text-center">
                  <EmptyStateIllustration className="h-24" />
                  <p className="mt-3 text-sm font-medium">{emptyText}</p>
                  {emptyHint && (
                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">{emptyHint}</p>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-muted/40">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3", c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
