import { useMemo, useState } from "react";
import { Sparkles, Scissors, Palette, Heart, Loader2, Shirt, User, Film, Download } from "lucide-react";
import type { ColorVariant, DisplayMode, Product, SpecRow } from "@/lib/catalog-types";
import { JerseySVG } from "./JerseySVG";
import { hexToRgba, callGemini, BG_REMOVAL_PROMPT, getLeftPageBg, buildMatchBgPrompt, buildColorVariationPrompt, getAIErrorMessage, readFileAsDataURL, resizeImage, downloadImageHD } from "@/lib/gemini";
import { notify } from "@/lib/toast";
import { ProductDisplayUpload } from "@/components/ProductDisplayUpload";

interface Props {
  product: Product;
  colorVariants: ColorVariant[];
  specRows: SpecRow[];
  activeColor: ColorVariant | null;
  activeColorId: string | null;
  setActiveColorId: (id: string) => void;
  displayMode: DisplayMode;
  setDisplayMode: (m: DisplayMode) => void;
  updateColorVariant: (id: string, patch: Partial<ColorVariant>) => void;
  isAdmin?: boolean;
  activeThemeId?: string;
}


export function CatalogSpread(p: Props) {
  const { product, colorVariants, specRows, activeColor: realActiveColor, displayMode } = p;
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [genId, setGenId] = useState<string | null>(null);
  const [customPreview, setCustomPreview] = useState<ColorVariant | null>(null);

  const activeColor = customPreview ?? realActiveColor;

  const sourceColor = useMemo(
    () => colorVariants.find((c) => c.jersey_photo && c.id !== realActiveColor?.id) || null,
    [colorVariants, realActiveColor?.id]
  );

  const fieldMap = { jersey: "jersey_photo", body: "body_photo", motion: "motion_gif" } as const;
  const currentPhoto = activeColor ? (activeColor[fieldMap[displayMode]] as string | null) : null;
  const canGenerate = !!p.isAdmin && displayMode === "jersey" && !!sourceColor && !customPreview;

  function selectPreset(id: string) {
    setCustomPreview(null);
    p.setActiveColorId(id);
  }

  function applyCustomColor(hexMain: string, hexShade: string, name: string) {
    const h = hexMain.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    setCustomPreview({
      id: "custom-preview",
      product_id: product.id,
      name,
      hex_main: hexMain,
      hex_shade: hexShade,
      is_light: (r * 0.299 + g * 0.587 + b * 0.114) > 170,
      jersey_photo: null, jersey_photo_name: null,
      body_photo: null, body_photo_name: null,
      motion_gif: null, motion_gif_name: null,
      note: "",
      sort_order: 99,
    } as ColorVariant);
  }

  async function runGenerate() {
    if (!activeColor || !sourceColor?.jersey_photo) return;
    setAiBusy(`Generating ${activeColor.name}…`);
    try {
      const prompt = buildColorVariationPrompt(
        activeColor.hex_main, activeColor.hex_shade || activeColor.hex_main,
        activeColor.name, !!activeColor.is_light, activeColor.note
      );
      const result = await callGemini(sourceColor.jersey_photo, prompt);
      p.updateColorVariant(activeColor.id, { jersey_photo: result });
      notify(`${activeColor.name} generated`);
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setAiBusy(null); }
  }

  async function runRemoveBg() {
    if (!activeColor || !currentPhoto) return;
    setAiBusy("Removing background…");
    try {
      const transparent = await callGemini(currentPhoto, BG_REMOVAL_PROMPT);
      p.updateColorVariant(activeColor.id, { [fieldMap[displayMode]]: transparent } as any);
      notify("Background removed");
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setAiBusy(null); }
  }


  async function runMatchBg() {
    if (!activeColor || !currentPhoto) return;
    setAiBusy("Matching background…");
    try {
      const bg = getLeftPageBg(p.activeThemeId);
      const result = await callGemini(currentPhoto, buildMatchBgPrompt(bg));
      p.updateColorVariant(activeColor.id, { [fieldMap[displayMode]]: result } as any);
      notify("Background matched");
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setAiBusy(null); }
  }

  async function generateForCard(target: ColorVariant) {
    const src = colorVariants.find((c) => c.jersey_photo && c.id !== target.id);
    if (!src?.jersey_photo) return;
    setGenId(target.id);
    try {
      const prompt = buildColorVariationPrompt(
        target.hex_main, target.hex_shade || target.hex_main,
        target.name, !!target.is_light, target.note
      );
      const result = await callGemini(src.jersey_photo, prompt);
      p.updateColorVariant(target.id, { jersey_photo: result });
      notify(`${target.name} generated`);
    } catch (e) { notify(getAIErrorMessage(e), true); }
    finally { setGenId(null); }
  }

  async function handleDisplayUpload(colorId: string, slotType: "jersey" | "body" | "motion", file: File) {
    try {
      const raw = await readFileAsDataURL(file);
      const resized = slotType === "motion" ? raw : await resizeImage(raw, 1024);
      const fields = {
        jersey: { photo: "jersey_photo", name: "jersey_photo_name" },
        body: { photo: "body_photo", name: "body_photo_name" },
        motion: { photo: "motion_gif", name: "motion_gif_name" },
      }[slotType];
      p.updateColorVariant(colorId, { [fields.photo]: resized, [fields.name]: file.name } as any);
      const label = slotType === "jersey" ? "Jersey" : slotType === "body" ? "On-Body" : "Motion GIF";
      notify(`${label} photo uploaded`);
    } catch {
      notify("Upload failed — try again", true);
    }
  }

  const haloColor = activeColor ? hexToRgba(activeColor.hex_main, 0.28) : "transparent";
  const leftPageBg = p.activeThemeId === "white" ? "#f0ebe0" : "#0a0a0a";
  const isWhiteTheme = p.activeThemeId === "white";
  const labelMutedColor = isWhiteTheme ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)";
  const labelTextColor = isWhiteTheme ? "#0a0a0a" : "var(--t-text)";
  const topBarBorder = isWhiteTheme ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.06)";


  return (
    <div
      className="catalog-themed relative"
      style={{
        width: 880, height: 570, perspective: 2000,
        transform: "rotateX(2deg)",
        filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.9))",
      }}
    >
      <div className="absolute inset-0 grid grid-cols-2" style={{ borderRadius: 4, overflow: "hidden" }}>
        {/* LEFT PAGE */}
        <div className="relative grid-bg" style={{ background: leftPageBg }}>
          {/* Court arcs */}
          <div className="court-arc" style={{ width: 480, height: 240 }} />
          <div className="court-arc" style={{ width: 260, height: 130 }} />
          <div className="court-arc" style={{ width: 90, height: 45 }} />

          {/* Top bar — pinned top, 44px */}
          <div className="absolute left-0 right-0 px-4 flex items-center justify-between"
            style={{ top: 0, height: 44, background: leftPageBg, borderBottom: topBarBorder, zIndex: 20 }}>
            <div className="flex items-center gap-1 font-display text-lg" style={{ color: labelTextColor }}>
              HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
            </div>
            <div className="text-[0.6rem] tracking-widest font-condensed" style={{ color: labelMutedColor }}>
              {product.season_label}
            </div>
          </div>

          {/* Corner badge */}
          {product.badge_label && (
            <div className="absolute left-0 px-3 py-1 text-[0.55rem] font-bold font-condensed tracking-widest text-white clip-arrow-right"
              style={{ top: 44, background: activeColor?.hex_main || "var(--t-accent)", zIndex: 15 }}>
              {product.badge_label}
            </div>
          )}

          {/* Display mode buttons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
            {(["jersey","body","motion"] as DisplayMode[]).map((m) => {
              const Icon = m === "jersey" ? Shirt : m === "body" ? User : Film;
              const active = displayMode === m;
              return (
                <button key={m} onClick={() => p.setDisplayMode(m)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition ${active ? "text-white" : ""}`}
                  style={{
                    background: active ? "var(--t-accent)" : "rgba(255,255,255,0.06)",
                    color: active ? "white" : "var(--t-subtext)",
                    border: "1px solid var(--t-border)",
                  }}
                  title={m}><Icon size={14} /></button>
              );
            })}
          </div>

          {/* Product hero wrap — bounded between top bar (44px) and product label (72px) */}
          <div className="product-hero-wrap" style={{ position: "absolute", top: 44, left: 0, right: 0, height: 452, overflow: "hidden" }}>
            {/* Glow halo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: 300, height: 300, background: `radial-gradient(circle, ${haloColor}, transparent 70%)` }} />

            <div className="product-view" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              {displayMode === "jersey" && (
                <div style={{ position: "absolute", inset: 0 }}>
                  <ProductDisplayUpload colorId={p.activeColorId} slotType="jersey" isAdmin={!!p.isAdmin} onUpload={handleDisplayUpload}>
                    {activeColor?.jersey_photo
                      ? <img src={activeColor.jersey_photo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", mixBlendMode: "normal" }} />
                      : activeColor && <JerseySVG hexMain={activeColor.hex_main} hexShade={activeColor.hex_shade || activeColor.hex_main} isLight={!!activeColor.is_light} category={product.category || undefined} />}
                  </ProductDisplayUpload>
                </div>
              )}
              {displayMode === "body" && (
                <div style={{ position: "absolute", inset: 0 }}>
                  <ProductDisplayUpload colorId={p.activeColorId} slotType="body" isAdmin={!!p.isAdmin} onUpload={handleDisplayUpload}>
                    {activeColor?.body_photo
                      ? <img src={activeColor.body_photo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", mixBlendMode: "normal" }} />
                      : <div className="w-full h-full flex flex-col items-center justify-center text-center" style={{ color: "var(--t-subtext)" }}>
                          <div className="text-5xl">🧍</div>
                          <div className="text-[0.6rem] font-condensed tracking-widest mt-2">ON-BODY PHOTO</div>
                        </div>}
                  </ProductDisplayUpload>
                </div>
              )}
              {displayMode === "motion" && (
                <div style={{ position: "absolute", inset: 0 }}>
                  <ProductDisplayUpload colorId={p.activeColorId} slotType="motion" isAdmin={!!p.isAdmin} onUpload={handleDisplayUpload}>
                    {activeColor?.motion_gif
                      ? <img src={activeColor.motion_gif} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", mixBlendMode: "normal" }} />
                      : <div className="w-full h-full flex flex-col items-center justify-center text-center" style={{ color: "var(--t-subtext)" }}>
                          <div className="text-5xl">🎞</div>
                          <div className="text-[0.6rem] font-condensed tracking-widest mt-2">MOTION GIF</div>
                        </div>}
                  </ProductDisplayUpload>
                </div>
              )}
            </div>

            {/* AI action row — inside hero wrap, anchored bottom */}
            <div className="absolute left-1/2 -translate-x-1/2 flex gap-2 z-20" style={{ bottom: 8 }}>
              {canGenerate && (
                <ActionBtn onClick={runGenerate} disabled={!!aiBusy}>
                  <Sparkles size={11} /> {activeColor?.jersey_photo ? "REGENERATE" : "GENERATE"} {activeColor!.name.split(" ").pop()}
                </ActionBtn>
              )}
              {!!currentPhoto && (
                <>
                  <ActionBtn onClick={runRemoveBg} disabled={!!aiBusy}><Scissors size={11} /> BG</ActionBtn>
                  <ActionBtn onClick={runMatchBg} disabled={!!aiBusy}><Palette size={11} /> MATCH</ActionBtn>
                  {p.isAdmin && (
                    <ActionBtn
                      onClick={() => {
                        const ext = displayMode === "motion" ? "gif" : "png";
                        const filename = `${product.sku || "jersey"}-${activeColor?.name.replace(/\s+/g, "-").toLowerCase()}-${displayMode}.${ext}`;
                        downloadImageHD(currentPhoto, filename, 2400);
                      }}
                      disabled={!!aiBusy}
                    >
                      <Download size={11} /> HD
                    </ActionBtn>
                  )}
                </>
              )}

            </div>
          </div>

          {/* Product label strip — pinned bottom, 72px, same bg as page */}
          <div className="product-label-strip" style={{
            position: "absolute", top: 496, left: 0, right: 0, height: 74,
            padding: "10px 20px 14px", background: leftPageBg,
            borderTop: topBarBorder, display: "flex", flexDirection: "column",
            justifyContent: "flex-end", gap: 2, zIndex: 15,
          }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.52rem", letterSpacing: "0.28em", color: labelMutedColor, textTransform: "uppercase", lineHeight: 1 }}>
              {product.sku}
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "0.04em", color: labelTextColor, lineHeight: 1 }}>
              {product.name}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.22em", color: "var(--t-accent)", textTransform: "uppercase", lineHeight: 1 }}>
              {activeColor?.name}
            </div>
            <div style={{ position: "absolute", right: 14, bottom: 8, fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.7rem", color: labelMutedColor }}>
              {product.page_left}
            </div>
          </div>


          {aiBusy && (
            <div className="absolute inset-0 z-30 bg-black/55 flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="animate-spin" /> <div className="text-xs font-condensed tracking-widest">{aiBusy}</div>
            </div>
          )}
        </div>

        {/* RIGHT PAGE */}
        <div className="relative" style={{ background: "var(--t-bg)" }}>
          <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-end"
            style={{ borderBottom: "1px solid var(--t-border)" }}>
            <div className="text-[0.6rem] tracking-widest font-condensed" style={{ color: "var(--t-subtext)" }}>
              {product.collection_label}
            </div>
          </div>

          <div className="px-6 pt-14 pb-20 h-full flex flex-col">
            <div className="text-[0.62rem] tracking-[0.3em] font-condensed uppercase" style={{ color: "var(--t-accent)" }}>
              {product.category}
            </div>
            <h1 className="font-display text-5xl leading-none mt-1" style={{ color: "var(--t-text)" }}>{product.name}</h1>
            <div className="text-xs mt-1 font-condensed" style={{ color: "var(--t-subtext)" }}>{product.subtitle}</div>

            {/* Price row */}
            <div className="flex items-end gap-3 mt-4">
              <div className="font-display text-4xl leading-none" style={{ color: "var(--t-accent)" }}>{product.price}</div>
              <div className="text-[0.62rem] font-condensed tracking-widest mb-1" style={{ color: "var(--t-subtext)" }}>VND</div>
              <div className="text-[0.7rem] line-through mb-1" style={{ color: "var(--t-subtext)" }}>{product.price_original}</div>
              {product.price_save_label && (
                <div className="text-[0.55rem] font-bold font-condensed tracking-widest px-1.5 py-0.5 mb-1 rounded bg-emerald-600 text-white">
                  {product.price_save_label}
                </div>
              )}
            </div>

            <p className="text-[0.78rem] italic mt-3 line-clamp-2" style={{ color: "var(--t-subtext)" }}>
              {product.description}
            </p>

            {/* Color section */}
            <div className="mt-4 flex items-center justify-between text-[0.6rem] font-condensed tracking-widest uppercase">
              <span style={{ color: "var(--t-subtext)" }}>Color</span>
              <span style={{ color: "var(--t-text)" }}>{activeColor?.name}</span>
            </div>
            <div className="mt-2 grid grid-cols-8 gap-1.5">
              {colorVariants.map((c) => {
                const hasSource = !!colorVariants.find((x) => x.jersey_photo && x.id !== c.id);
                return (
                  <ColorCard key={c.id} color={c}
                    isActive={!customPreview && c.id === p.activeColorId}
                    onClick={() => selectPreset(c.id)}
                    canGenerate={!!p.isAdmin && hasSource}
                    hasPhoto={!!c.jersey_photo}
                    onGenerate={() => generateForCard(c)}
                    generating={genId === c.id}
                  />
                );
              })}
              <CustomColorCard index={1} isGradient onApply={applyCustomColor} />
              <CustomColorCard index={2} isGradient onApply={applyCustomColor} />
              <CustomColorCard index={3} isGradient onApply={applyCustomColor} />
              <CustomColorCard index={4} isGradient={false} onApply={applyCustomColor} />
            </div>

            {/* Spec grid */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {specRows.slice(0, 6).map((s) => (
                <div key={s.id} className="px-2 py-1.5 rounded" style={{ background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  <div className="text-[0.55rem] tracking-widest font-condensed uppercase" style={{ color: "var(--t-accent)" }}>{s.label}</div>
                  <div className="text-[0.78rem] font-condensed" style={{ color: "var(--t-text)" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* CTA pinned bottom */}
            <div className="mt-auto flex items-center gap-2">
              <button className="flex-1 py-2.5 font-condensed tracking-widest text-xs font-bold text-white clip-arrow-right"
                style={{ background: "var(--t-accent)" }}>
                {product.cta_label}
              </button>
              <button className="w-9 h-9 rounded-full border flex items-center justify-center" style={{ borderColor: "var(--t-border)", color: "var(--t-text)" }}>
                <Heart size={14} />
              </button>
            </div>
          </div>

          {/* Page number + corner fold */}
          <div className="absolute right-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.18)" }}>
            {product.page_right}
          </div>
          <div className="absolute right-0 bottom-0" style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "0 0 22px 22px", borderColor: `transparent transparent var(--t-accent) transparent` }} />
        </div>
      </div>

      {p.isAdmin && (
        <div style={{
          position: "absolute", top: 8, right: 8, zIndex: 50, pointerEvents: "none",
          background: "rgba(255,77,0,0.12)", border: "1px solid rgba(255,77,0,0.3)",
          color: "var(--t-accent)", fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.25em",
          textTransform: "uppercase", padding: "3px 8px",
        }}>✏ Edit Mode</div>
      )}

      {/* Book spine */}
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-10"
        style={{ width: 2, background: "var(--t-spine)", boxShadow: "0 0 20px var(--t-glow)" }} />
    </div>
  );
}

function ActionBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-1 px-2.5 py-1 rounded text-[0.6rem] font-condensed tracking-widest font-bold uppercase disabled:opacity-50"
      style={{ background: "var(--t-accent)", color: "white" }}>
      {children}
    </button>
  );
}

function ColorCard({ color, isActive, onClick, canGenerate, hasPhoto, onGenerate, generating }: {
  color: ColorVariant; isActive: boolean; onClick: () => void;
  canGenerate: boolean; hasPhoto: boolean; onGenerate: () => void; generating: boolean;
}) {
  const label = hasPhoto ? "Regenerate" : "Generate";
  return (
    <div style={{ position: "relative", overflow: "visible", height: 46 }} onClick={onClick} className="cursor-pointer group">
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 4, border: isActive ? "2px solid var(--t-accent)" : "1px solid var(--t-border)" }}>
        {color.jersey_photo
          ? <img src={color.jersey_photo} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${color.hex_main}, ${color.hex_shade || color.hex_main})` }} />
        }
        <div className="absolute bottom-0 inset-x-0 text-center text-[0.45rem] font-condensed tracking-widest text-white bg-black/60 py-0.5 truncate">
          {color.name.split(" ").pop()}
        </div>
      </div>
      {canGenerate && !generating && (
        <button
          onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          title={label}
          aria-label={label}
          style={{
            position: "absolute", top: -7, right: -7, zIndex: 30,
            width: 22, height: 22, borderRadius: "50%",
            background: "var(--t-accent)", border: "2px solid var(--t-bg)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
            opacity: hasPhoto ? 0 : 1,
            transition: "opacity 0.15s",
          }}
          className={hasPhoto ? "group-hover:opacity-100" : ""}
        ><Sparkles size={11} /></button>
      )}
      {generating && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded">
          <Loader2 className="animate-spin text-white" size={14} />
        </div>
      )}
    </div>
  );
}

function CustomColorCard({ index, isGradient, onApply }: {
  index: number; isGradient: boolean; onApply: (hexMain: string, hexShade: string, name: string) => void;
}) {
  const [mainColor, setMainColor] = useState("#888888");
  const [shadeColor, setShadeColor] = useState("#555555");
  const [isOpen, setIsOpen] = useState(false);
  const label = isGradient ? `CUSTOM ${index}` : "SOLID";

  function darken(hex: string, amt = 40) {
    const h = hex.replace("#", "");
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(parseInt(h.slice(0, 2), 16) - amt);
    const g = clamp(parseInt(h.slice(2, 4), 16) - amt);
    const b = clamp(parseInt(h.slice(4, 6), 16) - amt);
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  function apply() {
    const shade = isGradient ? shadeColor : darken(mainColor, 40);
    onApply(mainColor, shade, label);
    setIsOpen(false);
  }

  const preview = isGradient
    ? `linear-gradient(135deg, ${mainColor}, ${shadeColor})`
    : mainColor;

  return (
    <div style={{ position: "relative", height: 46 }}>
      <div
        onClick={() => setIsOpen((v) => !v)}
        className="cursor-pointer"
        style={{
          width: "100%", height: 46, position: "relative", overflow: "hidden",
          borderRadius: 4, border: "1.5px dashed rgba(255,255,255,0.25)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: preview, opacity: 0.75 }} />
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.85)", fontSize: "1rem", fontWeight: 300,
        }}>+</div>
        <div className="absolute bottom-0 inset-x-0 text-center text-[0.45rem] font-condensed tracking-widest text-white bg-black/60 py-0.5 truncate">
          {label}
        </div>
      </div>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 52, right: 0, zIndex: 100,
            background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.18)",
            padding: 10, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            borderRadius: 4,
          }}
        >
          <button
            onClick={() => setIsOpen(false)}
            style={{
              position: "absolute", top: 4, right: 6, background: "none",
              border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem",
            }}
          >✕</button>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.55rem",
            fontWeight: 700, letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase", marginBottom: 8,
          }}>
            {isGradient ? "Gradient Color" : "Solid Color"}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <label style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", width: 40, textTransform: "uppercase" }}>
              {isGradient ? "Main" : "Color"}
            </label>
            <input type="color" value={mainColor} onChange={(e) => setMainColor(e.target.value)}
              style={{ width: 32, height: 24, border: "none", padding: 0, cursor: "pointer", background: "none" }} />
            <input type="text" value={mainColor}
              onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setMainColor(e.target.value); }}
              style={{ flex: 1, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)",
                color: "#f2ede3", fontFamily: "monospace", fontSize: "0.72rem", padding: "3px 6px", outline: "none" }} />
          </div>

          {isGradient && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <label style={{ fontSize: "0.55rem", color: "rgba(255,255,255,0.5)", width: 40, textTransform: "uppercase" }}>Shade</label>
                <input type="color" value={shadeColor} onChange={(e) => setShadeColor(e.target.value)}
                  style={{ width: 32, height: 24, border: "none", padding: 0, cursor: "pointer", background: "none" }} />
                <input type="text" value={shadeColor}
                  onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setShadeColor(e.target.value); }}
                  style={{ flex: 1, background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.1)",
                    color: "#f2ede3", fontFamily: "monospace", fontSize: "0.72rem", padding: "3px 6px", outline: "none" }} />
              </div>
              <div style={{
                height: 12, borderRadius: 2,
                background: `linear-gradient(90deg, ${mainColor}, ${shadeColor})`,
                marginBottom: 8, border: "1px solid rgba(255,255,255,0.1)",
              }} />
            </>
          )}

          <button onClick={apply} style={{
            width: "100%", padding: 6, background: "var(--t-accent)", border: "none",
            color: "#000", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.65rem",
            fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", cursor: "pointer",
            borderRadius: 2,
          }}>Apply Color</button>
        </div>
      )}
    </div>
  );
}
