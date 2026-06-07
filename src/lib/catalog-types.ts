export interface Product {
  id: string;
  name: string;
  subtitle: string | null;
  category: string | null;
  sku: string;
  description: string | null;
  price: string | null;
  price_original: string | null;
  price_save_label: string | null;
  badge_label: string | null;
  season_label: string | null;
  page_left: string | null;
  page_right: string | null;
  collection_label: string | null;
  cta_label: string | null;
  motion_video_url?: string | null;
  motion_video_prompt?: string | null;
  motion_video_task_id?: string | null;
}

export interface ColorVariant {
  id: string;
  product_id: string | null;
  name: string;
  hex_main: string;
  hex_shade: string | null;
  is_light: boolean | null;
  jersey_photo: string | null;
  jersey_photo_name: string | null;
  body_photo: string | null;
  body_photo_name: string | null;
  motion_gif: string | null;
  motion_gif_name: string | null;
  note: string | null;
  sort_order: number | null;
}

export interface SpecRow {
  id: string;
  product_id: string | null;
  label: string;
  value: string;
  sort_order: number | null;
}

export interface CatalogTheme {
  id: string;
  theme_id: string;
  name: string;
  accent: string;
  accent2: string;
  bg: string;
  surface: string;
  text_color: string;
  subtext_color: string;
  is_active: boolean | null;
  display_bg?: string | null;
}

export type DisplayMode = "jersey" | "body" | "motion";

export interface TemplateSet {
  id: string;
  product_id: string | null;
  name: string;
  template_jersey: string | null;
  template_back: string | null;
  template_shorts: string | null;
  template_name: string | null;
  template_back_name: string | null;
  template_shorts_name: string | null;
  is_active: boolean;
}
