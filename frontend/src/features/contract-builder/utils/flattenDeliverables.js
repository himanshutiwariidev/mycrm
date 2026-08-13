import { getCategoryMeta } from "../config/serviceCategories";
import { getLeafConfig } from "./configLookup";
import { getTrackingMode } from "./deliverableTracking";

// Per-category measurement model — reads the fields that category's own
// config/services/*.js leaf already collects (no new wizard fields
// invented) and maps them to a { unit, quantity, frequency, metadata }
// shape so downstream UI (task cards, Deliverables Overview) can show the
// right unit for that service instead of a generic quantity. Categories not
// listed here (or leaves missing the expected field) fall through to the
// generic quantity branch below, unchanged.
function extractStructuredAmount(categoryId, values = {}) {
  switch (categoryId) {
    case "sponsoredAds": {
      const campaignTypes = Array.isArray(values.campaignTypes) ? values.campaignTypes : [];
      const campaigns = campaignTypes.length || 1;
      return {
        unit: "campaigns",
        quantity: campaigns,
        frequency: values.budget ? "month" : "one-time",
        metadata: { budget: Number(values.budget) || undefined, campaigns, duration: values.duration || undefined },
      };
    }
    case "webDevelopment": {
      const pages = Number(values.pages) || 0;
      if (!pages) return null;
      return { unit: "pages", quantity: pages, frequency: "one-time", metadata: { pages, packageType: values.packageType } };
    }
    case "mobileAppDevelopment": {
      const screens = Number(values.screens) || 0;
      if (!screens) return null;
      return { unit: "screens", quantity: screens, frequency: "one-time", metadata: { screens } };
    }
    case "rankingOptimization": {
      const keywords = Array.isArray(values.keywords) ? values.keywords.length : 0;
      if (!keywords) return null;
      return { unit: "keywords", quantity: keywords, frequency: "month", metadata: { keywords, disciplines: values.disciplines } };
    }
    case "telecast":
    case "broadcast": {
      if (!values.budget) return null;
      return { unit: "budget", quantity: 1, frequency: "one-time", metadata: { budget: Number(values.budget) || undefined } };
    }
    default:
      return null;
  }
}

/** Maps every enabled leaf selection to the legacy deliverables[] subdocument shape. */
export function flattenDeliverables(enabledCategories = []) {
  return enabledCategories.flatMap((cat) => {
    const label = getCategoryMeta(cat.categoryId)?.label || cat.categoryId;
    return (cat.selections || []).flatMap((sel) => {
      const leafConfig = getLeafConfig(cat.categoryId, sel.path);

      // Per-item quantity tracking (e.g. Social Media's "Deliverables
      // Included" checklist): one deliverable row per selected item, each
      // with its own quantity/cadence, instead of one shared quantity for
      // the whole leaf.
      const itemQuantityField = (leafConfig?.fields || []).find((f) => f.type === "per-item-quantity");
      const selectedItems = itemQuantityField ? sel.values?.[itemQuantityField.sourceField] : null;
      if (itemQuantityField && Array.isArray(selectedItems) && selectedItems.length) {
        const itemQuantities = sel.values?.[itemQuantityField.name] || {};
        const labelByValue = new Map((itemQuantityField.sourceOptions || []).map((o) => [o.value, o.label]));
        return selectedItems.map((itemValue) => {
          const row = itemQuantities[itemValue] || {};
          const quantity = Number(row.quantity) || 1;
          const frequency = ["week", "month", "year"].includes(row.period) ? row.period : "one-time";
          return {
            title: `${label} — ${sel.label}: ${labelByValue.get(itemValue) || itemValue}`,
            quantity,
            frequency,
            categoryId: cat.categoryId,
            path: sel.path,
            trackingMode: "quantity",
          };
        });
      }

      const structured = extractStructuredAmount(cat.categoryId, sel.values);
      if (structured) {
        return [{
          title: `${label} — ${sel.label}`,
          quantity: structured.quantity,
          frequency: structured.frequency,
          categoryId: cat.categoryId,
          path: sel.path,
          trackingMode: "quantity",
          unit: structured.unit,
          metadata: structured.metadata,
        }];
      }

      const hasMonthlyQuantity = sel.values?.quantityPerMonth !== undefined && sel.values?.quantityPerMonth !== "";
      const quantity = Number(sel.values?.quantityPerMonth || sel.values?.quantity || 1) || 1;
      return [{
        title: `${label} — ${sel.label}`,
        quantity,
        frequency: hasMonthlyQuantity ? "month" : "one-time",
        categoryId: cat.categoryId,
        path: sel.path,
        trackingMode: getTrackingMode(leafConfig),
      }];
    });
  });
}
