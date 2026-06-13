import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Upload,
  Trash2,
  Scissors,
  Download,
  Shirt,
  Save,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  callGeminiTwoImages,
  callGeminiMultiImages,
  readFileAsDataURL,
  resizeImage,
  compositeOntoBackground,
  buildRemoveBgToSolidPrompt,
  callGemini,
  downloadImageHD,
  getAIErrorMessage,
  getLeftPageBg,
} from "@/lib/gemini";
import { notify } from "@/lib/toast";
import { ProductCutout } from "@/components/ProductCutout";

interface MixTemplate {
  id: string;
  type: "jersey" | "shorts" | "athlete";
  photo: string | null;
  photo_name: string | null;
  athlete_template: string | null;
  sort_order: number;
}

interface Props {
  isAdmin?: boolean;
  full?: boolean; // mobile mode
}

const GEN_PROMPT = `Dress the EXACT athlete from IMAGE 3 in a new basketball uniform. Keep him on a clean neutral background.

IMAGE 1 = JERSEY DESIGN SOURCE:
- Put this jersey design on the athlete's top.
- Preserve its colors, collar, trim, side panels, graphics, team text, numbers, logos, and pattern placement.

IMAGE 2 = SHORTS CUT / STYLE SOURCE:
- Shorts silhouette, length, waistband height, hem, leg opening, side seams, side panels, and construction come ONLY from IMAGE 2.
- Keep IMAGE 2's shorts pattern shapes and panel layout, but recolor them using IMAGE 1's jersey palette.

IMAGE 3 = THE ATHLETE (IDENTITY LOCK):
- Use the SAME person from IMAGE 3: same face, same skin tone, same hair, same body type, same height, same pose, same hands, same shoes.
- Do NOT change his appearance, age, ethnicity, facial features, or physique in any way.
- Only his jersey and shorts change — everything else about the person stays identical to IMAGE 3.

HARD RULES:
- Do NOT generate a different person. The athlete must be recognizably the same as IMAGE 3.
- Do NOT use jersey proportions for the shorts.
- Do NOT change the shorts cut, waistband, hem, or leg opening from IMAGE 2.
- Do NOT make the shorts look like the jersey bottom.
- Person = IMAGE 3. Top design = IMAGE 1. Shorts structure = IMAGE 2. Shorts colors = IMAGE 1 palette.`;

function useSectionSwipe(onLeft: () => void, onRight: () => void) {
  const startX = useRef<number | null>(null);
  return {
    onMouseDown: (e: React.MouseEvent) => {
      startX.current = e.clientX;
    },
    onMouseUp: (e: React.MouseEvent) => {
      if (startX.current === null) return;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 40) (dx < 0 ? onLeft : onRight)();
      startX.current = null;
    },
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return;
      const dx = e.changedTouches[0].clientX - startX.current;
      if (Math.abs(dx) > 40) (dx < 0 ? onLeft : onRight)();
      startX.current = null;
    },
  };
}

