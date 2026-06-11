import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Sparkles, Scissors, Palette, Loader2, Shirt, User, Film, X, Info, ListChecks, ShoppingCart, Paintbrush, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";

import type { CatalogTheme, ColorVariant, DisplayMode, Product, SpecRow } from "@/lib/catalog-types";
import { JerseySVG } from "./JerseySVG";
import { ProductDisplayUpload } from "@/components/ProductDisplayUpload";
import { hexToRgba, callGemini, getCurrentThemeBg, buildMatchBgPrompt, buildColorVariationPrompt, getAIErrorMessage, readFileAsDataURL, resizeImage, compositeOntoBackground, buildRemoveBgToSolidPrompt } from "@/lib/gemini";
import { notify } from "@/lib/toast";
import { MENU_PAGES, type SpreadDef } from "@/lib/catalog-spreads";
import { CMSPanel } from "./CMSPanel";
import { GallerySpread } from "./spreads/GallerySpread";
import { MixMatchSpread } from "./spreads/MixMatchSpread";

type CatalogCtx = {
  product: Product | null;
  colorVariants: ColorVariant[];
  specRows: SpecRow[];
  themes: CatalogTheme[];
  activeColor: ColorVariant | null;
  activeColorId: string | null;
  setActiveColorId: (id: string) => void;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  updateColorVariant: (id: string, patch: Partial<ColorVariant>) => void;
  updateProduct: (patch: Partial<Product>) => void;
  addColor: () => void;
  deleteColor: (id: string) => void;
  addSpec: () => void;
  updateSpec: (id: string, patch: Partial<SpecRow>) => void;
  deleteSpec: (id: string) => void;
  selectTheme: (theme_id: string) => void;
  updateCustomTheme: (patch: Partial<CatalogTheme>) => void;
  loading: boolean;
};

interface ShellProps {
  spreadIndex: number;
  setSpreadIndex: (n: number | ((i: number) => number)) => void;
  cat: CatalogCtx;
  isAdmin: boolean;
  cmsOpen: boolean;
  setCmsOpen: (v: boolean) => void;
  spreads: SpreadDef[];
  totalPages: number;
  addProductPage: (opts: { name: string; category: string; sku?: string }) => Promise<{ sku: string; spreadId: string }>;
  deleteSpread: (spread_id: string) => Promise<void>;
}

