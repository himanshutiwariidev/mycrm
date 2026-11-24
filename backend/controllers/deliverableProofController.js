const path = require("path");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const Contract = require("../models/Contract");
const User = require("../models/User");
const DeliverableProof = require("../models/DeliverableProof");
const { logActivity } = require("../utils/activityLogger");
const { findContractDeliverable } = require("../utils/deliverableSync");
const { getOwnedClientIds } = require("../middleware/clientOwnership");
const { createImageUpload, removeFiles } = require("../utils/imageUploads");
const { PERIOD_RE, WHOLE_CONTRACT, isPeriodic, monthKey, latestAllowedMonth } = require("../utils/taskPeriods");

const PROOF_DIR = path.join(__dirname, "../uploads/deliverable-proofs");
const MAX_PROOFS_PER_ITEM = 30;
const MAX_FILES_PER_REQUEST = 6;
const images = createImageUpload({ dir: PROOF_DIR, field: "files", maxFiles: MAX_FILES_PER_REQUEST, noun: "screenshot" });

/** Multer for the proof upload (multipart `files`, plus `link` / `note` text fields). */
exports.receiveProofImages = images.receive;

const isManager = (user) => user.role === "admin" || user.role === "manager";

/** A live link: http(s) only, scheme added when someone pastes "instagram.com/p/…". */
function normalizeLink(raw) {
  let value = String(raw || "").trim();
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString().slice(0, 2000);
  } catch {
    return null;
  }
}

const idList = (value) =>
  String(value || "").split(",").map((s) => s.trim()).filter((s) => mongoose.isValidObjectId(s)).slice(0, 200);

const POPULATE_UPLOADER = { path: "uploadedBy", select: "name role" };

/**
 * POST /api/deliverable-proofs/tasks/:taskId/items/:itemId — add proof for a
 * task's deliverable: up to 6 screenshots/photos (`files`) and/or a live
 * `link`, with an optional `note`. The task's assignee, admin or manager —
 * the same people who can update its progress.
 */
exports.addProofs = async (req, res) => {
  const files = req.files || [];
  const reject = (status, message) => {
    removeFiles(files);
    return res.status(status).json({ message });
  };
  try {
    const { taskId, itemId } = req.params;
    if (!mongoose.isValidObjectId(taskId) || !mongoose.isValidObjectId(itemId)) return reject(404, "Deliverable not found");

    const task = await Task.findById(taskId).select("assignedTo contractId clientId deliverables");
    if (!task) return reject(404, "Task not found");
    if (!isManager(req.user) && String(task.assignedTo || "") !== String(req.user.id)) {
      return reject(403, "Only the person assigned to this task (or an admin / manager) can add proof");
    }
    const item = task.deliverables.id(itemId);
    if (!item) return reject(404, "Deliverable not found");

    const rawLink = typeof req.body.link === "string" ? req.body.link.trim() : "";
    const url = rawLink ? normalizeLink(rawLink) : null;
    if (rawLink && !url) return reject(400, "Enter a valid link, e.g. https://instagram.com/p/…");
    if (!files.length && !url) return reject(400, "Add a screenshot / photo or a live link");
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 300) : "";
    // The month this proof is for (monthly items; defaults to the current one).
    const period = isPeriodic(item.frequency) ? String(req.body.period || monthKey(Date.now())) : WHOLE_CONTRACT;
    if (period !== WHOLE_CONTRACT && (!PERIOD_RE.test(period) || period > latestAllowedMonth())) {
      return reject(400, "Invalid month for this proof");
    }

    const existing = await DeliverableProof.countDocuments({ taskId, taskItemId: itemId });
    const adding = files.length + (url ? 1 : 0);
    if (existing + adding > MAX_PROOFS_PER_ITEM) {
      return reject(400, `A deliverable can have up to ${MAX_PROOFS_PER_ITEM} proofs (${Math.max(0, MAX_PROOFS_PER_ITEM - existing)} left)`);
    }

    // Any image format: JPG/PNG/WebP kept, the rest converted to JPEG. Replaced
    // in place so `reject` always cleans up whatever is on disk right now.
    for (let i = 0; i < files.length; i += 1) {
      try {
        files[i] = await images.normalize(files[i]);
      } catch {
        return reject(400, `"${files[i].originalname}" couldn't be read as an image`);
      }
    }

    // Link to the contract deliverable too, so contract-based panels find it.
    let contractDeliverableId = item.contractDeliverableId || null;
    let clientId = task.clientId || null;
    if (task.contractId && (!contractDeliverableId || !clientId)) {
      const contract = await Contract.findById(task.contractId).select("clientId deliverables");
      if (contract) {
        contractDeliverableId = contractDeliverableId || findContractDeliverable(contract, item)?._id || null;
        clientId = clientId || contract.clientId;
      }
    }

    const base = {
      taskId: task._id,
      taskItemId: item._id,
      contractId: task.contractId || undefined,
      contractDeliverableId: contractDeliverableId || undefined,
      clientId: clientId || undefined,
      deliverableTitle: item.title,
      period,
      ...(note ? { note } : {}),
      uploadedBy: req.user.id,
    };
    const docs = [
      ...files.map((f) => ({
        ...base, kind: "image", filename: f.filename, originalname: String(f.originalname || "").slice(0, 200), mimetype: f.mimetype, size: f.size,
      })),
      ...(url ? [{ ...base, kind: "link", url }] : []),
    ];
    let created;
    try {
      created = await DeliverableProof.insertMany(docs);
    } catch (insertError) {
      removeFiles(files);
      throw insertError;
    }
    const proofs = await DeliverableProof.find({ _id: { $in: created.map((d) => d._id) } }).populate(POPULATE_UPLOADER).sort({ createdAt: -1 });

    if (clientId) {
      const actor = await User.findById(req.user.id).select("name").lean().catch(() => null);
      const parts = [files.length ? `${files.length} screenshot${files.length === 1 ? "" : "s"}` : null, url ? "a live link" : null].filter(Boolean).join(" and ");
      await logActivity(clientId, "deliverable_proof_added", `${actor?.name || "A team member"} added proof (${parts}) for "${item.title}"`, {
        taskId: task._id, contractId: task.contractId,
      });
    }

    return res.status(201).json({ message: "Proof added", proofs });
  } catch (error) {
    removeFiles(files);
    console.error("Error adding deliverable proof:", error);
    return res.status(500).json({ message: error.message || "Failed to add proof" });
  }
};

