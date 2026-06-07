// Gemini AI image tools — runs entirely in the browser.
import { supabase } from "@/integrations/supabase/client";

const KEY_LS = "hoops_gemini_key";
const MODEL = "gemini-3.1-flash-image";

declare global {
  interface Window { __geminiKey?: string }
}

export function getGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return window.__geminiKey || localStorage.getItem(KEY_LS) || "";
}

export function setGeminiKey(key: string) {
  if (typeof window !== "undefined") {
    window.__geminiKey = key;
    localStorage.setItem(KEY_LS, key);
  }
}

export async function loadGeminiKeyFromDb() {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "gemini_api_key")
    .maybeSingle();
  if (data?.value) setGeminiKey(data.value);
  return data?.value || "";
}

export async function saveGeminiKeyToDb(key: string) {
  setGeminiKey(key);
  await supabase
    .from("app_settings")
    .upsert(
      { key: "gemini_api_key", value: key, label: "Gemini API Key" },
      { onConflict: "key" }
    );
}

export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 170;
}

export function resizeImage(dataUrl: string, maxSide = 1024): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      if (longest <= maxSide) { resolve(dataUrl); return; }
      const scale = maxSide / longest;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function callGemini(imageDataUrl: string, promptText: string, maxSide = 1024): Promise<string> {
  return callGeminiImages([imageDataUrl], promptText, maxSide);
}

export async function callGeminiTwoImages(
  sourceImageDataUrl: string,
  templateImageDataUrl: string,
  promptText: string,
  maxSide = 1024
): Promise<string> {
  return callGeminiImages([sourceImageDataUrl, templateImageDataUrl], promptText, maxSide);
}

async function callGeminiImages(imageDataUrls: string[], promptText: string, maxSide = 1024): Promise<string> {

  const key = getGeminiKey();
  if (!key || key.length < 10) throw new Error("NO_KEY");

  const parts: any[] = [];
  for (const url of imageDataUrls) {
    const resized = await resizeImage(url, maxSide);

    const base64 = resized.split(",")[1];
    const mimeMatch = resized.match(/data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }
  parts.push({ text: promptText });

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const respParts = data?.candidates?.[0]?.content?.parts || [];
  const imgPart = respParts.find((p: any) => p.inlineData || p.inline_data);
  const inline = imgPart?.inlineData || imgPart?.inline_data;
  if (!inline?.data) {
    const textPart = respParts.find((p: any) => p.text);
    if (textPart) throw new Error(textPart.text.slice(0, 140));
    throw new Error("No image returned");
  }
  const mt = inline.mimeType || inline.mime_type || "image/png";
  return `data:${mt};base64,${inline.data}`;
}

export async function compositeOntoBackground(transparentDataUrl: string, bgColor: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 800;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(transparentDataUrl);
    img.src = transparentDataUrl;
  });
}

export function getCurrentThemeBg(): string {
  if (typeof window === "undefined") return "#0a0a0a";
  return getComputedStyle(document.documentElement).getPropertyValue("--t-bg").trim() || "#0a0a0a";
}

export function getLeftPageBg(themeId?: string | null): string {
  return themeId === "white" ? "#f0ebe0" : "#0a0a0a";
}

export const BG_REMOVAL_PROMPT = `Remove the background from this photo completely. Preserve the subject's ORIGINAL colors, exposure, and tones exactly as captured — do NOT brighten, darken, or color-grade the subject.

WHAT TO REMOVE:
- Studio backdrop, wall, floor, props, lighting rigs, shadows on the floor
- ANY background pattern. Do NOT draw a checkerboard, grid, gradient, or any placeholder pattern.

WHAT TO KEEP — DO NOT REMOVE:
- The person/model in full (head, hair, arms, hands, legs, feet)
- The jersey, shorts, socks, shoes, and any sports equipment (ball) they hold
- The product itself completely intact

REQUIREMENTS:
- Output a PNG with a TRUE 100% TRANSPARENT alpha channel behind the subject
- NO white fill, NO grey fill, NO checkerboard, NO transparency-indicator pattern — pure alpha 0
- Clean cutout with realistic edge softness around hair and fingers
- Keep the ORIGINAL exposure, brightness, contrast, saturation, and white balance of the subject — do not lift midtones, do not boost vibrance, do not recover shadows, do not darken anything. The pixels of the subject should match the input.
- Preserve every detail of the product (logos, numbers, stitching, fabric texture)`;

