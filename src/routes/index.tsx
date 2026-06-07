import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { CatalogSpread } from "@/components/catalog/CatalogSpread";
import { CMSPanel } from "@/components/catalog/CMSPanel";
import { MobileCatalog } from "@/components/catalog/MobileCatalog";
import { CoverSpread } from "@/components/catalog/spreads/CoverSpread";
import { MenuSpread } from "@/components/catalog/spreads/MenuSpread";
import { SizeSpread } from "@/components/catalog/spreads/SizeSpread";
import { ContactSpread } from "@/components/catalog/spreads/ContactSpread";
import { CATALOG_SPREADS, TOTAL_PAGES } from "@/lib/catalog-spreads";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HOOPS · Flip Catalog" },
      { name: "description", content: "Interactive basketball apparel catalog — jerseys, warm-ups, jackets, hoodies and more." },
      { property: "og:title", content: "HOOPS · Basketball Catalogue 2025" },
      { property: "og:description", content: "53-page interactive basketball apparel catalogue with AI-powered colorway generation." },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [cmsOpen, setCmsOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const isMobile = useIsMobile();

  const currentSpread = CATALOG_SPREADS[spreadIndex];
  const cat = useCatalog(currentSpread.productSku ?? null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function updateScale() {
      const scale = Math.min((window.innerWidth * 0.98) / 880, (window.innerHeight * 0.92) / 570);
      document.documentElement.style.setProperty("--catalog-scale", String(scale));
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setSpreadIndex((i) => Math.min(CATALOG_SPREADS.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setSpreadIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canPrev = spreadIndex > 0;
  const canNext = spreadIndex < CATALOG_SPREADS.length - 1;

  function jumpToCategory(category: string) {
    const i = CATALOG_SPREADS.findIndex((s) => s.category === category || (s.type === "size" && category === "SIZE GUIDE") || (s.type === "contact" && category === "CONTACT & ORDER"));
    if (i >= 0) setSpreadIndex(i);
  }

  const spreadOptions = useMemo(() => CATALOG_SPREADS.map((s, i) => ({ value: i, label: s.label })), []);

  if (isMobile) {
    return (
      <MobileCatalog
        spreadIndex={spreadIndex}
        setSpreadIndex={setSpreadIndex}
        cat={cat}
        isAdmin={isAuthed}
        cmsOpen={cmsOpen}
        setCmsOpen={setCmsOpen}
      />
    );
  }

  const renderSpread = () => {
    switch (currentSpread.type) {
      case "cover":
        return <CoverSpread />;
      case "menu":
        return (
          <MenuSpread
            menuIndex={spreadIndex === 1 ? 0 : 1}
            pageLeft={currentSpread.pageLeft}
            pageRight={currentSpread.pageRight}
            onJump={jumpToCategory}
          />
        );
      case "size":
        return <SizeSpread />;
      case "contact":
        return <ContactSpread />;
      case "product":
        if (cat.loading || !cat.product) {
          return (
            <div className="catalog-themed flex items-center justify-center" style={{ width: 880, height: 570, background: "var(--t-surface)" }}>
              <div className="text-white/40 font-condensed tracking-widest text-xs">LOADING PRODUCT…</div>
            </div>
          );
        }
        return (
          <CatalogSpread
            product={cat.product}
            colorVariants={cat.colorVariants}
            specRows={cat.specRows}
            activeColor={cat.activeColor}
            activeColorId={cat.activeColorId}
            setActiveColorId={cat.setActiveColorId}
            displayMode={cat.displayMode}
            setDisplayMode={cat.setDisplayMode}
            updateColorVariant={cat.updateColorVariant}
            updateProduct={cat.updateProduct}
            isAdmin={isAuthed}
            activeThemeId={cat.themes?.find((t) => t.is_active)?.theme_id}
          />
        );
    }
  };

  return (
    <main className="catalog-themed catalog-viewport" style={{ background: "var(--t-bg)" }}>
      <header className="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-6 py-4">
        <div className="font-display tracking-widest text-2xl" style={{ color: "var(--t-text)" }}>
          HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
        </div>
        <nav className="flex items-center gap-2">
          {isAuthed ? (
            <button onClick={() => setCmsOpen(true)}
              className="px-3 py-1.5 rounded text-[0.6rem] font-condensed tracking-widest flex items-center gap-1 border border-white/10 hover:bg-white/5"
              style={{ color: "var(--t-text)" }}>
              <Settings size={12} /> EDIT
            </button>
          ) : (
            <a href="/auth" className="px-3 py-1.5 rounded text-[0.6rem] font-condensed tracking-widest border border-white/10 hover:bg-white/5"
              style={{ color: "var(--t-text)" }}>ADMIN SIGN IN</a>
          )}
        </nav>
      </header>

      <div className="catalog-scale-wrapper">{renderSpread()}</div>

      {/* Bottom navigation */}
      <div className="absolute bottom-3 inset-x-0 z-40 flex items-center justify-center gap-3 px-4">
        <button
          onClick={() => setSpreadIndex((i) => Math.max(0, i - 1))}
          disabled={!canPrev}
          className="font-condensed flex items-center gap-1 px-3 py-1.5 rounded"
          style={{
            background: "rgba(0,0,0,0.5)", border: "1px solid var(--t-border)",
            color: canPrev ? "var(--t-text)" : "var(--t-subtext)",
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", opacity: canPrev ? 1 : 0.4, cursor: canPrev ? "pointer" : "not-allowed",
            backdropFilter: "blur(6px)",
          }}
        >
          <ChevronLeft size={12} /> Prev
        </button>

        <select
          value={spreadIndex}
          onChange={(e) => setSpreadIndex(Number(e.target.value))}
          style={{
            background: "rgba(0,0,0,0.7)", border: "1px solid var(--t-border)",
            color: "var(--t-text)", fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", padding: "6px 10px", cursor: "pointer", minWidth: 200,
            backdropFilter: "blur(6px)",
          }}
        >
          {spreadOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="font-condensed" style={{
          fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)",
          textTransform: "uppercase", minWidth: 90, textAlign: "center",
        }}>
          {currentSpread.pageLeft.toString().padStart(2, "0")}–{currentSpread.pageRight.toString().padStart(2, "0")} / {TOTAL_PAGES}
        </div>

        <button
          onClick={() => setSpreadIndex((i) => Math.min(CATALOG_SPREADS.length - 1, i + 1))}
          disabled={!canNext}
          className="font-condensed flex items-center gap-1 px-3 py-1.5 rounded"
          style={{
            background: "var(--t-accent)", border: "1px solid var(--t-accent)",
            color: "#fff",
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", opacity: canNext ? 1 : 0.4, cursor: canNext ? "pointer" : "not-allowed",
          }}
        >
          Next <ChevronRight size={12} />
        </button>
      </div>

      {isAuthed && cat.product && (
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
        />
      )}
    </main>
  );
}
