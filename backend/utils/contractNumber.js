/**
 * Short, readable contract numbers: brand initials + date + time (IST).
 *
 *   "Himanshu Tiwari" on 20 Nov 2026, 4:53 pm  →  HT2011261653
 *   "Sunrise" (one word)                        →  SE…  (first + last letter)
 *   "Sunrise Retail Pvt Ltd"                    →  SRPL… (first letter of each word)
 *
 * Two contracts for the same brand in the same minute get "-2", "-3", ….
 */

const IST_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata", // the business runs on IST even if the server is in UTC
  day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

/** DDMMYYHHmm in IST, e.g. 2011261653. */
function istStamp(date = new Date()) {
  const p = Object.fromEntries(IST_PARTS.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
  return `${p.day}${p.month}${p.year}${p.hour}${p.minute}`;
}

/**
 * Brand initials (A–Z / 0–9 only): first + last letter of a one-word name,
 * otherwise the first letter of every word. Falls back to "CL" when the name
 * has no Latin letters/digits (e.g. written only in Hindi).
 */
function brandInitials(name) {
  const words = String(name || "")
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .filter(Boolean);
  if (!words.length) return "CL";
  if (words.length === 1) {
    const w = words[0];
    return (w.length > 1 ? w[0] + w[w.length - 1] : w).toUpperCase();
  }
  return words.map((w) => w[0]).join("").toUpperCase();
}

const contractNumberFor = (brandName, date = new Date()) => `${brandInitials(brandName)}${istStamp(date)}`;

/**
 * Contract.create(doc) with a fresh contract number for `brandName`, adding
 * "-2", "-3", … if that number is already taken (checked up front, and
 * retried if a simultaneous create wins the unique index first).
 */
async function createWithContractNumber(Contract, brandName, doc, date = new Date()) {
  const base = contractNumberFor(brandName, date);
  for (let n = 1; n <= 99; n += 1) {
    const contractNumber = n === 1 ? base : `${base}-${n}`;
    if (await Contract.exists({ contractNumber })) continue;
    try {
      return await Contract.create({ ...doc, contractNumber });
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.contractNumber) continue;
      throw err;
    }
  }
  throw new Error("Couldn't generate a unique contract number");
}

module.exports = { brandInitials, istStamp, contractNumberFor, createWithContractNumber };
