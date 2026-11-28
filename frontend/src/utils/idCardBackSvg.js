// Back side of the employee ID card — the BharatBizMart side of the company's
// digital card, drawn entirely in SVG (no image files): navy header with the
// logo and the dotted world map with India in orange (shapes traced from the
// card, see idCardBackShapes.js), contact details, "Our Brands", websites and
// the LinkedIn QR code.
//
// One SVG string serves both the on-screen card (inline) and the downloaded
// PNG (rendered onto the canvas in idCardDownload.js). Text that has to fit a
// fixed width uses textLength, so it looks the same whichever font the
// browser picks.

const W = 274;
const H = 445;
const NAVY = "#0d2b55";
const NAVY_DEEP = "#0a2348";
const ORANGE = "#f7931e";
const INK = "#0b1f3f";
const FONT = "Montserrat, Poppins, 'Segoe UI', Arial, sans-serif";

import { INDIA_PATH, MAP_DOTS_PATH, MAP_PINS, NAVY_EDGE, BAND_EDGE } from "./idCardBackShapes.js";

// LinkedIn profile on the card: https://www.linkedin.com/in/sunny-rathor/
const QR_ROWS = [
  "1111111011010000001111111",
  "1000001000101000101000001",
  "1011101000000101101011101",
  "1011101011111011101011101",
  "1011101010100110101011101",
  "1000001011100111001000001",
  "1111111010101010101111111",
  "0000000010010010000000000",
  "1000101110100111011111001",
  "0011010100011000000011010",
  "0110101001011111101111100",
  "1001110010111100101110111",
  "1110011011101100101100101",
  "1011100000100111110111110",
  "0000101011100001100110000",
  "0001010111001011001101100",
  "1100011101110110111110101",
  "0000000011001001100011110",
  "1111111010111110101011000",
  "1000001000110101100010101",
  "1011101010001100111110110",
  "1011101000100110111101101",
  "1011101001100001001100010",
  "1000001000101011011010110",
  "1111111010010111011111111",
];

const r1 = (n) => Math.round(n * 10) / 10;

// A map pin about the size of the ones on the card (~5 × 7).
function pin(x, y) {
  return `<g transform="translate(${x},${y}) scale(0.62)"><path d="M0,-6.5c-2.4,0-4.2,1.8-4.2,4.1c0,3,4.2,7.4,4.2,7.4s4.2-4.4,4.2-7.4c0-2.3-1.8-4.1-4.2-4.1z" fill="${ORANGE}"/><circle cx="0" cy="-2.4" r="1.5" fill="${NAVY}"/></g>`;
}

// Logo "B": orange letter with two green squares for its counters.
function logoB(x, y, s) {
  return `<g transform="translate(${x},${y}) scale(${s})">
    <path d="M0,0H12.5C17.6,0,20,2.8,20,6.6C20,9.2,18.8,11.1,16.8,12.1C19.6,13,21,15.4,21,18.8C21,23.4,18,26,12.8,26H0Z" fill="${ORANGE}"/>
    <rect x="5" y="4.3" width="7.6" height="6.2" rx="1.2" fill="#0a8f3c"/>
    <rect x="5" y="14.8" width="8.6" height="6.8" rx="1.2" fill="#0a8f3c"/>
  </g>`;
}

