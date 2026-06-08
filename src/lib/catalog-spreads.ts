export type SpreadType = "cover" | "menu" | "product" | "gallery" | "size" | "contact";

export interface SpreadDef {
  id: string;
  type: SpreadType;
  pageLeft: number;
  pageRight: number;
  productSku?: string;
  category?: string;
  title?: string;
  label: string; // navigation label
}

export const CATALOG_SPREADS: SpreadDef[] = [
  { id: "cover",    type: "cover",   pageLeft: 0,  pageRight: 1,  title: "HOOPS BASKETBALL CATALOGUE", label: "Cover" },
  { id: "menu-1",   type: "menu",    pageLeft: 2,  pageRight: 3,  title: "CATALOGUE CONTENTS", label: "Contents — Part 1" },
  { id: "menu-2",   type: "menu",    pageLeft: 4,  pageRight: 5,  title: "CATALOGUE CONTENTS", label: "Contents — Part 2" },
  { id: "jersey-1", type: "product", pageLeft: 6,  pageRight: 7,  productSku: "HPS-JRY-PG25", category: "JERSEYS", label: "Jersey 1 — Pro Game" },
  { id: "jersey-2", type: "product", pageLeft: 8,  pageRight: 9,  productSku: "HPS-JRY-EL25", category: "JERSEYS", label: "Jersey 2 — Elite Game" },
  { id: "jersey-3", type: "product", pageLeft: 10, pageRight: 11, productSku: "HPS-JRY-CL25", category: "JERSEYS", label: "Jersey 3 — Classic" },
  { id: "jersey-4", type: "product", pageLeft: 12, pageRight: 13, productSku: "HPS-JRY-TR25", category: "JERSEYS", label: "Jersey 4 — Training" },
  { id: "jersey-5", type: "product", pageLeft: 14, pageRight: 15, productSku: "HPS-JRY-YT25", category: "JERSEYS", label: "Jersey 5 — Youth" },
  { id: "jersey-6", type: "product", pageLeft: 16, pageRight: 17, productSku: "HPS-JRY-RT25", category: "JERSEYS", label: "Jersey 6 — Retro" },
  { id: "jersey-7", type: "product", pageLeft: 18, pageRight: 19, productSku: "HPS-JRY-RV25", category: "JERSEYS", label: "Jersey 7 — Reversible" },
  { id: "jersey-8", type: "product", pageLeft: 20, pageRight: 21, productSku: "HPS-JRY-SH25", category: "JERSEYS", label: "Jersey 8 — Shooter" },
  { id: "warmup-1", type: "product", pageLeft: 22, pageRight: 23, productSku: "HPS-WU-SS25",  category: "WARM-UP SETS", label: "Warm-Up 1 — Short Sleeve" },
  { id: "warmup-2", type: "product", pageLeft: 24, pageRight: 25, productSku: "HPS-WU-LS25",  category: "WARM-UP SETS", label: "Warm-Up 2 — Long Sleeve" },
  { id: "warmup-3", type: "product", pageLeft: 26, pageRight: 27, productSku: "HPS-WU-EL25",  category: "WARM-UP SETS", label: "Warm-Up 3 — Elite Set" },
  { id: "polo-1",   type: "product", pageLeft: 28, pageRight: 29, productSku: "HPS-PL-PF25",  category: "POLO SHIRTS", label: "Polo 1 — Performance" },
  { id: "polo-2",   type: "product", pageLeft: 30, pageRight: 31, productSku: "HPS-PL-CL25",  category: "POLO SHIRTS", label: "Polo 2 — Classic Coach" },
  { id: "jacket-1", type: "product", pageLeft: 32, pageRight: 33, productSku: "HPS-JK-PF25",  category: "JACKETS & SUITS", label: "Jacket 1 — Performance" },
  { id: "jacket-2", type: "product", pageLeft: 34, pageRight: 35, productSku: "HPS-JK-TS25",  category: "JACKETS & SUITS", label: "Jacket 2 — Track Suit" },
  { id: "jacket-3", type: "product", pageLeft: 36, pageRight: 37, productSku: "HPS-JK-BN25",  category: "JACKETS & SUITS", label: "Jacket 3 — Bench" },
  { id: "qzip-1",   type: "product", pageLeft: 38, pageRight: 39, productSku: "HPS-QZ-TR25",  category: "1/4 ZIP JACKETS", label: "1/4 Zip 1 — Training" },
  { id: "qzip-2",   type: "product", pageLeft: 40, pageRight: 41, productSku: "HPS-QZ-EL25",  category: "1/4 ZIP JACKETS", label: "1/4 Zip 2 — Elite" },
  { id: "hoodie-1", type: "product", pageLeft: 42, pageRight: 43, productSku: "HPS-HD-PL25",  category: "HOODIES", label: "Hoodie 1 — Pullover" },
  { id: "hoodie-2", type: "product", pageLeft: 44, pageRight: 45, productSku: "HPS-HD-ZP25",  category: "HOODIES", label: "Hoodie 2 — Zip" },
  { id: "socks-1",  type: "product", pageLeft: 46, pageRight: 47, productSku: "HPS-SK-PF25",  category: "SOCKS", label: "Socks 1 — Performance" },
  { id: "socks-2",  type: "product", pageLeft: 48, pageRight: 49, productSku: "HPS-SK-CP25",  category: "SOCKS", label: "Socks 2 — Compression" },
  { id: "size",     type: "size",    pageLeft: 50, pageRight: 51, title: "SIZE GUIDE", label: "Size Guide" },
  { id: "contact",  type: "contact", pageLeft: 52, pageRight: 53, title: "CONTACT & ORDER", label: "Contact & Order" },
];

export const TOTAL_PAGES = 53;

export interface MenuSection {
  num: string;
  category: string;
  items: string[];
  pages: string;
}

export const MENU_PAGES: MenuSection[][] = [
  [
    { num: "01", category: "JERSEYS",          items: ["Pro Game Jersey", "Elite Game Jersey", "Classic Jersey", "Training Jersey", "Youth Jersey", "Retro Jersey", "Reversible Jersey", "Shooter Jersey"], pages: "06–21" },
    { num: "02", category: "WARM-UP SETS",     items: ["Performance Warm-Up", "Training Warm-Up", "Elite Warm-Up Set"], pages: "22–27" },
    { num: "03", category: "POLO SHIRTS",      items: ["Performance Polo", "Classic Coach Polo"], pages: "28–31" },
  ],
  [
    { num: "04", category: "JACKETS & SUITS",  items: ["Performance Jacket", "Track Suit Full Set", "Bench Jacket"], pages: "32–37" },
    { num: "05", category: "1/4 ZIP JACKETS",  items: ["Training 1/4 Zip", "Elite 1/4 Zip"], pages: "38–41" },
    { num: "06", category: "HOODIES",          items: ["Pullover Hoodie", "Zip Hoodie"], pages: "42–45" },
    { num: "07", category: "SOCKS",            items: ["Performance Socks", "Compression Socks"], pages: "46–49" },
    { num: "08", category: "SIZE GUIDE",       items: [], pages: "50–51" },
    { num: "09", category: "CONTACT & ORDER",  items: [], pages: "52–53" },
  ],
];
