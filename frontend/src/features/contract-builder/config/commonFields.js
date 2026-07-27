import { FIELD_TYPES } from "./fieldDefinitions";

/**
 * Shared "Advanced" field set every leaf service/sub-service supports,
 * rendered collapsed-by-default via AdvancedFieldsPanel. Kept to pricing
 * fields only — quantity/notes are already captured on the leaf itself.
 */
export const COMMON_FIELDS = [
  { name: "estimatedCost", type: FIELD_TYPES.CURRENCY, label: "Estimated Cost" },
  { name: "sellingPrice", type: FIELD_TYPES.CURRENCY, label: "Selling Price" },
  { name: "discount", type: FIELD_TYPES.NUMBER, label: "Discount %", min: 0, max: 100 },
  // Read-only: GST % here is entirely driven by the contract-level "Apply
  // GST" checkbox on Step 1 (synced into every service), never edited here.
  { name: "gst", type: FIELD_TYPES.NUMBER, label: "GST %", min: 0, max: 100, defaultValue: 0, readOnly: true },
  { name: "finalPrice", type: FIELD_TYPES.CURRENCY, label: "Final Price", readOnly: true, derived: true },
  { name: "attachments", type: FIELD_TYPES.FILE, label: "Attachments" },
];
