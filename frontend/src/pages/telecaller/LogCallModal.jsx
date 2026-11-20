import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { PhoneCall, Phone, CalendarPlus, CalendarClock, Clock } from "lucide-react";
import { logCall, getSalesPeople } from "../../services/telecallingApi";
import {
  CALL_OUTCOMES, CONNECTED_OUTCOMES, NOT_CONNECTED_OUTCOMES, FOLLOW_UP_OUTCOMES, MEETING_MODES, LEAD_STATUS,
} from "../../config/telecalling";
import { Modal, Field, Btn, Badge, QuickTimes, toLocalInput, fmtAgo } from "./teleUi";

function OutcomeTile({ k, selected, onSelect }) {
  const o = CALL_OUTCOMES[k];
  return (
    <button
      type="button"
      className={`tc-outcome${selected ? " selected" : ""}`}
      style={selected ? { borderColor: o.color, background: o.bg, "--tc-tone-ring": `${o.color}22` } : undefined}
      onClick={() => onSelect(k)}
      aria-pressed={selected}
    >
      <span className="tc-outcome-icon" style={{ background: selected ? "#fff" : o.bg, color: o.color }}><o.Icon size={15} strokeWidth={2.3} /></span>
      <span className="tc-outcome-label">{o.label}</span>
    </button>
  );
}

/**
 * Log a call on a lead: pick the outcome, note what the client said, plan
 * the follow-up — and when they agree to meet, book the meeting for a sales
 * person right here (it then shows up in the sales person's and admin's panels).
 */
