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

// Fields a platform copies from another platform when the admin ticks
// "Post the same content on" — the deliverables checklist and its
// per-item quantities. Notes and pricing stay per-platform on purpose.
const SHARED_CONTENT_FIELDS = ["deliverables", "itemQuantities"];

function buildPlatformPackage(platformLabel, serviceList, defaultUnitPrice, shareGroup) {
  const deliverableOptions = toOptions(serviceList);
  return {
    id: "package",
    label: `${platformLabel} Content Package`,
    // Platforms in the same share group offer the same deliverable options,
    // so one can mirror another's deliverables + quantities (the same reels
    // and posts cross-posted to Instagram, Facebook, LinkedIn, ...).
    contentSharing: { group: shareGroup, platformLabel, fields: SHARED_CONTENT_FIELDS },
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
    { id: "facebook", label: "Facebook", kind: "leaf-group", items: [buildPlatformPackage("Facebook", STANDARD_SOCIAL_SERVICES, 1500, "standard")] },
    { id: "instagram", label: "Instagram", kind: "leaf-group", items: [buildPlatformPackage("Instagram", STANDARD_SOCIAL_SERVICES, 1500, "standard")] },
    { id: "linkedin", label: "LinkedIn", kind: "leaf-group", items: [buildPlatformPackage("LinkedIn", STANDARD_SOCIAL_SERVICES, 1500, "standard")] },
    { id: "threads", label: "Threads", kind: "leaf-group", items: [buildPlatformPackage("Threads", STANDARD_SOCIAL_SERVICES, 1500, "standard")] },
    { id: "other", label: "Other", kind: "leaf-group", items: [buildPlatformPackage("Other", STANDARD_SOCIAL_SERVICES, 1500, "standard")] },
    // YouTube has its own deliverable list (Shorts, long videos, ...), so it
    // sits alone in its share group and never offers/receives shared content.
    { id: "youtube", label: "YouTube", kind: "leaf-group", items: [buildPlatformPackage("YouTube", YOUTUBE_SERVICES, 2000, "youtube")] },
  ],
};
