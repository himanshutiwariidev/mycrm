import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";

/**
 * Full-screen image viewer (meeting photos, deliverable work proof).
 * `items`: [{ key, src, alt?, caption?, chips?: [{ label, color }], meta? }].
 * Rendered into <body>: the dashboards' animated wrappers (and modals) use
 * transforms, which would otherwise trap a position:fixed overlay inside them.
 */
export default function ImageLightbox({ items = [], startIndex = 0, title, label = "Photos", onClose }) {
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(items.length - 1, 0)));
  const item = items[index];
  const count = items.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % count);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, onClose]);

  if (!item) return null;
  const navBtn = (side) => ({
    position: "absolute", top: "50%", [side]: 14, transform: "translateY(-50%)", width: 42, height: 42, borderRadius: "50%",
    border: "none", background: "rgba(255,255,255,.14)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer",
  });

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={label} onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,.88)", display: "flex", flexDirection: "column", animation: "fadeIn .15s ease" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", color: "#fff", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title || label}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 3 }}>
            {(item.chips || []).map((c) => (
              <span key={c.label} style={{ padding: "2px 8px", borderRadius: 99, background: c.color || "#64748b", color: "#fff", fontWeight: 600 }}>{c.label}</span>
            ))}
            {item.meta && <span>{item.meta}</span>}
            <span>{index + 1} / {count}</span>
          </div>
        </div>
        <a href={item.src} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 12.5, fontWeight: 600, textDecoration: "none", padding: "7px 11px", borderRadius: 9, background: "rgba(255,255,255,.14)" }}>
          <ExternalLink size={13} /> Full size
        </a>
        <button type="button" onClick={onClose} aria-label="Close"
          style={{ width: 36, height: 36, borderRadius: 9, border: "none", background: "rgba(255,255,255,.14)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 64px" }}>
        <img
          key={item.key}
          src={item.src}
          alt={item.alt || item.caption || ""}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,.4)", background: "#0f172a" }}
        />
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous photo" style={navBtn("left")} onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + count) % count); }}><ChevronLeft size={22} /></button>
            <button type="button" aria-label="Next photo" style={navBtn("right")} onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % count); }}><ChevronRight size={22} /></button>
          </>
        )}
      </div>

      <div onClick={(e) => e.stopPropagation()} style={{ padding: "10px 16px 16px", textAlign: "center" }}>
        {item.caption && <div style={{ color: "#fff", fontSize: 13.5, marginBottom: 10 }}>{item.caption}</div>}
        {count > 1 && (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", overflowX: "auto", paddingBottom: 2 }}>
            {items.map((p, i) => (
              <button key={p.key} type="button" onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`}
                style={{ padding: 0, border: `2px solid ${i === index ? "#fff" : "transparent"}`, borderRadius: 8, overflow: "hidden", width: 52, height: 52, flexShrink: 0, cursor: "pointer", opacity: i === index ? 1 : 0.6, background: "#0f172a" }}>
                <img src={p.src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
