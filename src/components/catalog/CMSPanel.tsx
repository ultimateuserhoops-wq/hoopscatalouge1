import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Sparkles, LogOut, Check, Upload, Wand2, Download, FileText } from "lucide-react";
import type { CatalogTheme, ColorVariant, Product, SpecRow, TemplateSet } from "@/lib/catalog-types";
import type { SpreadDef } from "@/lib/catalog-spreads";
import { UploadSlot } from "./UploadSlot";
import { GalleryEditor } from "./GalleryEditor";
import { buildColorVariationPrompt, buildJerseyDisplayPrompt, callGemini, callGeminiTwoImages, downloadImageHD, getAIErrorMessage, loadGeminiKeyFromDb, readFileAsDataURL, resizeImage, saveGeminiKeyToDb } from "@/lib/gemini";

import { notify } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { useTemplateSet } from "@/hooks/useTemplateSet";
import { useNavigate } from "@tanstack/react-router";

type Tab = "theme" | "pages" | "info" | "colors" | "specs" | "page" | "gallery";

interface Props {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  colorVariants: ColorVariant[];
  specRows: SpecRow[];
  themes: CatalogTheme[];
  updateProduct: (p: Partial<Product>) => void;
  updateColorVariant: (id: string, p: Partial<ColorVariant>) => void;
  addColor: () => void;
  deleteColor: (id: string) => void;
  addSpec: () => void;
  updateSpec: (id: string, p: Partial<SpecRow>) => void;
  deleteSpec: (id: string) => void;
  selectTheme: (theme_id: string) => void;
  updateCustomTheme: (patch: Partial<CatalogTheme>) => void;
  spreads: SpreadDef[];
  addProductPage: (opts: { name: string; category: string; sku?: string }) => Promise<{ sku: string; spreadId: string }>;
  deleteSpread: (spread_id: string) => Promise<void>;
  onSpreadChange?: (index: number) => void;
  currentSpread?: SpreadDef | null;
}

