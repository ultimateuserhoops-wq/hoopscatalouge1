import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  CardHoverReveal,
  CardHoverRevealContent,
  CardHoverRevealMain,
} from "@/components/ui/reveal-on-hover";
import { JerseySVG } from "./JerseySVG";
import type { ColorVariant, DisplayMode, Product } from "@/lib/catalog-types";

interface Props {
  product: Product;
  colorVariants: ColorVariant[];
  activeColorId: string | null;
  onSelect: (id: string) => void;
  displayMode?: DisplayMode;
  className?: string;
  cardMinClass?: string;
}

const FIELD: Record<DisplayMode, "jersey_photo" | "body_photo" | "motion_gif"> = {
  jersey: "jersey_photo",
  body: "body_photo",
  motion: "motion_gif",
};

export function ProductCarousel({
  product,
  colorVariants,
  activeColorId,
  onSelect,
  displayMode = "jersey",
  className = "",
  cardMinClass = "min-w-[70vw] md:min-w-[38vw] xl:min-w-[30vw]",
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [colorVariants.length]);

  // Center active card when it changes externally.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !activeColorId) return;
    const target = el.querySelector<HTMLElement>(`[data-color-id="${activeColorId}"]`);
    if (target) {
      const left = target.offsetLeft - (el.clientWidth - target.clientWidth) / 2;
      el.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeColorId]);

  return (
    <div className={`relative w-full h-full flex flex-col ${className}`}>
      {/* Edge fade gradients */}
      <div
        className="pointer-events-none absolute left-0 top-0 bottom-6 w-10 z-10"
        style={{ background: "linear-gradient(to right, var(--t-bg, #0a0a0a), transparent)" }}
      />
      <div
        className="pointer-events-none absolute right-0 top-0 bottom-6 w-10 z-10"
        style={{ background: "linear-gradient(to left, var(--t-bg, #0a0a0a), transparent)" }}
      />

      <div
        ref={scrollerRef}
        className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth px-6 pb-2 hide-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {colorVariants.map((c) => {
          const photo = c[FIELD[displayMode]] as string | null;
          const active = c.id === activeColorId;
          const sizes = ["S", "M", "L", "XL"];
          return (
            <div
              key={c.id}
              data-color-id={c.id}
              className={`snap-center shrink-0 ${cardMinClass}`}
              onClick={() => onSelect(c.id)}
              role="button"
              tabIndex={0}
            >
              <CardHoverReveal
                className="h-full rounded-xl cursor-pointer"
                style={{
                  border: active
                    ? "2px solid var(--t-accent)"
                    : "1px solid var(--t-border, rgba(255,255,255,0.08))",
                  background: "var(--t-surface, #181818)",
                  boxShadow: active ? "0 12px 40px var(--t-glow)" : "none",
                  transition: "box-shadow 0.3s, border-color 0.3s",
                }}
              >
                <CardHoverRevealMain className="flex items-center justify-center">
                  {photo ? (
                    <img
                      src={photo}
                      alt={`${product.name} ${c.name}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-3/4 h-3/4">
                      <JerseySVG
                        hexMain={c.hex_main}
                        hexShade={c.hex_shade || c.hex_main}
                        isLight={!!c.is_light}
                        category={product.category || undefined}
                      />
                    </div>
                  )}
                </CardHoverRevealMain>
                <CardHoverRevealContent
                  className="rounded-lg space-y-3"
                  style={{
                    background: "color-mix(in oklab, var(--t-bg, #0a0a0a) 75%, transparent)",
                    color: "var(--t-text, #f2ede3)",
                  }}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {product.category && (
                      <Badge
                        className="text-[0.55rem] tracking-[0.2em] uppercase"
                        style={{ background: "var(--t-accent)", color: "#fff" }}
                      >
                        {product.category}
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[0.55rem] tracking-[0.2em] uppercase"
                      style={{
                        borderColor: "var(--t-accent)",
                        color: "var(--t-text, #f2ede3)",
                      }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{ background: c.hex_main }}
                      />
                      {c.name}
                    </Badge>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: "0.55rem",
                        letterSpacing: "0.28em",
                        opacity: 0.6,
                        textTransform: "uppercase",
                      }}
                    >
                      {product.sku}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Bebas Neue', sans-serif",
                        fontSize: "1.25rem",
                        letterSpacing: "0.04em",
                        lineHeight: 1.1,
                      }}
                    >
                      {product.name}
                    </div>
                  </div>
                  {product.description && (
                    <p className="text-[0.7rem] leading-snug opacity-80 line-clamp-3">
                      {product.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {sizes.map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="text-[0.55rem] tracking-widest"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "var(--t-text, #f2ede3)",
                        }}
                      >
                        {s}
                      </Badge>
                    ))}
                    {product.badge_label && (
                      <Badge
                        className="text-[0.55rem] tracking-widest"
                        style={{ background: "var(--t-accent)", color: "#fff" }}
                      >
                        {product.badge_label}
                      </Badge>
                    )}
                  </div>
                </CardHoverRevealContent>
              </CardHoverReveal>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div
        className="mx-6 mt-1 h-[3px] rounded-full overflow-hidden"
        style={{ background: "var(--t-border, rgba(255,255,255,0.08))" }}
      >
        <div
          className="h-full origin-left"
          style={{
            background: "var(--t-accent)",
            transform: `scaleX(${Math.max(0.05, progress)})`,
            transition: "transform 0.15s ease-out",
          }}
        />
      </div>
    </div>
  );
}