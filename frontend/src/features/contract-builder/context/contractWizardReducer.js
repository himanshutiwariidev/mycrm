import { getFieldDefaultValue } from "../config/fieldDefinitions";
import { COMMON_FIELDS } from "../config/commonFields";
import { getLeafConfig } from "../utils/configLookup";
import { computePricingSummary } from "../config/pricing";

export const ACTIONS = {
  HYDRATE_FROM_SERVER: "HYDRATE_FROM_SERVER",
  HYDRATE_FROM_LOCALSTORAGE: "HYDRATE_FROM_LOCALSTORAGE",
  SET_META_FIELD: "SET_META_FIELD",
  SET_STEP: "SET_STEP",
  TOGGLE_CATEGORY_ENABLED: "TOGGLE_CATEGORY_ENABLED",
  SET_LEAF_ENABLED: "SET_LEAF_ENABLED",
  SET_LEAF_FIELD_VALUE: "SET_LEAF_FIELD_VALUE",
  SET_LEAF_ADVANCED_VALUE: "SET_LEAF_ADVANCED_VALUE",
  TOGGLE_ADVANCED_PANEL: "TOGGLE_ADVANCED_PANEL",
  ADD_ATTACHMENT: "ADD_ATTACHMENT",
  REMOVE_ATTACHMENT: "REMOVE_ATTACHMENT",
  SET_PI_FILE: "SET_PI_FILE",
  RECOMPUTE_PRICING: "RECOMPUTE_PRICING",
  SET_STEP_ERRORS: "SET_STEP_ERRORS",
  SET_SEARCH_QUERY: "SET_SEARCH_QUERY",
  SET_ACTIVE_CATEGORY: "SET_ACTIVE_CATEGORY",
  TOGGLE_DARK_MODE: "TOGGLE_DARK_MODE",
  MARK_DIRTY: "MARK_DIRTY",
  MARK_CLEAN: "MARK_CLEAN",
  AUTOSAVE_START: "AUTOSAVE_START",
  AUTOSAVE_SUCCESS: "AUTOSAVE_SUCCESS",
  AUTOSAVE_ERROR: "AUTOSAVE_ERROR",
  SUBMIT_START: "SUBMIT_START",
  SUBMIT_SUCCESS: "SUBMIT_SUCCESS",
  SUBMIT_ERROR: "SUBMIT_ERROR",
  RESET_WIZARD: "RESET_WIZARD",
};

export function createInitialState({ clientId }) {
  return {
    meta: {
      clientId: clientId || "",
      contractId: null,
      clientName: "",
      clientEmail: "",
      projectName: "",
      timeline: "",
      contractStartDate: "",
      validUntil: "",
      paymentTerms: "",
      notes: "",
      currency: "INR",
      contractAmount: "",
      amountReceived: "",
      // Defaults to today, but must stay editable — a backdated contract's
      // initial "Amount Received" needs to be recorded against the date it
      // was actually received (e.g. January), not the date the contract was
      // entered into the system (e.g. August).
      paymentDate: new Date().toISOString(),
      dueDate: "",
      paymentMethod: "Cash",
      gstEnabled: false,
      gstPercent: "18",
      tdsEnabled: false,
      tdsPercent: "",
    },
    currentStep: 1,
    selectedServices: [],
    pricingSummary: { perCategory: {}, discountTotal: 0, gstTotal: 0, grandTotal: 0, currency: "INR" },
    attachments: {},
    piFile: null,
    ui: {
      activeCategoryId: null,
      expandedAdvancedPaths: [],
      darkMode: false,
      searchQuery: "",
    },
    validation: { errorsByStep: {} },
    status: {
      isDirty: false,
      isSubmitting: false,
      isAutosaving: false,
      lastAutosavedAt: null,
      loadSource: "new",
      error: null,
    },
  };
}

function findCategory(selectedServices, categoryId) {
  return selectedServices.find((c) => c.categoryId === categoryId);
}

function ensureCategory(selectedServices, categoryId) {
  if (findCategory(selectedServices, categoryId)) return selectedServices;
  return [...selectedServices, { categoryId, enabled: true, selections: [] }];
}

