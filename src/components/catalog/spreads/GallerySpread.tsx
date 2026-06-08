import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSwipe } from "@/hooks/useSwipe";
import {
  callGemini,
  compositeOntoBackground,
  buildRemoveBgToSolidPrompt,
  getAIErrorMessage,
  hexToRgba,
} from "@/lib/gemini";
import { uploadDataUrlToStorage } from "@/lib/storage";
import { notify } from "@/lib/toast";
import type { SpreadDef } from "@/lib/catalog-spreads";

interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  sku: string;
  photo: string;
  hexMain: string;
}

interface Props {
  spread: SpreadDef;
  isAdmin: boolean;
  full?: boolean; // mobile full-screen layout
}

export function GallerySpread({ spread, isAdmin, full = false }: Props) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [removingBg, setRemovingBg] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: rows } = await supabase
        .from("gallery_photos")
        .select("id, photo_url, title, subtitle, hex_color, sort_order")
        .eq("spread_id", spread.id)
        .order("sort_order");
      const list: GalleryItem[] = (rows ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? "",
        subtitle: r.subtitle ?? "",
        sku: "",
        photo: r.photo_url as string,
        hexMain: (r.hex_color as string) || "#FF4D00",
      }));
      if (!cancelled) {
        setItems(list);
        setActiveIndex(0);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [spread.id]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => {
      if (i < items.length - 1) { setDirection(1); return i + 1; }
      return i;
    });
  }, [items.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => {
      if (i > 0) { setDirection(-1); return i - 1; }
      return i;
    });
  }, []);

  // Local left/right key nav (stop propagation so catalog nav doesn't also fire)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") { e.stopPropagation(); goNext(); }
      else if (e.key === "ArrowLeft") { e.stopPropagation(); goPrev(); }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [goNext, goPrev]);

  const swipeHandlers = useSwipe({ threshold: 50, onSwipeLeft: goNext, onSwipeRight: goPrev });

  const activeItem = items[activeIndex];

  async function handleRemoveBg() {
    if (!activeItem || !isAdmin) return;
    setRemovingBg(true);
    try {
      const bg = "#0a0a0a";
      const transparent = await callGemini(activeItem.photo, buildRemoveBgToSolidPrompt(bg));
      const composited = await compositeOntoBackground(transparent, bg);
      const url = (await uploadDataUrlToStorage(composited, "colors/jersey_photo")) || composited;
      await supabase.from("gallery_photos").update({ photo_url: url }).eq("id", activeItem.id);
      setItems((prev) => prev.map((it, i) => (i === activeIndex ? { ...it, photo: url } : it)));
      notify("✓ Background removed");
    } catch (err) {
      notify(getAIErrorMessage(err), true);
    } finally {
      setRemovingBg(false);
    }
  }

  const variants = useMemo(() => ({
    enter: (dir: number) => ({ x: dir > 0 ? 120 : -120, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -120 : 120, opacity: 0, scale: 0.96 }),
  }), []);

  const W = full ? "100vw" : "880px";
  const H = full ? "100%" : "570px";
  const sidebarW = full ? 0 : 80;
  const thumbH = full ? 96 : 110;

  return (
    <div
      className="gallery-spread catalog-themed"
      style={{
        width: W, height: H, position: "relative", overflow: "hidden",
        background: "#0a0a0a", flexShrink: 0,
      }}
      {...swipeHandlers}
    >
      {/* Background radial glow keyed off active color */}
      <motion.div
        animate={{
          background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${hexToRgba(activeItem?.hexMain ?? "#FF4D00", 0.18)} 0%, transparent 70%)`,
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}
      />

      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "44px 44px", pointerEvents: "none", zIndex: 0,
      }} />

      {/* Hero image */}
      <AnimatePresence custom={direction} mode="wait">
        {activeItem && (
          <motion.div
            key={activeItem.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 32 },
              opacity: { duration: 0.22 },
              scale: { duration: 0.25 },
            }}
            style={{
              position: "absolute",
              top: full ? 48 : 0,
              left: sidebarW,
              right: 0,
              bottom: thumbH,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
            }}
          >
            <motion.img
              src={activeItem.photo}
              alt={activeItem.title || "Gallery photo"}
              crossOrigin="anonymous"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              style={{
                maxWidth: full ? "86%" : "72%",
                maxHeight: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 24px 48px rgba(0,0,0,0.6))",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left sidebar (desktop only) */}
      {!full && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: thumbH, width: sidebarW,
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "24px 0 20px 20px", zIndex: 10,
          borderRight: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.55rem", fontWeight: 700,
            letterSpacing: "0.35em", color: "var(--t-accent)", textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}>{spread.title}</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.2)", lineHeight: 1 }}>
            {String(activeIndex + 1).padStart(2, "0")}
            <span style={{ fontSize: "0.5rem", display: "block", letterSpacing: "0.1em" }}>
              / {String(items.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      {/* Top bar (mobile only) */}
      {full && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 48,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", zIndex: 20,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1rem", color: "var(--t-accent)", letterSpacing: "0.08em" }}>
            HOOPS<span style={{ color: "rgba(255,255,255,0.4)" }}> · {spread.title}</span>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.58rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em" }}>
            {items.length ? `${activeIndex + 1} / ${items.length}` : "0 / 0"}
          </div>
        </div>
      )}

      {/* Product label */}
      <AnimatePresence mode="wait">
        {activeItem && (
          <motion.div
            key={`label-${activeItem.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            style={{ position: "absolute", left: full ? 20 : 96, bottom: thumbH + 8, zIndex: 12, pointerEvents: "none" }}
          >
            {activeItem.title && (
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.5rem", letterSpacing: "0.04em", color: "#fff", lineHeight: 1 }}>
                {activeItem.title}
              </div>
            )}
            {activeItem.subtitle && (
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", color: "var(--t-accent)", textTransform: "uppercase", marginTop: 2 }}>
                {activeItem.subtitle}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prev/Next arrows */}
      {items.length > 1 && (
        <>
          <motion.button
            onClick={goPrev}
            disabled={activeIndex === 0}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.9 }}
            style={{
              position: "absolute", left: full ? 12 : 90, top: "50%", transform: "translateY(-50%)",
              marginTop: -55, zIndex: 20,
              background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
              color: activeIndex === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)",
              width: 32, height: 32, borderRadius: "50%",
              cursor: activeIndex === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", backdropFilter: "blur(8px)",
            }}
            aria-label="Previous photo"
          >‹</motion.button>
          <motion.button
            onClick={goNext}
            disabled={activeIndex === items.length - 1}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.9 }}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              marginTop: -55, zIndex: 20,
              background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)",
              color: activeIndex === items.length - 1 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)",
              width: 32, height: 32, borderRadius: "50%",
              cursor: activeIndex === items.length - 1 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.9rem", backdropFilter: "blur(8px)",
            }}
            aria-label="Next photo"
          >›</motion.button>
        </>
      )}

      {/* Remove BG (admin) */}
      {isAdmin && activeItem && (
        <motion.button
          onClick={handleRemoveBg}
          disabled={removingBg}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ borderColor: "var(--t-accent)", color: "#fff" }}
          whileTap={{ scale: 0.96 }}
          style={{
            position: "absolute", bottom: thumbH + 8, right: 16, zIndex: 20,
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
            background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)",
            color: removingBg ? "var(--t-accent)" : "rgba(255,255,255,0.7)",
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.6rem", fontWeight: 700,
            letterSpacing: "0.2em", textTransform: "uppercase",
            cursor: removingBg ? "not-allowed" : "pointer", backdropFilter: "blur(8px)",
          }}
        >
          {removingBg ? (
            <>
              <div style={{
                width: 10, height: 10, border: "2px solid rgba(255,255,255,0.1)",
                borderTopColor: "var(--t-accent)", borderRadius: "50%",
                animation: "ai-spin 0.7s linear infinite", flexShrink: 0,
              }} />
              Removing...
            </>
          ) : "✂ Remove BG"}
        </motion.button>
      )}

      {/* Thumbnail strip */}
      <div style={{
        position: "absolute", bottom: 0, left: sidebarW, right: 0, height: thumbH,
        background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)",
        display: "flex", alignItems: "center", padding: "0 20px 8px 20px", gap: 8,
        overflowX: "auto", overflowY: "visible", scrollbarWidth: "none", zIndex: 15,
        WebkitOverflowScrolling: "touch",
      }}>
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            onClick={() => { setDirection(i > activeIndex ? 1 : -1); setActiveIndex(i); }}
            whileHover={{ y: -3, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              borderColor: i === activeIndex ? "var(--t-accent)" : "rgba(255,255,255,0.1)",
              scale: i === activeIndex ? 1.08 : 1,
              y: i === activeIndex ? -4 : 0,
            }}
            transition={{ duration: 0.2 }}
            style={{
              flexShrink: 0, width: 52, height: 64,
              border: "1.5px solid", borderRadius: 2,
              overflow: "hidden", background: "#111",
              cursor: "pointer", padding: 0, position: "relative",
            }}
          >
            <img
              src={item.photo}
              alt={item.title || "Thumbnail"}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <div style={{
              position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
              width: 6, height: 6, borderRadius: "50%", background: item.hexMain,
              border: "1px solid rgba(255,255,255,0.3)",
            }} />
          </motion.button>
        ))}
      </div>

      {/* Page number (desktop) */}
      {!full && (
        <div style={{
          position: "absolute", bottom: 12, left: 20,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.5rem", letterSpacing: "0.2em",
          color: "rgba(255,255,255,0.15)", textTransform: "uppercase", zIndex: 20,
        }}>
          {spread.pageLeft}–{spread.pageRight}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30 }}>
          <div style={{
            width: 28, height: 28, border: "2px solid rgba(255,255,255,0.1)",
            borderTopColor: "var(--t-accent)", borderRadius: "50%",
            animation: "ai-spin 0.7s linear infinite",
          }} />
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em",
          textTransform: "uppercase", zIndex: 30, textAlign: "center", padding: "0 24px",
        }}>
          <div style={{ fontSize: "2.5rem", opacity: 0.3 }}>🖼️</div>
          No photos uploaded yet
          <span style={{ fontSize: "0.55rem", opacity: 0.6, letterSpacing: "0.2em" }}>
            Open CMS → Gallery to upload photos for this spread
          </span>
        </div>
      )}
    </div>
  );
}