export function MobileCatalog({ spreadIndex, setSpreadIndex, cat, isAdmin, cmsOpen, setCmsOpen, spreads, totalPages, addProductPage, deleteSpread }: ShellProps) {
  const current = spreads[spreadIndex];
  const canPrev = spreadIndex > 0;
  const canNext = spreadIndex < spreads.length - 1;

  const goNext = () => { if (canNext) setSpreadIndex((i) => Math.min(spreads.length - 1, i + 1)); };
  const goPrev = () => { if (canPrev) setSpreadIndex((i) => Math.max(0, i - 1)); };

  // Keyboard arrow support
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canNext, canPrev]);

  // Full-screen swipe for non-product spreads
  const nonProductSwipe = useSwipe({
    threshold: 50,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  // Page swipe handlers for product spread info area
  const pageSwipe = useSwipe({
    threshold: 60,
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
  });

  function jumpToCategory(category: string) {
    const i = spreads.findIndex((s) => s.category === category || (s.type === "size" && category === "SIZE GUIDE") || (s.type === "contact" && category === "CONTACT & ORDER"));
    if (i >= 0) setSpreadIndex(i);
  }



  if (!current) {
    return (
      <div className="catalog-themed" style={{ width: "100vw", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-bg)", color: "var(--t-subtext)" }}>
        LOADING…
      </div>
    );
  }

  return (
    <div className="catalog-themed" style={{
      width: "100vw", height: "100dvh", display: "flex", flexDirection: "column",
      background: "var(--t-bg)", overflow: "hidden", position: "relative", color: "var(--t-text)",
    }}>
      {/* Top nav */}
      <div style={{
        height: 36, display: "flex", alignItems: "center", gap: 5,
        padding: "0 8px", borderBottom: "1px solid var(--t-border)", flexShrink: 0, background: "var(--t-surface)",
      }}>
        <button onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))} disabled={!canPrev} style={{
          background: "none", border: "1px solid var(--t-border)", color: canPrev ? "var(--t-text)" : "var(--t-subtext)",
          width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: canPrev ? 1 : 0.4,
        }} aria-label="Previous"><ChevronLeft size={14} /></button>
        <select
          value={spreadIndex}
          onChange={(e) => setSpreadIndex(Number(e.target.value))}
          style={{
            flex: 1, minWidth: 0, height: 30, background: "var(--t-bg)", border: "1px solid var(--t-border)",
            color: "var(--t-text)", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", padding: "0 8px",
          }}
        >
          {spreads.map((s, i) => <option key={s.id} value={i}>{s.label}</option>)}
        </select>
        <button onClick={() => setSpreadIndex((i) => Math.min(spreads.length - 1, i + 1))} disabled={!canNext} style={{
          background: canNext ? "var(--t-accent)" : "none", border: "1px solid var(--t-border)",
          color: canNext ? "#fff" : "var(--t-subtext)",
          width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: canNext ? 1 : 0.4,
        }} aria-label="Next"><ChevronRight size={14} /></button>
        {isAdmin ? (
          <button onClick={() => setCmsOpen(true)} style={{
            background: "none", border: "1px solid var(--t-border)", color: "var(--t-subtext)",
            width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          }} aria-label="Settings"><Settings size={13} /></button>
        ) : (
          <a href="/auth" style={{
            background: "var(--t-accent)", border: "1px solid var(--t-accent)", color: "#fff",
            height: 28, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
            textDecoration: "none", padding: "0 10px", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }} aria-label="Admin Sign In">Login</a>
        )}
      </div>

      {/* Spread content */}
      {current.type === "product" ? (
        cat.loading || !cat.product
          ? <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t-subtext)" }}>LOADING PRODUCT…</div>
          : <MobileProductView cat={cat as CatalogCtx & { product: Product }} isAdmin={isAdmin} pageSwipeHandlers={pageSwipe} />
      ) : current.type === "gallery" ? (
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <GallerySpread spread={current} isAdmin={isAdmin} full />
        </div>
      ) : current.type === "mixmatch" ? (
        <div style={{ flex: 1, overflow: "auto" }}>
          <MixMatchSpread isAdmin={isAdmin} full />
        </div>
      ) : (
        <div style={{ flex: 1, overflow: "auto", touchAction: "pan-y" }} {...nonProductSwipe}>
          {current.type === "cover" && <MobileCover />}
          {current.type === "menu" && <MobileMenu menuIndex={spreadIndex === 1 ? 0 : 1} onJump={jumpToCategory} />}
          {current.type === "size" && <MobileSize />}
          {current.type === "contact" && <MobileContact />}
        </div>
      )}


      {/* Footer page counter */}
      <div style={{
        flexShrink: 0, padding: "2px 12px", background: "var(--t-surface)", borderTop: "1px solid var(--t-border)",
        textAlign: "center", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.5rem",
        letterSpacing: "0.25em", color: "var(--t-subtext)", textTransform: "uppercase",
        paddingBottom: "calc(2px + env(safe-area-inset-bottom, 0px))",
      }}>
        Page {String(current.pageLeft).padStart(2, "0")}–{String(current.pageRight).padStart(2, "0")} of {totalPages}
      </div>

      {isAdmin && (
        <CMSPanel
          open={cmsOpen}
          onClose={() => setCmsOpen(false)}
          product={cat.product}
          colorVariants={cat.colorVariants}
          specRows={cat.specRows}
          themes={cat.themes}
          updateProduct={cat.updateProduct}
          updateColorVariant={cat.updateColorVariant}
          addColor={cat.addColor}
          deleteColor={cat.deleteColor}
          addSpec={cat.addSpec}
          updateSpec={cat.updateSpec}
          deleteSpec={cat.deleteSpec}
          selectTheme={cat.selectTheme}
          updateCustomTheme={cat.updateCustomTheme}
          spreads={spreads}
          addProductPage={addProductPage}
          deleteSpread={deleteSpread}
          onSpreadChange={(i) => setSpreadIndex(i)}
        />
      )}
    </div>
  );
}

/* ---------- Non-product mobile spreads ---------- */

function MobileCover() {
  const cats = ["Jerseys", "Warm-Ups", "Polo", "Jackets", "1/4 Zip", "Hoodies", "Socks"];
  return (
    <div style={{ padding: "32px 22px", display: "flex", flexDirection: "column", gap: 18, minHeight: "100%", background: "var(--t-bg)" }}>
      <div className="font-display" style={{ color: "var(--t-text)", fontSize: "2rem", lineHeight: 1 }}>
        HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
      </div>
      <div className="font-condensed" style={{ fontSize: "0.58rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>
        2025 Collection
      </div>
      <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "2.8rem", lineHeight: 0.95 }}>BASKETBALL CATALOGUE</h1>
      <div style={{ width: 50, height: 3, background: "var(--t-accent)" }} />
      <p style={{ color: "var(--t-subtext)", fontSize: "0.85rem", lineHeight: 1.6, fontStyle: "italic" }}>
        Performance sportswear engineered for elite competition on and off the court.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
        {cats.map((c) => (
          <span key={c} className="font-condensed" style={{
            fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase",
            padding: "4px 10px", border: "1px solid var(--t-border)", color: "var(--t-text)", background: "var(--t-surface)",
          }}>{c}</span>
        ))}
      </div>
      <div className="font-condensed" style={{ marginTop: "auto", fontSize: "0.55rem", letterSpacing: "0.2em", color: "var(--t-subtext)", textTransform: "uppercase" }}>
        53 Pages · Full Customisation Available
      </div>
    </div>
  );
}

