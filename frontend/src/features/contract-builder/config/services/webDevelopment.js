import { FIELD_TYPES } from "../fieldDefinitions";

// Pricing lives on the platform itself (Custom Code, Shopify, ...) — the site
// type (Landing Page, Ecommerce, ...) is recorded as a checklist field on
// that one package rather than as its own separately priced leaf.
const PACKAGE_TYPE_OPTIONS = [
  { value: "singleLanding", label: "Single Landing Page" },
  { value: "fivePage", label: "5 Page Website" },
  { value: "tenPage", label: "10 Page Website" },
  { value: "ecommerce", label: "Ecommerce Website" },
  { value: "customApp", label: "Custom Web Application" },
];

function buildPlatformPackage(platformLabel) {
  return {
    id: "package",
    label: `${platformLabel} Package`,
    fields: [
      { name: "packageType", type: FIELD_TYPES.MULTISELECT, label: "Package Type", options: PACKAGE_TYPE_OPTIONS },
      { name: "pages", type: FIELD_TYPES.NUMBER, label: "Pages", min: 0 },
      { name: "hosting", type: FIELD_TYPES.TEXT, label: "Hosting" },
      { name: "domain", type: FIELD_TYPES.TEXT, label: "Domain" },
      { name: "cms", type: FIELD_TYPES.TEXT, label: "CMS" },
      { name: "maintenance", type: FIELD_TYPES.TOGGLE, label: "Maintenance Included" },
      { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline" },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice: 35000 },
  };
}

export const webDevelopmentConfig = {
  id: "webDevelopment",
  label: "Web Development",
  icon: "Globe",
  description: "Landing pages, multi-page sites, ecommerce & custom web apps.",
  kind: "tab-tree",
  groups: [
    { id: "customCode", label: "Custom Code", kind: "leaf-group", items: [buildPlatformPackage("Custom Code")] },
    { id: "shopify", label: "Shopify", kind: "leaf-group", items: [buildPlatformPackage("Shopify")] },
    { id: "wordpress", label: "WordPress", kind: "leaf-group", items: [buildPlatformPackage("WordPress")] },
    { id: "wix", label: "Wix", kind: "leaf-group", items: [buildPlatformPackage("Wix")] },
  ],
};