export function CMSPanel(p: Props) {
  const [tab, setTab] = useState<Tab>("theme");
  const [keyInput, setKeyInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => { if (p.open) loadGeminiKeyFromDb().then((k) => setKeyInput(k || "")); }, [p.open]);

  const isGallery = p.currentSpread?.type === "gallery";
  useEffect(() => {
    if (p.open && isGallery) setTab("gallery");
  }, [p.open, isGallery, p.currentSpread?.id]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div
      className={`fixed top-0 right-0 h-full z-50 bg-[#0a0a0a] text-white shadow-2xl transition-all duration-300 ${
        p.open ? "w-[420px]" : "w-0"
      } overflow-hidden`}
    >
      <div className="flex items-center justify-between px-4 h-12 border-b border-white/10">
        <div className="font-display tracking-widest text-lg">CMS</div>
        <div className="flex items-center gap-2">
          <button onClick={signOut} className="text-[0.6rem] font-condensed tracking-widest px-2 py-1 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1">
            <LogOut size={11} /> SIGN OUT
          </button>
          <button onClick={p.onClose} className="p-1 hover:bg-white/10 rounded"><X size={16} /></button>
        </div>
      </div>

      <div className="flex border-b border-white/10 text-[0.6rem] font-condensed tracking-widest">
        {((isGallery
          ? ["theme","pages","gallery"]
          : ["theme","pages","info","colors","specs","page"]) as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 uppercase ${tab===t?"bg-white/10 text-white":"text-white/50 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="cms-scroll overflow-y-auto h-[calc(100vh-92px)] p-4 space-y-4">
        {tab === "theme" && <ThemeTab themes={p.themes} selectTheme={p.selectTheme} updateCustomTheme={p.updateCustomTheme} />}
        {tab === "pages" && (
          <PagesTab
            spreads={p.spreads}
            addProductPage={p.addProductPage}
            deleteSpread={p.deleteSpread}
            onSpreadChange={p.onSpreadChange}
          />
        )}
        {tab === "info" && (p.product
          ? <InfoTab product={p.product} updateProduct={p.updateProduct} />
          : <EmptyProductHint />)}
        {tab === "colors" && p.product && (
          <ColorsTab
            keyInput={keyInput} setKeyInput={setKeyInput}
            productId={p.product.id}
            productSku={p.product.sku}
            colorVariants={p.colorVariants}
            updateColorVariant={p.updateColorVariant}
            addColor={p.addColor} deleteColor={p.deleteColor}
          />
        )}
        {tab === "colors" && !p.product && <EmptyProductHint />}

        {tab === "specs" && <SpecsTab specRows={p.specRows} addSpec={p.addSpec} updateSpec={p.updateSpec} deleteSpec={p.deleteSpec} />}
        {tab === "page" && (p.product
          ? <PageTab product={p.product} updateProduct={p.updateProduct} />
          : <EmptyProductHint />)}
        {tab === "gallery" && (isGallery && p.currentSpread
          ? <GalleryEditor spreadId={p.currentSpread.id} spreadTitle={p.currentSpread.label || p.currentSpread.title} />
          : <div className="text-[0.65rem] text-white/40 font-condensed tracking-widest uppercase">Open a gallery spread to manage its photos.</div>)}
      </div>
    </div>
  );
}

function EmptyProductHint() {
  return (
    <div className="text-[0.65rem] text-white/40 font-condensed tracking-widest uppercase">
      Open a product page to edit its details.
    </div>
  );
}

function PagesTab({ spreads, addProductPage, deleteSpread, onSpreadChange }: {
  spreads: SpreadDef[];
  addProductPage: (opts: { name: string; category: string; sku?: string }) => Promise<{ sku: string; spreadId: string }>;
  deleteSpread: (spread_id: string) => Promise<void>;
  onSpreadChange?: (index: number) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [sku, setSku] = useState("");
  const [busy, setBusy] = useState(false);

  const productSpreads = spreads.filter((s) => s.type === "product");
  const categories = Array.from(new Set(productSpreads.map((s) => s.category).filter(Boolean))) as string[];

  async function handleAdd() {
    if (!name.trim() || !category.trim()) {
      notify("Name and category are required", true);
      return;
    }
    setBusy(true);
    try {
      const res = await addProductPage({ name: name.trim(), category: category.trim().toUpperCase(), sku: sku.trim() || undefined });
      notify(`✓ Added page for ${res.sku}`);
      setName(""); setSku("");
      // Jump to the newly created spread
      setTimeout(() => {
        const idx = spreads.findIndex((s) => s.id === res.spreadId);
        if (idx >= 0 && onSpreadChange) onSpreadChange(idx);
      }, 250);
    } catch (e: any) {
      notify(e?.message || "Failed to add page", true);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(spread_id: string, label: string) {
    if (!confirm(`Remove "${label}"? This will also delete its product and colors.`)) return;
    try {
      await deleteSpread(spread_id);
      notify(`✓ Removed ${label}`);
    } catch (e: any) {
      notify(e?.message || "Failed to remove page", true);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-2 flex items-center gap-1">
          <FileText size={11} /> Create product page
        </div>
        <div className="space-y-2 p-2 border border-white/10 rounded bg-white/5">
          <Field label="Product name" value={name} onChange={setName} />
          <div>
            <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-1">Category</div>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="cms-category-list"
              placeholder="e.g. JERSEYS"
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-white/30 uppercase"
            />
            <datalist id="cms-category-list">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Field label="SKU (optional)" value={sku} onChange={setSku} />
          <div className="text-[0.55rem] text-white/40 italic">Default color is BLACK (#000000).</div>
          <button
            onClick={handleAdd}
            disabled={busy}
            className="w-full py-2 rounded bg-[var(--t-accent)] text-white text-[0.6rem] font-condensed tracking-widest flex items-center justify-center gap-1 disabled:opacity-50">
            <Plus size={12} /> {busy ? "ADDING…" : "ADD PRODUCT PAGE"}
          </button>
        </div>
      </div>

      <div>
        <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-2">
          Product pages ({productSpreads.length})
        </div>
        <div className="space-y-1.5">
          {productSpreads.map((s) => {
            const idx = spreads.findIndex((x) => x.id === s.id);
            return (
              <div key={s.id} className="flex items-center gap-2 p-2 border border-white/10 rounded bg-white/5">
                <button
                  onClick={() => onSpreadChange?.(idx)}
                  className="flex-1 text-left text-xs font-condensed tracking-wide hover:text-[var(--t-accent)]">
                  <div>{s.label}</div>
                  <div className="text-[0.55rem] text-white/40">
                    {s.category} · p.{String(s.pageLeft).padStart(2,"0")}–{String(s.pageRight).padStart(2,"0")}
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.label)}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-white/5 rounded"
                  aria-label="Delete page">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* --- Sub-tabs --- */

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-1">{label}</div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-white/30" />
    </label>
  );
}

function ThemeTab({ themes, selectTheme, updateCustomTheme }: { themes: CatalogTheme[]; selectTheme: (id: string) => void; updateCustomTheme: (p: Partial<CatalogTheme>) => void }) {
  const active = themes.find((t) => t.is_active);
  const presets = themes.filter((t) => t.theme_id !== "custom");
  return (
    <div className="space-y-4">
      <div>
        <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-2">Preset themes</div>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((t) => (
            <button key={t.theme_id} onClick={() => selectTheme(t.theme_id)}
              className={`relative h-16 rounded overflow-hidden border ${active?.theme_id===t.theme_id?"border-white":"border-white/10"}`}>
              <div className="absolute inset-0" style={{ background: t.bg }} />
              <div className="absolute top-0 right-0 bottom-0 w-1/5" style={{ background: t.accent }} />
              <div className="absolute bottom-0 inset-x-0 text-[0.45rem] font-condensed tracking-widest text-white/80 text-center py-0.5 bg-black/50">{t.name}</div>
              {active?.theme_id===t.theme_id && <Check size={12} className="absolute top-1 left-1 text-white" />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-2">Custom builder</div>
        {(["accent","bg","surface","text_color","display_bg"] as const).map((key) => {
          const val = active?.[key] || "#000000";
          return (
            <div key={key} className="flex items-center gap-2 mb-2">
              <input type="color" value={val} onChange={(e) => updateCustomTheme({ [key]: e.target.value } as any)}
                className="w-9 h-9 rounded border border-white/10 bg-transparent" />
              <div className="text-[0.6rem] font-condensed tracking-widest text-white/60 uppercase w-20">{key === "display_bg" ? "Display BG" : key.replace("_color","")}</div>
              <input value={val} onChange={(e) => updateCustomTheme({ [key]: e.target.value } as any)}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs font-mono" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InfoTab({ product, updateProduct }: { product: Product; updateProduct: (p: Partial<Product>) => void }) {
  return (
    <div className="space-y-3">
      <Field label="Product name" value={product.name} onChange={(v) => updateProduct({ name: v })} />
      <Field label="Subtitle" value={product.subtitle || ""} onChange={(v) => updateProduct({ subtitle: v })} />
      <Field label="Category" value={product.category || ""} onChange={(v) => updateProduct({ category: v })} />
      <Field label="SKU" value={product.sku} onChange={(v) => updateProduct({ sku: v })} />
      <Field label="Description" value={product.description || ""} onChange={(v) => updateProduct({ description: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price" value={product.price || ""} onChange={(v) => updateProduct({ price: v })} />
        <Field label="Original price" value={product.price_original || ""} onChange={(v) => updateProduct({ price_original: v })} />
      </div>
      <Field label="Save badge" value={product.price_save_label || ""} onChange={(v) => updateProduct({ price_save_label: v })} />
      <Field label="Corner badge" value={product.badge_label || ""} onChange={(v) => updateProduct({ badge_label: v })} />
      <Field label="Season label" value={product.season_label || ""} onChange={(v) => updateProduct({ season_label: v })} />
    </div>
  );
}

function ColorsTab({ keyInput, setKeyInput, productId, productSku, colorVariants, updateColorVariant, addColor, deleteColor }: {
  keyInput: string; setKeyInput: (s: string) => void;
  productId: string;
  productSku: string;
  colorVariants: ColorVariant[];
  updateColorVariant: (id: string, p: Partial<ColorVariant>) => void;
  addColor: () => void; deleteColor: (id: string) => void;
}) {

  const { templateSet, updateTemplate } = useTemplateSet(productId);
  const [generatingJerseyFor, setGeneratingJerseyFor] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(colorVariants[0]?.id || null);
  const [batchBusy, setBatchBusy] = useState<string | null>(null);
  // The primary reference jersey for THIS product — generated variants are recolored from it,
  // so the style/template stays consistent with the product's own jersey (not another product's).
  const sourceColor = colorVariants.find((c) => c.jersey_photo) || null;
  const missing = colorVariants.filter((c) => !c.jersey_photo && c.id !== sourceColor?.id);

  async function saveKey() {
    await saveGeminiKeyToDb(keyInput.trim());
    notify("API key saved");
  }

  async function generateAll() {
    if (!sourceColor?.jersey_photo) return;
    for (let i = 0; i < missing.length; i++) {
      const t = missing[i];
      setBatchBusy(`Generating ${i+1}/${missing.length}: ${t.name}`);
      try {
        const prompt = buildColorVariationPrompt(t.hex_main, t.hex_shade || t.hex_main, t.name, !!t.is_light, t.note);
        const result = await callGemini(sourceColor.jersey_photo, prompt);
        updateColorVariant(t.id, { jersey_photo: result });
      } catch (e) { notify(`${t.name}: ${getAIErrorMessage(e)}`, true); }
      await new Promise((r) => setTimeout(r, 1500));
    }
    setBatchBusy(null);
    notify("Batch generation complete");
  }

  async function generateJerseyDisplay(colorId: string) {
    const c = colorVariants.find((x) => x.id === colorId);
    if (!c?.body_photo) return;
    if (!templateSet?.template_jersey) {
      notify("Upload a jersey template in Template Set first", true);
      return;
    }
    setGeneratingJerseyFor(colorId);
    try {
      const prompt = buildJerseyDisplayPrompt(c.name, c.hex_main, c.hex_shade || c.hex_main, !!c.is_light, c.note);
      const result = await callGeminiTwoImages(c.body_photo, templateSet.template_jersey, prompt, 1536);

      await updateColorVariant(colorId, {
        jersey_photo: result,
        jersey_photo_name: `generated-${c.name.toLowerCase().replace(/\s+/g, "-")}.png`,
      });
      notify(`✓ ${c.name} jersey display generated`);
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally {
      setGeneratingJerseyFor(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="border border-white/10 rounded p-2 space-y-2 bg-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${keyInput.length > 10 ? "bg-emerald-500" : "bg-gray-500"}`} />
          <label className="text-[0.55rem] font-condensed tracking-widest uppercase text-white/60 flex-1">Gemini API key</label>
        </div>
      <div className="flex gap-1">
          <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="AIza..."
            className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-xs font-mono" />
          <button onClick={saveKey} className="px-3 text-[0.55rem] font-condensed tracking-widest rounded bg-[var(--t-accent)] text-white">SAVE</button>
        </div>
      </div>

      <TemplateSetSection templateSet={templateSet} updateTemplate={updateTemplate} />

      {sourceColor && missing.length > 0 && (
        <button onClick={generateAll} disabled={!!batchBusy}
          className="w-full py-2 rounded bg-white/10 hover:bg-white/15 text-[0.6rem] font-condensed tracking-widest flex items-center justify-center gap-1 disabled:opacity-50">
          <Sparkles size={11} /> {batchBusy || `GENERATE ALL MISSING (${missing.length})`}
        </button>
      )}

      <div className="space-y-2">
        {colorVariants.map((c) => {
          const isOpen = open === c.id;
          return (
            <div key={c.id} className="border border-white/10 rounded overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : c.id)}
                className="w-full flex items-center gap-2 p-2 hover:bg-white/5">
                <div className="w-8 h-8 rounded overflow-hidden border border-white/10 flex-shrink-0">
                  {c.jersey_photo
                    ? <img loading="lazy" decoding="async" src={c.jersey_photo} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${c.hex_main}, ${c.hex_shade || c.hex_main})` }} />}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-condensed tracking-widest">{c.name}</div>
                  <div className="text-[0.55rem] text-white/40 font-mono">{c.hex_main}</div>
                </div>
              </button>
              {isOpen && (
                <div className="p-2 space-y-2 border-t border-white/10">
                  <Field label="Color name" value={c.name} onChange={(v) => updateColorVariant(c.id, { name: v })} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-1">Main hex</div>
                      <div className="flex gap-1">
                        <input type="color" value={c.hex_main} onChange={(e) => updateColorVariant(c.id, { hex_main: e.target.value })} className="w-8 h-8 rounded border border-white/10 bg-transparent" />
                        <input value={c.hex_main} onChange={(e) => updateColorVariant(c.id, { hex_main: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded px-2 text-xs font-mono" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-1">Shade hex</div>
                      <div className="flex gap-1">
                        <input type="color" value={c.hex_shade || "#000000"} onChange={(e) => updateColorVariant(c.id, { hex_shade: e.target.value })} className="w-8 h-8 rounded border border-white/10 bg-transparent" />
                        <input value={c.hex_shade || ""} onChange={(e) => updateColorVariant(c.id, { hex_shade: e.target.value })} className="flex-1 bg-white/5 border border-white/10 rounded px-2 text-xs font-mono" />
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-[0.6rem] font-condensed tracking-widest text-white/70 uppercase">
                    <input type="checkbox" checked={!!c.is_light} onChange={(e) => updateColorVariant(c.id, { is_light: e.target.checked })} />
                    Light jersey (use dark contrast)
                  </label>
                  <Field label="AI note" value={c.note || ""} onChange={(v) => updateColorVariant(c.id, { note: v })} />
                  <div>
                    <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-1">Product displays</div>
                    <div className="grid grid-cols-3 gap-2">
                      <UploadSlot color={c} slot="jersey" icon="👕" label="JERSEY" accept="image/*"
                        allowRecolor sourceColor={colorVariants.find((x) => x.jersey_photo && x.id !== c.id) || null}
                        onUpdate={updateColorVariant} />
                      <UploadSlot color={c} slot="body" icon="🧍" label="ON BODY" accept="image/*"
                        allowRecolor sourceColor={colorVariants.find((x) => x.body_photo && x.id !== c.id) || null}
                        onUpdate={updateColorVariant} />
                      <UploadSlot color={c} slot="motion" icon="🎞" label="MOTION" accept="image/gif,image/*"
                        sourceColor={null} onUpdate={updateColorVariant} />
                    </div>
                  </div>
                  {c.body_photo && templateSet?.template_jersey && (
                    <button
                      onClick={() => generateJerseyDisplay(c.id)}
                      disabled={generatingJerseyFor === c.id}
                      className="w-full py-2 rounded border border-[var(--t-accent)]/40 bg-[var(--t-accent)]/10 text-[var(--t-accent)] hover:bg-[var(--t-accent)] hover:text-black text-[0.6rem] font-condensed tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      <Wand2 size={11} />
                      {generatingJerseyFor === c.id
                        ? "GENERATING DISPLAY…"
                        : c.jersey_photo ? "✨ REGENERATE JERSEY DISPLAY" : "✨ GENERATE JERSEY DISPLAY"}
                    </button>
                  )}
                  <button onClick={() => deleteColor(c.id)} disabled={colorVariants.length<=1}
                    className="text-[0.55rem] font-condensed tracking-widest text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-30">
                    <Trash2 size={11} /> DELETE COLOR
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={addColor} className="w-full py-2 border border-dashed border-white/20 rounded text-[0.6rem] font-condensed tracking-widest hover:bg-white/5 flex items-center justify-center gap-1">
        <Plus size={12} /> ADD COLOR
      </button>
      {colorVariants.some((c) => c.jersey_photo) && (
        <button
          onClick={async () => {
            const withPhotos = colorVariants.filter((c) => c.jersey_photo);
            for (const c of withPhotos) {
              const filename = `${productSku || "jersey"}-${c.name.replace(/\s+/g, "-").toLowerCase()}.png`;
              await downloadImageHD(c.jersey_photo!, filename, 2400);
              await new Promise((r) => setTimeout(r, 400));
            }
            notify(`✓ Downloaded ${withPhotos.length} photos`);
          }}
          className="w-full mt-2 py-2 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-[0.6rem] font-condensed tracking-widest text-white/70 flex items-center justify-center gap-1.5"
        >
          <Download size={11} /> DOWNLOAD ALL JERSEY PHOTOS (HD)
        </button>
      )}

    </div>
  );
}

function SpecsTab({ specRows, addSpec, updateSpec, deleteSpec }: {
  specRows: SpecRow[]; addSpec: () => void; updateSpec: (id: string, p: Partial<SpecRow>) => void; deleteSpec: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {specRows.map((s) => (
        <div key={s.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input value={s.label} onChange={(e) => updateSpec(s.id, { label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs" />
          <input value={s.value} onChange={(e) => updateSpec(s.id, { value: e.target.value })}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs" />
          <button onClick={() => deleteSpec(s.id)} className="p-1.5 text-red-400 hover:bg-white/5 rounded"><Trash2 size={12} /></button>
        </div>
      ))}
      {specRows.length < 6 && (
        <button onClick={addSpec} className="w-full py-2 border border-dashed border-white/20 rounded text-[0.6rem] font-condensed tracking-widest hover:bg-white/5 flex items-center justify-center gap-1">
          <Plus size={12} /> ADD SPEC
        </button>
      )}
    </div>
  );
}

function PageTab({ product, updateProduct }: { product: Product; updateProduct: (p: Partial<Product>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Left page #" value={product.page_left || ""} onChange={(v) => updateProduct({ page_left: v })} />
        <Field label="Right page #" value={product.page_right || ""} onChange={(v) => updateProduct({ page_right: v })} />
      </div>
      <Field label="Collection label" value={product.collection_label || ""} onChange={(v) => updateProduct({ collection_label: v })} />
      <Field label="CTA button text" value={product.cta_label || ""} onChange={(v) => updateProduct({ cta_label: v })} />
    </div>
  );
}

function TemplateSetSection({
  templateSet,
  updateTemplate,
}: {
  templateSet: TemplateSet | null;
  updateTemplate: (p: Partial<TemplateSet>) => Promise<void>;
}) {
  const slots: Array<{
    key: keyof TemplateSet;
    nameKey: keyof TemplateSet;
    label: string;
    icon: string;
    required?: boolean;
  }> = [
    { key: "template_jersey", nameKey: "template_name", label: "Jersey", icon: "👕", required: true },
    { key: "template_shorts", nameKey: "template_shorts_name", label: "Shorts", icon: "🩳" },
    { key: "template_back", nameKey: "template_back_name", label: "Back", icon: "🔄" },
  ];

  async function handleUpload(photoKey: keyof TemplateSet, nameKey: keyof TemplateSet, file: File) {
    const dataUrl = await readFileAsDataURL(file);
    const resized = await resizeImage(dataUrl, 1024);
    await updateTemplate({ [photoKey]: resized, [nameKey]: file.name } as Partial<TemplateSet>);
    notify(`✓ ${file.name} uploaded as template`);
  }

  return (
    <div className="border border-[var(--t-accent)]/20 rounded p-2 bg-[var(--t-accent)]/[0.03] space-y-2">
      <div className="flex items-center gap-2 pb-1.5 border-b border-[var(--t-accent)]/20">
        <div className="text-[0.6rem] font-condensed tracking-widest text-[var(--t-accent)] uppercase font-bold">
          Template Set
        </div>
        <div className="text-[0.55rem] text-white/40 italic font-condensed">
          — for AI Jersey Display
        </div>
      </div>
      <div className="space-y-1.5">
        {slots.map((s) => (
          <TemplateSlot
            key={s.key as string}
            label={s.label}
            icon={s.icon}
            required={s.required}
            photo={templateSet?.[s.key] as string | null | undefined}
            photoName={templateSet?.[s.nameKey] as string | null | undefined}
            onUpload={(file) => handleUpload(s.key, s.nameKey, file)}
            onRemove={() => updateTemplate({ [s.key]: null, [s.nameKey]: null } as Partial<TemplateSet>)}
          />
        ))}
      </div>
      <div className="text-[0.55rem] text-white/50 leading-relaxed border-l-2 border-[var(--t-accent)] pl-2 py-1">
        💡 Upload a plain flat jersey. Gemini reads the player's colorway from the On-Body photo and renders it onto your template.
      </div>
    </div>
  );
}

function TemplateSlot({
  label, icon, required, photo, photoName, onUpload, onRemove,
}: {
  label: string;
  icon: string;
  required?: boolean;
  photo?: string | null;
  photoName?: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-2">
      <div className={`w-14 text-[0.55rem] font-condensed tracking-widest uppercase flex-shrink-0 ${photo ? "text-white" : "text-white/50"}`}>
        {label}{required && <span className="text-[var(--t-accent)] ml-0.5">*</span>}
      </div>
      {photo ? (
        <div className="flex-1 flex items-center gap-1.5 bg-black/40 border border-white/10 rounded px-1.5 py-1">
          <img loading="lazy" decoding="async" src={photo} alt={label} className="w-8 h-8 object-contain flex-shrink-0" />
          <div className="flex-1 text-[0.55rem] text-white/60 truncate font-condensed">{photoName || "Template uploaded"}</div>
          <button onClick={onRemove} className="text-red-400 hover:text-red-300 px-1 text-xs">✕</button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex-1 h-9 border border-dashed border-white/15 bg-white/[0.02] text-white/40 hover:border-[var(--t-accent)] hover:text-[var(--t-accent)] text-[0.55rem] font-condensed tracking-widest uppercase flex items-center justify-center gap-1.5 rounded transition-colors"
        >
          <Upload size={10} /> {icon} Upload {label}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
