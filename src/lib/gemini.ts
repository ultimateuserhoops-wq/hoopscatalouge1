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

  return `You are a professional sportswear colorist. Produce a ${colorName} colorway of THIS EXACT garment (could be a jersey, jacket, hoodie, shorts, pants, or any apparel — match whatever is in the source image) by recoloring only — do not redesign.

TARGET COLOR: ${hexMain} (use ${hexShade} for fabric shadows / darker folds)
TEXT / NUMBER COLOR (if any text or numbers exist on the garment): ${textContrast}

RECOLOR RULE — preserve the source design 1:1:
- Look at the source image and identify EVERY design element on the garment(s) shown: graphics, logos, stripes, panels, patterns, trims, collar, cuffs, hem, waistband, side tape, zippers, pockets, prints, textures, embroidery — whatever is actually present.
- Keep EVERY one of those elements in EXACTLY the same shape, position, size, layout, and proportion.
- Recolor only the MAIN FABRIC / body panels of the garment to ${hexMain}.
- For all OTHER design elements (stripes, graphics, logos, trims, patterns, zippers, hardware), keep their EXISTING relative color relationships from the source: if a stripe was lighter than the body in the source, it stays lighter; if a graphic was white/light in the source, it stays white/light; if a trim was a gradient of accent colors, keep that same gradient (just harmonized with the new base color where needed for contrast).
- Any text / numbers / lettering keep ${textContrast}.

ABSOLUTELY DO NOT:
- Do NOT invent new stripes, panels, patterns, tape, pockets, zippers, or any graphic / hardware that is not in the source.
- Do NOT remove, move, resize, or restyle any existing graphic, stripe, or logo.
- Do NOT change the garment cut, neckline, collar style, armhole shape, sleeve length, hem length, zipper placement, or overall silhouette.
- Do NOT change the model (if any: skin, face, hair, body, pose, shoes, props, accessories) or the background / studio / hangers / racks.
- Do NOT change fabric texture or lighting direction.
- Do NOT swap the garment type — if the source shows a jacket, keep it a jacket; if it shows a jersey, keep it a jersey.

Think of this as a fabric dye change on the same exact garment — every print, panel, trim, and piece of hardware from the source must appear in the result in the same place, only the base fabric color changes to ${hexMain}.${noteSection}`;
}

