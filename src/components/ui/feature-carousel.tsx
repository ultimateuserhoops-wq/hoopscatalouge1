import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FeatureCarouselImage {
  src: string;
  alt: string;
  caption?: string;
  sub?: string;
  accent?: string;
}

export interface HeroProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title: React.ReactNode;
  subtitle: string;
  images: FeatureCarouselImage[];
  autoPlay?: boolean;
  intervalMs?: number;
}

export const HeroSection = React.forwardRef<HTMLElement, HeroProps>(
  ({ title, subtitle, images, className, autoPlay = true, intervalMs = 4000, ...props }, ref) => {
    const [currentIndex, setCurrentIndex] = React.useState(
      Math.floor(images.length / 2),
    );

    const handleNext = React.useCallback(() => {
      setCurrentIndex((i) => (i + 1) % Math.max(images.length, 1));
    }, [images.length]);

    const handlePrev = React.useCallback(() => {
      setCurrentIndex((i) => (i - 1 + images.length) % Math.max(images.length, 1));
    }, [images.length]);

    React.useEffect(() => {
      if (!autoPlay || images.length < 2) return;
      const t = setInterval(handleNext, intervalMs);
      return () => clearInterval(t);
    }, [autoPlay, intervalMs, handleNext, images.length]);

    const active = images[currentIndex];
    const accent = active?.accent ?? "#FF4D00";

    return (
      <section
        ref={ref}
        className={cn("relative w-full h-full overflow-hidden bg-[#0a0a0a] text-white", className)}
        {...props}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none transition-[background] duration-700"
          style={{
            background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${accent}33 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative z-10 flex h-full flex-col">
          {/* Header */}
          <div className="px-8 pt-8 pb-2 text-center">
            <h1 className="font-display text-3xl md:text-5xl tracking-wide leading-tight">
              {title}
            </h1>
            <p className="mt-2 text-xs md:text-sm tracking-[0.25em] uppercase text-white/50 font-condensed">
              {subtitle}
            </p>
          </div>

          {/* Coverflow */}
          <div className="relative flex-1 flex items-center justify-center">
            <div className="relative w-full h-full" style={{ perspective: "1400px" }}>
              {images.map((image, index) => {
                const total = images.length;
                const offset = index - currentIndex;
                let pos = ((offset + total) % total + total) % total;
                if (pos > Math.floor(total / 2)) pos = pos - total;

                const isCenter = pos === 0;
                const abs = Math.abs(pos);
                const translateX = pos * 28; // %
                const rotateY = pos * -22;
                const scale = isCenter ? 1 : abs === 1 ? 0.78 : 0.6;
                const z = 100 - abs;
                const opacity = abs > 2 ? 0 : isCenter ? 1 : abs === 1 ? 0.7 : 0.35;

                return (
                  <div
                    key={image.src + index}
                    className="absolute top-1/2 left-1/2 transition-all duration-700 ease-out"
                    style={{
                      width: "44%",
                      aspectRatio: "3 / 4",
                      transform: `translate(-50%, -50%) translateX(${translateX}%) rotateY(${rotateY}deg) scale(${scale})`,
                      zIndex: z,
                      opacity,
                      visibility: abs > 2 ? "hidden" : "visible",
                      transformStyle: "preserve-3d",
                    }}
                  >
                    <div
                      className={cn(
                        "relative w-full h-full overflow-hidden rounded-xl bg-neutral-900",
                        "border border-white/10",
                      )}
                      style={{
                        boxShadow: isCenter
                          ? `0 30px 60px -10px ${accent}66, 0 18px 36px -18px rgba(0,0,0,0.8)`
                          : "0 12px 30px -10px rgba(0,0,0,0.6)",
                      }}
                    >
                      <img
                        src={image.src}
                        alt={image.alt}
                        crossOrigin="anonymous"
                        draggable={false}
                        className="w-full h-full object-cover select-none"
                      />
                      {isCenter && (image.caption || image.sub) && (
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                          {image.caption && (
                            <div className="font-display text-lg leading-none tracking-wide">
                              {image.caption}
                            </div>
                          )}
                          {image.sub && (
                            <div
                              className="mt-1 text-[0.6rem] font-condensed font-bold tracking-[0.22em] uppercase"
                              style={{ color: accent }}
                            >
                              {image.sub}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nav */}
            {images.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  aria-label="Previous"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 rounded-full border-white/15 bg-black/50 text-white hover:bg-black/70 hover:text-white backdrop-blur"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  aria-label="Next"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 rounded-full border-white/15 bg-black/50 text-white hover:bg-black/70 hover:text-white backdrop-blur"
                >
                  <ChevronRight />
                </Button>
              </>
            )}
          </div>

          {/* Dots */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 pb-4">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? 24 : 8,
                    background: i === currentIndex ? accent : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  },
);

HeroSection.displayName = "HeroSection";