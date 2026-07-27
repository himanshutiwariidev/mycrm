import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

const REEL_TYPES = [
  { label: "Collaboration Reel", defaultUnitPrice: 15000 },
  { label: "Tag Reel", defaultUnitPrice: 8000 },
  { label: "Visit Reel", defaultUnitPrice: 20000 },
];

const FOLLOWER_RANGE_OPTIONS = [
  { value: "nano", label: "Nano (1K-10K)" },
  { value: "micro", label: "Micro (10K-100K)" },
  { value: "macro", label: "Macro (100K-1M)" },
  { value: "mega", label: "Mega (1M+)" },
];

const INFLUENCER_FIELDS = [
  { name: "influencerCategory", type: FIELD_TYPES.TEXT, label: "Influencer Category" },
  { name: "followerRange", type: FIELD_TYPES.SELECT, label: "Follower Range", options: FOLLOWER_RANGE_OPTIONS },
  { name: "platform", type: FIELD_TYPES.MULTISELECT, label: "Platform", options: [
    { value: "instagram", label: "Instagram" },
    { value: "youtube", label: "YouTube" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
  ] },
  { name: "deliverables", type: FIELD_TYPES.TEXTAREA, label: "Deliverables" },
  { name: "postingDate", type: FIELD_TYPES.DATE, label: "Posting Date" },
  { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
];

export const influencerMarketingConfig = {
  id: "influencerMarketing",
  label: "Influencer Marketing",
  icon: "Users",
  description: "Collaboration, tag and visit reels with influencers.",
  kind: "flat-list",
  items: REEL_TYPES.map(({ label, defaultUnitPrice }) => ({
    id: slugify(label),
    label,
    fields: INFLUENCER_FIELDS,
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  })),
};
