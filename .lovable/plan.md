# HOOPS Catalog — Full Flip-Book Expansion

Big change. Here's how I'll break it down before writing any code.

## 1. Scale fix (quick win)
- `src/routes/index.tsx`: change `Math.max` → `Math.min((vw*0.94)/880, (vh*0.96)/570)` so nothing clips
- `src/styles.css`: add `padding: 2vh 3vw; box-sizing: border-box` to `.catalog-viewport`

## 2. Spread architecture
New file `src/lib/catalog-spreads.ts`:
- `SpreadType` union (`cover | menu | product | size | contact`)
- `CATALOG_SPREADS` constant — the full 30-entry array from the brief
- `SPREAD_PRODUCT_MAP` (spread_id → sku) for the 22 product spreads
- `DEFAULT_PRODUCTS` seed list (22 products across 7 categories)
- `MENU_ITEMS` for the two contents spreads

## 3. Database
Migration (one approval):
- `catalog_spreads` table (spread_id, spread_type, page_left, page_right, product_id, category, title, sort_order) — public read, auth write, with GRANTs
- Seed `catalog_spreads` rows from the constant via `INSERT … ON CONFLICT DO NOTHING`
- Seed missing `products` rows (only the 21 new SKUs; keep existing `HPS-JRY-PG25`) — each gets a default color variant + spec rows so the product page renders out of the box

## 4. New spread components (one file each under `src/components/catalog/spreads/`)
- `CoverSpread.tsx` — dark left page w/ diagonal HOOPS watermark + court arc; right page w/ logo, "2025 Collection", title, category tags, page count
- `MenuSpread.tsx` — takes `menuPage` (0 or 1), renders MENU_ITEMS section with big category numbers + product list + page refs
- `SizeSpread.tsx` — size table (XS–4XL, chest/length/shoulder) + how-to-measure A/B/C/D guide
- `ContactSpread.tsx` — 4-step ordering on left, contact info + watermark on right
- All use existing theme tokens (`var(--t-bg)`, `var(--t-accent)`, etc.) — no hardcoded colors

## 5. Product spread updates
- `src/components/catalog/JerseySVG.tsx`: keep `makeJerseySVG`, add `makeProductSVG(category, hex_main, hex_shade, is_light)` switch returning category-appropriate flat SVG (warmup, polo, jacket, qzip, hoodie, socks fallbacks)
- `CatalogSpread.tsx` + `MobileCatalog.tsx`: pass `product.category` to the SVG renderer so non-jersey products show the right silhouette

## 6. Navigation & state (`src/routes/index.tsx`)
- Replace single-product state with `currentSpreadIndex` (0..29)
- `useCatalog` hook gets a `currentProductId` param so it loads the right product when on a product spread
- Render dispatch on `currentSpread.type`
- New nav row below the book:
  - PREV button (disabled at 0)
  - Category jump `<select>` listing all 30 spreads
  - Page counter `pageLeft–pageRight / 53`
  - NEXT button (disabled at last)
- CMS panel stays admin-only and continues to edit the currently-shown product

## 7. Mobile
- `MobileCatalog.tsx` gets the same spread navigation (PREV/NEXT + dropdown at the top); cover/menu/size/contact get simplified single-column mobile layouts

## Technical notes
- The existing `useCatalog` hook is product-scoped; I'll refactor it to take `productId` and have the route pick the SKU from `SPREAD_PRODUCT_MAP[currentSpread.id]`
- Theme/colors keep using existing semantic tokens — no design changes to the product spread itself
- Seeding runs in migration SQL (idempotent via `ON CONFLICT (sku) DO NOTHING` for products and `ON CONFLICT (spread_id) DO NOTHING` for spreads)
- I'll keep the brief's exact category labels, page numbers, and copy

## Open question
Want me to also let admins reorder/add/remove spreads from the CMS, or is the fixed 30-spread structure fine for now? (I'll assume **fixed** unless you say otherwise — it's a lot less surface area.)
