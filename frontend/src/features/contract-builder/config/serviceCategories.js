/**
 * Lightweight metadata for the 13 top-level categories, used by Step2's
 * selection grid/search. Full nested field configuration lives in ./services.
 */
export const SERVICE_CATEGORIES = [
  { id: "socialMedia", label: "Social Media", icon: "Share2", description: "Platform-wise content, creatives and video production." },
  { id: "rankingOptimization", label: "Ranking Optimization", icon: "TrendingUp", description: "SEO, AEO, GEO and Local SEO across domestic & international markets." },
  { id: "sponsoredAds", label: "Sponsored Ads", icon: "Megaphone", description: "Google Ads, Meta Ads and OTT advertising campaigns." },
  { id: "googleMyBusiness", label: "Google My Business", icon: "MapPin", description: "GMB posting, reviews, map creation and optimization." },
  { id: "webDevelopment", label: "Web Development", icon: "Globe", description: "Landing pages, multi-page sites, ecommerce & custom web apps." },
  { id: "mobileAppDevelopment", label: "Mobile App Development", icon: "Smartphone", description: "Android, iOS and hybrid app builds." },
  { id: "telecast", label: "Telecast", icon: "Tv", description: "TV channel ad slots and campaign placements." },
  { id: "broadcast", label: "Broadcast", icon: "Radio", description: "Radio station ad slots and campaign placements." },
  { id: "filmProduction", label: "Film Production", icon: "Clapperboard", description: "TVCs, corporate films, music albums, short films & AI ads." },
  { id: "aiServices", label: "AI Services", icon: "Sparkles", description: "AI reels, films, chatbots, robot calling and custom AI frameworks." },
  { id: "influencerMarketing", label: "Influencer Marketing", icon: "Users", description: "Collaboration, tag and visit reels with influencers." },
  { id: "celebrityManagement", label: "Celebrity Enrollment / Management", icon: "Star", description: "Celebrity endorsements, exclusivity & usage rights." },
  { id: "eventManagement", label: "Event Management", icon: "CalendarDays", description: "End-to-end event planning, production and branding." },
];

export function getCategoryMeta(categoryId) {
  return SERVICE_CATEGORIES.find((c) => c.id === categoryId) || null;
}
