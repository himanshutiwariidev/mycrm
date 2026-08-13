// Centralized icon + color resolution for every service/platform used across
// the contract builder, task cards, deliverables overview, and dashboards.
// This is the single source of truth — no component should hardcode a
// service/platform icon of its own. New categories added to
// features/contract-builder/config/serviceCategories.js automatically get a
// sensible fallback here (via their existing lucide `icon` name) with zero
// extra wiring; only add a CATEGORY_COLORS entry for a nicer accent color.
import * as LucideIcons from "lucide-react";
import { Package } from "lucide-react";
import {
  FaFacebook, FaInstagram, FaLinkedin, FaYoutube, FaXTwitter, FaGoogle,
  FaShopify, FaWhatsapp, FaWordpress,
} from "react-icons/fa6";
import { SiGoogleads, SiMeta, SiWix, SiThreads } from "react-icons/si";
import { SERVICE_CATEGORIES, getCategoryMeta } from "../features/contract-builder/config/serviceCategories";

// Brand-accurate platform/tool icons — resolved from a deliverable's title
// text, which is where the actual platform name lives (e.g. "Facebook
// Content Package: AI Creatives", "Google Ads Campaign Package"). Ordered
// so more specific matches (e.g. "Meta Ads") are checked before broader
// ones. `match` accepts common real-world spelling variants of the same
// platform so e.g. "Google Ads" / "Google Adwords" / "Google AdWords" all
// resolve to the same icon+color.
const PLATFORM_VISUALS = [
  { id: "metaAds", Icon: SiMeta, bg: "#0668E1", match: /meta\s*ads?/i },
  { id: "googleAds", Icon: SiGoogleads, bg: "#4285F4", match: /google\s*ad\s*words|google\s*adwords|google\s*ads?/i },
  { id: "facebook", Icon: FaFacebook, bg: "#1877F2", match: /facebook/i },
  { id: "instagram", Icon: FaInstagram, bg: "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", match: /instagram/i },
  { id: "linkedin", Icon: FaLinkedin, bg: "#0A66C2", match: /linkedin/i },
  { id: "youtube", Icon: FaYoutube, bg: "#FF0000", match: /youtube/i },
  { id: "threads", Icon: SiThreads, bg: "#000000", match: /threads/i },
  { id: "twitter", Icon: FaXTwitter, bg: "#000000", match: /\btwitter\b|\bx\s*ads?\b/i },
  { id: "whatsapp", Icon: FaWhatsapp, bg: "#25D366", match: /whatsapp/i },
  { id: "shopify", Icon: FaShopify, bg: "#95BF47", match: /shopify/i },
  { id: "wordpress", Icon: FaWordpress, bg: "#21759B", match: /wordpress/i },
  { id: "wix", Icon: SiWix, bg: "#0C6EFC", match: /\bwix\b/i },
  { id: "google", Icon: FaGoogle, bg: "#4285F4", match: /\bgoogle\b/i },
];

/** Best-effort brand icon+color for a deliverable title's platform mention. Returns null if none found. */
export function resolvePlatformVisual(title = "") {
  for (const p of PLATFORM_VISUALS) {
    if (p.match.test(title)) return { Icon: p.Icon, bg: p.bg };
  }
  return null;
}

// Decorative accent color per service category — purely visual, keyed by
// the same categoryId used everywhere else (SERVICE_CATEGORIES /
// SERVICE_CATEGORY_LABELS on the backend). Categories added later without
// an entry here fall back to a neutral gray in resolveCategoryVisual().
const CATEGORY_COLORS = {
  socialMedia: "#7c3aed",
  rankingOptimization: "#16a34a",
  sponsoredAds: "#ea580c",
  googleMyBusiness: "#2563eb",
  webDevelopment: "#4f46e5",
  mobileAppDevelopment: "#0d9488",
  telecast: "#dc2626",
  broadcast: "#d97706",
  filmProduction: "#db2777",
  aiServices: "#8b5cf6",
  influencerMarketing: "#e11d48",
  celebrityManagement: "#ca8a04",
  eventManagement: "#0891b2",
};

/** Category-level icon+color fallback, driven by the existing SERVICE_CATEGORIES lucide icon names. */
export function resolveCategoryVisual(categoryId) {
  const meta = getCategoryMeta(categoryId);
  const Icon = (meta && LucideIcons[meta.icon]) || Package;
  const color = CATEGORY_COLORS[categoryId] || "#64748b";
  return { Icon, bg: color };
}

/**
 * The single entry point components should use: prefer the specific brand
 * icon detected in the deliverable's own title (most deliverables are
 * titled "<Platform> ...", e.g. "Instagram Content Package: AI Creatives"),
 * falling back to the owning category's icon, then a generic package icon.
 */
export function resolveDeliverableVisual(title = "", categoryId) {
  return resolvePlatformVisual(title) || resolveCategoryVisual(categoryId) || { Icon: Package, bg: "#94a3b8" };
}

export { SERVICE_CATEGORIES };
