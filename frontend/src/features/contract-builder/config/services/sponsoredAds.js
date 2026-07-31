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

function toOptions(labels) {
  return labels.map((label) => ({ value: slugify(label), label }));
}

// Pricing lives on the ad platform itself (Google Ads, Meta Ads) — the
// specific campaign type (Search Ads, Shopping Ads, ...) is recorded as a
// checklist field on that one package rather than as its own priced leaf.
function buildAdPackage(adTypeLabel, campaignList, defaultUnitPrice) {
  return {
    id: "package",
    label: `${adTypeLabel} Campaign Package`,
    fields: [
      { name: "campaignTypes", type: FIELD_TYPES.MULTISELECT, label: "Campaign Types", options: toOptions(campaignList) },
      ...CAMPAIGN_FIELDS,
    ],
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  };
}

export const sponsoredAdsConfig = {
  id: "sponsoredAds",
  label: "Sponsored Ads",
  icon: "Megaphone",
  description: "Google Ads, Meta Ads and OTT advertising campaigns.",
  kind: "tab-tree",
  groups: [
    { id: "googleAds", label: "Google Ads", kind: "leaf-group", items: [buildAdPackage("Google Ads", GOOGLE_ADS_CAMPAIGNS, 8000)] },
    { id: "metaAds", label: "Meta Ads", kind: "leaf-group", items: [buildAdPackage("Meta Ads", META_ADS_CAMPAIGNS, 6000)] },
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
