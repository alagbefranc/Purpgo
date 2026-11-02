// Recovers a tab left open across a deploy: its lazy chunks no longer exist,
// so the first import of one fails. One reload fetches the new index and
// chunk names; the sessionStorage stamp stops a reload loop if the failure
// persists (a real outage rather than a stale tab).

const KEY = "purpgo-chunk-reload";
const WINDOW_MS = 30_000;

const CHUNK_ERROR = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|ChunkLoadError|Loading chunk/i;

export function isChunkLoadError(error: unknown): boolean {
    if (!error) return false;
    const e = error as { name?: unknown; message?: unknown };
    const text = `${typeof e.name === "string" ? e.name : ""} ${typeof e.message === "string" ? e.message : String(error)}`;
    return CHUNK_ERROR.test(text);
}

/** Reloads the page unless one already happened in the last ~30s. Returns whether it reloaded. */
export function reloadForStaleChunk(): boolean {
    if (typeof window === "undefined") return false;
    let last = 0;
    try {
        last = Number(window.sessionStorage.getItem(KEY)) || 0;
    } catch { /* storage blocked: fall through, still guarded below */ }
    const now = Date.now();
    if (now - last < WINDOW_MS) return false;
    try {
        window.sessionStorage.setItem(KEY, String(now));
    } catch {
        // Without storage there is no loop guard, so do not reload.
        return false;
    }
    window.location.reload();
    return true;
}

export function installChunkReload(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("vite:preloadError", (event) => {
        if (reloadForStaleChunk()) event.preventDefault();
    });
    // A load that stays healthy past the guard window clears the stamp, so a
    // later deploy can recover the same tab again.
    window.setTimeout(() => {
        try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    }, WINDOW_MS + 1_000);
}