// Small white icons inside the orange squares.
const ICONS = {
  phone: `<path d="M3.2,2.2c0.4-0.4,1-0.4,1.3,0l1.2,1.5c0.3,0.4,0.3,0.9,0,1.2L5,5.6c0.6,1.3,1.6,2.3,2.9,2.9l0.7-0.7c0.3-0.3,0.9-0.3,1.2,0l1.5,1.2c0.4,0.3,0.4,0.9,0,1.3l-0.9,0.9c-0.6,0.6-1.5,0.7-2.3,0.4C5.2,10.6,3.3,8.7,2.2,5.8C1.9,5,2.1,4.1,2.6,3.5Z" fill="#fff"/>`,
  whatsapp: `<path d="M6.5,1.8a4.7,4.7,0,0,0-4,7.1L2,11.2l2.4-0.6A4.7,4.7,0,1,0,6.5,1.8Z" fill="none" stroke="#fff" stroke-width="1.1"/><path d="M5,4.6c0.2-0.2,0.5-0.2,0.6,0l0.4,0.8c0.1,0.2,0,0.4-0.1,0.5l-0.3,0.3c0.3,0.6,0.8,1.1,1.4,1.4l0.3-0.3c0.1-0.1,0.3-0.2,0.5-0.1l0.8,0.4c0.2,0.1,0.2,0.4,0,0.6l-0.4,0.4C7.6,9,7,9,6.4,8.7C5.5,8.2,4.8,7.5,4.3,6.6C4,6,4,5.4,4.3,5Z" fill="#fff"/>`,
  mail: `<rect x="1.8" y="3.2" width="9.4" height="6.6" rx="0.8" fill="none" stroke="#fff" stroke-width="1.1"/><path d="M2.2,3.8L6.5,7.2L10.8,3.8" fill="none" stroke="#fff" stroke-width="1.1"/>`,
  // Phone with a plus — emergency contact.
  emergency: `<path d="M2.4,2.6c0.4-0.4,1-0.4,1.3,0l1.1,1.4c0.3,0.4,0.3,0.9,0,1.2L4.2,5.9c0.5,1.2,1.4,2.1,2.6,2.6l0.7-0.7c0.3-0.3,0.8-0.3,1.2,0l1.4,1.1c0.4,0.3,0.4,0.9,0,1.3l-0.8,0.8c-0.6,0.6-1.4,0.7-2.1,0.4C4.6,10.4,2.9,8.7,1.9,6.1C1.6,5.4,1.8,4.6,2.3,4Z" fill="#fff"/><path d="M9.6,1.6v3.6M7.8,3.4h3.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>`,
  pin: `<path d="M6.5,1.6c-2,0-3.5,1.5-3.5,3.4c0,2.6,3.5,6.3,3.5,6.3s3.5-3.7,3.5-6.3C10,3.1,8.5,1.6,6.5,1.6z" fill="#fff"/><circle cx="6.5" cy="5" r="1.3" fill="${ORANGE}"/>`,
};

function contactRow(y, icon, textSvg, x = 16) {
  return `<rect x="${x}" y="${y - 9.5}" width="13" height="13" rx="2.6" fill="${ORANGE}"/><g transform="translate(${x},${y - 9.5})">${ICONS[icon]}</g>${textSvg}`;
}

function globe(x, y) {
  return `<g transform="translate(${x},${y})" fill="none" stroke="#fff" stroke-width="0.8"><circle cx="0" cy="0" r="4.2"/><ellipse cx="0" cy="0" rx="1.9" ry="4.2"/><path d="M-4.2,0H4.2M-3.6,-2.1H3.6M-3.6,2.1H3.6"/></g>`;
}

function qrCode(x, y, size) {
  const n = QR_ROWS.length;
  const m = size / n;
  let d = "";
  QR_ROWS.forEach((row, ry) => {
    for (let rx = 0; rx < n; rx++) if (row[rx] === "1") d += `M${r1(x + rx * m)},${r1(y + ry * m)}h${r1(m + 0.05)}v${r1(m + 0.05)}h-${r1(m + 0.05)}z`;
  });
  return `<path d="${d}" fill="#111"/>`;
}

