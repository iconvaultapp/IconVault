// Ambient declarations for JS-only vendor packages used via dynamic import.
declare module "heic2any";
declare module "utif";

// sql.js is loaded from a CDN at runtime via dynamic import with @vite-ignore
// (not bundled). The ambient module declaration lives here (not in the tool
// file) because a .tsx module file can only *augment* existing modules.
declare module "https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/sql-wasm.js" {
  const initSqlJs: (config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>;
  export default initSqlJs;
}

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}
interface SqlJsDatabase {
  exec(sql: string): SqlJsResult[];
  close(): void;
}
interface SqlJsResult {
  columns: string[];
  values: unknown[][];
}
