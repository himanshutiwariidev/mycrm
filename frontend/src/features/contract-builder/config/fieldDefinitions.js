import { z } from "zod";

export const FIELD_TYPES = {
  TEXT: "text",
  TEXTAREA: "textarea",
  NUMBER: "number",
  CURRENCY: "currency",
  SELECT: "select",
  MULTISELECT: "multiselect",
  TAGS: "tags",
  DATE: "date",
  TOGGLE: "toggle",
  RADIO: "radio",
  FILE: "file",
  // Renders one quantity+period row per item currently selected in another
  // field on the same leaf (see `sourceField`) — e.g. Social Media's
  // "Deliverables Included" checklist, where each picked deliverable gets
  // its own quantity and per-week/month/year cadence instead of one shared
  // quantity for the whole leaf.
  PER_ITEM_QUANTITY: "per-item-quantity",
};

const FIELD_DEFAULTS = {
  [FIELD_TYPES.TEXT]: "",
  [FIELD_TYPES.TEXTAREA]: "",
  [FIELD_TYPES.NUMBER]: "",
  [FIELD_TYPES.CURRENCY]: "",
  [FIELD_TYPES.SELECT]: "",
  [FIELD_TYPES.MULTISELECT]: [],
  [FIELD_TYPES.TAGS]: [],
  [FIELD_TYPES.DATE]: null,
  [FIELD_TYPES.TOGGLE]: false,
  [FIELD_TYPES.RADIO]: "",
  [FIELD_TYPES.FILE]: [],
  [FIELD_TYPES.PER_ITEM_QUANTITY]: {},
};

/** Returns the value a field should start with when a leaf/advanced panel is first enabled. */
export function getFieldDefaultValue(field) {
  if (field.defaultValue !== undefined) return field.defaultValue;
  return FIELD_DEFAULTS[field.type] ?? "";
}

const zodFactories = {
  [FIELD_TYPES.TEXT]: (f) =>
    f.required ? z.string().min(1, `${f.label} is required`) : z.string().optional(),
  [FIELD_TYPES.TEXTAREA]: (f) =>
    f.required ? z.string().min(1, `${f.label} is required`) : z.string().optional(),
  [FIELD_TYPES.NUMBER]: (f) => {
    let schema = z.coerce.number({ invalid_type_error: `${f.label} must be a number` });
    if (f.min !== undefined) schema = schema.min(f.min, `${f.label} must be at least ${f.min}`);
    if (f.max !== undefined) schema = schema.max(f.max, `${f.label} must be at most ${f.max}`);
    return f.required ? schema : schema.optional();
  },
  [FIELD_TYPES.CURRENCY]: (f) => {
    const schema = z.coerce.number().min(0, `${f.label} cannot be negative`);
    return f.required ? schema : schema.optional();
  },
  [FIELD_TYPES.SELECT]: (f) =>
    f.required ? z.string().min(1, `${f.label} is required`) : z.string().optional(),
  [FIELD_TYPES.MULTISELECT]: (f) =>
    f.required
      ? z.array(z.string()).min(1, `Select at least one ${f.label}`)
      : z.array(z.string()).optional(),
  [FIELD_TYPES.TAGS]: (f) =>
    f.required
      ? z.array(z.string()).min(1, `Add at least one ${f.label}`)
      : z.array(z.string()).optional(),
  [FIELD_TYPES.DATE]: (f) => {
    const toDateOrUndefined = (val) => (val ? new Date(val) : undefined);
    return f.required
      ? z.preprocess(toDateOrUndefined, z.date({ required_error: `${f.label} is required` }))
      : z.preprocess(toDateOrUndefined, z.date().optional());
  },
  [FIELD_TYPES.TOGGLE]: () => z.boolean().optional(),
  [FIELD_TYPES.RADIO]: (f) =>
    f.required ? z.string().min(1, `${f.label} is required`) : z.string().optional(),
  [FIELD_TYPES.FILE]: () => z.array(z.object({ name: z.string(), size: z.number() })).optional(),
};

export function fieldToZodSchema(field) {
  const factory = zodFactories[field.type];
  return factory ? factory(field) : z.any().optional();
}