// "Our Brands" — the five brand wordmarks, as styled text.
function brands(y) {
  return `
  <g font-family="Georgia, 'Times New Roman', serif" font-weight="700">
    <text x="7" y="${y}" font-size="6.6" fill="#111" textLength="47" lengthAdjust="spacingAndGlyphs">THE TIMES OF</text>
    <text x="7" y="${y + 13}" font-size="14" fill="#d71920" textLength="47" lengthAdjust="spacingAndGlyphs">MSME</text>

    <text x="60" y="${y}" font-size="8.6" fill="${ORANGE}" textLength="41" lengthAdjust="spacingAndGlyphs">THE K12</text>
    <rect x="66" y="${y + 2}" width="29" height="10" fill="#fff" stroke="${ORANGE}" stroke-width="0.6"/>
    <text x="68" y="${y + 10.2}" font-size="8.6" fill="${ORANGE}" textLength="25" lengthAdjust="spacingAndGlyphs">TIMES</text>
    <text x="60" y="${y + 16}" font-family="${FONT}" font-weight="600" font-size="2.4" fill="${ORANGE}" textLength="41" lengthAdjust="spacingAndGlyphs">CONNECTING THE K12 COMMUNITY</text>
  </g>
  <g font-family="${FONT}" font-weight="800">
    <g transform="translate(110,${y - 6.5}) rotate(-10)"><rect width="22" height="5.5" fill="#222"/><path d="M2,0l3,5.5M8,0l3,5.5M14,0l3,5.5" stroke="#fff" stroke-width="1.2"/></g>
    <text x="108" y="${y + 9}" font-size="14" font-style="italic" fill="#e11d2a" stroke="#7f1d1d" stroke-width="0.4" textLength="30" lengthAdjust="spacingAndGlyphs">GNF</text>
    <text x="108" y="${y + 15.5}" font-size="4.4" fill="#e11d2a" textLength="30" lengthAdjust="spacingAndGlyphs">GEN NEXT FILMS</text>

    <rect x="145" y="${y - 3}" width="58" height="12" fill="#f7d417"/>
    <text x="147" y="${y + 6.2}" font-size="7.4" fill="#111" textLength="29" lengthAdjust="spacingAndGlyphs">MY FILMY</text>
    <rect x="177.5" y="${y - 1.5}" width="24" height="9" fill="#111"/>
    <text x="179" y="${y + 5.8}" font-size="7" fill="#f7d417" textLength="21" lengthAdjust="spacingAndGlyphs">STORY</text>
  </g>
  <g font-family="${FONT}">
    <g transform="translate(220,${y - 10})" fill="#d4a017"><circle cx="6" cy="3" r="3"/><circle cx="13" cy="3" r="3"/><rect x="3" y="5.5" width="14" height="7" rx="1.2"/><path d="M17,7.5l5,-2.5v8l-5,-2.5z"/><path d="M8,12.5l-3,5M12,12.5l3,5" stroke="#d4a017" stroke-width="1.2"/></g>
    <text x="210" y="${y + 10}" font-size="6.4" font-weight="800" font-style="italic" fill="#c99a14" textLength="58" lengthAdjust="spacingAndGlyphs">The Film Framers</text>
    <path d="M210,${y + 13}H218M260,${y + 13}H268" stroke="#c99a14" stroke-width="0.5"/>
    <text x="220" y="${y + 14.4}" font-size="3.8" font-style="italic" fill="#c99a14" textLength="38" lengthAdjust="spacingAndGlyphs">Weaving Stories</text>
  </g>`;
}

const xml = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// One SVG per emergency number (the only part that differs between employees).
const cache = new Map();

