// Mirrors the per-leaf pricing formula used in the contract builder
// (frontend/src/features/contract-builder/config/pricing.js) so dashboard
// stats can total up each service's own itemized cost server-side, without
// a shared module between the two separate frontend/backend codebases.
function computeLeafFinalPrice(advanced = {}) {
  const sellingPrice = Number(advanced.sellingPrice) || 0;
  const discountPct = Number(advanced.discount) || 0;
  const gstPct = advanced.gst !== undefined && advanced.gst !== "" ? Number(advanced.gst) : 18;
  const afterDiscount = sellingPrice - (sellingPrice * discountPct) / 100;
  return afterDiscount + (afterDiscount * gstPct) / 100;
}

// Keep in sync with frontend/src/features/contract-builder/config/serviceCategories.js
const SERVICE_CATEGORY_LABELS = {
  socialMedia: "Social Media",
  rankingOptimization: "Ranking Optimization",
  sponsoredAds: "Sponsored Ads",
  googleMyBusiness: "Google My Business",
  webDevelopment: "Web Development",
  mobileAppDevelopment: "Mobile App Development",
  telecast: "Telecast",
  broadcast: "Broadcast",
  filmProduction: "Film Production",
  aiServices: "AI Services",
  influencerMarketing: "Influencer Marketing",
  celebrityManagement: "Celebrity Enrollment / Management",
  eventManagement: "Event Management",
};

module.exports = { computeLeafFinalPrice, SERVICE_CATEGORY_LABELS };