function withLeafDefaults(leafConfig, meta) {
  const values = {};
  (leafConfig.fields || []).forEach((f) => {
    values[f.name] = getFieldDefaultValue(f);
  });
  const advanced = {};
  if (leafConfig.commonFields) {
    COMMON_FIELDS.forEach((f) => {
      advanced[f.name] = getFieldDefaultValue(f);
    });
    // Estimated Cost / Selling Price are left blank on purpose — admin or
    // sales must fill these in manually, rather than being seeded from the
    // config's defaultUnitPrice (which was previously a misleading pre-fill).
    // When the contract's own GST checkbox (Step 1) is enabled, every
    // service's Advanced Settings GST field should reflect that admin-set
    // rate instead of the config's static default, so the whole contract
    // stays on one GST rate unless a service is edited individually.
    if (meta?.gstEnabled && meta.gstPercent !== "" && meta.gstPercent !== undefined) {
      advanced.gst = meta.gstPercent;
    }
  }
  return { values, advanced };
}

/** Applies the contract-level GST% (Step 1) to every already-selected service's Advanced Settings GST field. */
function syncGstAcrossSelections(selectedServices, gstPercent) {
  return selectedServices.map((cat) => ({
    ...cat,
    selections: (cat.selections || []).map((sel) => ({
      ...sel,
      advanced: { ...sel.advanced, gst: gstPercent },
    })),
  }));
}

function recomputePricing(state) {
  return computePricingSummary(state.selectedServices, state.pricingSummary.currency);
}

