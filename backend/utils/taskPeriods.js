// Month-by-month tracking for contract task deliverables (mirrors
// frontend/src/utils/taskPeriods.js).
//
// A "month"/"week" deliverable (e.g. 4 reels / month) is tracked per calendar
// month: progress[] holds { period: "YYYY-MM", delivered } and every month
// starts from 0 again. One-time (and yearly) deliverables have a single
// period, "all", covering the whole contract.

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const WHOLE_CONTRACT = "all";

const isPeriodic = (frequency) => frequency === "month" || frequency === "week";

const monthKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * The latest month anyone could currently be in — the server may run in UTC
 * while the team is in IST, so allow for the widest time-zone offset (+14h)
 * rather than rejecting the first hours of a new month as "the future".
 */
const latestAllowedMonth = () => monthKey(Date.now() + 14 * 3600 * 1000);

/** Monthly target for an item: its quantity, or for weekly items quantity × weeks in that month. */
function targetFor(item, period) {
  const quantity = Number(item.quantity) || 0;
  if (item.frequency !== "week" || !PERIOD_RE.test(period)) return quantity;
  const [y, m] = period.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return Math.round((quantity * days) / 7);
}

/**
 * Tasks created before monthly tracking kept one running `delivered` count.
 * Moves it into progress[] (as the month the task was last updated, or the
 * whole-contract period) the first time the item is touched.
 */
function ensureProgress(task, item) {
  if (item.progress?.length || !item.delivered) return;
  item.progress = [{
    period: isPeriodic(item.frequency) ? monthKey(task.updatedAt || Date.now()) : WHOLE_CONTRACT,
    delivered: item.delivered,
  }];
}

const deliveredIn = (item, period) => (item.progress || []).find((p) => p.period === period)?.delivered || 0;

module.exports = { PERIOD_RE, WHOLE_CONTRACT, isPeriodic, monthKey, latestAllowedMonth, targetFor, ensureProgress, deliveredIn };
