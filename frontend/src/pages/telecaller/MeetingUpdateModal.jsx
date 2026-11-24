import React, { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2, CalendarClock, UserX, XCircle } from "lucide-react";
import { updateMeetingStatus } from "../../services/telecallingApi";
import { MEETING_OUTCOMES } from "../../config/telecalling";
import { Modal, Field, Btn, QuickTimes, toLocalInput, fmtWhen } from "./teleUi";

const ACTIONS = [
  { key: "completed", label: "Completed", Icon: CheckCircle2, color: "#16a34a", bg: "#dcfce7" },
  { key: "rescheduled", label: "Reschedule", Icon: CalendarClock, color: "#2563eb", bg: "#dbeafe" },
  { key: "no-show", label: "Client no-show", Icon: UserX, color: "#d97706", bg: "#fef3c7" },
  { key: "cancelled", label: "Cancel meeting", Icon: XCircle, color: "#64748b", bg: "#f1f5f9" },
];

/** Sales person (or admin) records what happened with a client meeting. */
export default function MeetingUpdateModal({ meeting, onClose, onUpdated }) {
  const [action, setAction] = useState("completed");
  const [outcome, setOutcome] = useState("");
  const [newDate, setNewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (action === "completed" && !outcome) { setError("Choose the meeting result"); return; }
    if (action === "rescheduled" && !newDate) { setError("Pick the new date and time"); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await updateMeetingStatus(meeting._id, {
        status: action,
        outcome: action === "completed" ? outcome : undefined,
        newDate: action === "rescheduled" ? new Date(newDate).toISOString() : undefined,
        notes,
      });
      toast.success(data.message);
      onUpdated?.(data.meeting);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update the meeting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Update meeting"
      subtitle={`${meeting.company || meeting.contactName} · ${fmtWhen(meeting.meetingDate)}`}
      Icon={ClipboardCheck}
      tone="#2563eb"
      onClose={onClose}
      width={600}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save update"}</Btn>
        </>
      }
    >
      <div className="tc-outcomes" style={{ marginBottom: 16 }}>
        {ACTIONS.map((a) => {
          const selected = action === a.key;
          return (
            <button
              key={a.key}
              type="button"
              className={`tc-outcome${selected ? " selected" : ""}`}
              style={selected ? { borderColor: a.color, background: a.bg, "--tc-tone-ring": `${a.color}22` } : undefined}
              onClick={() => { setAction(a.key); setError(""); }}
              aria-pressed={selected}
            >
              <span className="tc-outcome-icon" style={{ background: selected ? "#fff" : a.bg, color: a.color }}><a.Icon size={15} /></span>
              <span className="tc-outcome-label">{a.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tc-form-grid">
        {action === "completed" && (
          <Field label="How did it go?" required span2>
            <div className="tc-chips" style={{ marginBottom: 0 }}>
              {Object.entries(MEETING_OUTCOMES).map(([k, o]) => (
                <button
                  key={k}
                  type="button"
                  className={`tc-chip${outcome === k ? " active" : ""}`}
                  style={outcome === k ? { background: o.color, borderColor: o.color } : undefined}
                  onClick={() => setOutcome(k)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {outcome === "converted" && <span className="tc-field-hint">The client will be marked as converted — create their contract from the client page.</span>}
          </Field>
        )}
        {action === "rescheduled" && (
          <Field label="New date & time" required span2>
            <input className="tc-input" type="datetime-local" value={newDate} min={toLocalInput(new Date())} onChange={(e) => setNewDate(e.target.value)} />
            <QuickTimes onPick={(d) => setNewDate(toLocalInput(d))} options={["tomorrow", "tomorrow4", "3d", "week"]} />
          </Field>
        )}
        {action === "no-show" && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "9px 12px" }}>
            The lead goes back to the telecaller as a follow-up for tomorrow, so they can re-book.
          </div>
        )}
        <Field label={action === "completed" ? "Meeting notes" : "Reason / notes"} span2>
          <textarea className="tc-input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder={action === "completed" ? "Requirements, budget, next steps…" : "Optional"} />
        </Field>
      </div>
      {error && <div role="alert" style={{ marginTop: 12, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "9px 12px" }}>{error}</div>}
    </Modal>
  );
}