export function contractWizardReducer(state, action) {
  switch (action.type) {
    case ACTIONS.HYDRATE_FROM_SERVER:
    case ACTIONS.HYDRATE_FROM_LOCALSTORAGE: {
      const incoming = action.payload || {};
      const next = {
        ...state,
        ...incoming,
        meta: { ...state.meta, ...incoming.meta },
        ui: { ...state.ui, ...incoming.ui },
        status: {
          ...state.status,
          loadSource: action.type === ACTIONS.HYDRATE_FROM_SERVER ? "server" : "localStorage",
        },
      };
      next.pricingSummary = recomputePricing(next);
      return next;
    }

    case ACTIONS.SET_META_FIELD: {
      const { field, value } = action.payload;
      const next = {
        ...state,
        meta: { ...state.meta, [field]: value },
        status: { ...state.status, isDirty: true },
      };
      if (field === "currency") {
        next.pricingSummary = { ...next.pricingSummary, currency: value };
      }
      // Keep every already-selected service's Advanced Settings GST field in
      // sync with the contract-level rate (Step 1) — TDS is deliberately
      // excluded, it never reaches per-service pricing.
      if (field === "gstPercent" && next.meta.gstEnabled) {
        next.selectedServices = syncGstAcrossSelections(state.selectedServices, value);
        next.pricingSummary = recomputePricing(next);
      } else if (field === "gstEnabled") {
        // Checked: push the current rate into every service. Unchecked: clear
        // it back to 0 so no service is left silently carrying a stale GST%.
        next.selectedServices = syncGstAcrossSelections(state.selectedServices, value ? next.meta.gstPercent : 0);
        next.pricingSummary = recomputePricing(next);
      }
      return next;
    }

    case ACTIONS.SET_STEP:
      return { ...state, currentStep: action.payload.step };

    case ACTIONS.TOGGLE_CATEGORY_ENABLED: {
      const { categoryId, enabled } = action.payload;
      let selectedServices = ensureCategory(state.selectedServices, categoryId);
      selectedServices = selectedServices.map((c) =>
        c.categoryId === categoryId ? { ...c, enabled } : c
      );
      const next = { ...state, selectedServices, status: { ...state.status, isDirty: true } };
      next.pricingSummary = recomputePricing(next);
      return next;
    }

    case ACTIONS.SET_LEAF_ENABLED: {
      const { categoryId, path, enabled } = action.payload;
      let selectedServices = ensureCategory(state.selectedServices, categoryId);

      selectedServices = selectedServices.map((cat) => {
        if (cat.categoryId !== categoryId) return cat;
        const existing = (cat.selections || []).some((s) => s.path === path);
        if (enabled && !existing) {
          const leafConfig = getLeafConfig(categoryId, path);
          const { values, advanced } = leafConfig ? withLeafDefaults(leafConfig, state.meta) : { values: {}, advanced: {} };
          return {
            ...cat,
            enabled: true,
            selections: [
              ...(cat.selections || []),
              { path, label: leafConfig?.label || path, values, advanced },
            ],
          };
        }
        if (!enabled && existing) {
          return { ...cat, selections: cat.selections.filter((s) => s.path !== path) };
        }
        return cat;
      });

      const next = { ...state, selectedServices, status: { ...state.status, isDirty: true } };
      next.pricingSummary = recomputePricing(next);
      return next;
    }

    case ACTIONS.SET_LEAF_FIELD_VALUE: {
      const { categoryId, path, fieldName, value } = action.payload;
      const selectedServices = state.selectedServices.map((cat) => {
        if (cat.categoryId !== categoryId) return cat;
        return {
          ...cat,
          selections: cat.selections.map((sel) =>
            sel.path === path ? { ...sel, values: { ...sel.values, [fieldName]: value } } : sel
          ),
        };
      });
      return { ...state, selectedServices, status: { ...state.status, isDirty: true } };
    }

    case ACTIONS.SET_LEAF_ADVANCED_VALUE: {
      const { categoryId, path, fieldName, value } = action.payload;
      const selectedServices = state.selectedServices.map((cat) => {
        if (cat.categoryId !== categoryId) return cat;
        return {
          ...cat,
          selections: cat.selections.map((sel) =>
            sel.path === path ? { ...sel, advanced: { ...sel.advanced, [fieldName]: value } } : sel
          ),
        };
      });
      const next = { ...state, selectedServices, status: { ...state.status, isDirty: true } };
      next.pricingSummary = recomputePricing(next);
      return next;
    }

    case ACTIONS.TOGGLE_ADVANCED_PANEL: {
      const { path } = action.payload;
      const set = new Set(state.ui.expandedAdvancedPaths);
      set.has(path) ? set.delete(path) : set.add(path);
      return { ...state, ui: { ...state.ui, expandedAdvancedPaths: Array.from(set) } };
    }

    case ACTIONS.ADD_ATTACHMENT: {
      const { path, file } = action.payload;
      const existing = state.attachments[path] || [];
      return {
        ...state,
        attachments: { ...state.attachments, [path]: [...existing, file] },
        status: { ...state.status, isDirty: true },
      };
    }

    case ACTIONS.REMOVE_ATTACHMENT: {
      const { path, index } = action.payload;
      const existing = state.attachments[path] || [];
      return {
        ...state,
        attachments: { ...state.attachments, [path]: existing.filter((_, i) => i !== index) },
        status: { ...state.status, isDirty: true },
      };
    }

    case ACTIONS.SET_PI_FILE:
      return { ...state, piFile: action.payload.file, status: { ...state.status, isDirty: true } };

    case ACTIONS.RECOMPUTE_PRICING:
      return { ...state, pricingSummary: recomputePricing(state) };

    case ACTIONS.SET_STEP_ERRORS:
      return {
        ...state,
        validation: {
          ...state.validation,
          errorsByStep: { ...state.validation.errorsByStep, [action.payload.step]: action.payload.errors },
        },
      };

    case ACTIONS.SET_SEARCH_QUERY:
      return { ...state, ui: { ...state.ui, searchQuery: action.payload.query } };

    case ACTIONS.SET_ACTIVE_CATEGORY:
      return { ...state, ui: { ...state.ui, activeCategoryId: action.payload.categoryId } };

    case ACTIONS.TOGGLE_DARK_MODE:
      return { ...state, ui: { ...state.ui, darkMode: !state.ui.darkMode } };

    case ACTIONS.MARK_DIRTY:
      return { ...state, status: { ...state.status, isDirty: true } };

    case ACTIONS.MARK_CLEAN:
      return { ...state, status: { ...state.status, isDirty: false } };

    case ACTIONS.AUTOSAVE_START:
      return { ...state, status: { ...state.status, isAutosaving: true } };

    case ACTIONS.AUTOSAVE_SUCCESS:
      return {
        ...state,
        status: { ...state.status, isAutosaving: false, isDirty: false, lastAutosavedAt: new Date().toISOString() },
      };

    case ACTIONS.AUTOSAVE_ERROR:
      return { ...state, status: { ...state.status, isAutosaving: false, error: action.payload?.message || null } };

    case ACTIONS.SUBMIT_START:
      return { ...state, status: { ...state.status, isSubmitting: true, error: null } };

    case ACTIONS.SUBMIT_SUCCESS:
      return {
        ...state,
        status: { ...state.status, isSubmitting: false, isDirty: false },
        meta: { ...state.meta, contractId: action.payload?.contractId || state.meta.contractId },
      };

    case ACTIONS.SUBMIT_ERROR:
      return { ...state, status: { ...state.status, isSubmitting: false, error: action.payload?.message || "Failed to save contract" } };

    case ACTIONS.RESET_WIZARD:
      return createInitialState({ clientId: state.meta.clientId });

    default:
      return state;
  }
}
