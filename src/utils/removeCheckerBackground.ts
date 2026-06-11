// Client-side wrapper around the /api/photoroom proxy.
//
// Sends a source image URL (or data URL) to our server route which calls
// PhotoRoom's Remove Background API (using the PHOTOROOM_API_KEY secret),
// caches the cutout in Supabase Storage, and returns a public URL.
//
// Public API kept stable for existing callers (ProductCutout, etc.):
//   - removeCheckerBackground(src) -> Promise<string>
//   - isCutoutDisabled(src) / setCutoutDisabled(src, disabled)
//   - clearCutoutCache(src?)

export interface RemoveOptions {
  /** Reserved for future tuning — currently unused (PhotoRoom handles this). */
  tolerance?: number;
  feather?: boolean;
  maxDimension?: number;
}

const cache = new Map<string, Promise<string>>();
const DISABLED_KEY = "hoops:cutout:disabled";

function readDisabledSet(): Set<string> {
  if (typeof localStorage === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISABLED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeDisabledSet(s: Set<string>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DISABLED_KEY, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

export function isCutoutDisabled(src: string): boolean {
  return readDisabledSet().has(src);
}

export function setCutoutDisabled(src: string, disabled: boolean) {
  const s = readDisabledSet();
  if (disabled) s.add(src);
  else s.delete(src);
  writeDisabledSet(s);
  cache.delete(src);
}

export async function removeCheckerBackground(
  src: string,
  _opts: RemoveOptions = {},
): Promise<string> {
  if (!src) return src;
  if (isCutoutDisabled(src)) return src;

  const cached = cache.get(src);
  if (cached) return cached;

  const promise = (async () => {
    try {
      const res = await fetch("/api/photoroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src }),
      });
      if (!res.ok) return src;
      const data = (await res.json()) as { url?: string; error?: string };
      return data.url || src;
    } catch {
      return src;
    }
  })();

  cache.set(src, promise);
  return promise;
}

export function clearCutoutCache(src?: string) {
  if (src) cache.delete(src);
  else cache.clear();
}