import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { callGemini, callGeminiTwoImages, readFileAsDataURL, resizeImage, BG_REMOVAL_PROMPT, compositeOntoBackground, getCurrentThemeBg, getAIErrorMessage, buildColorVariationPrompt, buildOnBodyMatchPrompt, downloadImageHD } from "@/lib/gemini";
import { notify } from "@/lib/toast";
import type { ColorVariant } from "@/lib/catalog-types";

interface Props {
  color: ColorVariant;
  slot: "jersey" | "body" | "motion";
  icon: string;
  label: string;
  accept: string;
  allowRecolor?: boolean;
  sourceColor: ColorVariant | null;
  onUpdate: (id: string, patch: Partial<ColorVariant>) => void;
}

const FIELDS = {
  jersey: ["jersey_photo", "jersey_photo_name"],
  body: ["body_photo", "body_photo_name"],
  motion: ["motion_gif", "motion_gif_name"],
} as const;

export function UploadSlot({ color, slot, icon, label, accept, allowRecolor, sourceColor, onUpdate }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [photoField, nameField] = FIELDS[slot];
  const photo = (color[photoField] as string | null) ?? null;

  async function handleFile(file: File) {
    setBusy("Uploading...");
    try {
      const raw = await readFileAsDataURL(file);
      const resized = slot === "motion" ? raw : await resizeImage(raw, 1024);
      onUpdate(color.id, { [photoField]: resized, [nameField]: file.name } as any);
    } finally { setBusy(null); }
  }

  async function removeBg() {
    if (!photo) return;
    setBusy("Removing BG...");
    try {
      const transparent = await callGemini(photo, BG_REMOVAL_PROMPT);
      onUpdate(color.id, { [photoField]: transparent } as any);
      notify("Background removed");
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally { setBusy(null); }
  }


  const sourcePhoto = (sourceColor?.[photoField] as string | null) ?? null;
  const canGenerateBodyFromJersey = slot === "body" && !!color.jersey_photo;
  const canRecolor = !!allowRecolor && (!!sourcePhoto || canGenerateBodyFromJersey);

  async function recolor() {
    if (!sourcePhoto && !canGenerateBodyFromJersey) {
      notify("No source photo to recolor from", true);
      return;
    }
    setBusy("Recoloring...");
    try {
      let result: string;
      if (slot === "body" && color.jersey_photo) {
        const prompt = buildOnBodyMatchPrompt(color.name, color.hex_main, !!color.is_light, color.note);
        if (sourcePhoto) {
          // Use a real on-body template + jersey reference for best match.
          result = await callGeminiTwoImages(sourcePhoto, color.jersey_photo, prompt, 1536);
        } else {
          // No on-body template yet — generate from the jersey design alone.
          result = await callGemini(color.jersey_photo, prompt, 1536);
        }
      } else {
        const prompt = buildColorVariationPrompt(
          color.hex_main, color.hex_shade || color.hex_main,
          color.name, !!color.is_light, color.note
        );
        result = await callGemini(sourcePhoto!, prompt, slot === "body" ? 1536 : 1024);
      }
      onUpdate(color.id, { [photoField]: result } as any);
      notify(`${color.name} generated`);
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally { setBusy(null); }
  }

  return (
    <div className="relative min-h-[68px] rounded border border-white/15 bg-black/40 overflow-hidden group">
      {!photo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <label className="flex flex-col items-center cursor-pointer hover:opacity-80">
            <span className="text-xl">{icon}</span>
            <span className="text-[0.55rem] tracking-widest text-white/60 font-condensed mt-1">{label}</span>
            <input type="file" accept={accept} className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </label>
          {canRecolor && (
            <button onClick={recolor} disabled={!!busy}
              className="text-[0.55rem] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white">
              🎨 Generate
            </button>
          )}
        </div>
      )}
      {photo && (
        <>
          <img src={photo} alt={label} className="w-full h-[68px] object-cover" />
          <button
            onClick={() => downloadImageHD(photo, `${color.name.replace(/\s+/g, "-").toLowerCase()}-${slot}.${slot === "motion" ? "gif" : "png"}`, 2400)}
            className="absolute top-1 right-6 w-4 h-4 rounded-full bg-black/70 border border-white/20 text-white text-[10px] flex items-center justify-center hover:bg-black"
            title="Download HD"
          >↓</button>
          <button onClick={() => onUpdate(color.id, { [photoField]: null, [nameField]: null } as any)}
            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center"
            aria-label="Remove"><X size={10} /></button>

          <div className="absolute bottom-0 inset-x-0 bg-black/70 flex gap-1 p-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={removeBg} disabled={!!busy}
              className="text-[0.55rem] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white">✂ BG</button>
            {allowRecolor && (
              <button onClick={recolor} disabled={!!busy}
                className="text-[0.55rem] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white">🎨 Recolor</button>
            )}
          </div>
        </>
      )}
      {busy && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-[0.55rem] gap-1">
          <Loader2 className="animate-spin" size={14} /> {busy}
        </div>
      )}
    </div>
  );
}
