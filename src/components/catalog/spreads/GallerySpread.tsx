import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SpreadDef } from "@/lib/catalog-spreads";
import { HeroSection, type FeatureCarouselImage } from "@/components/ui/feature-carousel";

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

export function GallerySpread({ spread, isAdmin: _isAdmin, full = false }: Props) {
  const [items, setItems] = useState<GalleryItem[]>([]);
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
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [spread.id]);

  const W = full ? "100vw" : "880px";
  const H = full ? "100%" : "570px";

  const carouselImages: FeatureCarouselImage[] = items.map((it) => ({
    src: it.photo,
    alt: it.title || "Jersey photo",
    caption: it.title,
    sub: it.subtitle,
    accent: it.hexMain,
  }));

  const title = (
    <>
      {spread.title || "Gallery"}
      <span style={{ color: "var(--t-accent)" }}>.</span>
    </>
  );

  return (
    <div
      className="gallery-spread catalog-themed"
      style={{
        width: W, height: H, position: "relative", overflow: "hidden",
        background: "#0a0a0a", flexShrink: 0,
      }}
    >
      {loading ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: 28, height: 28, border: "2px solid rgba(255,255,255,0.1)",
            borderTopColor: "var(--t-accent)", borderRadius: "50%",
            animation: "ai-spin 0.7s linear infinite",
          }} />
        </div>
      ) : items.length === 0 ? (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 12,
          color: "rgba(255,255,255,0.4)", fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.25em",
          textTransform: "uppercase", textAlign: "center", padding: "0 24px",
        }}>
          <div style={{ fontSize: "2.5rem", opacity: 0.3 }}>🖼️</div>
          No photos uploaded yet
          <span style={{ fontSize: "0.55rem", opacity: 0.6, letterSpacing: "0.2em" }}>
            Open CMS → Gallery to upload photos for this spread
          </span>
        </div>
      ) : (
        <HeroSection
          title={title}
          subtitle={`HOOPS · ${spread.title || "Featured Jerseys"}`}
          images={carouselImages}
        />
      )}
    </div>
  );
}