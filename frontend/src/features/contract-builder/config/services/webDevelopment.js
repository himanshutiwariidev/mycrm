import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

const DEV_TYPES = [
  { label: "Single Landing Page", defaultUnitPrice: 15000 },
  { label: "5 Page Website", defaultUnitPrice: 35000 },
  { label: "10 Page Website", defaultUnitPrice: 60000 },
  { label: "Ecommerce Website", defaultUnitPrice: 120000 },
  { label: "Custom Web Application", defaultUnitPrice: 200000 },
];

function buildDevTypeItems() {
  return DEV_TYPES.map(({ label, defaultUnitPrice }) => ({
    id: slugify(label),
    label,
    fields: [
      { name: "pages", type: FIELD_TYPES.NUMBER, label: "Pages", min: 0 },
      { name: "hosting", type: FIELD_TYPES.TEXT, label: "Hosting" },
      { name: "domain", type: FIELD_TYPES.TEXT, label: "Domain" },
      { name: "cms", type: FIELD_TYPES.TEXT, label: "CMS" },
      { name: "maintenance", type: FIELD_TYPES.TOGGLE, label: "Maintenance Included" },
      { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline" },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  }));
}

export const webDevelopmentConfig = {
  id: "webDevelopment",
  label: "Web Development",
  icon: "Globe",
  description: "Landing pages, multi-page sites, ecommerce & custom web apps.",
  kind: "tab-tree",
  groups: [
    { id: "customCode", label: "Custom Code", kind: "leaf-group", items: buildDevTypeItems() },
    { id: "shopify", label: "Shopify", kind: "leaf-group", items: buildDevTypeItems() },
    { id: "wordpress", label: "WordPress", kind: "leaf-group", items: buildDevTypeItems() },
    { id: "wix", label: "Wix", kind: "leaf-group", items: buildDevTypeItems() },
  ],
};
