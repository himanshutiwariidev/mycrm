import { FIELD_TYPES } from "../fieldDefinitions";

function buildFields(defaultUnitPrice) {
  return {
    fields: [
      { name: "screens", type: FIELD_TYPES.NUMBER, label: "Number of Screens", min: 0 },
      { name: "adminPanel", type: FIELD_TYPES.TOGGLE, label: "Admin Panel" },
      { name: "apiIntegration", type: FIELD_TYPES.TOGGLE, label: "API Integration" },
      { name: "playStoreUpload", type: FIELD_TYPES.TOGGLE, label: "Play Store Upload" },
      { name: "appStoreUpload", type: FIELD_TYPES.TOGGLE, label: "App Store Upload" },
      { name: "timeline", type: FIELD_TYPES.TEXT, label: "Timeline" },
      { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
    ],
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  };
}

export const mobileAppDevelopmentConfig = {
  id: "mobileAppDevelopment",
  label: "Mobile App Development",
  icon: "Smartphone",
  description: "Android, iOS and hybrid app builds.",
  kind: "grid",
  items: [
    { id: "android", label: "Android", ...buildFields(150000) },
    { id: "ios", label: "iOS", ...buildFields(180000) },
    { id: "hybrid", label: "Hybrid", ...buildFields(200000) },
  ],
};
