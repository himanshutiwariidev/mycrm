const mongoose = require("mongoose");
const { PHOTO_CATEGORIES } = require("../utils/visitPhotos");

// One GPS fix shared from the sales person's browser. `at` is the SERVER's
// receive time (authoritative — a device clock can be wrong or changed);
// `deviceTime` is when the browser says it took the fix, kept for reference.
// lat/lng are optional at schema level because ending a meeting is allowed
// without a fix (e.g. permission revoked mid-visit) — check-in always
// requires one, enforced in the controller.
const LocationFixSchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, default: Date.now },
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 }, // metres, as reported by the device
    deviceTime: { type: Date },
  },
  { _id: false }
);

// A photo the sales person took at the meeting (with the client, their visiting
// card, the office / factory …). The file lives in uploads/visit-photos under
// a random name; `uploadedAt` is server time, so the admin can tell photos
// taken during the meeting from ones added after it ended.
const VisitPhotoSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalname: { type: String, trim: true, maxlength: 200 },
  mimetype: { type: String },
  size: { type: Number, min: 0 },
  category: { type: String, enum: PHOTO_CATEGORIES, default: "other" },
  caption: { type: String, trim: true, maxlength: 200 },
  uploadedAt: { type: Date, default: Date.now },
});

/**
 * A sales person's in-person client meeting: checked in on arrival with their
 * live location, checked out when leaving (second location + outcome). Only
 * ever created by the sales person tapping "Share location" — there is no
 * background tracking. Admin sees every record (Client Visits section).
 */
const ClientVisitSchema = new mongoose.Schema(
  {
    salesPerson: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    purpose: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["in-progress", "completed"], default: "in-progress" },
    checkIn: { type: LocationFixSchema, required: true },
    checkOut: { type: LocationFixSchema },
    outcome: { type: String, trim: true, maxlength: 2000 },
    photos: { type: [VisitPhotoSchema], default: [] },
  },
  { timestamps: true }
);

ClientVisitSchema.index({ salesPerson: 1, createdAt: -1 });
ClientVisitSchema.index({ createdAt: -1 });
ClientVisitSchema.index({ clientId: 1, createdAt: -1 });
// At most one open meeting per sales person — enforced by the database so
// two quick taps (or two tabs) can't both check in.
ClientVisitSchema.index(
  { salesPerson: 1 },
  { unique: true, partialFilterExpression: { status: "in-progress" }, name: "one_open_visit_per_sales_person" }
);

// Explicit collection name: this MongoDB database is shared with an unrelated
// system, so default names risk collisions (see Meeting.js / Contract.js).
module.exports = mongoose.model("ClientVisit", ClientVisitSchema, "clientFieldVisits");
