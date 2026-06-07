import { isLightColor } from "@/lib/gemini";

interface Props {
  hexMain: string;
  hexShade: string;
  isLight?: boolean;
  category?: string;
}

export function JerseySVG({ hexMain, hexShade, isLight, category }: Props) {
  const light = isLight ?? isLightColor(hexMain);
  const trim = light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.18)";
  const numColor = light ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)";
  const brand = light ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.22)";
  const shadow = light ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.35)";
  const id = "jg-" + hexMain.replace("#", "");

  const cat = (category || "JERSEYS").toUpperCase();

  // POLO SHIRTS
  if (cat === "POLO SHIRTS") {
    return (
      <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexMain} /><stop offset="100%" stopColor={hexShade} /></linearGradient></defs>
        <path d="M30 60 L60 50 L70 130 L40 140 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M190 60 L160 50 L150 130 L180 140 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M60 50 Q110 30 160 50 L170 230 Q110 240 50 230 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.5" />
        <path d="M90 50 L92 110 L100 115 L100 50 Z" fill={hexShade} stroke={trim} strokeWidth="1" />
        <path d="M130 50 L128 110 L120 115 L120 50 Z" fill={hexShade} stroke={trim} strokeWidth="1" />
        <circle cx="110" cy="70" r="1.5" fill={trim} /><circle cx="110" cy="85" r="1.5" fill={trim} /><circle cx="110" cy="100" r="1.5" fill={trim} />
        <text x="110" y="190" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="22" fontWeight="700" fill={brand} letterSpacing="3">HOOPS</text>
      </svg>
    );
  }

  // JACKETS & SUITS
  if (cat === "JACKETS & SUITS") {
    return (
      <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexMain} /><stop offset="100%" stopColor={hexShade} /></linearGradient></defs>
        <path d="M20 60 L55 45 L65 230 L30 240 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M200 60 L165 45 L155 230 L190 240 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M55 45 Q110 30 165 45 L170 235 Q110 245 50 235 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.5" />
        <path d="M85 40 Q110 55 135 40 L130 75 L90 75 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <line x1="110" y1="55" x2="110" y2="235" stroke={trim} strokeWidth="2" />
        <rect x="108" y="120" width="4" height="6" fill={trim} />
        <rect x="108" y="160" width="4" height="6" fill={trim} />
        <text x="110" y="200" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="20" fill={brand} letterSpacing="3">HOOPS</text>
      </svg>
    );
  }

  // 1/4 ZIP
  if (cat === "1/4 ZIP JACKETS") {
    return (
      <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexMain} /><stop offset="100%" stopColor={hexShade} /></linearGradient></defs>
        <path d="M22 60 L55 45 L65 230 L32 240 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M198 60 L165 45 L155 230 L188 240 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M55 45 Q110 30 165 45 L170 235 Q110 245 50 235 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.5" />
        <path d="M90 30 Q110 25 130 30 L130 65 L90 65 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <line x1="110" y1="45" x2="110" y2="130" stroke={trim} strokeWidth="2" />
        <circle cx="110" cy="128" r="3" fill={trim} />
        <text x="110" y="190" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="20" fill={brand} letterSpacing="3">HOOPS</text>
      </svg>
    );
  }

  // HOODIES
  if (cat === "HOODIES") {
    return (
      <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexMain} /><stop offset="100%" stopColor={hexShade} /></linearGradient></defs>
        <path d="M18 65 L55 48 L65 230 L30 245 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M202 65 L165 48 L155 230 L190 245 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <path d="M55 48 Q110 30 165 48 L172 235 Q110 250 48 235 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.5" />
        <path d="M70 50 Q110 10 150 50 Q145 75 110 75 Q75 75 70 50 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
        <rect x="70" y="175" width="80" height="45" rx="4" fill={shadow} opacity="0.5" stroke={trim} strokeWidth="1" />
        <text x="110" y="140" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="22" fill={brand} letterSpacing="3">HOOPS</text>
      </svg>
    );
  }

  // SOCKS
  if (cat === "SOCKS") {
    return (
      <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexMain} /><stop offset="100%" stopColor={hexShade} /></linearGradient></defs>
        <path d="M70 30 L100 30 L100 170 Q100 200 130 200 L155 200 Q170 200 170 215 L170 230 Q170 240 155 240 L100 240 Q70 240 70 200 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.5" />
        <rect x="70" y="40" width="30" height="6" fill={trim} opacity="0.4" />
        <rect x="70" y="55" width="30" height="3" fill={trim} opacity="0.3" />
        <text x="85" y="120" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="11" fontWeight="700" fill={brand} letterSpacing="2" transform="rotate(-90 85 120)">HOOPS</text>
      </svg>
    );
  }

  // WARM-UP SETS — jersey + shorts
  if (cat === "WARM-UP SETS") {
    return (
      <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={hexMain} /><stop offset="100%" stopColor={hexShade} /></linearGradient></defs>
        {/* top */}
        <path d="M30 35 L60 28 L68 80 L38 88 Z" fill={hexShade} stroke={trim} strokeWidth="1.2" />
        <path d="M190 35 L160 28 L152 80 L182 88 Z" fill={hexShade} stroke={trim} strokeWidth="1.2" />
        <path d="M60 28 Q110 18 160 28 L168 130 Q110 140 52 130 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.2" />
        <path d="M90 25 Q110 38 130 25 L125 40 Q110 50 95 40 Z" fill={hexShade} stroke={trim} strokeWidth="1" />
        {/* shorts */}
        <path d="M60 150 L160 150 L165 230 L130 235 L120 175 L100 175 L90 235 L55 230 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.2" />
        <rect x="60" y="150" width="100" height="6" fill={hexShade} />
        <text x="110" y="100" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="14" fontWeight="700" fill={brand} letterSpacing="2">HOOPS</text>
      </svg>
    );
  }

  // JERSEYS (default)
  return (
    <svg viewBox="0 0 220 260" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hexMain} />
          <stop offset="100%" stopColor={hexShade} />
        </linearGradient>
      </defs>
      <path d="M20 60 L60 50 L70 100 L30 110 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
      <path d="M200 60 L160 50 L150 100 L190 110 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
      <path d="M60 50 Q110 30 160 50 L175 230 Q110 245 45 230 Z" fill={`url(#${id})`} stroke={trim} strokeWidth="1.5" />
      <path d="M60 50 L70 230 L45 230 Z" fill={shadow} opacity="0.4" />
      <path d="M160 50 L150 230 L175 230 Z" fill={shadow} opacity="0.4" />
      <path d="M85 45 Q110 65 135 45 L130 60 Q110 75 90 60 Z" fill={hexShade} stroke={trim} strokeWidth="1.5" />
      <rect x="108" y="65" width="4" height="160" fill={trim} opacity="0.5" />
      <line x1="28" y1="95" x2="68" y2="86" stroke={trim} strokeWidth="1" />
      <line x1="32" y1="105" x2="69" y2="97" stroke={trim} strokeWidth="1" />
      <line x1="192" y1="95" x2="152" y2="86" stroke={trim} strokeWidth="1" />
      <line x1="188" y1="105" x2="151" y2="97" stroke={trim} strokeWidth="1" />
      <text x="110" y="170" textAnchor="middle" fontFamily="Bebas Neue, sans-serif" fontSize="76" fill={numColor} letterSpacing="2">23</text>
      <text x="110" y="100" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontSize="11" fontWeight="700" fill={brand} letterSpacing="2">HOOPS</text>
      <rect x="45" y="225" width="130" height="6" fill={hexShade} opacity="0.7" />
    </svg>
  );
}
