import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  removeCheckerBackground,
  isCutoutDisabled,
  setCutoutDisabled,
} from "@/utils/removeCheckerBackground";

interface Props {
  src: string | null | undefined;
  alt?: string;
  blendMode?: CSSProperties["mixBlendMode"];
  shadow?: boolean;
  /** Ambient color used for a soft-light overlay so the cutout picks up scene lighting. */
  envTint?: string | null;
  /** Object-fit / position passed straight to the underlying img. */
  fit?: CSSProperties["objectFit"];
  position?: CSSProperties["objectPosition"];
  /** Force-disable the cutout pipeline (e.g. raw photo with checkered design). */
  noCutout?: boolean;
  /** When true, render a small admin-only toggle to disable cutout per-image. */
  isAdmin?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function ProductCutout({
  src,
  alt = "",
  blendMode = "normal",
  shadow = true,
  envTint = null,
  fit = "contain",
  position = "center bottom",
  noCutout = false,
  isAdmin = false,
  className,
  style,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [cutSrc, setCutSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [disabled, setDisabled] = useState<boolean>(() => !!src && isCutoutDisabled(src));

  // Only process when near the viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Run the cleaner when src changes and we're visible.
  useEffect(() => {
    setCutSrc(null);
    if (!src || !visible) return;
    const skip = noCutout || disabled || src.startsWith("data:image/gif");
    if (skip) { setCutSrc(src); return; }
    let cancelled = false;
    setProcessing(true);
    removeCheckerBackground(src).then((out) => {
      if (cancelled) return;
      setCutSrc(out);
      setProcessing(false);
    });
    return () => { cancelled = true; setProcessing(false); };
  }, [src, visible, noCutout, disabled]);

  useEffect(() => { if (src) setDisabled(isCutoutDisabled(src)); }, [src]);

  if (!src) return null;

  const showImg = cutSrc ?? src;

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {/* Soft contact shadow */}
      {shadow && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "10%",
            right: "10%",
            bottom: "4%",
            height: "8%",
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.18) 45%, rgba(0,0,0,0) 70%)",
            filter: "blur(6px)",
            opacity: 0.85,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* The image itself */}
      <img
        src={showImg}
        alt={alt}
        loading="lazy"
        decoding="async"
        crossOrigin="anonymous"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: position,
          mixBlendMode: blendMode,
          zIndex: 1,
          transition: "opacity 0.35s ease",
          opacity: processing && !cutSrc ? 0.92 : 1,
        }}
      />

      {/* Environment tint — soft-light overlay so the cutout picks up scene lighting */}
      {envTint && cutSrc && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: envTint,
            mixBlendMode: "soft-light",
            opacity: 0.18,
            pointerEvents: "none",
            zIndex: 2,
            // Mask to the cutout's alpha by reusing the same image as a mask.
            WebkitMaskImage: `url(${showImg})`,
            maskImage: `url(${showImg})`,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: position as string,
            maskPosition: position as string,
            WebkitMaskSize: fit === "contain" ? "contain" : "cover",
            maskSize: fit === "contain" ? "contain" : "cover",
          }}
        />
      )}

      {/* Shimmer while processing */}
      {processing && !cutSrc && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(110deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0) 70%)",
            backgroundSize: "200% 100%",
            animation: "hoops-shimmer 1.4s linear infinite",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      )}

      {/* Admin toggle */}
      {isAdmin && src && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const next = !disabled;
            setCutoutDisabled(src, next);
            setDisabled(next);
          }}
          title={disabled ? "Cutout disabled — click to enable" : "Disable cutout for this image"}
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            zIndex: 10,
            padding: "3px 6px",
            borderRadius: 4,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "0.5rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            background: disabled ? "rgba(255,77,0,0.85)" : "rgba(0,0,0,0.55)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            cursor: "pointer",
          }}
        >
          {disabled ? "Cutout off" : "Cutout"}
        </button>
      )}

      <style>{`@keyframes hoops-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}