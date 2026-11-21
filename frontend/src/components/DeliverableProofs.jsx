/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ExternalLink, ImagePlus, Link2, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import {
  listDeliverableProofs, addDeliverableProofs, deleteDeliverableProof, proofImageUrl, MAX_PROOF_FILES_PER_UPLOAD,
} from "../services/deliverableProofApi";
import { preparePhoto, PHOTO_ACCEPT } from "../utils/uploads";
import ImageLightbox from "./ImageLightbox";

// Self-contained colours so this works in every panel (admin, user, sales).
const C = {
  text: "#0f172a", sub: "#475569", muted: "#94a3b8", border: "#e8eaf0", soft: "#f8f9fc",
  brand: "#f7931e", blue: "#2563eb", red: "#dc2626", redBg: "#fef2f2", green: "#16a34a",
};

const fmtWhen = (v) =>
  v ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
};

/** Proofs recorded against one task deliverable (user / admin task views). */
export const proofsForTaskItem = (proofs, itemId) => proofs.filter((p) => String(p.taskItemId) === String(itemId));
/** Proofs for one contract deliverable (client page, sales dashboard). */
export const proofsForContractDeliverable = (proofs, deliverableId) =>
  proofs.filter((p) => String(p.contractDeliverableId) === String(deliverableId));

/**
 * Loads proofs for the given task / contract / client ids (re-loads when the
 * id lists change). Returns { proofs, add(newProofs), remove(id) } for
 * optimistic local updates after an upload or delete.
 */
export function useDeliverableProofs({ taskIds, contractIds, clientIds }) {
  const key = JSON.stringify([taskIds || [], contractIds || [], clientIds || []]);
  const nothingToLoad = key === "[[],[],[]]";
  const [proofs, setProofs] = useState([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const [t, c, cl] = JSON.parse(key);
    if (!t.length && !c.length && !cl.length) return undefined;
    let cancelled = false; // ignore a slow response after the ids changed
    listDeliverableProofs({ taskIds: t, contractIds: c, clientIds: cl })
      .then(({ data }) => { if (!cancelled) setProofs(data.proofs || []); })
      .catch(() => { if (!cancelled) setProofs([]); });
    return () => { cancelled = true; };
  }, [key, version]);

  const add = useCallback((added) => setProofs((prev) => [...added, ...prev]), []);
  const remove = useCallback((id) => setProofs((prev) => prev.filter((p) => p._id !== id)), []);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { proofs: nothingToLoad ? [] : proofs, add, remove, reload };
}

/** Can the current viewer delete this proof? (its uploader, or admin / manager) */
export function canDeleteProof(proof) {
  let role = "";
  let userId = "";
  try { role = localStorage.getItem("role") || ""; userId = localStorage.getItem("userId") || ""; } catch { /* ignore */ }
  return role === "admin" || role === "manager" || String(proof.uploadedBy?._id || proof.uploadedBy) === userId;
}

// ─── Compact cell / button: thumbnails + count, or "Add proof" ───────────
export function ProofButton({ proofs = [], canAdd, onClick }) {
  const images = proofs.filter((p) => p.kind === "image");
  const links = proofs.length - images.length;
  if (!proofs.length) {
    if (!canAdd) return <span style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}>No proof</span>;
    return (
      <button type="button" onClick={onClick} title="Add a screenshot or live link as proof of this work"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 7, border: `1.5px dashed #cbd5e1`, background: "#fff", color: C.sub, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        <Plus size={12} /> Add proof
      </button>
    );
  }
  return (
    <button type="button" onClick={onClick} title="View proof of work"
      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "3px 8px 3px 3px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
      {images.length > 0 ? (
        <span style={{ display: "inline-flex", flexShrink: 0 }}>
          {images.slice(0, 2).map((p, i) => (
            <img key={p._id} src={proofImageUrl(p)} alt="" loading="lazy"
              style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover", border: "1.5px solid #fff", marginLeft: i ? -8 : 0, flexShrink: 0, background: C.soft }} />
          ))}
        </span>
      ) : (
        <span style={{ width: 24, height: 24, borderRadius: 6, background: "#eff6ff", display: "grid", placeItems: "center", flexShrink: 0 }}><Link2 size={13} color={C.blue} /></span>
      )}
      <span style={{ fontSize: 11.5, fontWeight: 700, color: C.blue }}>
        {proofs.length} proof{proofs.length === 1 ? "" : "s"}
      </span>
      {links > 0 && images.length > 0 && <Link2 size={12} color={C.muted} />}
    </button>
  );
}

// ─── Dialog: view + add + remove ──────────────────────────────────────────
/**
 * `task` + `itemId` are needed only to add proof (user / admin task views);
 * without them the dialog is view-only (client page, sales dashboard).
 */
