import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Upload, Trash2, Scissors, Download, Shirt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  callGeminiTwoImages,
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

interface MixTemplate {
  id: string;
  type: "jersey" | "shorts";
  photo: string | null;
  photo_name: string | null;
  athlete_template: string | null;
  sort_order: number;
}

interface Props {
  isAdmin?: boolean;
  full?: boolean; // mobile mode
}

const GEN_PROMPT = `You are a professional sportswear product visualizer.

IMAGE 1: A flat jersey photo showing the jersey design, colors, and graphics
IMAGE 2: An athlete/model template (the person to dress)

YOUR TASK: Dress the athlete in IMAGE 2 wearing:
- The jersey from IMAGE 1 (exact same colors, graphics, numbers, logos)
- Basketball shorts that MATCH the jersey's colorway (same primary color, same trim/accent color)
- The shorts should have a similar design aesthetic to the jersey

REQUIREMENTS:
- Keep the athlete's pose, body, skin, face, hair exactly as in IMAGE 2
- The jersey on the athlete must show the same design as IMAGE 1
- Background should match the athlete template background
- Result looks like a professional on-body product photo
- High quality output

OUTPUT: The athlete wearing the complete basketball set`;

export function MixMatchSpread({ isAdmin, full }: Props) {
  const [jerseys, setJerseys] = useState<MixTemplate[]>([]);
  const [shorts, setShorts] = useState<MixTemplate[]>([]);
  const [athlete, setAthlete] = useState<string | null>(null);
  const [selectedJersey, setSelectedJersey] = useState<string | null>(null);
  const [selectedShorts, setSelectedShorts] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);

  async function reload() {
    const { data } = await supabase
      .from("mix_match_templates" as any)
      .select("*")
      .order("sort_order");
    const rows = (data || []) as MixTemplate[];
    setJerseys(rows.filter((r) => r.type === "jersey"));
    setShorts(rows.filter((r) => r.type === "shorts"));
    const a = rows.find((r) => r.type === "athlete" || r.athlete_template);
    setAthlete(a?.athlete_template || null);
  }
  useEffect(() => {
    reload();
  }, []);

  async function generate() {
    if (!selectedJersey || !selectedShorts) {
      notify("Select a jersey and shorts first", true);
      return;
    }
    if (!athlete) {
      notify("Upload an athlete template in CMS first", true);
      return;
    }
    setGenerating(true);
    try {
      const out = await callGeminiTwoImages(selectedJersey, athlete, GEN_PROMPT, 1280);
      setResult(out);
      notify("Set generated");
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally {
      setGenerating(false);
    }
  }

  async function removeBg() {
    if (!result) return;
    setRemovingBg(true);
    try {
      const bg = getLeftPageBg(null);
      const r = await callGemini(result, buildRemoveBgToSolidPrompt(bg));
      const flat = await compositeOntoBackground(r, bg);
      setResult(flat);
      notify("Background removed");
    } catch (e) {
      notify(getAIErrorMessage(e), true);
    } finally {
      setRemovingBg(false);
    }
  }

  const both = selectedJersey && selectedShorts;

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
        <Section
          title="SELECT JERSEY"
          items={jerseys}
          selected={selectedJersey}
          onSelect={setSelectedJersey}
        />
        <Section
          title="SELECT SHORTS"
          items={shorts}
          selected={selectedShorts}
          onSelect={setSelectedShorts}
        />
        <div
          style={{
            position: "relative",
            background: "var(--t-surface)",
            border: "1px solid var(--t-border)",
            borderRadius: 6,
            minHeight: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="wait">
            {result ? (
              <motion.img
                key="r"
                src={result}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain" }}
                alt=""
              />
            ) : (
              <motion.div
                key="ph"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ textAlign: "center", color: "var(--t-subtext)", padding: 20 }}
              >
                <Shirt size={36} style={{ margin: "0 auto 8px" }} />
                <div className="font-condensed tracking-widest text-[0.65rem]">
                  PICK A JERSEY + SHORTS, THEN GENERATE
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {generating && <LoadingOverlay label="Generating set…" />}
        </div>
        <motion.button
          onClick={generate}
          disabled={!both || generating}
          animate={both && !generating ? { scale: [1, 1.03, 1] } : { scale: 1 }}
          transition={{ duration: 1.6, repeat: both ? Infinity : 0 }}
          style={{
            background: both ? "var(--t-accent)" : "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid var(--t-accent)",
            padding: "12px",
            borderRadius: 6,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.2em",
            fontSize: "0.8rem",
            opacity: both ? 1 : 0.5,
            cursor: both ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Sparkles size={14} /> GENERATE SET
        </motion.button>
        {result && (
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && (
              <SmallBtn onClick={removeBg} disabled={removingBg}>
                <Scissors size={11} /> REMOVE BG
              </SmallBtn>
            )}
            {isAdmin && (
              <SmallBtn onClick={() => downloadImageHD(result, "mixmatch-set.png", 2000)}>
                <Download size={11} /> HD
              </SmallBtn>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="catalog-themed relative"
      style={{
        width: 880,
        height: 570,
        perspective: 2000,
        transform: "rotateX(2deg)",
        filter: "drop-shadow(0 30px 70px rgba(0,0,0,0.9))",
      }}
    >
      <div
        className="absolute inset-0 grid grid-cols-2"
        style={{ borderRadius: 4, overflow: "hidden", background: "var(--t-bg)" }}
      >
        {/* LEFT — selectors */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="relative"
          style={{
            background: "var(--t-bg)",
            display: "flex",
            flexDirection: "column",
            color: "var(--t-text)",
          }}
        >
          {/* accent bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 4,
              background: "var(--t-accent)",
            }}
          />
          <div style={{ flex: 1, padding: 16, paddingLeft: 20, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <SelectorPanel
              title="SELECT JERSEY"
              items={jerseys}
              selected={selectedJersey}
              onSelect={setSelectedJersey}
            />
          </div>
          <div style={{ height: 1, background: "var(--t-border)" }} />
          <div style={{ flex: 1, padding: 16, paddingLeft: 20, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <SelectorPanel
              title="SELECT SHORTS"
              items={shorts}
              selected={selectedShorts}
              onSelect={setSelectedShorts}
            />
          </div>
        </motion.div>

        {/* RIGHT — result */}
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.08, ease: [0.32, 0.72, 0, 1] }}
          className="relative"
          style={{
            background: "var(--t-surface)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* title */}
          <div
            className="font-display"
            style={{
              padding: "14px 18px 0",
              fontSize: "1.4rem",
              letterSpacing: "0.08em",
              color: "var(--t-text)",
            }}
          >
            BUILD YOUR SET<span style={{ color: "var(--t-accent)" }}>.</span>
          </div>
          <div
            className="font-condensed"
            style={{
              padding: "0 18px 8px",
              fontSize: "0.6rem",
              letterSpacing: "0.22em",
              color: "var(--t-subtext)",
              textTransform: "uppercase",
            }}
          >
            Pick a jersey · pick shorts · generate the on-court look
          </div>

          <div
            style={{
              flex: 1,
              margin: "8px 18px",
              border: "1px solid var(--t-border)",
              borderRadius: 6,
              background: "var(--t-bg)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <AnimatePresence mode="wait">
              {result ? (
                <motion.img
                  key="result"
                  src={result}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4 }}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : athlete ? (
                <motion.img
                  key="ath"
                  src={athlete}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.45 }}
                  exit={{ opacity: 0 }}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center font-condensed"
                  style={{
                    color: "var(--t-subtext)",
                    fontSize: "0.65rem",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                  }}
                >
                  <Shirt size={42} style={{ margin: "0 auto 10px" }} />
                  <div>Athlete template not set</div>
                </motion.div>
              )}
            </AnimatePresence>

            {generating && <LoadingOverlay label="Generating your set…" />}
          </div>

          {/* Bottom action bar */}
          <div style={{ padding: "10px 18px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <motion.button
              onClick={generate}
              disabled={!both || generating}
              animate={both && !generating ? { scale: [1, 1.04, 1] } : { scale: 1 }}
              transition={{ duration: 1.6, repeat: both && !generating ? Infinity : 0 }}
              style={{
                flex: 1,
                background: both ? "var(--t-accent)" : "rgba(255,255,255,0.06)",
                color: "#fff",
                border: "1px solid var(--t-accent)",
                padding: "12px 14px",
                borderRadius: 6,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.2em",
                fontSize: "0.78rem",
                opacity: both ? 1 : 0.45,
                cursor: both && !generating ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Sparkles size={14} /> {generating ? "GENERATING…" : "GENERATE SET"}
            </motion.button>
            {result && isAdmin && (
              <SmallBtn onClick={removeBg} disabled={removingBg}>
                {removingBg ? <Loader2 size={11} className="animate-spin" /> : <Scissors size={11} />} BG
              </SmallBtn>
            )}
            {result && isAdmin && (
              <SmallBtn onClick={() => downloadImageHD(result, "mixmatch-set.png", 2400)}>
                <Download size={11} /> HD
              </SmallBtn>
            )}
          </div>

          <div
            className="font-condensed"
            style={{
              position: "absolute",
              right: 14,
              bottom: 4,
              fontSize: "0.5rem",
              letterSpacing: "0.25em",
              color: "var(--t-subtext)",
              textTransform: "uppercase",
            }}
          >
            p.04–05
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SelectorPanel({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: MixTemplate[];
  selected: string | null;
  onSelect: (photo: string | null) => void;
}) {
  const current = items.find((i) => i.photo === selected) || null;
  return (
    <>
      <div
        className="font-condensed"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.25em",
          color: "var(--t-subtext)",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {current?.photo ? (
            <motion.img
              key={current.id}
              src={current.photo}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              alt=""
              style={{ maxHeight: 130, maxWidth: "100%", objectFit: "contain" }}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-condensed"
              style={{
                fontSize: "0.55rem",
                letterSpacing: "0.22em",
                color: "var(--t-subtext)",
                textTransform: "uppercase",
              }}
            >
              {items.length === 0 ? "Add templates in CMS" : "Select an option below"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {items.slice(0, 6).map((it) => {
          const isSel = selected === it.photo;
          return (
            <motion.button
              key={it.id}
              onClick={() => onSelect(it.photo)}
              animate={{ scale: isSel ? 1.08 : 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 20 }}
              style={{
                width: 52,
                height: 64,
                borderRadius: 4,
                overflow: "hidden",
                border: isSel ? "2px solid var(--t-accent)" : "1px solid var(--t-border)",
                background: "var(--t-surface)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {it.photo && (
                <img
                  src={it.photo}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

function Section({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: MixTemplate[];
  selected: string | null;
  onSelect: (p: string | null) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--t-border)",
        borderRadius: 6,
        padding: 10,
        background: "var(--t-surface)",
      }}
    >
      <SelectorPanel title={title} items={items} selected={selected} onSelect={onSelect} />
    </div>
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
        fontSize: "0.6rem",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        gap: 5,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
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

  async function reload() {
    const { data } = await supabase
      .from("mix_match_templates" as any)
      .select("*")
      .order("sort_order");
    const rows = (data || []) as MixTemplate[];
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
      />
      <TemplateList
        title="Shorts templates"
        items={shorts}
        busy={busy}
        onAdd={(f) => addItem("shorts", f)}
        onDelete={delItem}
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
}: {
  title: string;
  items: MixTemplate[];
  busy: boolean;
  onAdd: (f: File) => void;
  onDelete: (id: string) => void;
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