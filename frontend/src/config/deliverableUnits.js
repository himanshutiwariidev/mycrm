// Unit-aware formatting for deliverables — the second half of making the
// Task/Deliverables UI service-aware. `unit`/`metadata` are additive fields
// on a deliverable (backend/models/{Contract,Task}.js); deliverables from
// before this change (or from categories with no specific unit model) simply
// lack them and fall back to the generic quantity/frequency rendering that
// already existed, so nothing old breaks.
//
// currency formatting kept local (INR, no decimals) rather than importing
// the contract-builder's formatCurrency to avoid pulling that module's
// dependency chain into every place that renders a task card.
const fmtBudget = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const UNIT_NOUN = {
  campaigns: "Campaigns",
  pages: "Pages",
  screens: "Screens",
  keywords: "Keywords",
  budget: "Budget",
};

/** Table columns to render in the Deliverables Overview for a given unit ("" = legacy/generic). */
export function columnsForUnit(unit) {
  switch (unit) {
    case "campaigns":
      return ["Deliverable", "Platform", "Budget", "Campaigns", "Progress"];
    case "pages":
      return ["Deliverable", "Platform", "Pages", "Progress"];
    case "screens":
      return ["Deliverable", "Platform", "Screens", "Progress"];
    case "keywords":
      return ["Deliverable", "Platform", "Keywords", "Progress"];
    case "budget":
      return ["Deliverable", "Platform", "Budget", "Progress"];
    default:
      return ["Deliverable", "Platform", "Progress", "Quantity"];
  }
}

/** Short "what & how much" line for a single deliverable item — used in the task card summary and quantity pills. */
export function formatDeliverableAmount(item) {
  const meta = item.metadata || {};
  switch (item.unit) {
    case "campaigns": {
      const parts = [];
      if (meta.budget) parts.push(`${fmtBudget(meta.budget)}/month`);
      parts.push(`${meta.campaigns ?? item.quantity} Campaign${(meta.campaigns ?? item.quantity) !== 1 ? "s" : ""}`);
      return parts.join(" • ");
    }
    case "pages":
      return `${meta.pages ?? item.quantity} Page${(meta.pages ?? item.quantity) !== 1 ? "s" : ""}`;
    case "screens":
      return `${meta.screens ?? item.quantity} Screen${(meta.screens ?? item.quantity) !== 1 ? "s" : ""}`;
    case "keywords":
      return `${meta.keywords ?? item.quantity} Keyword${(meta.keywords ?? item.quantity) !== 1 ? "s" : ""}`;
    case "budget":
      return meta.budget ? fmtBudget(meta.budget) : `${item.quantity}`;
    default:
      return `${item.quantity}${item.frequency && item.frequency !== "one-time" ? `/${item.frequency}` : ""}`;
  }
}

/** The unit's display noun ("Pages", "Screens", ...), or null for legacy/generic deliverables. */
export function unitNoun(unit) {
  return UNIT_NOUN[unit] || null;
}

/** "{delivered}/{quantity} {Noun} completed" — falls back to the existing generic "done" wording when there's no specific unit noun. */
export function formatDeliverableProgress(item) {
  const delivered = item.delivered || 0;
  const quantity = item.quantity || 0;
  const noun = UNIT_NOUN[item.unit];
  return noun ? `${delivered}/${quantity} ${noun}` : `${delivered}/${quantity} done`;
}

/** One compact line summarizing every deliverable in a task, for the task card. */
export function formatDeliverablesSummaryLine(deliverables = []) {
  return deliverables.map((d) => formatDeliverableAmount(d)).join(" • ");
}

/**
 * The task card's "Total Deliverables / Total X" side panel — sums the
 * right thing for the group's unit (budget for ad campaigns, pages for web
 * dev, screens for app dev, ...) instead of a generic "Total Quantity" that
 * doesn't mean anything for e.g. an ad-spend deliverable. Deliverables are
 * always grouped one-category-per-task (see backend createTasksFromDeliverables),
 * so a task's items share one unit — mixed/legacy data just falls back to
 * the original generic quantity sum, unchanged.
 */
export function summarizeTaskDeliverables(deliverables = []) {
  const count = deliverables.length;
  const unit = deliverables[0]?.unit;
  const sameUnit = unit && deliverables.every((d) => d.unit === unit);

  if (sameUnit) {
    if (unit === "campaigns" || unit === "budget") {
      const budget = deliverables.reduce((s, d) => s + (Number(d.metadata?.budget) || 0), 0);
      const campaigns = deliverables.reduce((s, d) => s + (Number(d.metadata?.campaigns ?? d.quantity) || 0), 0);
      return { count, label: "Total Budget", amount: budget ? `${fmtBudget(budget)}/mo` : `${campaigns} Campaigns` };
    }
    if (unit === "pages") {
      const pages = deliverables.reduce((s, d) => s + (Number(d.metadata?.pages ?? d.quantity) || 0), 0);
      return { count, label: "Total Pages", amount: `${pages}` };
    }
    if (unit === "screens") {
      const screens = deliverables.reduce((s, d) => s + (Number(d.metadata?.screens ?? d.quantity) || 0), 0);
      return { count, label: "Total Screens", amount: `${screens}` };
    }
    if (unit === "keywords") {
      const keywords = deliverables.reduce((s, d) => s + (Number(d.metadata?.keywords ?? d.quantity) || 0), 0);
      return { count, label: "Total Keywords", amount: `${keywords}` };
    }
  }

  const totalQty = deliverables.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
  const freqs = new Set(deliverables.map((d) => d.frequency).filter((f) => f && f !== "one-time"));
  const suffix = freqs.size === 1 ? `/${[...freqs][0]}` : "";
  return { count, label: "Total Quantity", amount: `${totalQty}${suffix}` };
}