export function ProofDialog({ title, subtitle, proofs = [], task, itemId, period, canAdd, onAdded, onRemoved, onClose }) {
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const images = proofs.filter((p) => p.kind === "image");
  const links = proofs.filter((p) => p.kind === "link");
  const addable = canAdd && task && itemId;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && viewer === null) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, viewer]);

  const submit = async ({ files = [], withLink = false }) => {
    setError("");
    if (withLink && !link.trim()) { setError("Paste the live link first"); return; }
    setBusy(true);
    setProgress(0);
    try {
      const prepared = await Promise.all(files.map(preparePhoto));
      const added = [];
      const batches = Math.max(1, Math.ceil(prepared.length / MAX_PROOF_FILES_PER_UPLOAD));
      for (let b = 0; b < batches; b += 1) {
        const chunk = prepared.slice(b * MAX_PROOF_FILES_PER_UPLOAD, (b + 1) * MAX_PROOF_FILES_PER_UPLOAD);
        const { data } = await addDeliverableProofs(task._id, itemId, {
          files: chunk, link: withLink && b === 0 ? link.trim() : "", note: note.trim(), period,
        }, (p) => setProgress(Math.round(((b + p / 100) / batches) * 100)));
        added.push(...(data.proofs || []));
      }
      onAdded?.(added);
      if (withLink) setLink("");
      setNote("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't add the proof. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onFiles = (input) => {
    const files = Array.from(input.files || []);
    input.value = "";
    if (files.length) submit({ files });
  };

  const remove = async (proof) => {
    if (!window.confirm(proof.kind === "image" ? "Remove this screenshot?" : "Remove this link?")) return;
    setRemovingId(proof._id);
    setError("");
    try {
      await deleteDeliverableProof(proof._id);
      onRemoved?.(proof._id);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't remove it.");
    } finally {
      setRemovingId(null);
    }
  };

  const input = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", color: C.text };
  const btn = (dark) => ({
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
    fontFamily: "inherit", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, whiteSpace: "nowrap",
    border: dark ? "none" : `1.5px solid ${C.border}`, background: dark ? C.text : "#fff", color: dark ? "#fff" : C.text,
  });
  const by = (p) => `${p.uploadedBy?.name || "Team member"} · ${fmtWhen(p.createdAt)}`;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Proof of work" onClick={onClose} data-proof-dialog
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(640px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 24px 80px rgba(0,0,0,.2)", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "18px 20px 14px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff4e6", display: "grid", placeItems: "center", flexShrink: 0 }}><Paperclip size={17} color={C.brand} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Proof of work</div>
            <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={title}>{title}</div>
            {subtitle && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, padding: 4, display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "16px 20px 20px", display: "grid", gap: 16 }}>
          {addable && (
            <div style={{ border: `1px solid ${C.border}`, background: C.soft, borderRadius: 13, padding: 14, display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12.5, color: C.sub }}>
                Add a <b>screenshot / photo</b> of the finished work, or the <b>live link</b> (e.g. the published post). Everyone who checks deliverables can see it.
              </div>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Note (optional) — e.g. Diwali offer post, published 12 Nov" style={input} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={btn(true)} disabled={busy} onClick={() => galleryRef.current?.click()}><ImagePlus size={15} /> Upload screenshots</button>
                <button type="button" style={btn(false)} disabled={busy} onClick={() => cameraRef.current?.click()}><Camera size={15} /> Take photo</button>
                <input ref={galleryRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={(e) => onFiles(e.target)} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFiles(e.target)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste live link — https://…" style={{ ...input, flex: 1 }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit({ withLink: true }); } }} />
                <button type="button" style={btn(false)} disabled={busy} onClick={() => submit({ withLink: true })}><Link2 size={15} /> Add link</button>
              </div>
              {busy && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.sub }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  {progress < 100 ? `Uploading… ${progress}%` : "Processing…"}
                </div>
              )}
            </div>
          )}

          {error && <div role="alert" style={{ padding: "8px 11px", borderRadius: 9, background: C.redBg, color: C.red, fontSize: 12.5 }}>{error}</div>}

          {proofs.length === 0 ? (
            <div style={{ padding: "26px 0", textAlign: "center", fontSize: 13, color: C.muted, border: `1.5px dashed ${C.border}`, borderRadius: 12 }}>
              No proof added yet{addable ? " — add a screenshot or a live link above." : "."}
            </div>
          ) : (
            <>
              {images.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Screenshots / photos · {images.length}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10 }}>
                    {images.map((p, i) => (
                      <div key={p._id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: C.soft }}>
                        <button type="button" onClick={() => setViewer(i)} aria-label="View screenshot" style={{ padding: 0, border: "none", width: "100%", aspectRatio: "4 / 3", display: "block", cursor: "zoom-in", background: C.soft }}>
                          <img src={proofImageUrl(p)} alt={p.note || p.deliverableTitle || "Proof"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </button>
                        <div style={{ padding: "5px 7px", fontSize: 10.5, color: C.sub, lineHeight: 1.35 }}>
                          {p.note && <div style={{ color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.note}>{p.note}</div>}
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={by(p)}>{by(p)}</div>
                        </div>
                        {canDeleteProof(p) && (
                          <button type="button" onClick={() => remove(p)} disabled={removingId === p._id} aria-label="Remove screenshot" title="Remove"
                            style={{ position: "absolute", top: 5, right: 5, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(15,23,42,.65)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                            {removingId === p._id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <X size={13} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {links.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Live links · {links.length}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {links.map((p) => (
                      <div key={p._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", border: `1px solid ${C.border}`, borderRadius: 10 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: "#eff6ff", display: "grid", placeItems: "center", flexShrink: 0 }}><Link2 size={15} color={C.blue} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.blue, fontWeight: 700, fontSize: 13, textDecoration: "none", maxWidth: "100%" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hostOf(p.url)}</span> <ExternalLink size={12} style={{ flexShrink: 0 }} />
                          </a>
                          <div style={{ fontSize: 11.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.url}>{p.url}</div>
                          <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>{p.note ? <><b style={{ color: C.text, fontWeight: 600 }}>{p.note}</b> · </> : null}{by(p)}</div>
                        </div>
                        {canDeleteProof(p) && (
                          <button type="button" onClick={() => remove(p)} disabled={removingId === p._id} aria-label="Remove link" title="Remove"
                            style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", padding: 4, display: "flex" }}>
                            {removingId === p._id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {viewer !== null && (
        <ImageLightbox
          label="Proof of work"
          title={title}
          startIndex={viewer}
          onClose={() => setViewer(null)}
          items={images.map((p) => ({ key: p._id, src: proofImageUrl(p), caption: p.note, meta: `By ${by(p)}` }))}
        />
      )}
    </div>,
    document.body
  );
}