export function MixMatchSpread({ isAdmin, full }: Props) {
  const [jerseys, setJerseys] = useState<MixTemplate[]>([]);
  const [shorts, setShorts] = useState<MixTemplate[]>([]);
  const [athlete, setAthlete] = useState<string | null>(null);
  const [jerseyIndex, setJerseyIndex] = useState(0);
  const [shortsIndex, setShortsIndex] = useState(0);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [defaultResult, setDefaultResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);

  const selectedJersey = jerseys[jerseyIndex] || null;
  const selectedShorts = shorts[shortsIndex] || null;

  async function reload() {
    const { data } = await supabase
      .from("mix_match_templates" as any)
      .select("*")
      .order("sort_order");
    const rows = ((data as unknown) || []) as MixTemplate[];
    setJerseys(rows.filter((r) => r.type === "jersey"));
    setShorts(rows.filter((r) => r.type === "shorts"));
    const a = rows.find((r) => r.type === "athlete" || r.athlete_template);
    setAthlete(a?.athlete_template || null);
  }
  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    setGeneratedResult(null);
  }, [jerseyIndex, shortsIndex]);

  useEffect(() => {
    async function loadDefault() {
      if (!selectedJersey?.id || !selectedShorts?.id) {
        setDefaultResult(null);
        return;
      }
      const { data } = await (supabase as any)
        .from("mix_match_defaults")
        .select("result_photo")
        .eq("jersey_id", selectedJersey.id)
        .eq("shorts_id", selectedShorts.id)
        .maybeSingle();
      setDefaultResult(data?.result_photo || null);
    }
    loadDefault();
  }, [selectedJersey?.id, selectedShorts?.id]);

  async function generate() {
    if (!selectedJersey?.photo || !selectedShorts?.photo) {
      notify("Select a jersey and shorts first", true);
      return;
    }
    setGenerating(true);
    try {
      const images = [selectedJersey.photo, selectedShorts.photo];
      if (athlete) images.push(athlete);
      const result = await callGeminiMultiImages(images, GEN_PROMPT, 1024);
      setGeneratedResult(result);
      notify("Set generated ✓");
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally {
      setGenerating(false);
    }
  }

  async function removeBg() {
    if (!generatedResult) return;
    setRemovingBg(true);
    try {
      const bg = getLeftPageBg(null);
      const r = await callGemini(generatedResult, buildRemoveBgToSolidPrompt(bg));
      const flat = await compositeOntoBackground(r, bg);
      setGeneratedResult(flat);
      notify("Background removed");
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally {
      setRemovingBg(false);
    }
  }

  async function saveResult() {
    if (!generatedResult || !selectedJersey || !selectedShorts) return;
    const { error } = await (supabase as any).from("mix_match_results").insert({
      jersey_id: selectedJersey.id,
      shorts_id: selectedShorts.id,
      result_photo: generatedResult,
    });
    if (error) notify(error.message, true);
    else notify("Saved ✓");
  }

  async function setAsDefault() {
    if (!generatedResult || !selectedJersey || !selectedShorts) return;
    const { error } = await (supabase as any)
      .from("mix_match_defaults")
      .upsert(
        {
          jersey_id: selectedJersey.id,
          shorts_id: selectedShorts.id,
          result_photo: generatedResult,
        },
        { onConflict: "jersey_id,shorts_id" }
      );
    if (error) {
      notify(error.message, true);
      return;
    }
    setDefaultResult(generatedResult);
    notify("Set as default ✓");
  }

  const canGenerate = !!(selectedJersey?.photo && selectedShorts?.photo);
  const displayResult = generatedResult || defaultResult;

  /* ─── Mobile vertical layout ─── */
  if (full) {
    return (
      <div
        className="catalog-themed"
        style={{
          width: "100%",
          minHeight: "100%",
          background: "var(--t-bg)",
          color: "var(--t-text)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
        }}
      >
        <MobileSelector
          emoji="👕"
          label="SELECT JERSEY"
          items={jerseys}
          index={jerseyIndex}
          setIndex={setJerseyIndex}
        />
        <MobileSelector
          emoji="🩳"
          label="SELECT SHORTS"
          items={shorts}
          index={shortsIndex}
          setIndex={setShortsIndex}
        />
        <div
          style={{
            position: "relative",
            background: "var(--t-surface)",
            border: "1px solid var(--t-border)",
            borderRadius: 6,
            minHeight: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <ResultArea
            generatedResult={generatedResult}
            defaultResult={defaultResult}
            athlete={athlete}
          />
          {(generating || removingBg) && (
            <LoadingOverlay label={generating ? "Generating…" : "Removing BG…"} />
          )}
        </div>
        <GenerateButton onClick={generate} canGenerate={canGenerate} generating={generating} />
        {displayResult && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SmallBtn onClick={saveResult} disabled={!generatedResult}>
              <Save size={11} /> SAVE
            </SmallBtn>
            <SmallBtn onClick={setAsDefault} disabled={!generatedResult}>
              <Star size={11} /> DEFAULT
            </SmallBtn>
            {isAdmin && generatedResult && (
              <SmallBtn onClick={removeBg} disabled={removingBg}>
                <Scissors size={11} /> BG
              </SmallBtn>
            )}
            {isAdmin && (
              <SmallBtn onClick={() => downloadImageHD(displayResult, "mixmatch-set.png", 2000)}>
                <Download size={11} /> HD
              </SmallBtn>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─── Desktop spread ─── */
  return (
    <div
      className="catalog-themed relative"
      style={{
        width: 1320,
        height: 500,
        perspective: 2000,
        transform: "rotateX(2deg)",
        filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.9))",
      }}
    >
      <div
        className="absolute inset-0 grid"
        style={{ borderRadius: 4, overflow: "hidden", gridTemplateColumns: "440px 440px 440px" }}
      >
        {/* LEFT page: 880×500, two selector sections (shorts + jersey) */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="relative"
          style={{
            background: "#0a0a0a",
            display: "flex",
            flexDirection: "row",
            color: "#fff",
            gridColumn: "1 / span 2",
          }}
        >
          {/* accent bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              background: "var(--t-accent)",
              zIndex: 2,
            }}
          />
          <SelectorSection
            emoji="🩳"
            label="SELECT SHORTS"
            items={shorts}
            index={shortsIndex}
            setIndex={setShortsIndex}
          />
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <SelectorSection
            emoji="👕"
            label="SELECT JERSEY"
            items={jerseys}
            index={jerseyIndex}
            setIndex={setJerseyIndex}
          />
        </motion.div>

        {/* RIGHT page: 440×500, result */}
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.32, 0.72, 0, 1] }}
          className="relative"
          style={{
            background: "var(--t-surface, #181818)",
            display: "flex",
            flexDirection: "column",
            color: "var(--t-text)",
          }}
        >
          {/* Top bar 32px — matches selector label strip for alignment */}
          <div
            style={{
              height: 32,
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--t-border)",
            }}
          >
            <div
              className="font-display"
              style={{ fontSize: "0.85rem", letterSpacing: "0.1em" }}
            >
              BUILD YOUR SET
            </div>
            <div
              className="font-condensed"
              style={{
                color: "var(--t-accent)",
                fontWeight: 700,
                letterSpacing: "0.18em",
                fontSize: "0.6rem",
              }}
            >
              HOOPS.
            </div>
          </div>

          <div
            style={{
              height: 416,
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              overflow: "hidden",
              background: "var(--t-bg)",
              padding: 8,
            }}
          >
            <ResultArea
              generatedResult={generatedResult}
              defaultResult={defaultResult}
              athlete={athlete}
            />
            {(generating || removingBg) && (
              <LoadingOverlay label={generating ? "Generating your set…" : "Removing BG…"} />
            )}
          </div>

          <div
            style={{
              height: 52,
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderTop: "1px solid var(--t-border)",
            }}
          >
            <GenerateButton
              onClick={generate}
              canGenerate={canGenerate}
              generating={generating}
            />
            {generatedResult && (
              <>
                <SmallBtn onClick={saveResult}>
                  <Save size={11} /> SAVE
                </SmallBtn>
                <SmallBtn onClick={setAsDefault}>
                  <Star size={11} /> DEFAULT
                </SmallBtn>
              </>
            )}
            {isAdmin && generatedResult && (
              <SmallBtn onClick={removeBg} disabled={removingBg}>
                {removingBg ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Scissors size={11} />
                )}{" "}
                BG
              </SmallBtn>
            )}
            {isAdmin && displayResult && (
              <SmallBtn
                onClick={() => downloadImageHD(displayResult, "mixmatch-set.png", 2400)}
              >
                <Download size={11} /> HD
              </SmallBtn>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Selector section (left page) ─── */
function SelectorSection({
  emoji,
  label,
  items,
  index,
  setIndex,
}: {
  emoji: string;
  label: string;
  items: MixTemplate[];
  index: number;
  setIndex: (i: number) => void;
}) {
  const current = items[index] || null;
  const cycle = (dir: 1 | -1) => {
    if (items.length === 0) return;
    setIndex((index + dir + items.length) % items.length);
  };
  const swipe = useSectionSwipe(
    () => cycle(1),
    () => cycle(-1)
  );
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      {/* label strip 32px */}
      <div
        style={{
          height: 32,
          paddingLeft: 14,
          paddingRight: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="font-condensed"
          style={{
            fontSize: "0.55rem",
            letterSpacing: "0.25em",
            color: "var(--t-accent)",
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {emoji} {label}
        </span>
        <span
          className="font-condensed"
          style={{
            fontSize: "0.55rem",
            letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.55)",
            textTransform: "uppercase",
          }}
        >
          {current?.photo_name || (items.length ? `${index + 1}/${items.length}` : "SWIPE TO CHOOSE")}
        </span>
      </div>

      {/* preview area */}
      <div
        {...swipe}
        style={{
          flex: 1,
          position: "relative",
          padding: 8,
          cursor: items.length > 1 ? "grab" : "default",
          userSelect: "none",
          minHeight: 0,
          perspective: "1200px",
        }}
      >
        {items.length === 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.15 }}>
            <Shirt size={68} color="#fff" />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
            {items.map((it, i) => {
              const total = items.length;
              let pos = ((i - index) % total + total) % total;
              if (pos > Math.floor(total / 2)) pos -= total;
              const isCenter = pos === 0;
              const abs = Math.abs(pos);
              if (abs > 2) return null;
              const translateX = pos * 32;
              const rotateY = pos * -24;
              const scale = isCenter ? 1 : abs === 1 ? 0.72 : 0.55;
              const opacity = isCenter ? 1 : abs === 1 ? 0.65 : 0.3;
              const z = 100 - abs;
              return (
                <div
                  key={it.id}
                  onClick={() => !isCenter && setIndex(i)}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "78%",
                    height: "92%",
                    transform: `translate(-50%, -50%) translateX(${translateX}%) rotateY(${rotateY}deg) scale(${scale})`,
                    transition: "transform 0.55s cubic-bezier(0.32,0.72,0,1), opacity 0.55s",
                    opacity,
                    zIndex: z,
                    cursor: isCenter ? "default" : "pointer",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  {it.photo ? (
                    <img
                      src={it.photo}
                      draggable={false}
                      alt=""
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                        objectPosition: "bottom",
                        filter: isCenter ? "none" : "brightness(0.7)",
                      }}
                    />
                  ) : (
                    <Shirt size={48} color="#fff" style={{ opacity: 0.3 }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {items.length > 1 && (
          <>
            <button
              onClick={() => cycle(-1)}
              style={arrowStyle("left")}
              aria-label="Previous"
            >
              <ChevronLeft size={14} color="#fff" />
            </button>
            <button
              onClick={() => cycle(1)}
              style={arrowStyle("right")}
              aria-label="Next"
            >
              <ChevronRight size={14} color="#fff" />
            </button>
          </>
        )}
      </div>

      {/* pagination dots */}
      <div
        style={{
          height: 28,
          padding: "0 12px",
          display: "flex",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to ${i + 1}`}
            style={{
              height: 6,
              width: i === index ? 22 : 6,
              borderRadius: 999,
              border: "none",
              padding: 0,
              background: i === index ? "var(--t-accent)" : "rgba(255,255,255,0.25)",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          />
        ))}
        {items.length === 0 && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              style={{
                width: 64,
                height: 80,
                borderRadius: 6,
                background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.12) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shirt size={28} style={{ opacity: 0.3, color: "var(--t-accent)" }} />
            </motion.div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "80%", alignItems: "center" }}>
              <motion.div
                animate={{ opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                style={{ height: 8, width: "70%", borderRadius: 4, background: "rgba(255,255,255,0.12)" }}
              />
              <motion.div
                animate={{ opacity: [0.2, 0.35, 0.2] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                style={{ height: 6, width: "50%", borderRadius: 4, background: "rgba(255,255,255,0.08)" }}
              />
            </div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: "0.55rem",
              letterSpacing: "0.2em",
              color: "var(--t-accent)",
              textTransform: "uppercase",
              opacity: 0.7,
            }}>
              Upload templates in CMS
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 6,
    transform: "translateY(-50%)",
    width: 26,
    height: 26,
    borderRadius: 999,
    background: "rgba(0,0,0,0.55)",
    border: "1px solid rgba(255,255,255,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 3,
  } as React.CSSProperties;
}

function MobileSelector({
  emoji,
  label,
  items,
  index,
  setIndex,
}: {
  emoji: string;
  label: string;
  items: MixTemplate[];
  index: number;
  setIndex: (i: number) => void;
}) {
  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid var(--t-border)",
        borderRadius: 6,
        overflow: "hidden",
        minHeight: 240,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SelectorSection
        emoji={emoji}
        label={label}
        items={items}
        index={index}
        setIndex={setIndex}
      />
    </div>
  );
}

function ResultArea({
  generatedResult,
  defaultResult,
  athlete,
}: {
  generatedResult: string | null;
  defaultResult: string | null;
  athlete: string | null;
}) {
  return (
    <AnimatePresence mode="wait">
      {generatedResult ? (
        <motion.div
          key="gen"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ProductCutout src={generatedResult} fit="contain" position="center" />
        </motion.div>
      ) : defaultResult ? (
        <motion.div
          key="def"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ProductCutout src={defaultResult} fit="contain" position="center" />
        </motion.div>
      ) : athlete ? (
        <motion.img
          key="ath"
          src={athlete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          alt=""
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      ) : (
        <motion.div
          key="ph"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center font-condensed"
          style={{
            color: "var(--t-subtext)",
            fontSize: "0.6rem",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            padding: 20,
          }}
        >
          <Shirt size={42} style={{ margin: "0 auto 10px" }} />
          <div>Select jersey + shorts then generate</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GenerateButton({
  onClick,
  canGenerate,
  generating,
}: {
  onClick: () => void;
  canGenerate: boolean;
  generating: boolean;
}) {
  const pulse = canGenerate && !generating;
  return (
    <motion.button
      onClick={onClick}
      disabled={!canGenerate || generating}
      animate={pulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={{ duration: 1.6, repeat: pulse ? Infinity : 0 }}
      style={{
        flex: 1,
        background: canGenerate ? "var(--t-accent)" : "rgba(255,255,255,0.08)",
        color: "#fff",
        border: "1px solid var(--t-accent)",
        padding: "10px 14px",
        borderRadius: 6,
        fontFamily: "'Bebas Neue', 'Barlow Condensed', sans-serif",
        fontWeight: 700,
        letterSpacing: "0.2em",
        fontSize: "0.85rem",
        opacity: canGenerate ? 1 : 0.4,
        cursor: canGenerate && !generating ? "pointer" : "not-allowed",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <Sparkles size={14} /> {generating ? "GENERATING…" : "GENERATE SET"}
    </motion.button>
  );
}

function SmallBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-condensed"
      style={{
        padding: "8px 10px",
        borderRadius: 5,
        border: "1px solid var(--t-border)",
        background: "rgba(255,255,255,0.05)",
        color: "var(--t-text)",
        fontSize: "0.55rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        gap: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 10,
        color: "#fff",
        backdropFilter: "blur(2px)",
      }}
    >
      <Loader2 size={28} className="animate-spin" />
      <div
        className="font-condensed"
        style={{ fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase" }}
      >
        {label}
      </div>
    </div>
  );
}

/* ─── CMS section (used inside CMSPanel as a tab) ─── */
export function MixMatchCMS() {
  const [jerseys, setJerseys] = useState<MixTemplate[]>([]);
  const [shorts, setShorts] = useState<MixTemplate[]>([]);
  const [athlete, setAthlete] = useState<MixTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const [bgBusyId, setBgBusyId] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase
      .from("mix_match_templates" as any)
      .select("*")
      .order("sort_order");
    const rows = ((data as unknown) || []) as MixTemplate[];
    setJerseys(rows.filter((r) => r.type === "jersey"));
    setShorts(rows.filter((r) => r.type === "shorts"));
    setAthlete(rows.find((r) => r.type === "athlete") || null);
  }
  useEffect(() => {
    reload();
  }, []);

  async function uploadFile(file: File): Promise<string> {
    const raw = await readFileAsDataURL(file);
    return resizeImage(raw, 1280);
  }

  async function addItem(type: "jersey" | "shorts", file: File) {
    setBusy(true);
    try {
      const photo = await uploadFile(file);
      await supabase.from("mix_match_templates" as any).insert({
        type,
        photo,
        photo_name: file.name,
        sort_order: Date.now() % 1000000,
      } as any);
      notify(`Added ${type}`);
      await reload();
    } catch (e: any) {
      notify(e?.message || "Upload failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function delItem(id: string) {
    if (!confirm("Delete this template?")) return;
    await supabase.from("mix_match_templates" as any).delete().eq("id", id);
    await reload();
  }

  async function removeBgItem(id: string, photo: string) {
    setBgBusyId(id);
    try {
      const res = await fetch("/api/photoroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src: photo }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; fallback?: boolean };
      if (!res.ok || !data.url) throw new Error(data.error || `PhotoRoom failed (${res.status})`);
      await supabase.from("mix_match_templates" as any).update({ photo: data.url } as any).eq("id", id);
      notify(data.fallback ? "Background removal unavailable; original kept" : "Background removed", data.fallback);
      await reload();
    } catch (e: any) {
      notify(e?.message || "Background removal failed", true);
    } finally {
      setBgBusyId(null);
    }
  }

  async function setAthleteTemplate(file: File) {
    setBusy(true);
    try {
      const photo = await uploadFile(file);
      if (athlete) {
        await supabase
          .from("mix_match_templates" as any)
          .update({ athlete_template: photo, photo_name: file.name } as any)
          .eq("id", athlete.id);
      } else {
        await supabase.from("mix_match_templates" as any).insert({
          type: "athlete",
          athlete_template: photo,
          photo_name: file.name,
          sort_order: 0,
        } as any);
      }
      notify("Athlete template saved");
      await reload();
    } catch (e: any) {
      notify(e?.message || "Upload failed", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-2">
          Athlete template (right page base)
        </div>
        <div className="flex items-center gap-3 p-2 border border-white/10 rounded bg-white/5">
          <div
            style={{
              width: 72,
              height: 90,
              borderRadius: 4,
              overflow: "hidden",
              background: "#111",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {athlete?.athlete_template ? (
              <img
                src={athlete.athlete_template}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <Shirt size={20} className="text-white/30" />
            )}
          </div>
          <label className="flex-1">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAthleteTemplate(f);
                e.target.value = "";
              }}
            />
            <div className="px-3 py-2 text-[0.6rem] font-condensed tracking-widest uppercase border border-white/10 rounded bg-white/5 hover:bg-white/10 flex items-center gap-1 cursor-pointer">
              <Upload size={11} /> {athlete ? "Replace" : "Upload athlete"}
            </div>
          </label>
        </div>
      </div>

      <TemplateList
        title="Jersey templates"
        items={jerseys}
        busy={busy}
        onAdd={(f) => addItem("jersey", f)}
        onDelete={delItem}
        onRemoveBg={removeBgItem}
        bgBusyId={bgBusyId}
      />
      <TemplateList
        title="Shorts templates"
        items={shorts}
        busy={busy}
        onAdd={(f) => addItem("shorts", f)}
        onDelete={delItem}
        onRemoveBg={removeBgItem}
        bgBusyId={bgBusyId}
      />
    </div>
  );
}

function TemplateList({
  title,
  items,
  busy,
  onAdd,
  onDelete,
  onRemoveBg,
  bgBusyId,
}: {
  title: string;
  items: MixTemplate[];
  busy: boolean;
  onAdd: (f: File) => void;
  onDelete: (id: string) => void;
  onRemoveBg: (id: string, photo: string) => void;
  bgBusyId: string | null;
}) {
  return (
    <div>
      <div className="text-[0.55rem] font-condensed tracking-widest text-white/60 uppercase mb-2">
        {title} ({items.length})
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div
            key={it.id}
            className="relative border border-white/10 rounded overflow-hidden bg-white/5"
            style={{ aspectRatio: "3/4" }}
          >
            {it.photo && (
              <img
                src={it.photo}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            <button
              onClick={() => onDelete(it.id)}
              className="absolute top-1 right-1 p-1 rounded bg-black/70 text-red-300 hover:text-red-200"
            >
              <Trash2 size={11} />
            </button>
            {it.photo && (
              <button
                onClick={() => onRemoveBg(it.id, it.photo!)}
                disabled={bgBusyId === it.id}
                title="Remove background"
                className="absolute top-1 left-1 p-1 rounded bg-black/70 text-white/80 hover:text-white disabled:opacity-50"
              >
                {bgBusyId === it.id ? <Loader2 size={11} className="animate-spin" /> : <Scissors size={11} />}
              </button>
            )}
          </div>
        ))}
        <label
          className="border border-dashed border-white/15 rounded flex items-center justify-center cursor-pointer hover:bg-white/5"
          style={{ aspectRatio: "3/4" }}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAdd(f);
              e.target.value = "";
            }}
          />
          <div className="text-center text-white/50 font-condensed text-[0.55rem] tracking-widest uppercase">
            <Upload size={14} className="mx-auto mb-1" />
            Add
          </div>
        </label>
      </div>
    </div>
  );
}