/**
 * Read a server-side environment variable across runtimes.
 *
 * Cloudflare Workers: dashboard Variables/Secrets arrive as worker env
 * bindings. Nitro's cloudflare preset stashes them on `globalThis.__env__`
 * at the start of every request. They are NOT visible via `process.env`
 * (the `node:process` shim on Workers does not include bindings), so code
 * that only reads `process.env` silently gets `undefined` in production
 * even when the dashboard shows the variable.
 *
 * Local dev / Node: falls back to `process.env` as usual.
 *
 * Server-only module: never import from client code.
 */
export function getServerEnv(name: string): string | undefined {
  const g = globalThis as unknown as Record<string, unknown>;

  // 1) Cloudflare Workers bindings (set by Nitro's cloudflare runtime).
  const workerEnv = g["__env__"] as Record<string, unknown> | undefined;
  const fromWorker = workerEnv?.[name];
  if (typeof fromWorker === "string" && fromWorker !== "") {
    return fromWorker;
  }

  // 2) Plain Node / local dev. Accessed dynamically so bundlers cannot
  // statically rewrite or inline it.
  const procEnv = (g["process"] as { env?: Record<string, string | undefined> } | undefined)?.env;
  const fromProc = procEnv?.[name];
  if (typeof fromProc === "string" && fromProc !== "") {
    return fromProc;
  }

  return undefined;
}