export function buildMatchBgPrompt(targetColor: string) {
  return `You are a professional product photo editor.

TASK: Replace the background of this photo with this exact solid color: ${targetColor}

REQUIREMENTS:
1. The product and person (if present) must remain COMPLETELY UNCHANGED
2. Replace the ENTIRE background with a perfectly clean, solid fill of ${targetColor}
3. The background must be uniformly flat — no gradients, no texture, no vignette
4. Blend the subject's edges naturally into the new background
5. Output: flat image, same dimensions, no transparency

TARGET COLOR (copy exactly): ${targetColor}
${targetColor.toLowerCase() === "#0a0a0a" ? "This color is near-black — RGB(10,10,10)." : ""}`;
}

function computeContrastTrim(hexMain: string): string {
  const hex = hexMain.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  if (luminance > 180) return "#1a1a1a";
  if (luminance > 120) {
    const dr = Math.max(0, r - 80);
    const dg = Math.max(0, g - 80);
    const db = Math.max(0, b - 80);
    return "#" + [dr, dg, db].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  return "#FFFFFF";
}

function computeGraphicColor(hexMain: string, trimColor: string): string {
  const hex = trimColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  if (luminance < 100) return hexMain;
  return "#1a1a1a";
}

export function buildColorVariationPrompt(
  hexMain: string, hexShade: string, colorName: string, isLight: boolean, note?: string | null
) {
  const textContrast = isLight ? "dark charcoal (#1a1a1a)" : "white (#FFFFFF)";
  const noteSection = note?.trim() ? `\n\nADDITIONAL DESIGNER NOTES:\n${note.trim()}` : "";

  return `You are a professional sportswear colorist. Produce a ${colorName} colorway of THIS EXACT jersey by recoloring only — do not redesign.

TARGET COLOR: ${hexMain} (use ${hexShade} for fabric shadows / darker folds)
NUMBER & NAME TEXT: ${textContrast}

RECOLOR RULE — preserve the source design 1:1:
- Look at the source image and identify every design element on the jersey and shorts: graphics, logos, stripes, panels, patterns, trims, waistband, collar, side tape, prints, textures.
- Keep EVERY one of those elements in EXACTLY the same shape, position, size, layout, and proportion.
- Recolor the main fabric (jersey body + shorts main panels) to ${hexMain}.
- For all OTHER design elements (stripes, graphics, logos, trims, patterns), keep their EXISTING relative color relationships from the source: if a stripe was lighter than the body in the source, it stays lighter; if a graphic was white/light in the source, it stays white/light; if a trim was a gradient of accent colors, keep that same gradient (just harmonized with the new base color where needed for contrast).
- The player number and name keep ${textContrast}.

ABSOLUTELY DO NOT:
- Do NOT invent new stripes, side panels, star patterns, tape, or any graphic that is not in the source.
- Do NOT remove, move, resize, or restyle any existing graphic, stripe, or logo.
- Do NOT change the jersey cut, neckline shape, armhole shape, shorts length, or silhouette.
- Do NOT change the model (skin, face, hair, body, pose, shoes, socks, basketball) or the background.
- Do NOT change fabric texture or lighting direction.

Think of this as a fabric dye change on the same exact garment — every print, panel and trim from the source must appear in the result in the same place, only the base fabric color changes to ${hexMain}.${noteSection}`;
}

export function darkenHex(hex: string, amount: number = 40): string {
  const h = hex.replace("#", "");
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(h.slice(0, 2), 16) - amount);
  const g = clamp(parseInt(h.slice(2, 4), 16) - amount);
  const b = clamp(parseInt(h.slice(4, 6), 16) - amount);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}


export function getAIErrorMessage(err: any): string {
  const msg = (err?.message || String(err) || "").trim();
  if (msg === "NO_KEY") return "⚠ No API key — enter Gemini key in Colors tab";
  if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) return "⚠ Invalid API key";
  if (msg.includes("PERMISSION_DENIED")) return "⚠ Key lacks permission — enable Gemini API";
  if (msg.includes("QUOTA_EXCEEDED") || msg.includes("429")) return "⚠ Quota exceeded — wait and retry";
  if (msg.includes("No image returned")) return "⚠ No image returned — try again";
  if (msg.includes("HTTP 400")) return "⚠ Image too large or bad format";
  if (msg.includes("HTTP 403")) return "⚠ Key lacks image generation access";
  return `⚠ ${msg.slice(0, 90)}`;
}

