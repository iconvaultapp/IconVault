/**
 * Real pagination for the big icon grids (PERF-H3). The old "Load more"
 * grew the DOM to 2,000 cards (each with its own observer + fetches) and
 * never shrank it. One page is 96 cards; moving pages unmounts the rest.
 */
export function GridPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  // Numbered window: up to 5 pages, centred on the current one.
  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
  const numbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  const btn =
    "focus-ring rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-default disabled:opacity-40 disabled:hover:border-border disabled:hover:text-inherit";
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-sm text-muted-foreground">
        Showing {from.toLocaleString("en-US")}–{to.toLocaleString("en-US")} of{" "}
        {total.toLocaleString("en-US")}
      </p>
      <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pages">
        <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className={btn}>
          Prev
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${btn} ${n === page ? "border-primary bg-primary-soft font-semibold text-primary" : ""}`}
          >
            {n + 1}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          className={btn}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