/**
 * GET /api/deliverable-proofs?taskIds=a,b&contractIds=c&clientIds=d — proofs
 * for any of the given tasks / contracts / clients, newest first. Admin and
 * manager see everything; a sales person only their own clients'; a user their
 * own tasks' and assigned clients'.
 */
exports.listProofs = async (req, res) => {
  try {
    const taskIds = idList(req.query.taskIds);
    const contractIds = idList(req.query.contractIds);
    const clientIds = idList(req.query.clientIds);
    const wanted = [
      taskIds.length && { taskId: { $in: taskIds } },
      contractIds.length && { contractId: { $in: contractIds } },
      clientIds.length && { clientId: { $in: clientIds } },
    ].filter(Boolean);
    if (!wanted.length) return res.status(400).json({ message: "Pass taskIds, contractIds or clientIds" });

    const filter = { $and: [{ $or: wanted }] };
    if (req.user.role === "sales") {
      filter.$and.push({ clientId: { $in: await getOwnedClientIds(req.user) } });
    } else if (req.user.role === "user") {
      const [ownClients, ownTasks] = await Promise.all([
        getOwnedClientIds(req.user),
        Task.distinct("_id", { assignedTo: req.user.id }),
      ]);
      filter.$and.push({ $or: [{ clientId: { $in: ownClients } }, { taskId: { $in: ownTasks } }] });
    } else if (req.user.role === "salesmanager") {
      // The sales team's clients — not the ones a super admin handles personally.
      filter.$and.push({ clientId: { $in: await getOwnedClientIds(req.user) } });
    } else if (!isManager(req.user)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const proofs = await DeliverableProof.find(filter).sort({ createdAt: -1 }).limit(2000).populate(POPULATE_UPLOADER);
    return res.json({ proofs });
  } catch (error) {
    console.error("Error listing deliverable proofs:", error);
    return res.status(500).json({ message: error.message || "Failed to load proofs" });
  }
};

/** DELETE /api/deliverable-proofs/:id — the person who added it, or admin / manager. */
exports.deleteProof = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Proof not found" });
    const proof = await DeliverableProof.findById(req.params.id);
    if (!proof) return res.status(404).json({ message: "Proof not found" });
    if (!isManager(req.user) && String(proof.uploadedBy) !== String(req.user.id)) {
      return res.status(403).json({ message: "You can only remove proof you added" });
    }
    await proof.deleteOne();
    if (proof.kind === "image") images.removeFile(proof.filename);
    return res.json({ message: "Proof removed" });
  } catch (error) {
    console.error("Error removing deliverable proof:", error);
    return res.status(500).json({ message: error.message || "Failed to remove proof" });
  }
};