function MobileMenu({ menuIndex, onJump }: { menuIndex: 0 | 1; onJump: (cat: string) => void }) {
  const items = MENU_PAGES[menuIndex];
  return (
    <div style={{ padding: "22px 16px", background: "var(--t-bg)", minHeight: "100%" }}>
      <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
        <BookOpen size={12} /> Catalogue Contents
      </div>
      <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "2.2rem", lineHeight: 0.95, margin: "8px 0 16px", whiteSpace: "pre-line" }}>
        {menuIndex === 0 ? "UNIFORMS &\nAPPAREL" : "OUTERWEAR\n& MORE"}
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <button key={it.num} onClick={() => onJump(it.category)} style={{
            textAlign: "left", padding: "12px 14px", background: "var(--t-surface)",
            border: "1px solid var(--t-border)", color: "var(--t-text)", cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span className="font-display" style={{ color: "var(--t-accent)", fontSize: "1.3rem", lineHeight: 1 }}>{it.num}</span>
                <span className="font-display" style={{ color: "var(--t-text)", fontSize: "1rem", letterSpacing: "0.04em" }}>{it.category}</span>
              </div>
              <span className="font-condensed" style={{ fontSize: "0.58rem", letterSpacing: "0.15em", color: "var(--t-subtext)" }}>p.{it.pages}</span>
            </div>
            {it.items.length > 0 && (
              <div className="font-condensed" style={{ fontSize: "0.6rem", color: "var(--t-subtext)", marginTop: 6, lineHeight: 1.5 }}>
                {it.items.join(" · ")}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function MobileSize() {
  const sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
  const rows = [
    { label: "Chest (cm)",    values: ["84","88","92","98","104","110","118","126"] },
    { label: "Length (cm)",   values: ["68","70","72","74","76","78","80","82"] },
    { label: "Shoulder (cm)", values: ["40","42","44","46","48","50","52","54"] },
  ];
  return (
    <div style={{ padding: 16, background: "var(--t-bg)", minHeight: "100%" }}>
      <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>Size Reference</div>
      <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "2rem", lineHeight: 1, margin: "6px 0 12px" }}>SIZE GUIDE</h1>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.7rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid var(--t-border)", color: "var(--t-subtext)" }}>SIZE</th>
              {sizes.map((s) => <th key={s} style={{ padding: 6, borderBottom: "1px solid var(--t-border)", color: "var(--t-accent)" }}>{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td style={{ padding: 6, borderBottom: "1px solid var(--t-border)", color: "var(--t-text)" }}>{r.label}</td>
                {r.values.map((v, j) => <td key={j} style={{ padding: 6, borderBottom: "1px solid var(--t-border)", color: "var(--t-text)", textAlign: "center" }}>{v}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: 14, fontSize: "0.7rem", color: "var(--t-subtext)", fontStyle: "italic", lineHeight: 1.6 }}>
        All measurements in centimetres. Sizes are approximate — custom sizing available on all orders.
      </p>
    </div>
  );
}

function MobileContact() {
  const steps = [
    { s: "01", t: "CHOOSE YOUR PRODUCT", d: "Pick your category, style and base color." },
    { s: "02", t: "CUSTOMISE", d: "Send logo, names, numbers and color preferences." },
    { s: "03", t: "CONFIRM QUANTITY", d: "MOQ 10 units. Bulk pricing from 50+." },
    { s: "04", t: "PRODUCTION & DELIVERY", d: "10–14 business days. Delivery nationwide." },
  ];
  const contacts = [
    { l: "Address", v: "Da Nang, Vietnam" },
    { l: "Phone", v: "+84 xxx xxx xxxx" },
    { l: "Email", v: "sales@hoops.vn" },
    { l: "Website", v: "www.hoops.vn" },
    { l: "Zalo / FB", v: "@hoopsvietnam" },
  ];
  return (
    <div style={{ padding: 18, background: "var(--t-bg)", minHeight: "100%", display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>How to Order</div>
        <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "2rem", lineHeight: 1, marginTop: 6 }}>GET IN TOUCH</h1>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((it) => (
          <div key={it.s} style={{ display: "flex", gap: 12 }}>
            <div className="font-display" style={{ color: "var(--t-accent)", fontSize: "1.6rem", lineHeight: 1, minWidth: 36 }}>{it.s}</div>
            <div>
              <div className="font-display" style={{ color: "var(--t-text)", fontSize: "0.9rem" }}>{it.t}</div>
              <div className="font-condensed" style={{ fontSize: "0.7rem", color: "var(--t-subtext)", lineHeight: 1.5 }}>{it.d}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, borderTop: "1px solid var(--t-border)" }}>
        {contacts.map((c) => (
          <div key={c.l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
            <span className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-accent)", textTransform: "uppercase" }}>{c.l}</span>
            <span style={{ fontSize: "0.78rem", color: "var(--t-text)" }}>{c.v}</span>
          </div>
        ))}
      </div>
      <p className="font-condensed" style={{ fontSize: "0.6rem", color: "var(--t-subtext)", lineHeight: 1.6, marginTop: "auto" }}>
        © 2025 HOOPS Basketball Apparel · Da Nang, Vietnam
      </p>
    </div>
  );
}

/* ---------- Product spread (existing implementation) ---------- */

type TabKey = "info" | "specs" | "order" | "theme" | null;
const FIELD_MAP = { jersey: "jersey_photo", body: "body_photo", motion: "motion_gif" } as const;

interface ProductProps {
  cat: CatalogCtx & { product: Product };
  isAdmin: boolean;
  pageSwipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}


function MobileProductView(pp: ProductProps) {
  const p = {
    product: pp.cat.product,
    colorVariants: pp.cat.colorVariants,
    specRows: pp.cat.specRows,
    themes: pp.cat.themes,
    activeColor: pp.cat.activeColor,
    activeColorId: pp.cat.activeColorId,
    setActiveColorId: pp.cat.setActiveColorId,
    displayMode: pp.cat.displayMode,
    setDisplayMode: pp.cat.setDisplayMode,
    updateColorVariant: pp.cat.updateColorVariant,
    selectTheme: pp.cat.selectTheme,
    isAdmin: pp.isAdmin,
  };

  const { product, colorVariants, specRows, themes, activeColor, displayMode } = p;

  const [activeTab, setActiveTab] = useState<TabKey>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [genId, setGenId] = useState<string | null>(null);
  const [customPreview, setCustomPreview] = useState<ColorVariant | null>(null);
  const [swipeDir, setSwipeDir] = useState<1 | -1>(1);


  const sortedColors = useMemo(() => [...colorVariants].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [colorVariants]);

  const liveColor = customPreview ?? activeColor;
  const sourceColor = useMemo(
    () => colorVariants.find((c) => c.jersey_photo && c.id !== activeColor?.id) || null,
    [colorVariants, activeColor?.id]
  );
  const currentPhoto = liveColor ? (liveColor[FIELD_MAP[displayMode]] as string | null) : null;
  const canGenerate = !!p.isAdmin && displayMode === "jersey" && !!sourceColor && !customPreview;

  async function handleDisplayUpload(colorId: string, slot: "jersey" | "body" | "motion", file: File) {
    try {
      const raw = await readFileAsDataURL(file);
      const resized = slot === "motion" ? raw : await resizeImage(raw, 1024);
      const f = slot === "jersey" ? { p: "jersey_photo", n: "jersey_photo_name" }
        : slot === "body" ? { p: "body_photo", n: "body_photo_name" }
        : { p: "motion_gif", n: "motion_gif_name" };
      p.updateColorVariant(colorId, { [f.p]: resized, [f.n]: file.name } as any);
      notify("Uploaded");
    } catch { notify("Upload failed", true); }
  }

  async function runGenerate() {
    if (!liveColor || !sourceColor?.jersey_photo) return;
    setAiBusy(`Generating ${liveColor.name}…`);
    try {
      const prompt = buildColorVariationPrompt(liveColor.hex_main, liveColor.hex_shade || liveColor.hex_main, liveColor.name, !!liveColor.is_light, liveColor.note);
      const res = await callGemini(sourceColor.jersey_photo, prompt);
      p.updateColorVariant(liveColor.id, { jersey_photo: res });
      notify(`${liveColor.name} generated`);
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setAiBusy(null); }
  }
  async function runRemoveBg() {
    if (!liveColor || !currentPhoto) return;
    setAiBusy("Removing background…");
    try {
      const bg = getCurrentThemeBg();
      const res = await callGemini(currentPhoto, buildRemoveBgToSolidPrompt(bg));
      const flat = await compositeOntoBackground(res, bg);
      p.updateColorVariant(liveColor.id, { [FIELD_MAP[displayMode]]: flat } as any);
      notify("Background removed");
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setAiBusy(null); }
  }
  async function runMatchBg() {
    if (!liveColor || !currentPhoto) return;
    setAiBusy("Matching background…");
    try {
      const res = await callGemini(currentPhoto, buildMatchBgPrompt(getCurrentThemeBg()));
      p.updateColorVariant(liveColor.id, { [FIELD_MAP[displayMode]]: res } as any);
      notify("Background matched");
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setAiBusy(null); }
  }
  async function generateForCard(target: ColorVariant) {
    const src = colorVariants.find((c) => c.jersey_photo && c.id !== target.id);
    if (!src?.jersey_photo) return;
    setGenId(target.id);
    try {
      const prompt = buildColorVariationPrompt(target.hex_main, target.hex_shade || target.hex_main, target.name, !!target.is_light, target.note);
      const res = await callGemini(src.jersey_photo, prompt);
      p.updateColorVariant(target.id, { jersey_photo: res });
      notify(`${target.name} generated`);
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setGenId(null); }
  }

  function selectPreset(id: string) { setCustomPreview(null); p.setActiveColorId(id); }
  function applyCustomColor(hexMain: string, hexShade: string, name: string) {
    const h = hexMain.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    setCustomPreview({
      id: "custom-preview", product_id: product.id, name,
      hex_main: hexMain, hex_shade: hexShade,
      is_light: (r * 0.299 + g * 0.587 + b * 0.114) > 170,
      jersey_photo: null, jersey_photo_name: null,
      body_photo: null, body_photo_name: null,
      motion_gif: null, motion_gif_name: null,
      note: "", sort_order: 99,
    } as ColorVariant);
  }

  const photo = currentPhoto;

  function handleSwipe(direction: "left" | "right") {
    setSwipeDir(direction === "left" ? 1 : -1);
    if (sortedColors.length < 2) return;
    const currentId = customPreview ? null : p.activeColorId;
    const idx = sortedColors.findIndex((c) => c.id === currentId);
    if (direction === "left") {
      if (idx >= sortedColors.length - 1) return;
      const nextIdx = idx < 0 ? 0 : idx + 1;
      setCustomPreview(null);
      p.setActiveColorId(sortedColors[nextIdx].id);
    } else {
      if (idx <= 0) return;
      const nextIdx = idx - 1;
      setCustomPreview(null);
      p.setActiveColorId(sortedColors[nextIdx].id);
    }
  }

  const colorSwipe = useSwipe({
    threshold: 45,
    preventScroll: true,
    onSwipeLeft: () => handleSwipe("left"),
    onSwipeRight: () => handleSwipe("right"),
  });


  return (
    <div style={{
      flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
      background: "var(--t-bg)", overflow: "hidden", position: "relative", color: "var(--t-text)",
    }}>


      {/* Display area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", touchAction: "pan-y", background: "var(--t-display-bg)" }} {...colorSwipe}>
        {/* Color glow halo */}
        <motion.div
          animate={{ background: `radial-gradient(ellipse 55% 50% at 48% 52%, ${hexToRgba(liveColor?.hex_main ?? "#888", 0.22)} 0%, transparent 70%)` }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}
        />
        {/* Ground shadow */}
        <div style={{
          position: "absolute",
          bottom: 48,
          left: "50%",
          transform: "translateX(-50%)",
          width: "55%",
          height: "18px",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }} />
        {/* Photo */}
        <motion.div
          className="product-view"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatType: "loop" }}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}
        >
          <ProductDisplayUpload colorId={liveColor?.id ?? null} slotType={displayMode} isAdmin={!!p.isAdmin} onUpload={handleDisplayUpload}>
            <AnimatePresence mode="wait" custom={swipeDir}>
            <motion.div
              key={`mobile-media-${liveColor?.id}-${displayMode}`}
              custom={swipeDir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: d * 20, scale: 0.97 }),
                center: { opacity: 1, x: 0, scale: 1 },
                exit: (d: number) => ({ opacity: 0, x: d * -20, scale: 0.97 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {photo ? (
                <img loading="lazy" decoding="async" crossOrigin="anonymous" src={photo} alt={liveColor?.name} style={{ maxWidth: "85%", maxHeight: "90%", objectFit: "contain", mixBlendMode: "normal" }} />
              ) : displayMode === "jersey" && liveColor ? (
                <div style={{ width: "65%", height: "65%" }}>
                  <JerseySVG hexMain={liveColor.hex_main} hexShade={liveColor.hex_shade || liveColor.hex_main} isLight={!!liveColor.is_light} category={product.category || undefined} />
                </div>
              ) : (
                <div style={{ textAlign: "center", opacity: 0.35, color: "var(--t-text)" }}>
                  <div style={{ fontSize: "2.5rem" }}>{displayMode === "body" ? "🧍" : "🎞"}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", letterSpacing: "0.2em", marginTop: 8, textTransform: "uppercase" }}>
                    {displayMode === "body" ? "On-Body Photo" : "Motion GIF"}
                  </div>
                </div>
              )}
            </motion.div>
            </AnimatePresence>
          </ProductDisplayUpload>
        </motion.div>

        {/* Display mode buttons */}
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 8, zIndex: 10 }}>
          {([
            { k: "jersey", I: Shirt },
            { k: "body", I: User },
            { k: "motion", I: Film },
          ] as const).map(({ k, I }) => {
            const active = displayMode === k;
            return (
              <motion.button
                key={k}
                onClick={() => p.setDisplayMode(k)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                animate={{
                  background: active ? "var(--t-accent)" : "rgba(0,0,0,0.45)",
                  color: active ? "#000000" : "rgba(255,255,255,0.7)",
                }}
                transition={{ duration: 0.2 }}
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: `1px solid ${active ? "var(--t-accent)" : "rgba(255,255,255,0.15)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(6px)",
                }} aria-label={k}><I size={15} /></motion.button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}>
          {aiBusy ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.8)",
              border: "1px solid var(--t-accent)", color: "var(--t-accent)",
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.58rem", fontWeight: 700,
              letterSpacing: "0.18em", textTransform: "uppercase", padding: "6px 14px", backdropFilter: "blur(8px)",
            }}>
              <Loader2 size={11} className="animate-spin" /> {aiBusy}
            </div>
          ) : (
            <>
              {canGenerate && (
                <MobileActionBtn onClick={runGenerate} variant="generate">
                  <Sparkles size={11} /> {liveColor?.jersey_photo ? "Regenerate" : "Generate"}
                </MobileActionBtn>
              )}
              {!!currentPhoto && (
                <>
                  <MobileActionBtn onClick={runRemoveBg}><Scissors size={11} /> BG</MobileActionBtn>
                  <MobileActionBtn onClick={runMatchBg}><Palette size={11} /> Match</MobileActionBtn>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info area — swipe to change page */}
      <div style={{ flexShrink: 0, touchAction: "pan-y" }} {...pp.pageSwipeHandlers}>
      {/* Product strip */}
      <div style={{ padding: "5px 14px 4px", background: "var(--t-surface)", borderTop: "1px solid var(--t-border)", flexShrink: 0 }}>

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.46rem", letterSpacing: "0.22em", color: "var(--t-subtext)", textTransform: "uppercase", marginBottom: 0 }}>
          {product?.sku}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.05rem", letterSpacing: "0.05em", color: "var(--t-text)", lineHeight: 1, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {product?.name}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.95rem", color: "var(--t-accent)" }}>{product?.price}</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.5rem", color: "var(--t-subtext)", fontWeight: 700 }}>VND</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.2em", color: "var(--t-accent)", textTransform: "uppercase", marginTop: 1 }}>
          {liveColor?.name}
        </div>
      </div>

      {/* Color grid */}
      <div style={{ padding: "4px 10px", background: "var(--t-surface)", borderTop: "1px solid var(--t-border)", flexShrink: 0 }}>
        <div className="mobile-color-grid" style={{
          display: "flex", gap: 5, overflowX: "auto", overflowY: "visible", paddingBottom: 20,
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        }}>
          {sortedColors.map((c) => {
            const hasSource = !!colorVariants.find((x) => x.jersey_photo && x.id !== c.id);
            return (
              <MobileColorCard key={c.id} color={c}
                isActive={!customPreview && c.id === p.activeColorId}
                onClick={() => selectPreset(c.id)}
                canGenerate={!!p.isAdmin && hasSource}
                hasPhoto={!!c.jersey_photo}
                onGenerate={() => generateForCard(c)}
                generating={genId === c.id}
              />
            );
          })}
          {[1, 2, 3].map((i) => <MobileCustomColor key={`g${i}`} index={i} isGradient onApply={applyCustomColor} />)}
          <MobileCustomColor index={4} isGradient={false} onApply={applyCustomColor} />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", background: "var(--t-surface)", borderTop: "1px solid var(--t-border)",
        flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {([
          { k: "info", I: Info, l: "Info" },
          { k: "specs", I: ListChecks, l: "Specs" },
          { k: "order", I: ShoppingCart, l: "Order" },
          { k: "theme", I: Paintbrush, l: "Theme" },
        ] as const).map(({ k, I, l }) => {
          const active = activeTab === k;
          const isOrder = k === "order";
          return (
            <button key={k} onClick={() => setActiveTab(active ? null : k)} style={{
              flex: 1, height: 40, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              background: isOrder && !active ? "rgba(255,77,0,0.08)" : "none",
              border: "none", position: "relative",
              color: active ? "var(--t-accent)" : isOrder ? "var(--t-accent)" : "var(--t-subtext)",
              borderTop: `2px solid ${active ? "var(--t-accent)" : isOrder ? "rgba(255,77,0,0.3)" : "transparent"}`,
            }}>
              <I size={13} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.44rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>{l}</span>
              {isOrder && liveColor && !active && (
                <div style={{
                  position: "absolute",
                  top: 4,
                  right: "calc(50% - 16px)",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: liveColor.hex_main,
                  border: "1px solid rgba(255,255,255,0.3)",
                }} />
              )}
            </button>
          );
        })}
      </div>
      </div>
      {/* /info area wrapper */}

      {/* Panels */}

      <AnimatePresence>
      {activeTab === "info" && (
        <MobilePanel title="Product Info" onClose={() => setActiveTab(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {product?.category && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.25em", color: "var(--t-accent)", textTransform: "uppercase" }}>{product.category}</div>}
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", letterSpacing: "0.04em", color: "var(--t-text)", lineHeight: 1 }}>{product?.name}</div>
            {product?.subtitle && <div style={{ fontSize: "0.8rem", color: "var(--t-subtext)", fontStyle: "italic" }}>{product.subtitle}</div>}
            {product?.description && <div style={{ fontSize: "0.85rem", color: "var(--t-text)", lineHeight: 1.6 }}>{product.description}</div>}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, paddingTop: 8, borderTop: "1px solid var(--t-border)" }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "2rem", color: "var(--t-accent)" }}>{product?.price}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "var(--t-subtext)" }}>VND</span>
              {product?.price_original && <span style={{ fontSize: "0.8rem", color: "var(--t-subtext)", textDecoration: "line-through" }}>{product.price_original}</span>}
              {product?.price_save_label && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "2px 6px", letterSpacing: "0.1em" }}>{product.price_save_label}</span>}
            </div>
          </div>
        </MobilePanel>
      )}
      {activeTab === "specs" && (
        <MobilePanel title="Specifications" onClose={() => setActiveTab(null)}>
          {(() => {
            const findSpec = (re: RegExp) => specRows.find((s) => re.test(s.label || ""));
            const fields = [
              { label: "FABRIC", value: findSpec(/fabric/i)?.value || "—" },
              { label: "MIN ORDER", value: findSpec(/min/i)?.value || "—" },
              { label: "FEATURE", value: findSpec(/feature/i)?.value || "—" },
            ];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fields.map((f) => (
                  <div key={f.label} style={{ background: "var(--t-bg)", border: "1px solid var(--t-border)", padding: 12 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.2em", color: "var(--t-accent)", textTransform: "uppercase", marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: "0.9rem", color: "var(--t-text)", fontWeight: 600, whiteSpace: "pre-wrap" }}>{f.value}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </MobilePanel>
      )}
      {activeTab === "order" && (
        <MobilePanel title="Order Now" onClose={() => setActiveTab(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "var(--t-bg)", border: "1px solid var(--t-border)" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: liveColor?.hex_main }} />
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", color: "var(--t-text)", textTransform: "uppercase" }}>{liveColor?.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--t-subtext)" }}>Selected color</div>
              </div>
            </div>
            <button style={{
              width: "100%", padding: 16, background: "var(--t-accent)", border: "none", color: "#000",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.2rem", letterSpacing: "0.1em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>{product?.cta_label ?? "ORDER NOW →"}</button>
            <div style={{ fontSize: "0.75rem", color: "var(--t-subtext)", textAlign: "center" }}>
              Minimum order: 10 units · Lead time: 10–14 days
            </div>
          </div>
        </MobilePanel>
      )}
      {activeTab === "theme" && (
        <MobilePanel title="Catalog Theme" onClose={() => setActiveTab(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {themes.map((t) => (
              <button key={t.theme_id} onClick={() => { p.selectTheme(t.theme_id); setActiveTab(null); }} style={{
                height: 52, border: `1.5px solid ${t.is_active ? "#fff" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 4, overflow: "hidden", position: "relative", display: "flex",
                alignItems: "flex-end", padding: "6px 8px", background: t.bg,
              }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "25%", height: "100%", background: t.accent }} />
                {t.is_active && <div style={{ position: "absolute", top: 6, right: 6, color: "#000", fontSize: "0.7rem", fontWeight: 900, zIndex: 1 }}>✓</div>}
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.15em", color: t.text_color, textTransform: "uppercase", zIndex: 1 }}>
                  {t.name.split(" ").pop()}
                </div>
              </button>
            ))}
          </div>
        </MobilePanel>
      )}
      </AnimatePresence>
    </div>
  );
}

function MobileActionBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant?: "generate" }) {
  const base: React.CSSProperties = {
    height: 30, padding: "0 12px",
    background: variant === "generate" ? "var(--t-accent)" : "rgba(0,0,0,0.75)",
    border: variant === "generate" ? "none" : "1px solid rgba(255,255,255,0.2)",
    color: variant === "generate" ? "#000" : "rgba(255,255,255,0.85)",
    fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 700,
    letterSpacing: "0.15em", textTransform: "uppercase", backdropFilter: "blur(8px)",
    whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4,
  };
  return <button onClick={onClick} style={base}>{children}</button>;
}

function MobileColorCard({ color, isActive, onClick, canGenerate, hasPhoto, onGenerate, generating }: {
  color: ColorVariant; isActive: boolean; onClick: () => void;
  canGenerate: boolean; hasPhoto: boolean; onGenerate: () => void; generating: boolean;
}) {
  return (
    <motion.div
      onClick={onClick}
      animate={{ scale: isActive ? 1.08 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{ position: "relative", overflow: "visible", flexShrink: 0, width: 46, height: 46 }}
    >
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", borderRadius: 4,
        border: isActive ? "2px solid var(--t-accent)" : "1px solid var(--t-border)",
      }}>
        {color.jersey_photo
          ? <img loading="lazy" decoding="async" src={color.jersey_photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${color.hex_main}, ${color.hex_shade || color.hex_main})` }} />
        }
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center",
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.42rem", letterSpacing: "0.15em",
          color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 0",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{color.name.split(" ").pop()}</div>
      </div>
      {canGenerate && !generating && !hasPhoto && (
        <button onClick={(e) => { e.stopPropagation(); onGenerate(); }} style={{
          position: "absolute", top: -6, right: -6, zIndex: 30,
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--t-accent)", border: "2px solid var(--t-bg)",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#000",
          boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
        }} aria-label="Generate"><Sparkles size={10} /></button>
      )}
      {generating && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
          <Loader2 size={14} className="animate-spin" color="#fff" />
        </div>
      )}
    </motion.div>
  );
}

function MobileCustomColor({ index, isGradient, onApply }: { index: number; isGradient: boolean; onApply: (m: string, s: string, name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [main, setMain] = useState("#888888");
  const [shade, setShade] = useState("#555555");
  const label = isGradient ? `CUSTOM ${index}` : "SOLID";

  function darken(hex: string, amt = 40) {
    const h = hex.replace("#", "");
    const c = (i: number) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) - amt));
    return "#" + [c(0), c(2), c(4)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  const preview = isGradient ? `linear-gradient(135deg, ${main}, ${shade})` : main;

  return (
    <div style={{ position: "relative", flexShrink: 0, width: 46, height: 46 }}>
      <div onClick={() => setOpen((v) => !v)} style={{
        width: "100%", height: "100%", position: "relative", overflow: "hidden",
        borderRadius: 4, border: "1.5px dashed rgba(255,255,255,0.25)",
      }}>
        <div style={{ position: "absolute", inset: 0, background: preview, opacity: 0.8 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1rem" }}>+</div>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center",
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.4rem", letterSpacing: "0.15em",
          color: "#fff", background: "rgba(0,0,0,0.6)", padding: "1px 0",
        }}>{label}</div>
      </div>
      {open && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: "absolute", bottom: 62, right: 0, zIndex: 100,
          background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)",
          padding: 10, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", borderRadius: 4,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <label style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", width: 40, textTransform: "uppercase" }}>{isGradient ? "Main" : "Color"}</label>
            <input type="color" value={main} onChange={(e) => setMain(e.target.value)} style={{ width: 32, height: 24, border: "none", background: "none" }} />
            <input type="text" value={main} onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setMain(e.target.value)}
              style={{ flex: 1, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", color: "#f2ede3", fontFamily: "monospace", fontSize: "0.72rem", padding: "3px 6px" }} />
          </div>
          {isGradient && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <label style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", width: 40, textTransform: "uppercase" }}>Shade</label>
              <input type="color" value={shade} onChange={(e) => setShade(e.target.value)} style={{ width: 32, height: 24, border: "none", background: "none" }} />
              <input type="text" value={shade} onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setShade(e.target.value)}
                style={{ flex: 1, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)", color: "#f2ede3", fontFamily: "monospace", fontSize: "0.72rem", padding: "3px 6px" }} />
            </div>
          )}
          <button onClick={() => { onApply(main, isGradient ? shade : darken(main, 40), label); setOpen(false); }} style={{
            width: "100%", padding: 6, background: "var(--t-accent)", border: "none", color: "#000",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.18em", textTransform: "uppercase", borderRadius: 2,
          }}>Apply Color</button>
        </div>
      )}
    </div>
  );
}

function MobilePanel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <motion.div
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 38, mass: 1 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: "80dvh",
          background: "var(--t-surface)", borderRadius: "16px 16px 0 0", borderTop: "2px solid var(--t-accent)",
          zIndex: 51, display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid var(--t-border)", flexShrink: 0 }}>
          <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 32, height: 3, borderRadius: 2, background: "var(--t-border)" }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.25em", color: "var(--t-text)", textTransform: "uppercase" }}>{title}</div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid var(--t-border)", color: "var(--t-subtext)",
            width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          }} aria-label="Close"><X size={14} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: 16 }}>{children}</div>
      </motion.div>
    </>
  );
}
