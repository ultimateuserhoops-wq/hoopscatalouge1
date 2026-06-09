import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function HeroSlideshow() {
  const [images, setImages] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("color_variants")
      .select("jersey_photo,body_photo")
      .then(({ data }) => {
        if (cancelled || !data) return;
        const urls = Array.from(
          new Set(
            (data as { jersey_photo: string | null; body_photo: string | null }[])
              .flatMap((r) => [r.jersey_photo, r.body_photo])
              .filter((u): u is string => !!u && u.length > 0),
          ),
        );
        setImages(shuffle(urls));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (images.length < 2) return;
    const id = window.setInterval(() => {
      setIdx((prev) => {
        if (images.length <= 1) return prev;
        let next = Math.floor(Math.random() * images.length);
        if (next === prev) next = (prev + 1) % images.length;
        return next;
      });
    }, 10000);
    return () => window.clearInterval(id);
  }, [images]);

  if (images.length === 0) return null;
  const src = images[idx];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--t-surface)" }}>
      <AnimatePresence mode="sync">
        <motion.div
          key={src}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      </AnimatePresence>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

export function CoverSpread() {
  const cats = ["Jerseys", "Warm-Ups", "Polo", "Jackets", "1/4 Zip", "Hoodies", "Socks"];
  return (
    <div className="catalog-themed relative" style={{
      width: 880, height: 570, perspective: 2000, transform: "rotateX(2deg)",
      filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.9))",
    }}>
      <div className="absolute inset-0 grid grid-cols-2" style={{ borderRadius: 4, overflow: "hidden" }}>
        {/* LEFT — dark watermark */}
        <div className="relative grid-bg" style={{ background: "var(--t-surface)", overflow: "hidden" }}>
          {/* Dynamic product slideshow (falls back to court art if no images load) */}
          <HeroSlideshow />
          {/* Diagonal HOOPS watermark */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            transform: "rotate(-22deg)", pointerEvents: "none",
          }}>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: "11rem", lineHeight: 0.85,
              color: "rgba(255,255,255,0.03)", letterSpacing: "0.04em", whiteSpace: "nowrap",
            }}>
              HOOPS<br />HOOPS<br />HOOPS
            </div>
          </div>
          {/* Court arcs */}
          <div className="court-arc" style={{ width: 560, height: 280 }} />
          <div className="court-arc" style={{ width: 300, height: 150 }} />
          <div className="court-arc" style={{ width: 110, height: 55 }} />
          {/* Orange bar */}
          <div style={{
            position: "absolute", left: 0, bottom: 60, width: 90, height: 8,
            background: "var(--t-accent)",
          }} />
          <div style={{
            position: "absolute", left: 24, bottom: 28, fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.55rem", letterSpacing: "0.3em", color: "var(--t-subtext)", textTransform: "uppercase",
          }}>
            Cover · 2025
          </div>
          <div className="absolute left-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.15)" }}>00</div>
        </div>

        {/* RIGHT — main */}
        <div className="relative" style={{ background: "var(--t-bg)" }}>
          <div className="absolute inset-0 px-10 py-12 flex flex-col">
            {/* Top */}
            <div>
              <div className="font-display" style={{ color: "var(--t-text)", fontSize: "2.5rem", lineHeight: 1 }}>
                HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
              </div>
              <div className="font-condensed mt-1" style={{ fontSize: "0.6rem", letterSpacing: "0.25em", color: "var(--t-subtext)", textTransform: "uppercase" }}>
                Basketball Apparel · Da Nang, Vietnam
              </div>
            </div>

            {/* Center */}
            <div className="my-auto">
              <div className="font-condensed" style={{ fontSize: "0.65rem", letterSpacing: "0.35em", color: "var(--t-accent)", textTransform: "uppercase", marginBottom: 12 }}>
                2025 Collection
              </div>
              <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "5rem", lineHeight: 0.9, letterSpacing: "0.02em" }}>
                BASKETBALL<br />CATALOGUE
              </h1>
              <div style={{ width: 60, height: 3, background: "var(--t-accent)", margin: "18px 0" }} />
              <p style={{ color: "var(--t-subtext)", fontSize: "0.85rem", lineHeight: 1.6, maxWidth: 320, fontStyle: "italic" }}>
                Performance sportswear engineered for elite competition on and off the court.
              </p>
            </div>

            {/* Bottom */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {cats.map((c) => (
                  <span key={c} className="font-condensed" style={{
                    fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase",
                    padding: "4px 10px", border: "1px solid var(--t-border)",
                    color: "var(--t-text)", background: "var(--t-surface)",
                  }}>{c}</span>
                ))}
              </div>
              <div className="font-condensed" style={{ fontSize: "0.55rem", letterSpacing: "0.2em", color: "var(--t-subtext)", textTransform: "uppercase" }}>
                53 Pages · Full Customisation Available
              </div>
            </div>
          </div>
          <div className="absolute right-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.18)" }}>01</div>
          <div className="absolute right-0 bottom-0" style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "0 0 22px 22px", borderColor: "transparent transparent var(--t-accent) transparent" }} />
        </div>
      </div>
    </div>
  );
}
