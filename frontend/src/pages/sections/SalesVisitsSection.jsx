import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Navigation, LogOut as EndIcon, History, Loader2, ShieldCheck, ImagePlus } from "lucide-react";
import { getAllClients } from "../../services/clientApi";
import {
  checkInClientVisit, checkOutClientVisit, getMyClientVisits, getCurrentLocation, mapUrl, canEditVisitPhotos,
} from "../../services/clientVisitApi";
import { T, Modal } from "./shared";
import { VisitPhotoManager, PhotoStrip, PhotoLightbox } from "./VisitPhotos";
import { Card, Chip, Empty, th, td } from "./salesUi";
import { fmtDateTime, fmtTime, fmtDuration, visitMinutes, hasFix, clientLabel } from "./visitFormat";

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
  background: T.inputBg, color: T.textPrimary, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
};

const primaryBtn = (disabled) => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
  padding: "13px 18px", border: "none", borderRadius: 12, fontSize: 14.5, fontWeight: 700, fontFamily: "inherit",
  color: "#fff", background: disabled ? "#fbbf77" : "linear-gradient(135deg, #f7931e, #e8590c)",
  cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 6px 16px rgba(247,147,30,.28)",
});

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary, marginBottom: 6 }}>{children}</div>;
}

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 13 }}>
      {children}
    </div>
  );
}

function FixLink({ fix, label }) {
  if (!hasFix(fix)) return <span style={{ color: T.textMuted, fontSize: 12 }}>{label}: not shared</span>;
  return (
    <a href={mapUrl(fix.lat, fix.lng)} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#2563eb", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
      <MapPin size={12} /> {label}{Number.isFinite(fix.accuracy) ? ` ±${fix.accuracy} m` : ""}
    </a>
  );
}

// ─── Open meeting ─────────────────────────────────────────────────────────
function OpenMeetingCard({ visit, onEnded, onUpdated }) {
  const [outcome, setOutcome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const end = async () => {
    setBusy(true);
    setError("");
    let fix = null;
    try {
      fix = await getCurrentLocation();
    } catch (err) {
      // Don't trap the sales person in an open meeting if location fails on
      // the way out — let them end it explicitly without a check-out fix.
      if (!window.confirm(`${err.message}\n\nEnd the meeting without sharing your location?`)) {
        setBusy(false);
        return;
      }
    }
    try {
      const { data } = await checkOutClientVisit(visit._id, { ...(fix || {}), outcome });
      onEnded(data.visit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't end the meeting. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: T.card, border: `1.5px solid ${T.brandMid}`, borderRadius: 18, padding: 20, boxShadow: "0 8px 24px rgba(247,147,30,.10)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ea580c", boxShadow: "0 0 0 4px rgba(234,88,12,.18)" }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: 0.5 }}>Meeting in progress</span>
      </div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, color: T.textPrimary }}>{clientLabel(visit.clientId)}</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: T.textSecondary }}>
        <span>Started {fmtTime(visit.checkIn?.at)}</span>
        <span style={{ fontWeight: 700, color: T.textPrimary }}>{fmtDuration(visitMinutes(visit, now))}</span>
        <FixLink fix={visit.checkIn} label="Location shared" />
      </div>
      {visit.purpose && <div style={{ marginTop: 8, fontSize: 13, color: T.textSecondary }}>Purpose: {visit.purpose}</div>}

      <div style={{ marginTop: 16 }}>
        <VisitPhotoManager visit={visit} onUpdated={onUpdated} />
      </div>

      <div style={{ marginTop: 16 }}>
        <Label>Meeting outcome (optional)</Label>
        <textarea
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What was discussed, next steps…"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      <div style={{ marginTop: 14 }}>
        <button type="button" style={primaryBtn(busy)} onClick={end} disabled={busy}>
          {busy ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <EndIcon size={17} />}
          {busy ? "Getting your location…" : "End meeting & share location"}
        </button>
      </div>
      <ErrorNote>{error}</ErrorNote>
    </div>
  );
}