export default function LogCallModal({ lead, onClose, onLogged }) {
  const [outcome, setOutcome] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [meeting, setMeeting] = useState({ date: "", mode: "in-person", location: "", salesPersonId: "", agenda: lead.requirement || "", projectType: "service" });
  const [salesPeople, setSalesPeople] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const meta = CALL_OUTCOMES[outcome];
  const isMeeting = outcome === "meeting-scheduled";
  const wantsFollowUp = FOLLOW_UP_OUTCOMES.includes(outcome);

  useEffect(() => {
    getSalesPeople().then(({ data }) => setSalesPeople(data.salesPeople || [])).catch(() => setSalesPeople([]));
  }, []);

  const setM = (key) => (e) => setMeeting((m) => ({ ...m, [key]: e.target?.value ?? e }));

  const submit = async () => {
    if (!outcome) { setError("Choose how the call went"); return; }
    if (isMeeting) {
      if (!meeting.date) { setError("Pick the meeting date and time"); return; }
      if (!meeting.salesPersonId) { setError("Assign a sales person for the meeting"); return; }
      if (meeting.mode === "in-person" && !meeting.location.trim()) { setError("Add the meeting address"); return; }
    }
    setSaving(true);
    setError("");
    try {
      const durationSec = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
      const { data } = await logCall(lead._id, {
        outcome,
        durationSec: meta?.connected ? durationSec : 0,
        notes,
        followUpAt: wantsFollowUp && followUpAt ? new Date(followUpAt).toISOString() : undefined,
        meeting: isMeeting ? { ...meeting, date: new Date(meeting.date).toISOString() } : undefined,
      });
      toast.success(data.message);
      if (data.reassignedTo) {
        toast.info(`Assigned to ${data.reassignedTo} — this number is already their client`, { duration: 6000 });
      }
      onLogged?.(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the call");
    } finally {
      setSaving(false);
    }
  };

  const status = LEAD_STATUS[lead.status];
  const modeMeta = MEETING_MODES[meeting.mode];

  return (
    <Modal
      title="Log call"
      subtitle={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ color: "#0f172a" }}>{lead.name}</strong>
          {lead.company && <span>· {lead.company}</span>}
          {status && <Badge meta={status} size="sm" />}
          {lead.callCount > 0 && <span>· {lead.callCount} previous call{lead.callCount === 1 ? "" : "s"}, last {fmtAgo(lead.lastCallAt)}</span>}
        </span>
      }
      Icon={PhoneCall}
      tone="#16a34a"
      onClose={onClose}
      width={720}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant={isMeeting ? "success" : "primary"} Icon={isMeeting ? CalendarPlus : undefined} onClick={submit} disabled={saving || !outcome}>
            {saving ? "Saving…" : isMeeting ? "Book meeting & save call" : "Save call"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 16, padding: "10px 12px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
        <span style={{ fontSize: 13, color: "#166534" }}>Dial, talk, then record how it went.</span>
        <a href={`tel:${lead.phone}`} className="tc-btn tc-btn-success tc-btn-sm" style={{ textDecoration: "none" }}>
          <Phone size={14} /> Call {lead.phone}
        </a>
      </div>

      <div className="tc-outcome-group">
        <div className="tc-outcome-group-title">Connected</div>
        <div className="tc-outcomes">
          {CONNECTED_OUTCOMES.map((k) => <OutcomeTile key={k} k={k} selected={outcome === k} onSelect={setOutcome} />)}
        </div>
      </div>
      <div className="tc-outcome-group">
        <div className="tc-outcome-group-title">Not connected</div>
        <div className="tc-outcomes">
          {NOT_CONNECTED_OUTCOMES.map((k) => <OutcomeTile key={k} k={k} selected={outcome === k} onSelect={setOutcome} />)}
        </div>
      </div>

      {outcome && (
        <div className="tc-form-grid" style={{ marginTop: 18 }}>
          {meta.connected && (
            <Field label="Call duration">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input className="tc-input" type="number" min="0" max="240" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="0" aria-label="Minutes" style={{ width: 80 }} />
                <span style={{ fontSize: 12.5, color: "#64748b" }}>min</span>
                <input className="tc-input" type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="0" aria-label="Seconds" style={{ width: 80 }} />
                <span style={{ fontSize: 12.5, color: "#64748b" }}>sec</span>
              </div>
            </Field>
          )}
          {wantsFollowUp && (
            <Field label="Next follow-up" hint="You'll see this lead in Follow-ups due at this time.">
              <input className="tc-input" type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
              <QuickTimes onPick={(d) => setFollowUpAt(toLocalInput(d))} />
            </Field>
          )}
          <Field label={meta.connected ? "What did the client say?" : "Notes"} span2>
            <textarea
              className="tc-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              placeholder={meta.connected ? "Their response, objections, budget, decision maker…" : "Optional"}
            />
          </Field>
        </div>
      )}

      {isMeeting && (
        <div className="tc-panel" style={{ marginTop: 18 }}>
          <div className="tc-panel-title"><CalendarClock size={16} color="#7c3aed" /> Book the meeting</div>
          <div className="tc-form-grid">
            <Field label="Date & time" required>
              <input className="tc-input" type="datetime-local" value={meeting.date} onChange={setM("date")} min={toLocalInput(new Date())} />
              <QuickTimes onPick={(d) => setMeeting((m) => ({ ...m, date: toLocalInput(d) }))} options={["tomorrow", "tomorrow4", "3d", "week"]} />
            </Field>
            <Field label="Assign to sales person" required>
              <select className="tc-input" value={meeting.salesPersonId} onChange={setM("salesPersonId")}>
                <option value="">Select…</option>
                {salesPeople.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
              {!salesPeople.length && <span className="tc-field-hint">No active sales people found — ask the admin to add one.</span>}
            </Field>
            <Field label="Meeting type" span2>
              <div className="tc-segmented" role="radiogroup">
                {Object.entries(MEETING_MODES).map(([k, m]) => (
                  <button key={k} type="button" className={meeting.mode === k ? "active" : ""} onClick={() => setMeeting((s) => ({ ...s, mode: k }))} aria-pressed={meeting.mode === k}>
                    <m.Icon size={14} /> {m.label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={modeMeta.locationLabel} required={meeting.mode === "in-person"} span2>
              <input className="tc-input" value={meeting.location} onChange={setM("location")} placeholder={modeMeta.placeholder} maxLength={300} />
            </Field>
            <Field label="Interested in">
              <select className="tc-input" value={meeting.projectType} onChange={setM("projectType")}>
                <option value="service">Services</option>
                <option value="product">Product</option>
              </select>
            </Field>
            <Field label="Agenda for the sales person">
              <input className="tc-input" value={meeting.agenda} onChange={setM("agenda")} placeholder="e.g. Website + SEO proposal" maxLength={1000} />
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", marginTop: 12 }}>
            <Clock size={13} /> The lead becomes a client of the chosen sales person and appears in their Meetings tab.
          </div>
        </div>
      )}

      {error && <div role="alert" style={{ marginTop: 14, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "9px 12px" }}>{error}</div>}
    </Modal>
  );
}
