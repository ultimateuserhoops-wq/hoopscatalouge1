import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SpreadDef, SpreadType } from "@/lib/catalog-spreads";

interface DbSpreadRow {
  id: string;
  spread_id: string;
  spread_type: SpreadType;
  category: string | null;
  title: string | null;
  sort_order: number;
  product_id: string | null;
  products?: { sku: string } | null;
}

function deriveLabel(r: DbSpreadRow): string {
  if (r.spread_type === "cover") return "Cover";
  if (r.spread_type === "menu") return r.title ? r.title.replace(/^CATALOGUE\s+/i, "Contents — ") : "Contents";
  if (r.spread_type === "size") return "Size Guide";
  if (r.spread_type === "contact") return "Contact & Order";
  return r.title || r.products?.sku || r.spread_id;
}

function compute(rows: DbSpreadRow[]): { spreads: SpreadDef[]; totalPages: number } {
  const sorted = [...rows].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  let cursor = 0;
  const spreads: SpreadDef[] = sorted.map((r) => {
    const pageLeft = cursor;
    const pageRight = cursor + 1;
    cursor += 2;
    return {
      id: r.spread_id,
      type: r.spread_type,
      pageLeft,
      pageRight,
      productSku: r.products?.sku,
      category: r.category ?? undefined,
      title: r.title ?? undefined,
      label: deriveLabel(r),
    };
  });
  return { spreads, totalPages: cursor };
}

export function useSpreads() {
  const [spreads, setSpreads] = useState<SpreadDef[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("catalog_spreads")
      .select("*, products(sku)")
      .order("sort_order");
    const rows = (data as unknown as DbSpreadRow[]) || [];
    const { spreads, totalPages } = compute(rows);
    setSpreads(spreads);
    setTotalPages(totalPages);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const addProductPage = useCallback(
    async (opts: { name: string; category: string; sku?: string }) => {
      const sku = (opts.sku?.trim() || `CUSTOM-${Date.now().toString(36).toUpperCase()}`).toUpperCase();

      const { data: prod, error: prodErr } = await supabase
        .from("products")
        .insert({
          name: opts.name.toUpperCase(),
          sku,
          category: opts.category,
          subtitle: null,
          description: null,
          price: null,
          price_original: null,
          price_save_label: null,
          badge_label: null,
          season_label: "Season 2025",
          collection_label: `${opts.category} · 2025 Collection`,
          cta_label: "ORDER NOW →",
        })
        .select()
        .single();
      if (prodErr || !prod) throw prodErr || new Error("Failed to create product");

      await supabase.from("color_variants").insert({
        product_id: prod.id,
        name: "BLACK",
        hex_main: "#000000",
        hex_shade: "#1a1a1a",
        is_light: false,
        sort_order: 1,
      });

      // Insert before the "size" guide; if none, append to end.
      const { data: existing } = await supabase
        .from("catalog_spreads")
        .select("id,spread_id,sort_order")
        .order("sort_order");
      const rows = (existing as { id: string; spread_id: string; sort_order: number }[]) || [];
      const sizeRow = rows.find((r) => r.spread_id === "size");
      const insertOrder = sizeRow
        ? sizeRow.sort_order
        : (rows[rows.length - 1]?.sort_order || 0) + 1;

      // Shift size + contact (anything >= insertOrder) by +1
      for (const r of rows) {
        if (r.sort_order >= insertOrder) {
          await supabase
            .from("catalog_spreads")
            .update({ sort_order: r.sort_order + 1 })
            .eq("id", r.id);
        }
      }

      const spreadId = `product-${sku.toLowerCase()}`;
      await supabase.from("catalog_spreads").insert({
        spread_id: spreadId,
        spread_type: "product",
        page_left: 0,
        page_right: 0,
        product_id: prod.id,
        category: opts.category,
        title: opts.name,
        sort_order: insertOrder,
      });

      await reload();
      return { sku, spreadId };
    },
    [reload],
  );

  const deleteSpread = useCallback(
    async (spread_id: string) => {
      const { data: row } = await supabase
        .from("catalog_spreads")
        .select("id,product_id,spread_type")
        .eq("spread_id", spread_id)
        .maybeSingle();
      if (!row) return;
      await supabase.from("catalog_spreads").delete().eq("id", row.id);
      if (row.spread_type === "product" && row.product_id) {
        await supabase.from("color_variants").delete().eq("product_id", row.product_id);
        await supabase.from("spec_rows").delete().eq("product_id", row.product_id);
        await supabase.from("products").delete().eq("id", row.product_id);
      }
      await reload();
    },
    [reload],
  );

  return { spreads, totalPages, loading, reload, addProductPage, deleteSpread };
}