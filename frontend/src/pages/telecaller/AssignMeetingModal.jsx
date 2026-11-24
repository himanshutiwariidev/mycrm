import React, { useState } from "react";
import { toast } from "sonner";
import { UserCheck, AlertTriangle } from "lucide-react";
import { assignMeeting } from "../../services/telecallingApi";
import { Modal, Field, Btn, fmtWhen } from "./teleUi";

/**
 * Sales manager (or super admin): give a telecaller-booked meeting to a sales
 * person, or move it to another one. When the client already belongs to a
 * different sales person, the server answers 409 and we ask before moving the
 * client along with the meeting.
 */
export default function AssignMeetingModal({ meeting, salesPeople, onClose, onAssigned }) {
  const clientOwner = meeting.clientId?.salesPerson;
  const current = meeting.salesPerson?._id;
  // Start from the client's own sales person when it has one (and it isn't already them).
  const [salesPersonId, setSalesPersonId] = useState(
    clientOwner?._id && clientOwner._id !== current ? clientOwner._id : ""
  );
  const [ownerConflict, setOwnerConflict] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const chosen = salesPeople.find((s) => s._id === salesPersonId);

  const submit = async (moveClient = false) => {
    if (!salesPersonId) { setError("Choose a sales person"); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await assignMeeting(meeting._id, { salesPersonId, moveClient });
      toast.success(data.message);
      onAssigned?.(data.meeting);
    } catch (err) {
      if (err.response?.status === 409) setOwnerConflict(err.response.data.currentOwner);
      else setError(err.response?.data?.message || "Couldn't assign the meeting");
    } finally {
      setSaving(false);
    }
  };

  const name = meeting.company || meeting.contactName;

  return (
    <Modal
      title={current ? "Reassign meeting" : "Assign meeting"}
      subtitle={<><strong style={{ color: "#0f172a" }}>{name}</strong> · {fmtWhen(meeting.meetingDate)}{meeting.createdBy?.name ? ` · booked by ${meeting.createdBy.name}` : ""}</>}
      Icon={UserCheck}
      tone="#7c3aed"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          {ownerConflict ? (
            <Btn variant="primary" onClick={() => submit(true)} disabled={saving}>{saving ? "Assigning…" : `Move client & assign to ${chosen?.name || "them"}`}</Btn>
          ) : (
            <Btn variant="primary" Icon={UserCheck} onClick={() => submit(false)} disabled={saving || !salesPersonId}>{saving ? "Assigning…" : "Assign"}</Btn>
          )}
        </>
      }
    >
      <Field label="Sales person" required hint={clientOwner?.name ? `This client is ${clientOwner.name}'s.` : "A new client goes to the person you choose."}>
        <select
          className="tc-input"
          value={salesPersonId}
          onChange={(e) => { setSalesPersonId(e.target.value); setOwnerConflict(null); }}
          data-assign-select
          autoFocus
        >
          <option value="">Select…</option>
          {salesPeople.map((s) => (
            <option key={s._id} value={s._id} disabled={s._id === current}>
              {s.name}{s._id === current ? " (assigned now)" : ""}{s._id === clientOwner?._id ? " — client's sales person" : ""}
            </option>
          ))}
        </select>
      </Field>

      {meeting.description && (
        <div className="tc-meeting-note" style={{ marginTop: 12 }}><strong style={{ color: "#0f172a" }}>Agenda:</strong> {meeting.description}</div>
      )}

      {ownerConflict && (
        <div role="alert" data-owner-conflict style={{ display: "flex", gap: 10, marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: 13 }}>
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {name} is <strong>{ownerConflict.name}</strong>&apos;s client. Assigning this meeting to {chosen?.name} also moves the client
            (with its contracts and payments) to {chosen?.name}.
          </span>
        </div>
      )}
      {error && <div role="alert" style={{ marginTop: 14, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "9px 12px" }}>{error}</div>}
    </Modal>
  );
}
