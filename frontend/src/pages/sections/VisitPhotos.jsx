import React, { useRef, useState } from "react";
import { Camera, ImagePlus, Images, Loader2, Lock, X } from "lucide-react";
import ImageLightbox from "../../components/ImageLightbox";
import {
  PHOTO_CATEGORIES, MAX_VISIT_PHOTOS, MAX_PHOTOS_PER_UPLOAD, PHOTO_EDIT_WINDOW_HOURS,
  addVisitPhotos, deleteVisitPhoto, visitPhotoUrl, photoCategoryLabel, canEditVisitPhotos, addedAfterMeeting, preparePhoto,
  PHOTO_ACCEPT,
} from "../../services/clientVisitApi";
import { T } from "./shared";
import { fmtDateTime } from "./visitFormat";

const CATEGORY_COLORS = {
  "with-client": "#2563eb",
  "business-card": "#7c3aed",
  premises: "#0f766e",
  other: "#64748b",
};

// ─── Full-screen viewer (sales + admin) ───────────────────────────────────
export function PhotoLightbox({ visit, startIndex = 0, title, onClose }) {
  const items = (visit?.photos || []).map((photo) => ({
    key: photo._id,
    src: visitPhotoUrl(photo),
    alt: photo.caption || photoCategoryLabel(photo.category),
    caption: photo.caption,
    chips: [
      { label: photoCategoryLabel(photo.category), color: CATEGORY_COLORS[photo.category] },
      ...(addedAfterMeeting(photo, visit) ? [{ label: "Added after the meeting", color: "#b45309" }] : []),
    ],
    meta: `Uploaded ${fmtDateTime(photo.uploadedAt)}`,
  }));
  return <ImageLightbox items={items} startIndex={startIndex} title={title || "Meeting photos"} label="Meeting photos" onClose={onClose} />;
}

