export function SizeSpread() {
  const sizes = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"];
  const rows = [
    { label: "Chest (cm)",    values: ["84","88","92","98","104","110","118","126"] },
    { label: "Length (cm)",   values: ["68","70","72","74","76","78","80","82"] },
    { label: "Shoulder (cm)", values: ["40","42","44","46","48","50","52","54"] },
    { label: "Sleeve (cm)",   values: ["20","21","22","23","24","25","26","27"] },
  ];
  const measure = [
    { p: "A", l: "CHEST",    d: "Around the fullest part of the chest, keeping the tape horizontal." },
    { p: "B", l: "SHOULDER", d: "From shoulder point to shoulder point across the back." },
    { p: "C", l: "LENGTH",   d: "From the highest point of the shoulder to the desired hem." },
    { p: "D", l: "SLEEVE",   d: "From the shoulder seam to the end of the cuff." },
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
            <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)" }}>SIZE GUIDE</div>
          </div>

          <div className="px-6 pt-14 pb-10 h-full flex flex-col">
            <div className="font-condensed" style={{ fontSize: "0.62rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>
              Size Reference
            </div>
            <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "3rem", lineHeight: 1 }}>SIZE GUIDE</h1>

            <table className="mt-5 w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className="font-condensed text-left" style={{ fontSize: "0.55rem", letterSpacing: "0.2em", color: "var(--t-subtext)", padding: "6px 4px", borderBottom: "1px solid var(--t-border)" }}>MEASUREMENT</th>
                  {sizes.map((s) => (
                    <th key={s} className="font-display" style={{ fontSize: "0.95rem", color: "var(--t-accent)", padding: "6px 0", borderBottom: "1px solid var(--t-border)", textAlign: "center" }}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className="font-condensed" style={{ fontSize: "0.62rem", color: "var(--t-text)", padding: "6px 4px", borderBottom: "1px solid var(--t-border)", letterSpacing: "0.05em" }}>{r.label}</td>
                    {r.values.map((v, j) => (
                      <td key={j} className="font-condensed text-center" style={{ fontSize: "0.7rem", color: "var(--t-text)", padding: "6px 0", borderBottom: "1px solid var(--t-border)" }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-4 font-condensed" style={{ fontSize: "0.62rem", lineHeight: 1.6, color: "var(--t-subtext)", fontStyle: "italic" }}>
              All measurements in centimetres. Sizes are approximate — custom sizing available on all orders. Contact your sales representative for custom fit orders.
            </p>
          </div>
          <div className="absolute left-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.15)" }}>50</div>
        </div>

        {/* RIGHT */}
        <div className="relative" style={{ background: "var(--t-bg)" }}>
          <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-end" style={{ borderBottom: "1px solid var(--t-border)" }}>
            <div className="font-condensed" style={{ fontSize: "0.6rem", letterSpacing: "0.2em", color: "var(--t-subtext)" }}>FIT GUIDE</div>
          </div>

          <div className="px-6 pt-14 pb-10 h-full flex flex-col">
            <div className="font-condensed" style={{ fontSize: "0.62rem", letterSpacing: "0.3em", color: "var(--t-accent)", textTransform: "uppercase" }}>
              How to Measure
            </div>
            <h1 className="font-display" style={{ color: "var(--t-text)", fontSize: "3rem", lineHeight: 1 }}>FIT GUIDE</h1>

            <div className="mt-4 flex flex-col gap-2.5">
              {measure.map((m) => (
                <div key={m.p} className="flex gap-3 items-start" style={{ padding: "8px 10px", background: "var(--t-surface)", border: "1px solid var(--t-border)" }}>
                  <div className="font-display" style={{
                    width: 28, height: 28, borderRadius: "50%", background: "var(--t-accent)",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.9rem", flexShrink: 0,
                  }}>{m.p}</div>
                  <div>
                    <div className="font-display" style={{ color: "var(--t-text)", fontSize: "0.95rem", letterSpacing: "0.05em" }}>{m.l}</div>
                    <div className="font-condensed" style={{ fontSize: "0.62rem", color: "var(--t-subtext)", lineHeight: 1.5, marginTop: 2 }}>{m.d}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-3" style={{ borderTop: "1px solid var(--t-border)" }}>
              <div className="font-condensed" style={{ fontSize: "0.65rem", letterSpacing: "0.2em", color: "var(--t-accent)", textTransform: "uppercase" }}>Custom Sizing</div>
              <p className="font-condensed" style={{ fontSize: "0.62rem", color: "var(--t-subtext)", lineHeight: 1.5, marginTop: 4 }}>
                All HOOPS products are available in custom sizes. Provide your team measurements and we will tailor each garment to specification.
              </p>
            </div>
          </div>
          <div className="absolute right-4 bottom-3 text-[0.7rem] font-display" style={{ color: "rgba(255,255,255,0.18)" }}>51</div>
          <div className="absolute right-0 bottom-0" style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "0 0 22px 22px", borderColor: "transparent transparent var(--t-accent) transparent" }} />
        </div>
      </div>
    </div>
  );
}