/** The back side as an SVG string (274 × 445, same size as the front). */
export function idCardBackSvg(user = {}) {
  const emergency = String(user.emergencyContact || "").trim();
  const phone = String(user.phone || "").trim();
  const key = `${phone}|${emergency}`;
  if (cache.has(key)) return cache.get(key);
  // Pins sit with their head on the traced point.
  const pins = MAP_PINS.map(([x, y]) => pin(r1(x), r1(y + 1.2))).join("");
  const navyEdge = NAVY_EDGE.split(" ");
  const bandEdge = BAND_EDGE.split(" ");
  const last = (edge) => edge[edge.length - 1].split(",")[1];
  // Navy header down to its traced edge; the orange band fills the gap to the band edge.
  const navyPath = `M0,0H${W}V${last(navyEdge)}L${navyEdge.slice().reverse().join("L")}Z`;
  const bandPath = `M${navyEdge.join("L")}L${W},${last(navyEdge)}V${last(bandEdge)}L${bandEdge.slice().reverse().join("L")}Z`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
  <defs>
    <clipPath id="idb-card"><rect width="${W}" height="${H}" rx="18"/></clipPath>
    <linearGradient id="idb-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_DEEP}"/></linearGradient>
  </defs>
  <g clip-path="url(#idb-card)">
    <rect width="${W}" height="${H}" fill="#fff"/>

    <!-- Header: navy, with the orange band along its curved bottom -->
    <path d="${navyPath}" fill="url(#idb-navy)"/>
    <path d="${bandPath}" fill="${ORANGE}"/>

    <!-- World map (traced from the company card) -->
    <path d="${MAP_DOTS_PATH}" fill="#aeb8c8" opacity="0.8"/>
    <path d="${INDIA_PATH}" fill="${ORANGE}"/>
    ${pins}

    <!-- Logo -->
    ${logoB(57, 14, 0.7)}
    <text x="72" y="32" font-size="21.5" font-weight="700" fill="${ORANGE}" textLength="55" lengthAdjust="spacingAndGlyphs">harat</text>
    ${logoB(132, 14, 0.7)}
    <text x="147" y="32" font-size="21.5" font-weight="700" fill="${ORANGE}" textLength="72" lengthAdjust="spacingAndGlyphs">izMart</text>
    <path d="M57,41H86M190,41H219" stroke="#f3b26b" stroke-width="0.5"/>
    <text x="137" y="43" text-anchor="middle" font-size="6.6" font-weight="500" fill="#f3b26b" textLength="98" lengthAdjust="spacingAndGlyphs">EMPOWERING BUSINESSES</text>

    <!-- Contact -->
    <!-- 1. The employee: own number and emergency number, side by side -->
    <g font-size="6.2" font-weight="800" fill="${ORANGE}" letter-spacing="0.6">
      <text x="35" y="232">CONTACT</text>
      <text x="160" y="232">EMERGENCY</text>
    </g>
    ${contactRow(245, "phone", `<text x="35" y="245" font-size="11" font-weight="800" fill="${INK}">${xml(phone || "—")}</text>`)}
    ${contactRow(245, "emergency", `<text x="160" y="245" font-size="11" font-weight="800" fill="${INK}">${xml(emergency || "—")}</text>`, 141)}

    <!-- 2. Our Brands -->
    <path d="M4,262H${W - 4}" stroke="${ORANGE}" stroke-width="0.9"/>
    <rect x="${W / 2 - 34}" y="254.5" width="68" height="15" rx="7.5" fill="${NAVY}"/>
    <text x="${W / 2}" y="265.1" text-anchor="middle" font-size="9.4" font-weight="700" fill="#fff" textLength="52" lengthAdjust="spacingAndGlyphs">Our Brands</text>
    ${brands(285)}

    <!-- 3. The company: calling + WhatsApp number, email, address -->
    <path d="M16,304H${W - 16}" stroke="#e5e7eb" stroke-width="0.8"/>
    ${contactRow(318, "phone", `<text x="35" y="318" font-size="11" font-weight="800" fill="${INK}" textLength="80" lengthAdjust="spacingAndGlyphs">01146120491</text>`)}
    ${contactRow(333, "mail", `<text x="35" y="333" font-size="11" font-weight="800" fill="${INK}" textLength="162" lengthAdjust="spacingAndGlyphs">info@bharatbizmart.com</text>`)}
    ${contactRow(348, "pin", `<text x="35" y="348" font-size="9.4" font-weight="800" fill="${ORANGE}" textLength="228" lengthAdjust="spacingAndGlyphs">Cybertricks Media Pvt. Ltd. | Bharat Bizmart</text>`)}
    <g font-size="7.8" font-weight="800" fill="${INK}">
      <text x="35" y="357.5" textLength="222" lengthAdjust="spacingAndGlyphs">201/7, 2nd Floor, dimension Tower, Vardhaman</text>
      <text x="35" y="366" textLength="226" lengthAdjust="spacingAndGlyphs">Market, West Enclave, Pitampura, Delhi-110034</text>
    </g>

    <!-- Footer -->
    <path d="M0,${H}V385Q0,371 16,371H${W - 16}Q${W},371 ${W},385V${H}Z" fill="${ORANGE}"/>
    <path d="M0,${H}V389Q0,375 16,375H${W - 16}Q${W},375 ${W},389V${H}Z" fill="${NAVY}"/>
    ${globe(20, 388)}${globe(20, 401)}${globe(20, 414)}${globe(20, 427)}
    <g font-size="9.6" font-weight="600" fill="#fff">
      <text x="28" y="391.4" textLength="116" lengthAdjust="spacingAndGlyphs">www.bharatbizmart.com</text>
      <text x="28" y="404.4" textLength="107" lengthAdjust="spacingAndGlyphs">www.gennexfilms.com</text>
      <text x="28" y="417.4" textLength="126" lengthAdjust="spacingAndGlyphs">www.thetimesofmsme.com</text>
      <text x="28" y="430.4" textLength="107" lengthAdjust="spacingAndGlyphs">www.thek12times.com</text>
    </g>
    <path d="M187,385V432" stroke="${ORANGE}" stroke-width="0.9"/>
    <rect x="207" y="381" width="50" height="50" rx="6" fill="#fff"/>
    ${qrCode(210.5, 384.5, 43)}
    <text x="222" y="440.5" font-size="5.6" fill="#fff" text-anchor="middle">Scan for</text>
    <rect x="235" y="435" width="7.4" height="7.4" rx="1.2" fill="#0a66c2"/>
    <text x="238.7" y="441" font-size="5.6" font-weight="800" fill="#fff" text-anchor="middle">in</text>
  </g>
</svg>`;
  cache.set(key, svg);
  return svg;
}

/** The back side as an <img>-loadable data URL (for the canvas download). */
export const idCardBackDataUrl = (user, scale = 1) => {
  let svg = idCardBackSvg(user);
  if (scale !== 1) {
    svg = svg.replace(`width="${W}" height="${H}"`, `width="${W * scale}" height="${H * scale}"`);
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
