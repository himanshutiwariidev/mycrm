const mongoose = require("mongoose");
const ClientVisit = require("../models/ClientVisit");
const User = require("../models/User");
const Meeting = require("../models/Meeting");
const { hiddenClientIds } = require("../middleware/clientOwnership");
const { logActivity } = require("../utils/activityLogger");
const {
  MAX_PHOTOS_PER_VISIT, PHOTO_CATEGORIES, PHOTO_EDIT_WINDOW_HOURS,
  canEditPhotos, normalizePhoto, removeFiles, removePhotoFile,
} = require("../utils/visitPhotos");

const MAX_PAGE_SIZE = 200;

/**
 * Validates a browser geolocation fix from the request body. Returns
 * { fix } on success, { fix: null } when no coordinates were sent, or
 * { error } for malformed/out-of-range values.
 */
function parseFix(body = {}) {
  const hasCoords = body.lat !== undefined && body.lat !== null && body.lng !== undefined && body.lng !== null;
  if (!hasCoords) return { fix: null };

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Invalid location coordinates" };
  }
  const accuracy = Number(body.accuracy);
  const deviceTime = body.deviceTime ? new Date(body.deviceTime) : null;
  return {
    fix: {
      at: new Date(),
      lat,
      lng,
      accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? Math.round(accuracy) : undefined,
      deviceTime: deviceTime && !Number.isNaN(deviceTime.getTime()) ? deviceTime : undefined,
    },
  };
}

const POPULATE_CLIENT = { path: "clientId", select: "clientName companyName city address" };
const POPULATE_SALES = { path: "salesPerson", select: "name email" };

async function actorName(userId) {
  const user = await User.findById(userId).select("name").lean().catch(() => null);
  return user?.name || "Sales person";
}

/** POST /api/client-visits/check-in (sales) — start a client meeting with live location. */
exports.checkIn = async (req, res) => {
  try {
    const { clientId, meetingId } = req.body;
    const purpose = typeof req.body.purpose === "string" ? req.body.purpose.trim().slice(0, 500) : undefined;
    if (!clientId || !mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ message: "Choose the client you're meeting" });
    }

    const { fix, error } = parseFix(req.body);
    if (error) return res.status(400).json({ message: error });
    if (!fix) return res.status(400).json({ message: "Location is required to start a client meeting" });

    // Started from one of your own client meetings → link it (its proof shows on the meeting).
    let meeting = null;
    if (meetingId) {
      if (!mongoose.isValidObjectId(meetingId)) return res.status(400).json({ message: "Meeting not found" });
      meeting = await Meeting.findOne({ _id: meetingId, kind: "client", salesPerson: req.user.id }).select("clientId status").lean();
      if (!meeting) return res.status(404).json({ message: "That meeting isn't assigned to you" });
      if (String(meeting.clientId) !== String(clientId)) return res.status(400).json({ message: "That meeting is with a different client" });
      if (meeting.status !== "scheduled") return res.status(400).json({ message: "That meeting is already closed" });
    }

    const open = await ClientVisit.findOne({ salesPerson: req.user.id, status: "in-progress" }).populate(POPULATE_CLIENT);
    if (open) {
      return res.status(409).json({
        message: `End your current meeting with ${open.clientId?.companyName || open.clientId?.clientName || "a client"} first`,
        visit: open,
      });
    }

    let visit;
    try {
      visit = await ClientVisit.create({ salesPerson: req.user.id, clientId, purpose, checkIn: fix, ...(meeting ? { meeting: meeting._id } : {}) });
    } catch (createError) {
      // Lost a race with another check-in (double tap / second tab).
      if (createError?.code === 11000) {
        return res.status(409).json({ message: "You already have a meeting in progress" });
      }
      throw createError;
    }
    await visit.populate([POPULATE_CLIENT, POPULATE_SALES]);

    await logActivity(
      clientId,
      "meeting_check_in",
      `${await actorName(req.user.id)} checked in for a client meeting (location shared)${purpose ? ` — ${purpose}` : ""}`,
      { visitId: visit._id }
    );

    return res.status(201).json({ message: "Meeting started — location shared", visit });
  } catch (error) {
    console.error("Error checking in to client visit:", error);
    return res.status(500).json({ message: error.message || "Failed to start meeting" });
  }
};

