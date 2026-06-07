import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hexToRgba, loadGeminiKeyFromDb } from "@/lib/gemini";
import type { CatalogTheme, ColorVariant, DisplayMode, Product, SpecRow } from "@/lib/catalog-types";
import { COLOR_IMAGE_FIELDS, uploadImageFieldsInUpdates, migrateBase64ToStorage } from "@/lib/storage";

let migrationStarted = false;

export function applyThemeToRoot(t: CatalogTheme) {
  const root = document.documentElement;
  root.style.setProperty("--t-accent", t.accent);
  root.style.setProperty("--t-accent2", t.accent2);
  root.style.setProperty("--t-bg", t.bg);
  root.style.setProperty("--t-surface", t.surface);
  root.style.setProperty("--t-text", t.text_color);
  root.style.setProperty("--t-subtext", t.subtext_color);
  root.style.setProperty("--t-border", hexToRgba(t.text_color, 0.07));
  root.style.setProperty("--t-glow", hexToRgba(t.accent, 0.22));
  root.style.setProperty("--t-spine", t.accent);
}

export function useCatalog(productSku?: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([]);
  const [specRows, setSpecRows] = useState<SpecRow[]>([]);
  const [themes, setThemes] = useState<CatalogTheme[]>([]);
  const [activeColorId, setActiveColorId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("jersey");
  const [loading, setLoading] = useState(true);

  // Themes load once on mount
  useEffect(() => {
    supabase.from("catalog_themes").select("*").then(({ data }) => {
      const list = (data as CatalogTheme[]) || [];
      setThemes(list);
      const active = list.find((t) => t.is_active);
      if (active) applyThemeToRoot(active);
    });
    loadGeminiKeyFromDb().catch(() => {});
    if (!migrationStarted) {
      migrationStarted = true;
      // Only signed-in users can write to storage; skip for public viewers.
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return;
        migrateBase64ToStorage().then(({ migrated }) => {
          if (migrated > 0) console.info(`[storage] migrated ${migrated} legacy base64 image(s) to storage`);
        }).catch((e) => console.warn("[storage] migration error", e));
      });
    }
  }, []);

  // Load product (and its colors + specs) whenever sku changes
  const reload = useCallback(async () => {
    setLoading(true);
    setActiveColorId(null);
    let pQuery = supabase.from("products").select("*");
    if (productSku) pQuery = pQuery.eq("sku", productSku);
    else pQuery = pQuery.eq("sku", "HPS-JRY-PG25");
    const pRes = await pQuery.maybeSingle();
    const prod = pRes.data as Product | null;
    setProduct(prod);

    if (prod) {
      const [cRes, sRes] = await Promise.all([
        supabase.from("color_variants").select("*").eq("product_id", prod.id).order("sort_order"),
        supabase.from("spec_rows").select("*").eq("product_id", prod.id).order("sort_order"),
      ]);
      const cols = (cRes.data as ColorVariant[]) || [];
      setColorVariants(cols);
      setSpecRows((sRes.data as SpecRow[]) || []);
      if (cols.length) setActiveColorId(cols[0].id);
    } else {
      setColorVariants([]); setSpecRows([]);
    }
    setLoading(false);
  }, [productSku]);

  useEffect(() => { reload(); }, [reload]);

  const activeColor = colorVariants.find((c) => c.id === activeColorId) || colorVariants[0] || null;

  const updateColorVariant = useCallback(async (id: string, updates: Partial<ColorVariant>) => {
    // Optimistic UI shows base64/URL immediately
    setColorVariants((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    // Upload any base64 image fields to storage and persist URLs instead of base64
    const persisted = await uploadImageFieldsInUpdates(updates as Record<string, any>, COLOR_IMAGE_FIELDS, "colors");
    if (persisted !== updates) {
      setColorVariants((prev) => prev.map((c) => (c.id === id ? { ...c, ...(persisted as Partial<ColorVariant>) } : c)));
    }
    await supabase.from("color_variants").update(persisted as Partial<ColorVariant>).eq("id", id);
  }, []);

  const updateProduct = useCallback(async (updates: Partial<Product>) => {
    if (!product) return;
    setProduct({ ...product, ...updates });
    await supabase.from("products").update(updates).eq("id", product.id);
  }, [product]);

  const addColor = useCallback(async () => {
    if (!product) return;
    const order = (colorVariants[colorVariants.length - 1]?.sort_order || 0) + 1;
    const { data } = await supabase.from("color_variants").insert({
      product_id: product.id, name: "NEW COLOR", hex_main: "#888888", hex_shade: "#555555", sort_order: order,
    }).select().single();
    if (data) setColorVariants((p) => [...p, data as ColorVariant]);
  }, [colorVariants, product]);

  const deleteColor = useCallback(async (id: string) => {
    if (colorVariants.length <= 1) return;
    setColorVariants((p) => p.filter((c) => c.id !== id));
    if (activeColorId === id) setActiveColorId(colorVariants[0]?.id || null);
    await supabase.from("color_variants").delete().eq("id", id);
  }, [colorVariants, activeColorId]);

  const addSpec = useCallback(async () => {
    if (!product || specRows.length >= 6) return;
    const order = (specRows[specRows.length - 1]?.sort_order || 0) + 1;
    const { data } = await supabase.from("spec_rows").insert({
      product_id: product.id, label: "Label", value: "Value", sort_order: order,
    }).select().single();
    if (data) setSpecRows((p) => [...p, data as SpecRow]);
  }, [specRows, product]);

  const updateSpec = useCallback(async (id: string, updates: Partial<SpecRow>) => {
    setSpecRows((p) => p.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await supabase.from("spec_rows").update(updates).eq("id", id);
  }, []);

  const deleteSpec = useCallback(async (id: string) => {
    setSpecRows((p) => p.filter((s) => s.id !== id));
    await supabase.from("spec_rows").delete().eq("id", id);
  }, []);

  const selectTheme = useCallback(async (theme_id: string) => {
    const t = themes.find((x) => x.theme_id === theme_id);
    if (!t) return;
    setThemes((prev) => prev.map((x) => ({ ...x, is_active: x.theme_id === theme_id })));
    applyThemeToRoot(t);
    await supabase.from("catalog_themes").update({ is_active: false }).neq("theme_id", theme_id);
    await supabase.from("catalog_themes").update({ is_active: true }).eq("theme_id", theme_id);
  }, [themes]);

  const updateCustomTheme = useCallback(async (patch: Partial<CatalogTheme>) => {
    const existing = themes.find((t) => t.theme_id === "custom");
    if (existing) {
      const merged = { ...existing, ...patch, is_active: true };
      setThemes((p) => p.map((t) => t.theme_id === "custom" ? merged : { ...t, is_active: false }));
      applyThemeToRoot(merged);
      await supabase.from("catalog_themes").update({ is_active: false }).neq("theme_id", "custom");
      await supabase.from("catalog_themes").update(patch).eq("theme_id", "custom");
      await supabase.from("catalog_themes").update({ is_active: true }).eq("theme_id", "custom");
    } else {
      const base = themes.find((t) => t.is_active) || themes[0];
      const next: Omit<CatalogTheme, "id"> = {
        theme_id: "custom", name: "CUSTOM",
        accent: base?.accent || "#FF4D00", accent2: base?.accent2 || "#FFB800",
        bg: base?.bg || "#0a0a0a", surface: base?.surface || "#181818",
        text_color: base?.text_color || "#f2ede3", subtext_color: base?.subtext_color || "#7a7268",
        is_active: true, ...patch,
      };
      await supabase.from("catalog_themes").update({ is_active: false }).neq("theme_id", "custom");
      const { data } = await supabase.from("catalog_themes").insert(next).select().single();
      if (data) {
        setThemes((p) => [...p.map((t) => ({ ...t, is_active: false })), data as CatalogTheme]);
        applyThemeToRoot(data as CatalogTheme);
      }
    }
  }, [themes]);

  return {
    product, colorVariants, specRows, themes,
    activeColor, activeColorId, setActiveColorId,
    displayMode, setDisplayMode, loading,
    reload, updateColorVariant, updateProduct,
    addColor, deleteColor, addSpec, updateSpec, deleteSpec,
    selectTheme, updateCustomTheme,
  };
}
