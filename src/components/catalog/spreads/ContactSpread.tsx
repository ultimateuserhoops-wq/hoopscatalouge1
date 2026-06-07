import { MapPin, Phone, Mail, Globe, MessageCircle } from "lucide-react";

export function ContactSpread() {
  const steps = [
    { step: "01", t: "CHOOSE YOUR PRODUCT", d: "Select your product category, style, and base color from this catalogue." },
    { step: "02", t: "CUSTOMISE YOUR DESIGN", d: "Provide your team logo, names, number list, and color preferences. Custom printing and embroidery available." },
    { step: "03", t: "CONFIRM QUANTITIES", d: "Minimum order: 10 units per design. Bulk pricing available from 50+ units." },
    { step: "04", t: "PRODUCTION & DELIVERY", d: "Production lead time: 10–14 business days. Express available. Delivery to all Vietnam provinces." },
  ];

  const contacts = [
    { Icon: MapPin,         l: "ADDRESS",  v: "HOOPS Basketball Apparel\nDa Nang, Vietnam" },
    { Icon: Phone,          l: "PHONE",    v: "+84 xxx xxx xxxx" },
    { Icon: Mail,           l: "EMAIL",    v: "sales@hoops.vn\ndesign@hoops.vn" },
    { Icon: Globe,          l: "WEBSITE",  v: "www.hoops.vn" },
    { Icon: MessageCircle,  l: "ZALO / FB", v: "@hoopsvietnam" },
  ];

  return (
    <div className="catalog-themed relative" style={{
      width: 880, height: 570, perspective: 2000, transform: "rotateX(2deg)",
      filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.9))",
    }}>
      <div className="absolute inset-0 grid grid-cols-2" style={{ borderRadius: 4, overflow: "hidden" }}>
        {/* LEFT */}
        <div className="relative grid-bg" style={{ background: "var(--t-surface)" }}>
          <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--t-border)" }}>
            <div className="font-display text-lg" style={{ color: "var(--t-text)" }}>HOOPS<span style={{ color: "var(--t-accent)" }}>.</span></div>
            <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)" }}>HOW TO ORDER</div>
          </div>

          <div className="px-6 pt-14 pb-10 h-full flex flex-col">
            <div className="font-condensed" style={{ fontSize: "0.62rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>
              Get in Touch
            </div>
            <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "3rem", lineHeight: 1 }}>HOW TO ORDER</h1>

            <div className="mt-5 flex flex-col gap-2.5">
              {steps.map((s) => (
                <div key={s.step} className="flex gap-3 items-start">
                  <div className="font-display" style={{
                    color: "var(--t-accent)", fontSize: "2rem", lineHeight: 0.9,
                    minWidth: 44, flexShrink: 0,
                  }}>{s.step}</div>
                  <div className="flex-1">
                    <div className="font-display" style={{ color: "var(--t-text)", fontSize: "0.95rem", letterSpacing: "0.06em" }}>{s.t}</div>
                    <div className="font-condensed" style={{ fontSize: "0.62rem", color: "var(--t-subtext)", lineHeight: 1.5, marginTop: 2 }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto font-display" style={{ color: "var(--t-text)", fontSize: "1.5rem" }}>
              HOOPS<span style={{ color: "var(--t-accent)" }}>.</span>
            </div>
          </div>
          <div className="absolute left-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.15)" }}>52</div>
        </div>

        {/* RIGHT */}
        <div className="relative" style={{ background: "var(--t-bg)", overflow: "hidden" }}>
          <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-end" style={{ borderBottom: "1px solid var(--t-border)" }}>
            <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)" }}>GET IN TOUCH</div>
          </div>

          {/* Watermark */}
          <div style={{
            position: "absolute", right: -40, bottom: -20, pointerEvents: "none",
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "16rem", lineHeight: 0.8,
            color: "rgba(255,255,255,0.025)", letterSpacing: "0.04em",
          }}>HOOPS</div>

          <div className="px-6 pt-14 pb-10 h-full flex flex-col relative">
            <div className="font-condensed" style={{ fontSize: "0.62rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>
              Contact Us
            </div>
            <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "3rem", lineHeight: 1 }}>CONTACT</h1>

            <div className="mt-5 flex flex-col gap-2">
              {contacts.map((c) => (
                <div key={c.l} className="flex gap-3 items-start" style={{
                  padding: "8px 12px", background: "var(--t-surface)",
                  border: "1px solid var(--t-border)",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--t-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0,
                  }}>
                    <c.Icon size={14} />
                  </div>
                  <div>
                    <div className="font-condensed" style={{ fontSize: "0.55rem", letterSpacing: "0.25em", color: "var(--t-accent)", textTransform: "uppercase" }}>{c.l}</div>
                    <div className="font-condensed" style={{ fontSize: "0.78rem", color: "var(--t-text)", lineHeight: 1.4, whiteSpace: "pre-line", marginTop: 2 }}>{c.v}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <p className="font-condensed" style={{ fontSize: "0.55rem", color: "var(--t-subtext)", lineHeight: 1.6, letterSpacing: "0.05em" }}>
                © 2025 HOOPS Basketball Apparel · Da Nang, Vietnam<br />
                All designs and products are subject to full customisation.<br />
                Prices exclude VAT and shipping. MOQ applies per style.
              </p>
            </div>
          </div>
          <div className="absolute right-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.18)" }}>53</div>
          <div className="absolute right-0 bottom-0" style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "0 0 22px 22px", borderColor: "transparent transparent var(--t-accent) transparent" }} />
        </div>
      </div>
    </div>
  );
}