/** PUT /api/client-visits/:id/check-out (sales) — end your own open meeting. */
exports.checkOut = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    const { fix, error } = parseFix(req.body);
    if (error) return res.status(400).json({ message: error });

    const outcome = typeof req.body.outcome === "string" ? req.body.outcome.trim().slice(0, 2000) : undefined;
    const visit = await ClientVisit.findOneAndUpdate(
      { _id: req.params.id, salesPerson: req.user.id, status: "in-progress" },
      { $set: { status: "completed", checkOut: fix || { at: new Date() }, ...(outcome ? { outcome } : {}) } },
      { returnDocument: "after", runValidators: true }
    ).populate([POPULATE_CLIENT, POPULATE_SALES]);

    if (!visit) {
      return res.status(404).json({ message: "No open meeting found to end" });
    }

    const minutes = Math.max(0, Math.round((visit.checkOut.at - visit.checkIn.at) / 60000));
    await logActivity(
      visit.clientId?._id || visit.clientId,
      "meeting_check_out",
      `${visit.salesPerson?.name || "Sales person"} ended the client meeting after ${minutes} min${fix ? "" : " (location not shared)"}`,
      { visitId: visit._id }
    );

    return res.json({ message: "Meeting ended", visit });
  } catch (error) {
    console.error("Error checking out of client visit:", error);
    return res.status(500).json({ message: error.message || "Failed to end meeting" });
  }
};

/** GET /api/client-visits/mine (sales) — your open meeting + recent history. */
exports.getMyVisits = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, MAX_PAGE_SIZE);
    const [open, visits] = await Promise.all([
      ClientVisit.findOne({ salesPerson: req.user.id, status: "in-progress" }).populate(POPULATE_CLIENT),
      ClientVisit.find({ salesPerson: req.user.id }).sort({ createdAt: -1 }).limit(limit).populate(POPULATE_CLIENT),
    ]);
    return res.json({ open, visits });
  } catch (error) {
    console.error("Error fetching own client visits:", error);
    return res.status(500).json({ message: error.message || "Failed to load meetings" });
  }
};

const PHOTO_CATEGORY_LABELS = {
  "with-client": "with the client",
  "business-card": "business card",
  premises: "office / factory",
  other: "other",
};
const lockedMessage = `Photos can only be added or removed during the meeting or within ${PHOTO_EDIT_WINDOW_HOURS} hours after it ends`;

/**
 * POST /api/client-visits/:id/photos (sales) — add photos (multipart `photos`,
 * plus optional `category` and `caption` for the batch) to your own meeting.
 */
exports.addPhotos = async (req, res) => {
  const files = req.files || [];
  const reject = (status, message) => {
    removeFiles(files);
    return res.status(status).json({ message });
  };
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return reject(404, "Meeting not found");
    if (!files.length) return reject(400, "Choose at least one photo");

    const visit = await ClientVisit.findOne({ _id: req.params.id, salesPerson: req.user.id }).select("status checkOut photos clientId");
    if (!visit) return reject(404, "Meeting not found");
    if (!canEditPhotos(visit)) return reject(403, lockedMessage);

    // Any image format works: JPG/PNG/WebP are kept, everything else (iPhone
    // HEIC, TIFF, AVIF, GIF, BMP …) is converted to JPEG. Files are replaced in
    // place so `reject` always cleans up whatever is on disk right now.
    for (let i = 0; i < files.length; i += 1) {
      try {
        files[i] = await normalizePhoto(files[i]);
      } catch {
        return reject(400, `"${files[i].originalname}" couldn't be read as a photo`);
      }
    }
    const room = MAX_PHOTOS_PER_VISIT - (visit.photos?.length || 0);
    if (files.length > room) {
      return reject(400, room > 0
        ? `You can add ${room} more photo${room === 1 ? "" : "s"} to this meeting (${MAX_PHOTOS_PER_VISIT} max)`
        : `This meeting already has ${MAX_PHOTOS_PER_VISIT} photos — remove one to add another`);
    }

    const category = PHOTO_CATEGORIES.includes(req.body.category) ? req.body.category : "other";
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim().slice(0, 200) : "";
    const uploadedAt = new Date();
    const photos = files.map((f) => ({
      filename: f.filename,
      originalname: String(f.originalname || "").slice(0, 200),
      mimetype: f.mimetype,
      size: f.size,
      category,
      ...(caption ? { caption } : {}),
      uploadedAt,
    }));

    // Re-check the cap atomically so two uploads at once can't overshoot it.
    const updated = await ClientVisit.findOneAndUpdate(
      {
        _id: visit._id,
        salesPerson: req.user.id,
        $expr: { $lte: [{ $size: { $ifNull: ["$photos", []] } }, MAX_PHOTOS_PER_VISIT - photos.length] },
      },
      { $push: { photos: { $each: photos } } },
      { returnDocument: "after", runValidators: true }
    ).populate([POPULATE_CLIENT, POPULATE_SALES]);
    if (!updated) return reject(409, `This meeting can have at most ${MAX_PHOTOS_PER_VISIT} photos`);

    const n = photos.length;
    await logActivity(
      updated.clientId?._id || updated.clientId,
      "visit_photos_added",
      `${updated.salesPerson?.name || "Sales person"} added ${n} photo${n === 1 ? "" : "s"} from the client meeting (${PHOTO_CATEGORY_LABELS[category]}${caption ? ` — ${caption}` : ""})`,
      { visitId: updated._id }
    );

    return res.status(201).json({ message: `${n} photo${n === 1 ? "" : "s"} added`, visit: updated });
  } catch (error) {
    removeFiles(files);
    console.error("Error adding visit photos:", error);
    return res.status(500).json({ message: error.message || "Failed to upload photos" });
  }
};

