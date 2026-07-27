import { FIELD_TYPES } from "../fieldDefinitions";
import { slugify } from "../../utils/idHelpers";

const AI_SERVICES = [
  { label: "AI Reels", defaultUnitPrice: 8000 },
  { label: "AI Short Film", defaultUnitPrice: 40000 },
  { label: "AI Film", defaultUnitPrice: 100000 },
  { label: "AI Product Demo", defaultUnitPrice: 25000 },
  { label: "AI Chatbot", defaultUnitPrice: 60000 },
  { label: "AI Robot Calling", defaultUnitPrice: 50000 },
  { label: "AI Framework", defaultUnitPrice: 150000 },
  { label: "Other AI Services", defaultUnitPrice: 20000 },
];

const AI_FIELDS = [
  { name: "description", type: FIELD_TYPES.TEXTAREA, label: "Description" },
  { name: "duration", type: FIELD_TYPES.TEXT, label: "Duration" },
  { name: "deliverables", type: FIELD_TYPES.TEXTAREA, label: "Deliverables" },
  { name: "notes", type: FIELD_TYPES.TEXTAREA, label: "Notes" },
];

export const aiServicesConfig = {
  id: "aiServices",
  label: "AI Services",
  icon: "Sparkles",
  description: "AI reels, films, chatbots, robot calling and custom AI frameworks.",
  kind: "flat-list",
  items: AI_SERVICES.map(({ label, defaultUnitPrice }) => ({
    id: slugify(label),
    label,
    fields: AI_FIELDS,
    commonFields: true,
    pricing: { basis: "flat", defaultUnitPrice },
  })),
};
