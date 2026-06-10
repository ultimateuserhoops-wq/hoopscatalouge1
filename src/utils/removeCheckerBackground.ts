// Client-side checkerboard / flat-background → transparent PNG converter.
//
// Used to clean up product renders that come back from Gemini with a
// gray/white transparency-placeholder checkerboard (or any flat near-neutral
// background) so they composite naturally into the spread.
//
// Algorithm:
//   1. Load the image into a canvas (crossOrigin="anonymous").
//   2. Sample edge pixels (corners + thin border) and keep only near-neutral
//      (low-saturation, light) colors. Cluster into up to 2 background colors.
//   3. Flood-fill from every edge pixel inward; any pixel within tolerance of
//      either background color becomes alpha=0. (Flood — not global keying —
//      so light/gray areas INSIDE the product are preserved.)
//   4. Feather pass on boundary pixels for a soft 1–2px edge.
//
// Results are cached in-memory by source URL so each image is processed once.

export interface RemoveOptions {
  tolerance?: number;       // 0–255, color distance threshold (default 28)
  feather?: boolean;        // run boundary feather pass (default true)
  maxDimension?: number;    // cap working canvas (default 1400)
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
  try { localStorage.setItem(DISABLED_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

export function isCutoutDisabled(src: string): boolean {
  return readDisabledSet().has(src);
}
export function setCutoutDisabled(src: string, disabled: boolean) {
  const s = readDisabledSet();
  if (disabled) s.add(src); else s.delete(src);
  writeDisabledSet(s);
  // bust cache so it re-renders the raw image immediately
  cache.delete(src);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load failed"));
    img.src = src;
  });
}

function isNeutralLight(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  // Low saturation (channels near each other) + reasonably light.
  return max - min < 14 && max > 150;
}

function colorDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleBackgrounds(data: Uint8ClampedArray, w: number, h: number): Array<[number, number, number]> {
  const samples: Array<[number, number, number]> = [];
  const push = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a > 200 && isNeutralLight(r, g, b)) samples.push([r, g, b]);
  };
  const border = 3;
  for (let x = 0; x < w; x += 4) {
    for (let y = 0; y < border; y++) { push(x, y); push(x, h - 1 - y); }
  }
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < border; x++) { push(x, y); push(w - 1 - x, y); }
  }
  if (samples.length === 0) return [];

  // Simple 2-cluster split by luminance (checker = 2 grays).
  const lum = (c: [number, number, number]) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
  const sorted = samples.slice().sort((a, b) => lum(a) - lum(b));
  const mid = sorted[Math.floor(sorted.length / 2)];
  const lower = sorted.filter((c) => lum(c) < lum(mid) + 4);
  const upper = sorted.filter((c) => lum(c) >= lum(mid) + 4);
  const avg = (arr: Array<[number, number, number]>) => {
    if (arr.length === 0) return null;
    const s = arr.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]);
    return [s[0] / arr.length, s[1] / arr.length, s[2] / arr.length] as [number, number, number];
  };
  const out: Array<[number, number, number]> = [];
  const a = avg(lower); if (a) out.push(a);
  const b = avg(upper);
  if (b && (!a || colorDist(a[0], a[1], a[2], b[0], b[1], b[2]) > 12)) out.push(b);
  if (out.length === 0) out.push(avg(sorted)!);
  return out;
}

/** Process an image URL and return a data URL with the background removed. */
export async function removeCheckerBackground(src: string, opts: RemoveOptions = {}): Promise<string> {
  if (!src) return src;
  if (isCutoutDisabled(src)) return src;
  const cached = cache.get(src);
  if (cached) return cached;

  const promise = (async () => {
    const tolerance = opts.tolerance ?? 28;
    const maxDim = opts.maxDimension ?? 1400;
    const feather = opts.feather ?? true;

    const img = await loadImage(src);
    let w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return src;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    w = Math.max(1, Math.round(w * scale));
    h = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const bgs = sampleBackgrounds(data, w, h);
    if (bgs.length === 0) return src; // nothing looked like a checker/flat bg

    const tol2 = tolerance;
    const matchesBg = (r: number, g: number, b: number): number => {
      // Return min distance to any bg color; only consider neutral pixels to
      // avoid eating saturated colors that happen to be light.
      if (!isNeutralLight(r, g, b) && Math.max(r, g, b) - Math.min(r, g, b) > 30) return Infinity;
      let best = Infinity;
      for (const [br, bg, bb] of bgs) {
        const d = colorDist(r, g, b, br, bg, bb);
        if (d < best) best = d;
      }
      return best;
    };

    // Flood-fill from edges.
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];
    const enqueue = (x: number, y: number) => {
      const idx = y * w + x;
      if (visited[idx]) return;
      const di = idx * 4;
      const d = matchesBg(data[di], data[di + 1], data[di + 2]);
      if (d <= tol2) {
        visited[idx] = 1;
        data[di + 3] = 0; // alpha 0
        queue.push(idx);
      } else {
        visited[idx] = 2; // boundary candidate
      }
    };
    for (let x = 0; x < w; x++) { enqueue(x, 0); enqueue(x, h - 1); }
    for (let y = 0; y < h; y++) { enqueue(0, y); enqueue(w - 1, y); }

    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const x = idx % w, y = (idx / w) | 0;
      if (x + 1 < w) enqueue(x + 1, y);
      if (x - 1 >= 0) enqueue(x - 1, y);
      if (y + 1 < h) enqueue(x, y + 1);
      if (y - 1 >= 0) enqueue(x, y - 1);
    }

    // Feather pass: any opaque pixel adjacent to a transparent one gets
    // partial alpha based on color distance to background.
    if (feather) {
      const featherTol = tolerance * 1.8;
      const original = new Uint8ClampedArray(data); // copy of current alphas
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const di = idx * 4;
          if (data[di + 3] === 0) continue;
          // is any neighbor transparent?
          const left = original[(idx - 1) * 4 + 3];
          const right = original[(idx + 1) * 4 + 3];
          const up = original[(idx - w) * 4 + 3];
          const down = original[(idx + w) * 4 + 3];
          if (left && right && up && down) continue;
          const d = matchesBg(data[di], data[di + 1], data[di + 2]);
          if (d < featherTol) {
            const t = Math.max(0, Math.min(1, (d - tolerance) / (featherTol - tolerance)));
            data[di + 3] = Math.round(255 * t);
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL("image/png");
  })().catch(() => src);

  cache.set(src, promise);
  return promise;
}

export function clearCutoutCache(src?: string) {
  if (src) cache.delete(src); else cache.clear();
}