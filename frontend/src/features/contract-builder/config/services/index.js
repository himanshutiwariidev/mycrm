import { socialMediaConfig } from "./socialMedia";
import { rankingOptimizationConfig } from "./rankingOptimization";
import { sponsoredAdsConfig } from "./sponsoredAds";
import { googleMyBusinessConfig } from "./googleMyBusiness";
import { webDevelopmentConfig } from "./webDevelopment";
import { mobileAppDevelopmentConfig } from "./mobileAppDevelopment";
import { telecastConfig } from "./telecast";
import { broadcastConfig } from "./broadcast";
import { filmProductionConfig } from "./filmProduction";
import { aiServicesConfig } from "./aiServices";
import { influencerMarketingConfig } from "./influencerMarketing";
import { celebrityManagementConfig } from "./celebrityManagement";
import { eventManagementConfig } from "./eventManagement";

/**
 * Full nested config (kind/groups/items) keyed by category id.
 * Adding a category #14 = write one new file above + register it here.
 * No engine component needs to change.
 */
export const SERVICE_CONFIG = {
  socialMedia: socialMediaConfig,
  rankingOptimization: rankingOptimizationConfig,
  sponsoredAds: sponsoredAdsConfig,
  googleMyBusiness: googleMyBusinessConfig,
  webDevelopment: webDevelopmentConfig,
  mobileAppDevelopment: mobileAppDevelopmentConfig,
  telecast: telecastConfig,
  broadcast: broadcastConfig,
  filmProduction: filmProductionConfig,
  aiServices: aiServicesConfig,
  influencerMarketing: influencerMarketingConfig,
  celebrityManagement: celebrityManagementConfig,
  eventManagement: eventManagementConfig,
};

export function getCategoryConfig(categoryId) {
  return SERVICE_CONFIG[categoryId] || null;
}
