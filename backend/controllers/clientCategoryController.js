const ClientCategory = require("../models/ClientCategory");
const Client = require("../models/Client");

const toValue = (name) => String(name).trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const toLabel = (value) => String(value).split("-").map((w) => (w.length <= 4 && w === "fmcg" ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");

/**
 * Categories already saved on clients (from the old fixed list, or data
 * imported before) become real categories, so their labels keep showing.
 */
async function adoptExistingCategories() {
  const [used, known] = await Promise.all([
    Client.distinct("businessCategory", { businessCategory: { $nin: [null, ""] } }),
    ClientCategory.distinct("value"),
  ]);
  const missing = used.filter((v) => !known.includes(v));
  if (!missing.length) return;
  await ClientCategory.bulkWrite(
    missing.map((value) => ({ updateOne: { filter: { value }, update: { $setOnInsert: { value, name: toLabel(value) } }, upsert: true } })),
    { ordered: false }
  ).catch(() => {});
}

/** GET /api/client-categories — every category, A–Z. */
exports.listCategories = async (req, res) => {
  try {
    await adoptExistingCategories();
    const categories = await ClientCategory.find().select("name value").sort({ name: 1 }).collation({ locale: "en" }).lean();
    return res.json({ categories });
  } catch (error) {
    console.error("Error listing client categories:", error);
    return res.status(500).json({ message: "Failed to load categories" });
  }
};

/** POST /api/client-categories { name } — add one (an existing name is just returned). */
exports.createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || "").replace(/\s+/g, " ").trim();
    if (!name) return res.status(400).json({ message: "Enter the category name" });
    if (name.length > 60) return res.status(400).json({ message: "Keep the category name under 60 characters" });
    const value = toValue(name);
    if (!value) return res.status(400).json({ message: "Use letters or numbers in the category name" });

    const existing = await ClientCategory.findOne({ value }).select("name value").lean();
    if (existing) return res.json({ message: `"${existing.name}" already exists`, category: existing, existed: true });

    try {
      const category = await ClientCategory.create({ name, value, createdBy: req.user.id });
      return res.status(201).json({ message: `Category "${name}" added`, category: { _id: category._id, name: category.name, value: category.value } });
    } catch (err) {
      if (err?.code === 11000) {
        const again = await ClientCategory.findOne({ value }).select("name value").lean();
        return res.json({ message: `"${again.name}" already exists`, category: again, existed: true });
      }
      throw err;
    }
  } catch (error) {
    console.error("Error adding client category:", error);
    return res.status(500).json({ message: "Failed to add the category" });
  }
};

/** Is this a known category value (or empty)? Used when saving a client. */
exports.isKnownCategory = async (value) => !value || Boolean(await ClientCategory.exists({ value }));