// ─── Start meeting ────────────────────────────────────────────────────────
function StartMeetingCard({ clients, onStarted, initialClientId = "", initialPurpose = "" }) {
  const [clientId, setClientId] = useState(initialClientId);
  const [purpose, setPurpose] = useState(initialPurpose);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sorted = useMemo(
    () => [...clients].sort((a, b) => clientLabel(a).localeCompare(clientLabel(b))),
    [clients]
  );

  const start = async () => {
    if (!clientId) return;
    setBusy(true);
    setError("");
    try {
      const fix = await getCurrentLocation();
      const { data } = await checkInClientVisit({ clientId, purpose, ...fix });
      setPurpose("");
      onStarted(data.visit);
    } catch (err) {
      // 409 = already in a meeting: show that one instead of an error.
      if (err.response?.status === 409 && err.response.data?.visit) {
        onStarted(err.response.data.visit);
        return;
      }
      setError(err.response?.data?.message || err.message || "Couldn't start the meeting. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.brandLight, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Navigation size={16} color={T.brand} />
        </div>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary }}>Start a client meeting</div>
          <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>Share your location when you arrive at the client</div>
        </div>
      </div>

      {clients.length === 0 ? (
        <Empty>You don't have any clients yet. Clients assigned to you will appear here.</Empty>
      ) : (
        <>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <Label>Client</Label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle}>
                <option value="">Select the client you're meeting…</option>
                {sorted.map((c) => (
                  <option key={c._id} value={c._id}>
                    {clientLabel(c)}{c.companyName && c.clientName ? ` — ${c.clientName}` : ""}{c.city ? ` (${c.city})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Purpose (optional)</Label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                maxLength={500}
                placeholder="e.g. Renewal discussion, demo, payment follow-up"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="button" style={primaryBtn(busy || !clientId)} onClick={start} disabled={busy || !clientId}>
              {busy ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={17} />}
              {busy ? "Getting your location…" : "Share location & start meeting"}
            </button>
          </div>
          <ErrorNote>{error}</ErrorNote>
        </>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────
export default function SalesVisitsSection() {
  // Opened from a booked meeting ("Start visit") → client + purpose prefilled.
  const [searchParams] = useSearchParams();
  const presetClient = searchParams.get("client") || "";
  const presetPurpose = searchParams.get("purpose") || "";
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(null);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [clientsRes, visitsRes] = await Promise.all([getAllClients(), getMyClientVisits(50)]);
      setClients(clientsRes.data.clients || []);
      setOpen(visitsRes.data.open || null);
      setVisits(visitsRes.data.visits || []);
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't load your meetings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upsertVisit = (visit) =>
    setVisits((prev) => [visit, ...prev.filter((v) => v._id !== visit._id)]);
  // Photo changes: update the row in place (don't reorder the history).
  const replaceVisit = (visit) => {
    setVisits((prev) => prev.map((v) => (v._id === visit._id ? visit : v)));
    setOpen((o) => (o && o._id === visit._id ? visit : o));
  };
  const [now] = useState(() => Date.now());
  const [photoVisitId, setPhotoVisitId] = useState(null);
  const [viewer, setViewer] = useState(null); // { visit, index }
  const photoVisit = visits.find((v) => v._id === photoVisitId);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: T.textPrimary, margin: 0 }}>Client Meetings</h1>
        <p style={{ fontSize: 13, color: T.textSecondary, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldCheck size={14} color={T.green} />
          Your location is only taken when you tap the button — never in the background.
        </p>
      </div>

      {loadError && <ErrorNote>{loadError}</ErrorNote>}

      <div style={{ maxWidth: 620 }}>
        {loading && !open && !clients.length ? (
          <Empty Icon={Loader2}>Loading…</Empty>
        ) : open ? (
          <OpenMeetingCard
            key={open._id}
            visit={open}
            onEnded={(visit) => { setOpen(null); upsertVisit(visit); }}
            onUpdated={replaceVisit}
          />
        ) : (
          <StartMeetingCard
            key={presetClient}
            initialClientId={clients.some((c) => c._id === presetClient) ? presetClient : ""}
            initialPurpose={presetPurpose}
            clients={clients}
            onStarted={(visit) => { setOpen(visit); upsertVisit(visit); }}
          />
        )}
      </div>

      <Card Icon={History} iconColor="#2563eb" iconBg="#dbeafe" title="My recent meetings" subtitle="Your last 50 check-ins">
        {visits.length === 0 ? (
          <Empty>No client meetings yet</Empty>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={th()}>Date</th>
                  <th style={th()}>Client</th>
                  <th style={th()}>Duration</th>
                  <th style={th()}>Location</th>
                  <th style={th()}>Photos</th>
                  <th style={th()}>Status</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr key={v._id}>
                    <td style={td({ whiteSpace: "nowrap", color: T.textSecondary })}>{fmtDateTime(v.checkIn?.at)}</td>
                    <td style={td()}>
                      <div style={{ fontWeight: 600, color: T.textPrimary }}>{clientLabel(v.clientId)}</div>
                      {(v.outcome || v.purpose) && (
                        <div style={{ fontSize: 11.5, color: T.textMuted, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.outcome || v.purpose}>
                          {v.outcome || v.purpose}
                        </div>
                      )}
                    </td>
                    <td style={td({ whiteSpace: "nowrap", color: T.textSecondary })}>
                      {v.status === "completed" ? fmtDuration(visitMinutes(v)) : "—"}
                    </td>
                    <td style={td()}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <FixLink fix={v.checkIn} label="Check-in" />
                        {v.status === "completed" && <FixLink fix={v.checkOut} label="Check-out" />}
                      </div>
                    </td>
                    <td style={td()}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                        <PhotoStrip visit={v} size={30} onOpen={(index) => setViewer({ visit: v, index })} />
                        {v.status === "completed" && canEditVisitPhotos(v, now) && (
                          <button type="button" onClick={() => setPhotoVisitId(v._id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "none", color: T.brand, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                            <ImagePlus size={12} /> {v.photos?.length ? "Add / manage" : "Add photos"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={td()}><Chip label={v.status === "completed" ? "Completed" : "In Meeting"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {photoVisit && (
        <Modal title={`Photos — ${clientLabel(photoVisit.clientId)}`} onClose={() => setPhotoVisitId(null)} width={560}>
          <VisitPhotoManager visit={photoVisit} onUpdated={replaceVisit} />
        </Modal>
      )}
      {viewer && (
        <PhotoLightbox
          visit={visits.find((v) => v._id === viewer.visit._id) || viewer.visit}
          startIndex={viewer.index}
          title={`${clientLabel(viewer.visit.clientId)} · ${fmtDateTime(viewer.visit.checkIn?.at)}`}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
