import { supabase } from "@/integrations/supabase/client";

const BUCKET = "hoops-catalog-images";

export const COLOR_IMAGE_FIELDS = ["jersey_photo", "body_photo", "motion_gif"] as const;
export const TEMPLATE_IMAGE_FIELDS = ["template_jersey", "template_back", "template_shorts"] as const;

export function isDataUrl(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("data:");
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("svg")) return "svg";
  return "jpg";
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; contentType: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = (meta.match(/data:([^;]+);/)?.[1]) || "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return { blob: new Blob([arr], { type: mime }), ext: extFromMime(mime), contentType: mime };
}

/** Upload a base64 data URL to storage and return the public URL. Pass-through for http(s) URLs. */
export async function uploadDataUrlToStorage(value: string | null | undefined, folder = "img"): Promise<string | null | undefined> {
  if (!value) return value;
  if (!isDataUrl(value)) return value;
  const { blob, ext, contentType } = dataUrlToBlob(value);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) {
    console.error("[storage] upload failed", error);
    return value; // fallback: keep base64 so the app still works
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Walk an updates object and upload any base64 image fields, replacing them with public URLs. */
export async function uploadImageFieldsInUpdates<T extends Record<string, any>>(
  updates: T,
  fields: readonly string[],
  folder = "img"
): Promise<T> {
  const out: Record<string, any> = { ...updates };
  await Promise.all(
    fields.map(async (k) => {
      if (k in out && isDataUrl(out[k])) {
        out[k] = await uploadDataUrlToStorage(out[k], folder);
      }
    })
  );
  return out as T;
}

/** One-time migration: convert any existing base64 rows in color_variants + template_sets to storage URLs. */
export async function migrateBase64ToStorage(onProgress?: (msg: string) => void): Promise<{ migrated: number; failed: number }> {
  let migrated = 0;
  let failed = 0;

  const { data: colors } = await supabase.from("color_variants").select("id, jersey_photo, body_photo, motion_gif");
  for (const row of colors || []) {
    const patch: Record<string, string | null> = {};
    for (const k of COLOR_IMAGE_FIELDS) {
      const v = (row as any)[k];
      if (isDataUrl(v)) {
        try {
          const url = await uploadDataUrlToStorage(v, `colors/${k}`);
          if (typeof url === "string" && !url.startsWith("data:")) {
            patch[k] = url;
            migrated++;
            onProgress?.(`migrated color ${row.id} ${k}`);
          } else failed++;
        } catch { failed++; }
      }
    }
    if (Object.keys(patch).length) await supabase.from("color_variants").update(patch).eq("id", row.id);
  }

  const { data: templates } = await supabase.from("template_sets").select("id, template_jersey, template_back, template_shorts");
  for (const row of templates || []) {
    const patch: Record<string, string | null> = {};
    for (const k of TEMPLATE_IMAGE_FIELDS) {
      const v = (row as any)[k];
      if (isDataUrl(v)) {
        try {
          const url = await uploadDataUrlToStorage(v, `templates/${k}`);
          if (typeof url === "string" && !url.startsWith("data:")) {
            patch[k] = url;
            migrated++;
            onProgress?.(`migrated template ${row.id} ${k}`);
          } else failed++;
        } catch { failed++; }
      }
    }
    if (Object.keys(patch).length) await supabase.from("template_sets").update(patch).eq("id", row.id);
  }

  return { migrated, failed };
}