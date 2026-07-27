import { z } from "zod";
import { fieldToZodSchema } from "./fieldDefinitions";
import { COMMON_FIELDS } from "./commonFields";

export const step1Schema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectName: z.string().min(3, "Project name must be at least 3 characters"),
  timeline: z.string().optional(),
  validUntil: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  currency: z.string().optional(),
  contractAmount: z.coerce.number({ invalid_type_error: "Contract amount is required" }).min(1, "Contract amount is required"),
  amountReceived: z.coerce.number().min(0, "Amount received cannot be negative").optional(),
  dueDate: z.string().optional(),
  gstEnabled: z.boolean().optional(),
  gstPercent: z.coerce.number().min(0, "GST % cannot be negative").max(100, "GST % cannot exceed 100").optional(),
  tdsEnabled: z.boolean().optional(),
  tdsPercent: z.coerce.number().min(0, "TDS % cannot be negative").max(100, "TDS % cannot exceed 100").optional(),
}).refine(
  (data) => (Number(data.amountReceived) || 0) <= data.contractAmount,
  { message: "Amount received cannot exceed the contract amount", path: ["amountReceived"] }
).refine(
  (data) => !data.gstEnabled || Number(data.gstPercent) > 0,
  { message: "Enter a GST percentage", path: ["gstPercent"] }
).refine(
  (data) => !data.tdsEnabled || Number(data.tdsPercent) > 0,
  { message: "Enter a TDS percentage", path: ["tdsPercent"] }
);

export function validateStep2(selectedServices) {
  const hasCategory = (selectedServices || []).some((cat) => cat.enabled);
  return hasCategory ? { success: true } : { success: false, message: "Select at least one service to continue" };
}

/** Builds a Zod object for one enabled leaf's values+advanced fields, from its own config. */
export function buildLeafSchema(leafConfig) {
  const shape = {};
  (leafConfig.fields || []).forEach((f) => {
    shape[f.name] = fieldToZodSchema(f);
  });
  if (leafConfig.commonFields) {
    COMMON_FIELDS.forEach((f) => {
      shape[f.name] = fieldToZodSchema(f);
    });
  }
  return z.object(shape);
}

/**
 * Validates every enabled leaf independently (rather than one giant nested
 * schema) so errors can be mapped back to the specific LeafItemCard by path.
 */
export function validateStep3(selectedServices, getLeafConfig) {
  const errorsByPath = {};

  (selectedServices || [])
    .filter((cat) => cat.enabled)
    .forEach((cat) => {
      (cat.selections || []).forEach((sel) => {
        const leafConfig = getLeafConfig(cat.categoryId, sel.path);
        if (!leafConfig) return;
        const schema = buildLeafSchema(leafConfig);
        const merged = { ...(sel.values || {}), ...(sel.advanced || {}) };
        const result = schema.safeParse(merged);
        if (!result.success) {
          errorsByPath[sel.path] = result.error.flatten().fieldErrors;
        }
      });
    });

  return { success: Object.keys(errorsByPath).length === 0, errorsByPath };
}

export function validateStep4(meta) {
  const contractAmount = Number(meta?.contractAmount) || 0;
  return contractAmount > 0
    ? { success: true }
    : { success: false, message: "Enter the contract amount on Step 1 before continuing" };
}

export function buildStepSchema(step, state, getLeafConfig) {
  switch (step) {
    case 1:
      return step1Schema.safeParse(state.meta);
    case 2:
      return validateStep2(state.selectedServices);
    case 3:
      return validateStep3(state.selectedServices, getLeafConfig);
    case 4:
    case 5:
      return validateStep4(state.meta);
    default:
      return { success: true };
  }
}
