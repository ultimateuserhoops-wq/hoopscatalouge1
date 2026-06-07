import { MENU_PAGES } from "@/lib/catalog-spreads";

interface Props {
  menuIndex: 0 | 1;
  pageLeft: number;
  pageRight: number;
  onJump?: (category: string) => void;
}

export function MenuSpread({ menuIndex, pageLeft, pageRight, onJump }: Props) {
  const items = MENU_PAGES[menuIndex];
  const pad2 = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="catalog-themed relative" style={{
      width: 880, height: 570, perspective: 2000, transform: "rotateX(2deg)",
      filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.9))",
    }}>
      <div className="absolute inset-0 grid grid-cols-2" style={{ borderRadius: 4, overflow: "hidden" }}>
        {/* LEFT */}
        <div className="relative grid-bg" style={{ background: "var(--t-surface)", overflow: "hidden" }}>
          <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border)" }}>
            <div className="font-display text-lg" style={{ color: "var(--t-text)" }}>
              HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
            </div>
            <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)", textTransform: "uppercase" }}>
              Contents
            </div>
          </div>

          <div className="px-8 pt-14 h-full flex flex-col">
            <div className="font-condensed" style={{ fontSize: "0.65rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>
              Catalogue Contents
            </div>
            <h1 className="font-display mt-2" style={{ color: "var(--t-text)", fontSize: "3.5rem", lineHeight: 0.95, whiteSpace: "pre-line" }}>
              {menuIndex === 0 ? "UNIFORMS &\nAPPAREL" : "OUTERWEAR\n& MORE"}
            </h1>

            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              {items.map((it) => (
                <div key={it.num} className="font-display" style={{ color: "rgba(255,255,255,0.07)", fontSize: "4.5rem", lineHeight: 1 }}>
                  {it.num}
                </div>
              ))}
            </div>

            <div className="mt-auto pb-12 font-display text-2xl" style={{ color: "var(--t-text)" }}>
              HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
            </div>
          </div>
          <div className="absolute left-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.15)" }}>{pad2(pageLeft)}</div>
        </div>

        {/* RIGHT */}
        <div className="relative" style={{ background: "var(--t-bg)" }}>
          <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-end" style={{ borderBottom: "1px solid var(--t-border)" }}>
            <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)", textTransform: "uppercase" }}>
              Page {pad2(pageRight)}
            </div>
          </div>

          <div className="px-8 pt-14 pb-10 h-full flex flex-col gap-3 overflow-hidden">
            {items.map((it) => (
              <button
                key={it.num}
                onClick={() => onJump?.(it.category)}
                className="text-left group"
                style={{
                  padding: "10px 12px", borderBottom: "1px solid var(--t-border)",
                  background: "transparent", cursor: onJump ? "pointer" : "default",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--t-surface)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display" style={{ color: "var(--t-accent)", fontSize: "1.4rem", lineHeight: 1 }}>{it.num}</span>
                    <span className="font-display" style={{ color: "var(--t-text)", fontSize: "1.2rem", lineHeight: 1, letterSpacing: "0.03em" }}>{it.category}</span>
                  </div>
                  <span className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)", textTransform: "uppercase" }}>
                    p.{it.pages}
                  </span>
                </div>
                {it.items.length > 0 && (
                  <div className="font-condensed mt-1" style={{ fontSize: "0.65rem", letterSpacing: "0.05em", color: "var(--t-subtext)" }}>
                    {it.items.join(" · ")}
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="absolute right-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.18)" }}>{pad2(pageRight)}</div>
          <div className="absolute right-0 bottom-0" style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "0 0 22px 22px", borderColor: "transparent transparent var(--t-accent) transparent" }} />
        </div>
      </div>
    </div>
  );
}