/** DELETE /api/client-visits/:id/photos/:photoId (sales) — remove one of your meeting photos. */
exports.deletePhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(photoId)) {
      return res.status(404).json({ message: "Photo not found" });
    }
    const visit = await ClientVisit.findOne({ _id: id, salesPerson: req.user.id }).select("status checkOut photos");
    if (!visit) return res.status(404).json({ message: "Meeting not found" });
    if (!canEditPhotos(visit)) return res.status(403).json({ message: lockedMessage });
    const photo = visit.photos.id(photoId);
    if (!photo) return res.status(404).json({ message: "Photo not found" });

    const updated = await ClientVisit.findOneAndUpdate(
      { _id: id, salesPerson: req.user.id },
      { $pull: { photos: { _id: photoId } } },
      { returnDocument: "after" }
    ).populate([POPULATE_CLIENT, POPULATE_SALES]);
    removePhotoFile(photo.filename);

    return res.json({ message: "Photo removed", visit: updated });
  } catch (error) {
    console.error("Error removing visit photo:", error);
    return res.status(500).json({ message: error.message || "Failed to remove photo" });
  }
};

/**
 * GET /api/client-visits (admin) — every sales person's visits.
 * Filters: salesPerson, clientId, status, from, to (check-in date, inclusive
 * whole days); paginated with page/limit.
 */
exports.getAllVisits = async (req, res) => {
  try {
    const filter = {};
    const { salesPerson, clientId, status, from, to } = req.query;
    if (salesPerson && mongoose.isValidObjectId(salesPerson)) filter.salesPerson = salesPerson;
    if (clientId && mongoose.isValidObjectId(clientId)) filter.clientId = clientId;
    // Sales manager: not the visits on a super admin's own clients.
    const hidden = await hiddenClientIds(req.user);
    if (status === "in-progress" || status === "completed") filter.status = status;

    const range = {};
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && !Number.isNaN(fromDate.getTime())) range.$gte = fromDate;
    if (toDate && !Number.isNaN(toDate.getTime())) range.$lte = toDate;
    if (Object.keys(range).length) filter["checkIn.at"] = range;

    if (hidden.length) filter.$and = [{ clientId: { $nin: hidden } }];
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), MAX_PAGE_SIZE);
    const page = Math.max(Number(req.query.page) || 1, 1);

    const [visits, total, stats] = await Promise.all([
      ClientVisit.find(filter)
        .sort({ "checkIn.at": -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate([POPULATE_CLIENT, POPULATE_SALES]),
      ClientVisit.countDocuments(filter),
      ClientVisit.aggregate([
        { $match: { ...filter, ...(filter.salesPerson ? { salesPerson: new mongoose.Types.ObjectId(filter.salesPerson) } : {}), ...(filter.clientId ? { clientId: new mongoose.Types.ObjectId(filter.clientId) } : {}), ...(hidden.length ? { $and: [{ clientId: { $nin: hidden } }] } : {}) } },
        {
          $group: {
            _id: null,
            clients: { $addToSet: "$clientId" },
            salesPeople: { $addToSet: "$salesPerson" },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] } },
            photos: { $sum: { $size: { $ifNull: ["$photos", []] } } },
            totalMinutes: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$status", "completed"] }, { $ifNull: ["$checkOut.at", false] }] },
                  { $divide: [{ $subtract: ["$checkOut.at", "$checkIn.at"] }, 60000] },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const s = stats[0];
    return res.json({
      visits,
      total,
      page,
      pages: Math.max(Math.ceil(total / limit), 1),
      summary: {
        totalVisits: total,
        uniqueClients: s ? s.clients.length : 0,
        activeSalesPeople: s ? s.salesPeople.length : 0,
        inProgress: s ? s.inProgress : 0,
        totalMinutes: s ? Math.round(s.totalMinutes) : 0,
        totalPhotos: s ? s.photos : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching client visits:", error);
    return res.status(500).json({ message: error.message || "Failed to load client visits" });
  }
};
