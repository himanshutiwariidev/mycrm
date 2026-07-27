import { FIELD_TYPES } from "../fieldDefinitions";

export const googleMyBusinessConfig = {
  id: "googleMyBusiness",
  label: "Google My Business",
  icon: "MapPin",
  description: "GMB posting, reviews management, map creation and optimization.",
  kind: "flat-list",
  items: [
    {
      id: "monthlyPosting",
      label: "Monthly Posting",
      description: "Regular GMB post updates.",
      fields: [
        { name: "quantity", type: FIELD_TYPES.NUMBER, label: "Quantity", min: 0, defaultValue: 8 },
        { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline", placeholder: "e.g. Monthly" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 5000 },
    },
    {
      id: "reviewsManagement",
      label: "Reviews Management",
      description: "Monitoring and responding to customer reviews.",
      fields: [
        { name: "quantity", type: FIELD_TYPES.NUMBER, label: "Quantity", min: 0 },
        { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 3000 },
    },
    {
      id: "mapCreation",
      label: "Map Creation",
      description: "Business location/map profile setup.",
      fields: [
        { name: "quantity", type: FIELD_TYPES.NUMBER, label: "Quantity", min: 0, defaultValue: 1 },
        { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 2000 },
    },
    {
      id: "optimization",
      label: "Optimization",
      description: "Profile completeness, categories, attributes tuning.",
      fields: [
        { name: "quantity", type: FIELD_TYPES.NUMBER, label: "Quantity", min: 0, defaultValue: 1 },
        { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline" },
        { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
      ],
      commonFields: true,
      pricing: { basis: "flat", defaultUnitPrice: 4000 },
    },
  ],
};
