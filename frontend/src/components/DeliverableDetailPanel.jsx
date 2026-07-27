import React from "react";
import { FIELD_TYPES } from "../features/contract-builder/config/fieldDefinitions";
import { COMMON_FIELDS } from "../features/contract-builder/config/commonFields";
import { formatCurrency } from "../features/contract-builder/config/pricing";
import "./DeliverableDetailPanel.css";

function formatFieldValue(field, value, currency) {
  if (value === undefined || value === null || value === "") return "—";

  switch (field.type) {
    case FIELD_TYPES.CURRENCY:
      return formatCurrency(value, currency);
    case FIELD_TYPES.SELECT:
    case FIELD_TYPES.RADIO: {
      const option = (field.options || []).find((o) => o.value === value);
      return option?.label || String(value);
    }
    case FIELD_TYPES.MULTISELECT: {
      if (!Array.isArray(value) || !value.length) return "—";
      return value
        .map((v) => (field.options || []).find((o) => o.value === v)?.label || v)
        .join(", ");
    }
    case FIELD_TYPES.TAGS:
      return Array.isArray(value) && value.length ? value.join(", ") : "—";
    case FIELD_TYPES.DATE: {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
    }
    case FIELD_TYPES.TOGGLE:
      return value ? "Yes" : "No";
    case FIELD_TYPES.FILE:
      return Array.isArray(value) && value.length ? `${value.length} file(s)` : "—";
    default:
      return String(value);
  }
}

/**
 * Read-only, category-aware breakdown of one deliverable — shows only the
 * fields that actually belong to the service it came from (e.g. Pages/CMS
 * for Web Development, Budget/Audience for Sponsored Ads) instead of a
 * generic quantity/frequency form that doesn't apply to every category.
 */
export default function DeliverableDetailPanel({ leafConfig, selection, currency = "INR" }) {
  if (!leafConfig) {
    return <p className="ddp-empty">No service-specific details available for this deliverable.</p>;
  }

  const ownFields = leafConfig.fields || [];
  const advancedFields = leafConfig.commonFields ? COMMON_FIELDS : [];
  const values = selection?.values || {};
  const advanced = selection?.advanced || {};

  return (
    <div className="ddp-panel">
      {leafConfig.description && <p className="ddp-description">{leafConfig.description}</p>}
      <div className="ddp-grid">
        {ownFields.map((field) => (
          <div className="ddp-field" key={field.name}>
            <span className="ddp-label">{field.label}</span>
            <span className="ddp-value">{formatFieldValue(field, values[field.name], currency)}</span>
          </div>
        ))}
        {advancedFields
          .filter((field) => field.name !== "attachments")
          .map((field) => (
            <div className="ddp-field" key={field.name}>
              <span className="ddp-label">{field.label}</span>
              <span className="ddp-value">{formatFieldValue(field, advanced[field.name], currency)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