export function buildOnBodyMatchPrompt(
  colorName: string, hexMain: string, isLight: boolean, note?: string | null
) {
  const textContrast = isLight ? "dark charcoal (#1a1a1a)" : "white (#FFFFFF)";
  const noteSection = note?.trim() ? `\n\nADDITIONAL DESIGNER NOTES:\n${note.trim()}` : "";
  return `You are a professional sportswear product photographer. You have TWO images:
- IMAGE 1: an ON-BODY (or on-hanger / on-rack / flat-lay) photo showing how the garment is worn or displayed. This is your CANVAS — keep the model / mannequin / hangers / rack, pose, body, skin, hair, face, shoes, props, lighting, camera angle, and background EXACTLY as-is.
- IMAGE 2: the FINAL ${colorName} garment design (already approved — could be a jersey, jacket, hoodie, shorts, pants, etc.). This is your DESIGN REFERENCE — the garment in IMAGE 1 must match this EXACTLY in colour, graphics, stripes, panels, logos, text, trims, collar, cuffs, hem, zippers, and every print.

TASK: Repaint the garment(s) shown in IMAGE 1 so they become a 1:1 replica of the garment(s) shown in IMAGE 2 — same colour, same design elements, same hardware. Match whatever garment type is in IMAGE 2 onto the same garment area in IMAGE 1.

STRICT RULES:
- Base fabric colour: ${hexMain} (${colorName}) — must match IMAGE 2 exactly.
- Any text / number / lettering colour: ${textContrast} — match IMAGE 2.
- Copy every graphic, stripe, panel, logo, trim, collar, cuff, hem, zipper, sleeve edge, sublimation pattern from IMAGE 2 onto the garment in IMAGE 1, in the same positions and proportions (adapted to the actual drape / pose / fabric folds in IMAGE 1).
- Do NOT change the model / mannequin, pose, body, skin tone, hair, face, hands, shoes, props, hangers, rack, background, lighting, or camera.
- Do NOT invent any design element that is not in IMAGE 2.
- Do NOT swap the garment type or silhouette shown in IMAGE 1 — only repaint / redesign what is already there.
- Output must be a clean, sharp, high-resolution on-body product photo, photorealistic, with realistic fabric folds and shading consistent with IMAGE 1's lighting.${noteSection}`;
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

  return `You are a professional apparel design artist and product photographer.

You have been given TWO images:
- IMAGE 1: A model / mannequin / on-body or on-hanger photo showing the FULL garment design (could be a jersey, jacket, hoodie, shorts, pants, or any apparel). This is your DESIGN SOURCE.
- IMAGE 2: A flat-lay garment template on a hanger / stand / neutral surface. This is your CANVAS.

═══════════════════════════════════════════════════
STEP 1 — EXTRACT design elements from IMAGE 1:
═══════════════════════════════════════════════════

Look at IMAGE 1 carefully and identify EVERY design element actually present — do not assume basketball-specific parts exist. Catalogue whatever you see:
- PRIMARY FABRIC COLOR (target: ${hexMain})
- SECONDARY / TRIM COLOR (target accent: ${trimColor}) — collar, cuffs, hem, side panels, zipper tape, waistband, edge tape
- SIDE PANELS / STRIPES — shape, width, color
- COLLAR / HOOD / NECKLINE — exact style and trim
- SLEEVE EDGES / CUFFS — color, width, ribbing
- TEXT / LETTERING / TEAM NAME — exact text, font, color (${textContrast}), position
- NUMBERS — size, color (${textContrast}), outline (${trimColor}), position
- HEM / WAISTBAND — color, stripe pattern, width
- ZIPPERS, POCKETS, BUTTONS, DRAWSTRINGS — color, placement, hardware
- LOGOS — position and color of every brand mark and badge
- DECORATIVE PATTERNS — stripes, stars, geometric shapes, sublimation, gradients

If the source has no number, no text, no waistband, etc. — skip that element. Only reproduce what is actually there.

═══════════════════════════════════════════════════
STEP 2 — APPLY to IMAGE 2 (the template) with PRECISION:
═══════════════════════════════════════════════════

1. PRIMARY FABRIC: Fill all main body panels of the template with ${hexMain}.
   Use ${hexShade} for shadow / fold areas to maintain realistic fabric depth.

2. SIDE PANELS / STRIPES: Apply the panels/stripes from IMAGE 1 to the corresponding positions on the template, in color ${trimColor} (or whatever color they had in IMAGE 1), matching proportions.

3. COLLAR / HOOD / NECKLINE: Reproduce the exact collar/hood/neckline style and trim from IMAGE 1 on the template, color ${trimColor} where applicable.

4. SLEEVE EDGES / CUFFS: Apply the cuff/sleeve-edge style from IMAGE 1 to the template's sleeve openings, color ${trimColor}, same width proportionally.

5. TEXT / LETTERING: If present, place text on the template in the same position as IMAGE 1, color ${textContrast}, same font style.

6. NUMBERS: If present, place numbers in the same position, fill ${textContrast}, outline ${trimColor}.

7. HEM / WAISTBAND: If present, apply the hem/waistband detail to the template with matching color and proportion.

8. ZIPPERS / POCKETS / HARDWARE: If present in IMAGE 1, place them in the same positions on the template with the same colors.

9. LOGOS: Place all logos in their exact relative positions on the template.

10. DECORATIVE PATTERNS: Apply any geometric patterns, sublimation prints, or decorative elements from IMAGE 1 to the corresponding positions on the template.

═══════════════════════════════════════════════════
CRITICAL OUTPUT RULES:
═══════════════════════════════════════════════════

✅ The output MUST match the template's shape, hanger/stand, and background exactly.
✅ Keep the template's background (hanger, surface, color) completely unchanged.
✅ The final garment must look like a professional flat-lay product photo.
✅ All design proportions must match IMAGE 1's design — scaled to fit the template dimensions.
✅ Fabric texture should look realistic — actual fabric appearance, not flat fill.
✅ Realistic lighting and shadows based on the template's existing light source direction.

❌ Do NOT show any person or model in the output.
❌ Do NOT change the template's garment type, shape, fold positions, or composition.
❌ Do NOT invent new design elements not present in IMAGE 1.
❌ Do NOT simplify or omit any design detail from IMAGE 1.
❌ Do NOT swap the garment type — if the template is a jacket, output a jacket; if it's a jersey, output a jersey.

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

