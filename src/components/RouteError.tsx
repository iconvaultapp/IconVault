/**
 * Shared per-route error fallback (ROB-L3). Without a route-level
 * errorComponent, a render crash in /app, /illustrations or a pack page
 * bubbled to the root boundary and took the whole page down. This keeps
 * the failure local and gives the user a one-click retry.
 */
export default function RouteError() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-2xl font-semibold">This page didn&apos;t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong while rendering it. Your saved icons and account are untouched.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="focus-ring mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
