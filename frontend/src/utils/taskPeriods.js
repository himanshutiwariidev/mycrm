// Month-by-month view of contract task deliverables (mirrors
// backend/utils/taskPeriods.js).
//
// A contract runs for a number of months (from its end date, or its
// "timeline" text such as "1 year" / "6 months"), starting in the calendar
// month it starts in. Monthly / weekly items have a target every month and
// their own delivered count per month (item.progress[{ period: "YYYY-MM" }]);
// one-time items have one target for the whole contract (period "all").

export const WHOLE_CONTRACT = "all";
export const isPeriodic = (frequency) => frequency === "month" || frequency === "week";

export const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const currentMonthKey = () => monthKey(Date.now());

export function addMonths(key, n) {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

export const monthLabel = (key, long = false) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: long ? "long" : "short", year: "numeric" });
};

/** Months in "1 year", "6 months", "12 Months", "2 years" … (null if it doesn't say). */
function monthsFromTimeline(text = "") {
  const match = String(text).toLowerCase().match(/(\d+(?:\.\d+)?)\s*(year|yr|month|mon|mo)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Math.max(1, Math.round(match[2].startsWith("y") ? n * 12 : n));
}

/** Whole months from start to end date (4 Nov → 3 Nov next year = 12). */
function monthsBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null;
  const diff = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + (e.getDate() >= s.getDate() ? 1 : 0);
  return Math.max(1, diff);
}

/**
 * The contract months of a task: { startKey, count } — count is null for an
 * open-ended contract (no end date / timeline), which runs to the current month.
 */
export function taskContractMonths(task) {
  const contract = task.contractId && typeof task.contractId === "object" ? task.contractId : null;
  const start = contract?.contractStartDate || contract?.createdAt || task.createdAt;
  if (!start) return null;
  const startKey = monthKey(start);
  const count = (contract?.validUntil && monthsBetween(start, contract.validUntil)) || monthsFromTimeline(contract?.timeline);
  return { startKey, count: count || null };
}

/** Is `key` inside the task's contract period? Returns { index, count } (1-based) or null. */
export function contractMonthOf(task, key) {
  const range = taskContractMonths(task);
  if (!range) return null;
  const [sy, sm] = range.startKey.split("-").map(Number);
  const [y, m] = key.split("-").map(Number);
  const index = (y - sy) * 12 + (m - sm) + 1;
  if (index < 1) return null;
  if (range.count && index > range.count) return null;
  if (!range.count && key > currentMonthKey()) return null;
  return { index, count: range.count };
}

/** Every month any of these tasks runs in (oldest first), always including the current month. */
export function monthsForTasks(tasks = []) {
  const current = currentMonthKey();
  let first = current;
  let last = current;
  tasks.forEach((task) => {
    const range = taskContractMonths(task);
    if (!range) return;
    if (range.startKey < first) first = range.startKey;
    const end = range.count ? addMonths(range.startKey, range.count - 1) : current;
    if (end > last) last = end;
  });
  const keys = [];
  for (let k = first; k <= last && keys.length < 120; k = addMonths(k, 1)) keys.push(k);
  return keys;
}

/** Monthly target: quantity, or for weekly items quantity × weeks in that month. */
export function targetFor(item, key) {
  const quantity = Number(item.quantity) || 0;
  if (item.frequency !== "week" || key === WHOLE_CONTRACT) return quantity;
  const [y, m] = key.split("-").map(Number);
  return Math.round((quantity * new Date(y, m, 0).getDate()) / 7);
}

/** The period an item is tracked in when viewing month `key`. */
export const periodFor = (item, key) => (isPeriodic(item.frequency) ? key : WHOLE_CONTRACT);

/**
 * Delivered in a period. Tasks from before monthly tracking only have one
 * running `delivered` count — it's shown in the month the task was last
 * updated (the server files it there on the next update too).
 */
export function deliveredFor(item, period, task) {
  if (item.progress?.length) return item.progress.find((p) => p.period === period)?.delivered || 0;
  if (!item.delivered) return 0;
  const legacyPeriod = isPeriodic(item.frequency) ? monthKey(task?.updatedAt || Date.now()) : WHOLE_CONTRACT;
  return period === legacyPeriod ? item.delivered : 0;
}

/**
 * Everything a task card needs for month `key`:
 *   inRange / index / count — "Month 3 of 12"
 *   items[] — per item: period, target, delivered, pending, editable
 *   done / target / pending — totals for the month (monthly items)
 *   backlog[] — earlier months (within the contract, up to `key`) with work
 *   still pending, newest first; backlogTotal — their sum
 */
export function taskMonthView(task, key) {
  const current = currentMonthKey();
  const position = contractMonthOf(task, key);
  const isFuture = key > current;
  const deliverables = task.deliverables || [];

  const items = deliverables.map((item) => {
    const period = periodFor(item, key);
    const target = targetFor(item, period);
    const delivered = Math.min(deliveredFor(item, period, task), target || Infinity);
    const inPeriod = period === WHOLE_CONTRACT || !!position;
    return {
      item, period, target, delivered,
      pending: inPeriod ? Math.max(0, target - delivered) : 0,
      editable: inPeriod && !isFuture,
      whole: period === WHOLE_CONTRACT,
    };
  });
  const monthly = items.filter((i) => !i.whole);
  const inRange = !!position;
  const done = inRange ? monthly.reduce((s, i) => s + i.delivered, 0) : 0;
  const target = inRange ? monthly.reduce((s, i) => s + i.target, 0) : 0;

  const backlog = [];
  const range = taskContractMonths(task);
  if (range && monthly.length) {
    const lastPast = key < current ? addMonths(key, -1) : addMonths(current, -1);
    for (let k = lastPast; k >= range.startKey && backlog.length < 60; k = addMonths(k, -1)) {
      if (!contractMonthOf(task, k)) continue;
      const pending = monthly.reduce((s, i) => s + Math.max(0, targetFor(i.item, k) - deliveredFor(i.item, k, task)), 0);
      if (pending > 0) backlog.push({ key: k, pending });
    }
  }

  return {
    inRange, index: position?.index ?? null, count: position?.count ?? null, isFuture,
    items, done, target, pending: Math.max(0, target - done),
    backlog, backlogTotal: backlog.reduce((s, b) => s + b.pending, 0),
  };
}

/** Month a proof belongs to (proofs from before monthly tracking: their upload month). */
export const proofPeriod = (proof, item) =>
  proof.period || (isPeriodic(item?.frequency) ? monthKey(proof.createdAt) : WHOLE_CONTRACT);