export function buildJerseyDisplayPrompt(
  colorName: string,
  hexMain: string,
  hexShade: string,
  isLight: boolean,
  note?: string | null
): string {
  const trimColor = computeContrastTrim(hexMain);
  const textContrast = isLight ? "#1a1a1a" : "#FFFFFF";
  const noteSection = note?.trim() ? `\n\nDESIGNER NOTES FROM THE HOOPS TEAM:\n${note.trim()}` : "";

  return `You are a professional sportswear design artist and product photographer.

You have been given TWO images:
- IMAGE 1: A basketball player wearing a jersey set. This is your DESIGN SOURCE.
- IMAGE 2: A flat-lay jersey template on a hanger/stand/neutral surface. This is your CANVAS.

═══════════════════════════════════════════════════
STEP 1 — EXTRACT these design elements from IMAGE 1:
═══════════════════════════════════════════════════

A. PRIMARY FABRIC COLOR: ${hexMain} — the main body color of the jersey
B. SECONDARY / TRIM COLOR: ${trimColor} — collar, sleeve edges, waistband, side panel borders
C. SIDE PANEL DESIGN: the vertical stripe or panel running down the sides of the jersey and shorts — extract its exact shape, width, and color
D. COLLAR DESIGN: exact style (V-neck, crew, band collar), color, and trim detail
E. SLEEVE EDGES: the trim band color and width around each armhole
F. TEAM NAME / LETTERING: the exact text, font style, color (${textContrast}), and position on the chest
G. PLAYER NUMBER: the number, its size, color (${textContrast}), outline color (${trimColor}), and position on the front
H. WAISTBAND: the shorts waistband color, stripe pattern, and width
I. LOGOS: positions and colors of any brand logos (Nike swoosh, team badge) on the jersey
J. ANY DECORATIVE PATTERNS: stars, geometric shapes, sublimation patterns, gradient panels — extract all of them

═══════════════════════════════════════════════════
STEP 2 — APPLY to IMAGE 2 (the template) with PRECISION:
═══════════════════════════════════════════════════

1. PRIMARY FABRIC: Fill all main body panels of the template jersey with ${hexMain}
   Use ${hexShade} for shadow/fold areas to maintain realistic fabric depth

2. SIDE PANELS: Apply the side panel design extracted from Image 1 to the corresponding side positions of the template jersey
   Match the exact proportions and color (${trimColor})

3. COLLAR: Reproduce the exact collar style from Image 1 on the template collar
   Color: ${trimColor}

4. SLEEVE EDGES: Apply the armhole trim from Image 1 to the template's sleeve openings
   Color: ${trimColor}, same width proportionally

5. TEAM NAME: Place the team name text on the template chest in the same vertical/horizontal position as Image 1
   Color: ${textContrast}, same font style

6. NUMBER: Place the player number on the template front center, same size and position as Image 1
   Fill: ${textContrast}, Outline: ${trimColor}

7. WAISTBAND: Apply the waistband stripe to the template shorts with matching color and proportion

8. LOGOS: Place all logos in their exact relative positions on the template

9. DECORATIVE PATTERNS: Apply any geometric patterns, sublimation prints, or decorative elements from Image 1 to their corresponding positions on the template

═══════════════════════════════════════════════════
CRITICAL OUTPUT RULES:
═══════════════════════════════════════════════════

✅ The output MUST match the template's shape, hanger/stand, and background exactly
✅ Keep the template's background (hanger, surface, color) completely unchanged
✅ The final jersey must look like a professional flat-lay product photo
✅ All design proportions must match Image 1's jersey design — scaled to fit the template dimensions
✅ Fabric texture should look realistic — not flat fill, actual mesh/fabric appearance
✅ Realistic lighting and shadows based on the template's existing light source direction

❌ Do NOT show any person or model in the output
❌ Do NOT change the template's shape, fold positions, or composition
❌ Do NOT invent new design elements not present in Image 1
❌ Do NOT simplify or omit any design detail from Image 1

COLORWAY SUMMARY:
- Primary: ${hexMain} (${colorName})
- Trim/Accent: ${trimColor}
- Text/Numbers: ${textContrast}
- Shadow/Fold: ${hexShade}${noteSection}`;
}

export async function upscaleImage(dataUrl: string, targetWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(1, targetWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png", 1.0));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function downloadImageHD(dataUrl: string, filename: string, targetWidth = 2400) {
  const isGif = /\.gif$/i.test(filename) || dataUrl.startsWith("data:image/gif");
  const href = isGif ? dataUrl : await upscaleImage(dataUrl, targetWidth);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