// ─── Small overlapping thumbnails for tables ──────────────────────────────
export function PhotoStrip({ visit, onOpen, size = 34 }) {
  const photos = visit?.photos || [];
  if (!photos.length) return <span style={{ fontSize: 12, color: T.textMuted }}>No photos</span>;
  const shown = photos.slice(0, 3);
  return (
    <button type="button" onClick={() => onOpen(0)} title={`View ${photos.length} photo${photos.length === 1 ? "" : "s"}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: 0, border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-flex", flexShrink: 0 }}>
        {shown.map((p, i) => (
          <img key={p._id} src={visitPhotoUrl(p)} alt="" loading="lazy"
            style={{ width: size, height: size, flexShrink: 0, borderRadius: 8, objectFit: "cover", border: "2px solid #fff", marginLeft: i ? -10 : 0, boxShadow: "0 1px 3px rgba(15,23,42,.18)", background: T.inputBg }} />
        ))}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb", whiteSpace: "nowrap" }}>
        {photos.length} photo{photos.length === 1 ? "" : "s"}
      </span>
    </button>
  );
}

// ─── Sales person: add / remove photos on a meeting ──────────────────────
export function VisitPhotoManager({ visit, onUpdated }) {
  const [category, setCategory] = useState("with-client");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [now] = useState(() => Date.now());
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const photos = visit.photos || [];
  const editable = canEditVisitPhotos(visit, now);
  const room = MAX_VISIT_PHOTOS - photos.length;

  const upload = async (fileList, input) => {
    const files = Array.from(fileList || []);
    if (input) input.value = "";
    if (!files.length) return;
    if (files.length > room) {
      setError(room > 0 ? `You can add ${room} more photo${room === 1 ? "" : "s"} to this meeting (${MAX_VISIT_PHOTOS} max).` : `This meeting already has ${MAX_VISIT_PHOTOS} photos — remove one to add another.`);
      return;
    }
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const prepared = await Promise.all(files.map(preparePhoto));
      let latest = null;
      const batches = Math.ceil(prepared.length / MAX_PHOTOS_PER_UPLOAD);
      for (let b = 0; b < batches; b += 1) {
        const chunk = prepared.slice(b * MAX_PHOTOS_PER_UPLOAD, (b + 1) * MAX_PHOTOS_PER_UPLOAD);
        const { data } = await addVisitPhotos(visit._id, chunk, { category, caption: caption.trim() },
          (p) => setProgress(Math.round(((b + p / 100) / batches) * 100)));
        latest = data.visit;
      }
      if (latest) onUpdated(latest);
      setCaption("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Couldn't upload the photos. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photo) => {
    if (!window.confirm("Remove this photo?")) return;
    setRemovingId(photo._id);
    setError("");
    try {
      const { data } = await deleteVisitPhoto(visit._id, photo._id);
      onUpdated(data.visit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't remove the photo.");
    } finally {
      setRemovingId(null);
    }
  };

  const chip = (active, color) => ({
    padding: "6px 11px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    border: `1.5px solid ${active ? color : T.border}`, background: active ? `${color}14` : "#fff", color: active ? color : T.textSecondary,
  });
  const actionBtn = (primary) => ({
    flex: "1 1 150px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 14px", borderRadius: 11,
    fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: busy || !room ? "not-allowed" : "pointer", opacity: busy || !room ? 0.6 : 1,
    border: primary ? "none" : `1.5px solid ${T.border}`, background: primary ? "#0f172a" : "#fff", color: primary ? "#fff" : T.textPrimary,
  });

  return (
    <div data-visit-photos style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: "#fafbfd", padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Images size={16} color={T.brand} />
          <span style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Meeting photos</span>
          <span style={{ fontSize: 12, color: T.textMuted }}>{photos.length}/{MAX_VISIT_PHOTOS}</span>
        </div>
        {!editable && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: T.textMuted }}><Lock size={12} /> Locked</span>}
      </div>

      {editable ? (
        <>
          <p style={{ fontSize: 12.5, color: T.textSecondary, margin: "6px 0 10px" }}>
            A photo with the client, their visiting card, the office or factory — anything useful. Any photo format works (iPhone HEIC too). Your admin sees these with the visit.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }} role="radiogroup" aria-label="What's in the photo">
            {PHOTO_CATEGORIES.map((c) => (
              <button key={c.value} type="button" role="radio" aria-checked={category === c.value} onClick={() => setCategory(c.value)} style={chip(category === c.value, CATEGORY_COLORS[c.value])}>
                {c.label}
              </button>
            ))}
          </div>
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            placeholder="Caption (optional) — e.g. Mr. Sharma at the Pune plant"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`, background: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={actionBtn(true)} disabled={busy || !room} onClick={() => cameraRef.current?.click()}>
              <Camera size={16} /> Take photo
            </button>
            <button type="button" style={actionBtn(false)} disabled={busy || !room} onClick={() => galleryRef.current?.click()}>
              <ImagePlus size={16} /> Choose from gallery
            </button>
            {/* `capture` opens the camera straight away on phones (ignored on desktop). */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files, e.target)} />
            <input ref={galleryRef} type="file" accept={PHOTO_ACCEPT} multiple hidden onChange={(e) => upload(e.target.files, e.target)} />
          </div>
          {busy && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.textSecondary }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                {progress < 100 ? `Uploading… ${progress}%` : "Processing photos…"}
              </div>
              <div style={{ height: 4, borderRadius: 99, background: T.border, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: T.brand, transition: "width .2s" }} />
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ fontSize: 12.5, color: T.textMuted, margin: "6px 0 10px" }}>
          Photos can be added or removed until {PHOTO_EDIT_WINDOW_HOURS} hours after the meeting ends.
        </p>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 10, padding: "8px 11px", borderRadius: 9, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 12.5 }}>{error}</div>
      )}

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 8, marginTop: 12 }}>
          {photos.map((p, i) => (
            <div key={p._id} style={{ position: "relative", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", background: T.border }}>
              <button type="button" onClick={() => setViewerIndex(i)} aria-label={`View photo ${i + 1}`} style={{ padding: 0, border: "none", width: "100%", height: "100%", cursor: "zoom-in", display: "block" }}>
                <img src={visitPhotoUrl(p)} alt={p.caption || photoCategoryLabel(p.category)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 6px 4px", background: "linear-gradient(transparent, rgba(15,23,42,.75))", color: "#fff", fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>
                {photoCategoryLabel(p.category)}
              </span>
              {editable && (
                <button type="button" onClick={() => remove(p)} disabled={removingId === p._id} aria-label="Remove photo" title="Remove photo"
                  style={{ position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(15,23,42,.65)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                  {removingId === p._id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <X size={13} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <PhotoLightbox visit={visit} startIndex={viewerIndex} title="Meeting photos" onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
