import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

const CAMPAIGN_FIELDS = [
  { name: "budget", type: FIELD_TYPES.CURRENCY, label: "Budget" },
  { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration", placeholder: "e.g. 30 days" },
  { name: "audience", type: FIELD_TYPES.TEXT, label: "Audience" },
  { name: "location", type: FIELD_TYPES.TEXT, label: "Location" },
  { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
];

const GOOGLE_ADS_CAMPAIGNS = [
  "Search Ads",
  "Shopping Ads",
  "Remarketing",
  "Traffic Campaign",
  "YouTube Banner Ads",
  "YouTube View Ads (Skippable)",
  "YouTube View Ads (Non Skippable)",
  "YouTube Subscribers Campaign",
  "YouTube Traffic Campaign",
  "App Install Campaign",
  "Google Maps Ads",
];

const META_ADS_CAMPAIGNS = [
  "Page Likes",
  "Post Likes",
  "Followers",
  "Post Engagement",
  "Reel Views",
  "Subscription Campaign",
  "Shopping Campaign",
  "One Click Form Ads",
  "QA Form Ads",
  "WhatsApp Leads",
  "Call Leads",
  "Website Traffic",
];

function buildCampaignItems(labels, defaultUnitPrice) {
  return labels.map((label) => ({
    id: slugify(label),
    label,
    fields: CAMPAIGN_FIELDS,
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  }));
}

export const sponsoredAdsConfig = {
  id: "sponsoredAds",
  label: "Sponsored Ads",
  icon: "Megaphone",
  description: "Google Ads, Meta Ads and OTT advertising campaigns.",
  kind: "tab-tree",
  groups: [
    { id: "googleAds", label: "Google Ads", kind: "grid", items: buildCampaignItems(GOOGLE_ADS_CAMPAIGNS, 8000) },
    { id: "metaAds", label: "Meta Ads", kind: "grid", items: buildCampaignItems(META_ADS_CAMPAIGNS, 6000) },
    {
      id: "ottAds",
      label: "OTT Ads",
      kind: "leaf-group",
      items: [
        {
          id: "ottCampaign",
          label: "OTT Ads Campaign",
          fields: [
            { name: "platform", type: FIELD_TYPES.TEXT, label: "Platform", placeholder: "e.g. Hotstar, JioCinema" },
            { name: "budget", type: FIELD_TYPES.CURRENCY, label: "Budget" },
            { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration" },
            { name: "targetAudience", type: FIELD_TYPES.TEXT, label: "Target Audience" },
            { name: "location", type: FIELD_TYPES.TEXT, label: "Location" },
            { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
          ],
          commonFields: true,
          pricing: { basis: "flat", defaultUnitPrice: 15000 },
        },
      ],
    },
  ],
};
