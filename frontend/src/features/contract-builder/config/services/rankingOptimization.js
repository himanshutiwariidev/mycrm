import { FIELD_TYPES } from "../fieldDefinitions";

const KEYWORD_TYPE_OPTIONS = [
  { value: "long-tail", label: "Long Tail Keywords" },
  { value: "short-tail", label: "Short Tail Keywords" },
  { value: "luxury", label: "Luxury Keywords" },
];

const DISCIPLINE_OPTIONS = [
  { value: "seo", label: "SEO" },
  { value: "aeo", label: "AEO" },
  { value: "geo", label: "GEO" },
  { value: "localSeo", label: "Local SEO" },
];

// Pricing lives on the region itself (Domestic, International) — SEO / AEO /
// GEO / Local SEO are recorded as a checklist plus their combined detail
// fields on that one package, rather than as separately priced leaves.
function buildRegionPackage(regionLabel) {
  return {
    id: "package",
    label: `${regionLabel} SEO Package`,
    fields: [
      { name: "disciplines", type: FIELD_TYPES.MULTISELECT, label: "Disciplines Included", options: DISCIPLINE_OPTIONS },
      // SEO detail fields
      { name: "keywordTypes", type: FIELD_TYPES.MULTISELECT, label: "Keyword Type", options: KEYWORD_TYPE_OPTIONS },
      { name: "keywords", type: FIELD_TYPES.TAGS, label: "Keywords" },
      { name: "targetUrl", type: FIELD_TYPES.TEXT, label: "Target URL" },
      { name: "competitorUrls", type: FIELD_TYPES.TAGS, label: "Competitor URLs" },
      { name: "monthlyTarget", type: FIELD_TYPES.NUMBER, label: "Monthly Target", min: 0 },
      // AEO detail fields
      { name: "targetKeywords", type: FIELD_TYPES.TAGS, label: "AEO Target Keywords" },
      { name: "faqCount", type: FIELD_TYPES.NUMBER, label: "FAQ Count", min: 0 },
      { name: "schemaRequired", type: FIELD_TYPES.TOGGLE, label: "Schema Required" },
      { name: "knowledgeBase", type: FIELD_TYPES.TEXTAREA, label: "Knowledge Base" },
      // GEO detail fields
      { name: "countries", type: FIELD_TYPES.TAGS, label: "Countries" },
      { name: "languages", type: FIELD_TYPES.TAGS, label: "Languages" },
      { name: "audience", type: FIELD_TYPES.TEXT, label: "Audience" },
      { name: "competitors", type: FIELD_TYPES.TAGS, label: "Competitors" },
      // Local SEO detail fields
      { name: "state", type: FIELD_TYPES.TEXT, label: "State" },
      { name: "city", type: FIELD_TYPES.TEXT, label: "City" },
      { name: "businessName", type: FIELD_TYPES.TEXT, label: "Business Name" },
      { name: "googleBusinessProfile", type: FIELD_TYPES.TEXT, label: "Google Business Profile" },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice: 12000 },
  };
}

export const rankingOptimizationConfig = {
  id: "rankingOptimization",
  label: "Ranking Optimization",
  icon: "TrendingUp",
  description: "SEO, AEO, GEO and Local SEO across domestic & international markets.",
  kind: "tab-tree",
  groups: [
    { id: "domestic", label: "Domestic", kind: "leaf-group", items: [buildRegionPackage("Domestic")] },
    { id: "international", label: "International", kind: "leaf-group", items: [buildRegionPackage("International")] },
  ],
};
