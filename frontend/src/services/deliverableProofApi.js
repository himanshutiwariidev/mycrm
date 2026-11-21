import API from "./api";
import { uploadedFileUrl } from "../utils/uploads";

/**
 * Proof of work on deliverables (screenshots / photos and live links).
 * Added by the task's assignee (or admin / manager) when updating progress;
 * visible to admin, manager, the client's sales person and the assignee.
 */
export const MAX_PROOF_FILES_PER_UPLOAD = 6;

const joinIds = (ids) => (ids && ids.length ? ids.join(",") : undefined);

export const listDeliverableProofs = ({ taskIds, contractIds, clientIds } = {}) =>
  API.get("/deliverable-proofs", {
    params: { taskIds: joinIds(taskIds), contractIds: joinIds(contractIds), clientIds: joinIds(clientIds) },
  });

/** Adds screenshots (`files`) and/or a live `link` to one task deliverable; `onProgress` gets 0–100. */
export function addDeliverableProofs(taskId, itemId, { files = [], link = "", note = "", period } = {}, onProgress) {
  const form = new FormData();
  if (period) form.append("period", period);
  files.forEach((file) => form.append("files", file, file.name));
  if (link) form.append("link", link);
  if (note) form.append("note", note);
  return API.post(`/deliverable-proofs/tasks/${taskId}/items/${itemId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
  });
}

export const deleteDeliverableProof = (proofId) => API.delete(`/deliverable-proofs/${proofId}`);

export const proofImageUrl = (proof) => uploadedFileUrl("deliverable-proofs", proof.filename);
