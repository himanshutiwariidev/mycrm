import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

const PRODUCTION_TYPES = [
  { label: "TV Advertisement", defaultUnitPrice: 300000 },
  { label: "Corporate Film", defaultUnitPrice: 150000 },
  { label: "Music Album", defaultUnitPrice: 250000 },
  { label: "Short Film", defaultUnitPrice: 200000 },
  { label: "AI Advertisement", defaultUnitPrice: 80000 },
];

const PRODUCTION_FIELDS = [
  { name: "projectBrief", type: FIELD_TYPES.TEXTAREA, label: "Project Brief" },
  { name: "script", type: FIELD_TYPES.TEXTAREA, label: "Script" },
  { name: "storyboard", type: FIELD_TYPES.TOGGLE, label: "Storyboard Required" },
  { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration" },
  { name: "shootDays", type: FIELD_TYPES.NUMBER, label: "Shoot Days", min: 0 },
  { name: "location", type: FIELD_TYPES.TEXT, label: "Location" },
  { name: "voiceOver", type: FIELD_TYPES.TOGGLE, label: "Voice Over" },
  { name: "artists", type: FIELD_TYPES.TAGS, label: "Artists" },
  { name: "language", type: FIELD_TYPES.TAGS, label: "Language" },
  { name: "deliverables", type: FIELD_TYPES.TEXTAREA, label: "Deliverables" },
  { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
];

export const filmProductionConfig = {
  id: "filmProduction",
  label: "Film Production",
  icon: "Clapperboard",
  description: "TVCs, corporate films, music albums, short films & AI ads.",
  kind: "grid",
  items: PRODUCTION_TYPES.map(({ label, defaultUnitPrice }) => ({
    id: slugify(label),
    label,
    fields: PRODUCTION_FIELDS,
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  })),
};
