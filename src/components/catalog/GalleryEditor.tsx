import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadDataUrlToStorage } from "@/lib/storage";
import { readFileAsDataURL, resizeImage } from "@/lib/gemini";
import { notify } from "@/lib/toast";

interface GalleryPhoto {
  id: string;
  spread_id: string;
  photo_url: string;
  title: string | null;
  subtitle: string | null;
  hex_color: string;
  sort_order: number;
}

export function GalleryEditor({ spreadId, spreadTitle }: { spreadId: string; spreadTitle?: string }) {
  const [rows, setRows] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("gallery_photos")
      .select("*")
      .eq("spread_id", spreadId)
      .order("sort_order");
    if (error) notify(error.message, true);
    setRows((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [spreadId]);

  async function addPhoto() {
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { data, error } = await supabase
      .from("gallery_photos")
      .insert({ spread_id: spreadId, photo_url: "", sort_order: nextOrder })
      .select()
      .single();
    if (error) { notify(error.message, true); return; }
    setRows((prev) => [...prev, data as any]);
  }

  async function updateRow(id: string, patch: Partial<GalleryPhoto>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error } = await supabase.from("gallery_photos").update(patch as any).eq("id", id);
    if (error) notify(error.message, true);
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this photo?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("gallery_photos").delete().eq("id", id);
    if (error) notify(error.message, true);
  }

  async function moveRow(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= rows.length) return;
    const a = rows[idx], b = rows[swap];
    const next = [...rows];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[swap] = { ...a, sort_order: b.sort_order };
    setRows(next);
    await Promise.all([
      supabase.from("gallery_photos").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("gallery_photos").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  }

  async function onFileChange(id: string, file: File | undefined) {
    if (!file) return;
    setUploadingId(id);
    try {
      const dataUrl = await readFileAsDataURL(file);
      const resized = await resizeImage(dataUrl, 1600);
      const url = (await uploadDataUrlToStorage(resized, "gallery")) || resized;
      await updateRow(id, { photo_url: url });
      notify("✓ Photo uploaded");
    } catch (e: any) {
      notify(e?.message || "Upload failed", true);
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-[0.6rem] font-condensed tracking-widest uppercase text-white/40 mb-1">Gallery spread</div>
        <div className="text-[0.78rem] font-display tracking-wide text-white">{spreadTitle || spreadId}</div>
      </div>

      <button
        onClick={addPhoto}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded border border-white/10 hover:bg-white/5 text-[0.62rem] font-condensed tracking-widest uppercase text-white/80"
      >
        <Plus size={12} /> Add photo
      </button>

      {loading && <div className="text-[0.6rem] text-white/40 font-condensed tracking-widest uppercase">Loading…</div>}
      {!loading && rows.length === 0 && (
        <div className="text-[0.62rem] text-white/40 font-condensed tracking-widest uppercase">No photos yet. Add one above.</div>
      )}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="rounded border border-white/10 bg-white/[0.02] p-2 space-y-2">
            <div className="flex gap-2">
              <div className="relative w-20 h-24 flex-shrink-0 rounded overflow-hidden bg-black/40 border border-white/10">
                {r.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[0.55rem] tracking-widest uppercase text-white/30">Empty</div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={r.title ?? ""}
                  onChange={(e) => updateRow(r.id, { title: e.target.value })}
                  placeholder="Title (optional)"
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[0.7rem] text-white placeholder:text-white/30"
                />
                <input
                  type="text"
                  value={r.subtitle ?? ""}
                  onChange={(e) => updateRow(r.id, { subtitle: e.target.value })}
                  placeholder="Subtitle (optional)"
                  className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-[0.7rem] text-white placeholder:text-white/30"
                />
                <div className="flex items-center gap-2">
                  <label className="text-[0.55rem] font-condensed tracking-widest uppercase text-white/40">Color</label>
                  <input
                    type="color"
                    value={r.hex_color || "#FF4D00"}
                    onChange={(e) => updateRow(r.id, { hex_color: e.target.value })}
                    className="w-7 h-6 bg-transparent border border-white/10 rounded cursor-pointer"
                  />
                  <span className="text-[0.6rem] text-white/40 font-mono">{r.hex_color}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <input
                ref={(el) => { fileRefs.current[r.id] = el; }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { onFileChange(r.id, e.target.files?.[0]); e.target.value = ""; }}
              />
              <button
                onClick={() => fileRefs.current[r.id]?.click()}
                disabled={uploadingId === r.id}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded border border-white/10 hover:bg-white/5 text-[0.58rem] font-condensed tracking-widest uppercase text-white/80 disabled:opacity-50"
              >
                <Upload size={10} /> {uploadingId === r.id ? "Uploading…" : r.photo_url ? "Replace" : "Upload"}
              </button>
              <button
                onClick={() => moveRow(r.id, -1)}
                disabled={i === 0}
                className="p-1.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-30"
                title="Move up"
              ><ArrowUp size={11} /></button>
              <button
                onClick={() => moveRow(r.id, 1)}
                disabled={i === rows.length - 1}
                className="p-1.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-30"
                title="Move down"
              ><ArrowDown size={11} /></button>
              <button
                onClick={() => deleteRow(r.id)}
                className="p-1.5 rounded border border-white/10 hover:bg-red-500/20 text-red-400"
                title="Delete"
              ><Trash2 size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}