const mongoose = require("mongoose");

/**
 * A client's industry ("Category" in the client form). Added from the form's
 * "+" button instead of a fixed list; Client.businessCategory stores `value`.
 */
const ClientCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    // Stable key saved on clients, e.g. "real-estate" (lower-case, hyphenated name).
    value: { type: String, required: true, unique: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Explicit collection name: this MongoDB database is shared with an unrelated
// system (see Contract.js / Meeting.js).
module.exports = mongoose.model("ClientCategory", ClientCategorySchema, "clientCategories");
