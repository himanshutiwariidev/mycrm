import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

const STANDARD_SOCIAL_SERVICES = [
  "Graphic Creatives",
  "AI Creatives",
  "AI Reels",
  "Templated Reels",
  "Shooted Reels",
  "After Effects Videos",
  "Blogs",
  "Long Videos (2 Minutes)",
  "GIF",
  "Stories",
  "Go Live",
];

function buildStandardPlatformItems() {
  return STANDARD_SOCIAL_SERVICES.map((label) => ({
    id: slugify(label),
    label,
    fields: [
      { name: "quantityPerMonth", type: FIELD_TYPES.NUMBER, label: "Quantity / Month", min: 0, defaultValue: 4 },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "perUnit", defaultUnitPrice: 1500 },
  }));
}

const YOUTUBE_SERVICES = [
  "Shorts",
  "Reels Upload as Shorts",
  "Shooted Reels",
  "Shooted Long Videos",
  "AI Shorts",
  "AI Videos",
];

function buildYoutubeItems() {
  return YOUTUBE_SERVICES.map((label) => ({
    id: slugify(label),
    label,
    fields: [
      { name: "quantityPerMonth", type: FIELD_TYPES.NUMBER, label: "Quantity / Month", min: 0, defaultValue: 4 },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "perUnit", defaultUnitPrice: 2000 },
  }));
}

export const socialMediaConfig = {
  id: "socialMedia",
  label: "Social Media",
  icon: "Share2",
  description: "Platform-wise content creatives and video production.",
  kind: "tab-tree",
  groups: [
    { id: "facebook", label: "Facebook", kind: "leaf-group", items: buildStandardPlatformItems() },
    { id: "instagram", label: "Instagram", kind: "leaf-group", items: buildStandardPlatformItems() },
    { id: "linkedin", label: "LinkedIn", kind: "leaf-group", items: buildStandardPlatformItems() },
    { id: "threads", label: "Threads", kind: "leaf-group", items: buildStandardPlatformItems() },
    { id: "other", label: "Other", kind: "leaf-group", items: buildStandardPlatformItems() },
    { id: "youtube", label: "YouTube", kind: "leaf-group", items: buildYoutubeItems() },
  ],
};
