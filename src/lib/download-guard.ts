/**
 * IconVault v55 — SITE-WIDE download guard (single choke point).
 *
 * Rule (founder scope addition, v55): before a user downloads ANYTHING they
 * must be signed in. Browsing, searching, previews and copy-to-clipboard are
 * NOT gated — only taking a file away is.
 *
 * How it works:
 * - AuthProvider syncs the signed-in state into this module (see useAuth).
 * - `downloadWithGate(blob, filename)` is the blob path: authed users download
 *   immediately; anonymous users get the blob parked in IndexedDB (blobs do not
 *   fit in sessionStorage) plus a marker, and the auth prompt is requested.
 * - `downloadUrlWithGate(url, filename)` is the static-file path: anonymous
 *   users get the URL + filename parked in sessionStorage instead.
 * - After login/signup, `DownloadGateListener` (mounted in __root) drains the
 *   parked download exactly once, so the download RESUMES AUTOMATICALLY —
 *   the user never has to click again for that file.
 * - Tool exports flow through `downloadBlob` in logo-builder.ts, which calls
 *   this guard — that one call site covers ~190 tool files.
 * - `downloadCsv` in csv.ts is gated the same way.
 * - Nothing here touches the temp-mail signup block, the KV rate limiter,
 *   Google OAuth or the admin login.
 */

export const REQUIRE_AUTH_EVENT = "iconvault:require-auth";
const PENDING_MARKER = "iv-pending-download";
const PENDING_URL_KEY = "iv-pending-download-url";
const IDB_NAME = "iconvault";
const IDB_STORE = "pending-downloads";
const IDB_KEY = "pending";

let authed = false;

/** Called by AuthProvider whenever the session changes. */
export const setGateAuthed = (value: boolean) => {
  authed = value;
};

export const isGateAuthed = () => authed;

/** Synchronous check for "a download is parked" (used by the auth prompt). */
export const hasPendingDownload = (): boolean => {
  try {
    return sessionStorage.getItem(PENDING_MARKER) === "1";
  } catch {
    return false;
  }
};

const markPending = () => {
  try {
    sessionStorage.setItem(PENDING_MARKER, "1");
  } catch {
    /* storage unavailable — in-memory fallback still prompts */
  }
};

const clearMarker = () => {
  try {
    sessionStorage.removeItem(PENDING_MARKER);
    sessionStorage.removeItem(PENDING_URL_KEY);
  } catch {
    /* ignore */
  }
};

/** Ask the root listener to open the existing sign-in prompt. */
export const requestAuthForDownload = () => {
  markPending();
  try {
    window.dispatchEvent(new CustomEvent(REQUIRE_AUTH_EVENT));
  } catch {
    /* ignore */
  }
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

/* ---------------- IndexedDB parked-blob store ---------------- */

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbPut = async (blob: Blob, filename: string): Promise<boolean> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put({ blob, filename }, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
};

const idbTake = async (): Promise<{ blob: Blob; filename: string } | null> => {
  try {
    const db = await openDb();
    const value = await new Promise<{ blob: Blob; filename: string } | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const get = store.get(IDB_KEY);
      get.onsuccess = () => {
        const v = get.result as { blob: Blob; filename: string } | undefined;
        if (v) store.delete(IDB_KEY);
        resolve(v ?? null);
      };
      get.onerror = () => reject(get.error);
    });
    db.close();
    return value;
  } catch {
    return null;
  }
};

/* ---------------- Public API ---------------- */

/**
 * Blob downloads (tool exports, icon PNG/SVG, illustration files, zips).
 * Returns true when the download ran now; false when it was parked for
 * after-login resume (the auth prompt is requested in that case).
 */
export const downloadWithGate = (blob: Blob, filename: string): boolean => {
  if (authed) {
    triggerBlobDownload(blob, filename);
    return true;
  }
  void idbPut(blob, filename).then((stored) => {
    if (!stored) {
      // Last resort: keep the marker so the listener can at least tell the
      // user to retry after signing in (huge blobs / private-mode IDB).
      try {
        sessionStorage.setItem("iv-pending-download-unstored", "1");
      } catch {
        /* ignore */
      }
    }
  });
  requestAuthForDownload();
  return false;
};

/**
 * Static-file downloads (template files, animated-icon files, original SVGs).
 * Returns true when the download ran now; false when parked for resume.
 */
export const downloadUrlWithGate = (url: string, filename: string): boolean => {
  if (authed) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }
  try {
    sessionStorage.setItem(PENDING_URL_KEY, JSON.stringify({ url, filename }));
  } catch {
    /* ignore */
  }
  requestAuthForDownload();
  return false;
};

/* ---------------- Re-derivable multi-file actions (bulk / collections) ---- */
/* These cannot be parked as a single blob before login (the files are only
 * fetched during export), so the export parameters are parked instead and the
 * listener rebuilds the export after login. Bulk quota is only consumed on
 * the rebuilt export, never on the parked attempt. */

export type PendingAction =
  | { kind: "bulk"; ids: string[]; mode: "svg" | "png"; pngSize: number }
  | { kind: "collection"; label: string; ids: string[] };

const PENDING_ACTION_KEY = "iv-pending-download-action";

export const storePendingAction = (action: PendingAction) => {
  try {
    sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action));
  } catch {
    /* ignore */
  }
  requestAuthForDownload();
};

export const takePendingAction = (): PendingAction | null => {
  try {
    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_ACTION_KEY);
    return JSON.parse(raw) as PendingAction;
  } catch {
    return null;
  }
};

/**
 * Drain a parked download once (called by DownloadGateListener after login).
 * Returns "blob" | "url" | "unstored" | null.
 */
export const drainPendingDownload = async (): Promise<"blob" | "url" | "unstored" | null> => {
  const parked = await idbTake();
  if (parked) {
    clearMarker();
    triggerBlobDownload(parked.blob, parked.filename);
    return "blob";
  }
  try {
    const raw = sessionStorage.getItem(PENDING_URL_KEY);
    if (raw) {
      const { url, filename } = JSON.parse(raw) as { url: string; filename: string };
      clearMarker();
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return "url";
    }
    if (sessionStorage.getItem("iv-pending-download-unstored") === "1") {
      sessionStorage.removeItem("iv-pending-download-unstored");
      clearMarker();
      return "unstored";
    }
  } catch {
    /* ignore */
  }
  if (hasPendingDownload()) clearMarker();
  return null;
};
