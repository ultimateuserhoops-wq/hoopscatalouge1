import { useRef, useState } from "react";

interface Props {
  colorId: string | null;
  slotType: "jersey" | "body" | "motion";
  isAdmin: boolean;
  onUpload: (colorId: string, slotType: "jersey" | "body" | "motion", file: File) => void;
  children: React.ReactNode;
}

const ICONS = { jersey: "👕", body: "🧍", motion: "🎞" } as const;
const LABELS = { jersey: "Upload Jersey", body: "Upload On-Body", motion: "Upload GIF" } as const;
const ACCEPTS = { jersey: "image/*", body: "image/*", motion: "image/gif,image/*" } as const;

// Center-only hover trigger inset (leaves side strips free for view-mode buttons)
const HOVER_INSET = { top: "8%", bottom: "8%", left: "18%", right: "18%" };

export function ProductDisplayUpload({ colorId, slotType, isAdmin, onUpload, children }: Props) {
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isAdmin || !colorId) return <>{children}</>;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {children}

      {/* Hover-detection zone only in the center — side strips remain clickable for view-mode buttons */}
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => inputRef.current?.click()}
        style={{
          position: "absolute",
          top: HOVER_INSET.top,
          bottom: HOVER_INSET.bottom,
          left: HOVER_INSET.left,
          right: HOVER_INSET.right,
          zIndex: 15,
          cursor: "pointer",
        }}
      >
        {hovering && (
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.58)", backdropFilter: "blur(2px)",
              borderRadius: 8,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 6, animation: "fadeIn 0.15s ease",
            }}
          >
            <div style={{ fontSize: "1.5rem", opacity: 0.85 }}>{ICONS[slotType]}</div>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "var(--t-accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", color: "#000",
            }}>↑</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.58rem",
              fontWeight: 700, letterSpacing: "0.25em", color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
            }}>{LABELS[slotType]}</div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: "0.48rem",
              letterSpacing: "0.15em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
            }}>Click to choose file</div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTS[slotType]}
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(colorId, slotType, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
