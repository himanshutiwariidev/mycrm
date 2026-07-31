import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

// Pricing lives on the platform itself (Facebook, Instagram, ...) — not on
// each individual content type — so these are offered as a checklist of
// what's included in that platform's package, rather than as separately
// priced leaves of their own.
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

const YOUTUBE_SERVICES = [
  "Shorts",
  "Reels Upload as Shorts",
  "Shooted Reels",
  "Shooted Long Videos",
  "AI Shorts",
  "AI Videos",
];

function toOptions(labels) {
  return labels.map((label) => ({ value: slugify(label), label }));
}

function buildPlatformPackage(platformLabel, serviceList, defaultUnitPrice) {
  const deliverableOptions = toOptions(serviceList);
  return {
    id: "package",
    label: `${platformLabel} Content Package`,
    fields: [
      { name: "deliverables", type: FIELD_TYPES.MULTISELECT, label: "Deliverables Included", options: deliverableOptions },
      // Each selected deliverable gets its own quantity + cadence (week/month/year)
      // instead of one shared "Quantity / Month" for the whole package.
      { name: "itemQuantities", type: FIELD_TYPES.PER_ITEM_QUANTITY, label: "Quantity per Deliverable", sourceField: "deliverables", sourceOptions: deliverableOptions },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "perUnit", defaultUnitPrice },
  };
}

export const socialMediaConfig = {
  id: "socialMedia",
  label: "Social Media",
  icon: "Share2",
  description: "Platform-wise content creatives and video production.",
  kind: "tab-tree",
  groups: [
    { id: "facebook", label: "Facebook", kind: "leaf-group", items: [buildPlatformPackage("Facebook", STANDARD_SOCIAL_SERVICES, 1500)] },
    { id: "instagram", label: "Instagram", kind: "leaf-group", items: [buildPlatformPackage("Instagram", STANDARD_SOCIAL_SERVICES, 1500)] },
    { id: "linkedin", label: "LinkedIn", kind: "leaf-group", items: [buildPlatformPackage("LinkedIn", STANDARD_SOCIAL_SERVICES, 1500)] },
    { id: "threads", label: "Threads", kind: "leaf-group", items: [buildPlatformPackage("Threads", STANDARD_SOCIAL_SERVICES, 1500)] },
    { id: "other", label: "Other", kind: "leaf-group", items: [buildPlatformPackage("Other", STANDARD_SOCIAL_SERVICES, 1500)] },
    { id: "youtube", label: "YouTube", kind: "leaf-group", items: [buildPlatformPackage("YouTube", YOUTUBE_SERVICES, 2000)] },
  ],
};
