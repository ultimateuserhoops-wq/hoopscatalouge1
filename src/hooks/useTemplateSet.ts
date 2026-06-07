import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateSet } from "@/lib/catalog-types";
import { TEMPLATE_IMAGE_FIELDS, uploadImageFieldsInUpdates } from "@/lib/storage";

export function useTemplateSet(productId: string | null | undefined) {
  const [templateSet, setTemplateSet] = useState<TemplateSet | null>(null);

  useEffect(() => {
    if (!productId) { setTemplateSet(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("template_sets")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle();
      if (!cancelled) setTemplateSet((data as TemplateSet | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, [productId]);

  const updateTemplate = useCallback(async (updates: Partial<TemplateSet>) => {
    if (!productId) return;
    setTemplateSet((prev) => (prev ? { ...prev, ...updates } : prev));
    const persisted = await uploadImageFieldsInUpdates(updates as Record<string, any>, TEMPLATE_IMAGE_FIELDS, "templates");
    if (persisted !== updates) {
      setTemplateSet((prev) => (prev ? { ...prev, ...(persisted as Partial<TemplateSet>) } : prev));
    }
    const { data: existing } = await supabase
      .from("template_sets")
      .select("id")
      .eq("product_id", productId)
      .maybeSingle();
    if (existing?.id) {
      const { data } = await supabase
        .from("template_sets")
        .update(persisted)
        .eq("id", existing.id)
        .select()
        .single();
      if (data) setTemplateSet(data as TemplateSet);
    } else {
      const { data } = await supabase
        .from("template_sets")
        .insert({ product_id: productId, name: "Default Template", ...persisted })
        .select()
        .single();
      if (data) setTemplateSet(data as TemplateSet);
    }
  }, [productId]);

  return { templateSet, updateTemplate };
}
