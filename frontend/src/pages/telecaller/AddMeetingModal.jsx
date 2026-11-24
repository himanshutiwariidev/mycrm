import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, MapPin } from "lucide-react";
import { createOwnMeeting } from "../../services/telecallingApi";
import { getAllClients } from "../../services/clientApi";
import { MEETING_MODES } from "../../config/telecalling";
import { Modal, Field, Btn, toLocalInput } from "./teleUi";

const label = (c) => (c.companyName ? `${c.companyName} — ${c.clientName}` : c.clientName) + (c.city ? ` (${c.city})` : "");

/**
 * A sales person (or the sales manager) adds a client meeting themselves —
 * e.g. one they found on the spot while out at another. Existing client or a
 * new one; "Start the visit now" goes straight to the location check-in.
 * `salesPeople` (sales manager only) lets them pick who goes; default is them.
 */
export default function AddMeetingModal({ onClose, onAdded, salesPeople }) {
  const me = localStorage.getItem("userId");
  const [clients, setClients] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [clientId, setClientId] = useState("");
  const [newClient, setNewClient] = useState({ clientName: "", companyName: "", phone: "", email: "", city: "" });
  const [form, setForm] = useState({ date: toLocalInput(new Date()), mode: "in-person", location: "", agenda: "", projectType: "service", salesPersonId: me || "" });
  const [startNow, setStartNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllClients()
      .then(({ data }) => {
        const list = data.clients || [];
        setClients(list);
        if (!list.length) setIsNew(true);
      })
      .catch(() => { setClients([]); setIsNew(true); });
  }, []);

  // The sales manager sees every client; offer only those of whoever goes (or unassigned ones).
  const goer = form.salesPersonId || me;
  const choices = useMemo(() => {
    const list = (clients || []).filter((c) => !salesPeople || !c.salesPerson || String(c.salesPerson?._id || c.salesPerson) === String(goer));
    return list.sort((a, b) => label(a).localeCompare(label(b)));
  }, [clients, salesPeople, goer]);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target?.value ?? e }));
  const setN = (k) => (e) => setNewClient((n) => ({ ...n, [k]: e.target.value }));
  const goesMyself = !salesPeople || !form.salesPersonId || form.salesPersonId === me;
  const soon = Math.abs(new Date(form.date).getTime() - Date.now()) < 3 * 3600e3;
  const canStartNow = goesMyself && form.mode === "in-person" && soon;
  const modeMeta = MEETING_MODES[form.mode];

  const submit = async () => {
    if (isNew) {
      if (!newClient.clientName.trim()) { setError("Enter the client's name"); return; }
      if (newClient.phone.trim() && newClient.phone.replace(/\D/g, "").length < 10) { setError("Enter a valid phone number, or leave it empty"); return; }
    } else if (!clientId) { setError("Choose the client"); return; }
    if (!form.date) { setError("Pick the meeting date and time"); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await createOwnMeeting({
        ...(isNew ? { newClient } : { clientId }),
        date: new Date(form.date).toISOString(),
        mode: form.mode,
        location: form.location,
        agenda: form.agenda,
        projectType: form.projectType,
        ...(salesPeople ? { salesPersonId: form.salesPersonId || me } : {}),
      });
      toast.success(data.message);
      onAdded?.(data.meeting, { startVisit: canStartNow && startNow });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't add the meeting");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add a meeting"
      subtitle="A meeting you set up yourself — e.g. one you found while out at another."
      Icon={CalendarPlus}
      tone="#7c3aed"
      onClose={onClose}
      width={680}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" Icon={canStartNow && startNow ? MapPin : CalendarPlus} onClick={submit} disabled={saving} data-add-meeting-save>
            {saving ? "Saving…" : canStartNow && startNow ? "Add & start visit" : "Add meeting"}
          </Btn>
        </>
      }
    >
      {salesPeople && (
        <div style={{ marginBottom: 14 }}>
          <Field label="Who goes to the meeting">
            <select className="tc-input" value={form.salesPersonId} onChange={(e) => { setF("salesPersonId")(e); setClientId(""); }} data-add-meeting-goer>
              <option value={me}>Me</option>
              {salesPeople.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
      )}

      <div className="tc-segmented" role="radiogroup" style={{ marginBottom: 12 }}>
        <button type="button" className={!isNew ? "active" : ""} onClick={() => setIsNew(false)} aria-pressed={!isNew} disabled={clients?.length === 0}>Existing client</button>
        <button type="button" className={isNew ? "active" : ""} onClick={() => setIsNew(true)} aria-pressed={isNew} data-add-meeting-new>New client</button>
      </div>

      <div className="tc-form-grid">
        {!isNew ? (
          <Field label="Client" required span2>
            <select className="tc-input" value={clientId} onChange={(e) => setClientId(e.target.value)} data-add-meeting-client>
              <option value="">{clients === null ? "Loading clients…" : "Select the client…"}</option>
              {choices.map((c) => <option key={c._id} value={c._id}>{label(c)}</option>)}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Client name" required>
              <input className="tc-input" value={newClient.clientName} onChange={setN("clientName")} placeholder="Person you're meeting" maxLength={120} data-new-client-name />
            </Field>
            <Field label="Company">
              <input className="tc-input" value={newClient.companyName} onChange={setN("companyName")} placeholder="Business name" maxLength={200} />
            </Field>
            <Field label="Phone">
              <input className="tc-input" type="tel" value={newClient.phone} onChange={setN("phone")} placeholder="Optional — 10-digit mobile" maxLength={20} data-new-client-phone />
            </Field>
            <Field label="Email">
              <input className="tc-input" type="email" value={newClient.email} onChange={setN("email")} placeholder="Optional" maxLength={200} />
            </Field>
            <Field label="City">
              <input className="tc-input" value={newClient.city} onChange={setN("city")} placeholder="Optional" maxLength={100} />
            </Field>
            <Field label="Interested in">
              <select className="tc-input" value={form.projectType} onChange={setF("projectType")}>
                <option value="service">Services</option>
                <option value="product">Product</option>
              </select>
            </Field>
          </>
        )}

        <Field label="Date & time" required>
          <input className="tc-input" type="datetime-local" value={form.date} onChange={setF("date")} />
          <div className="tc-quick">
            <button type="button" className="tc-quick-chip" onClick={() => setForm((f) => ({ ...f, date: toLocalInput(new Date()) }))}>Now</button>
          </div>
        </Field>
        <Field label="Meeting type">
          <div className="tc-segmented" role="radiogroup">
            {Object.entries(MEETING_MODES).map(([k, m]) => (
              <button key={k} type="button" className={form.mode === k ? "active" : ""} onClick={() => setForm((f) => ({ ...f, mode: k }))} aria-pressed={form.mode === k}>
                <m.Icon size={14} /> {m.label}
              </button>
            ))}
          </div>
        </Field>
        <Field label={modeMeta.locationLabel} span2>
          <input className="tc-input" value={form.location} onChange={setF("location")} placeholder={modeMeta.placeholder} maxLength={300} />
        </Field>
        <Field label="Agenda" span2>
          <input className="tc-input" value={form.agenda} onChange={setF("agenda")} placeholder="e.g. Website + SEO requirement" maxLength={1000} />
        </Field>
      </div>

      {canStartNow && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: "#334155", cursor: "pointer" }}>
          <input type="checkbox" checked={startNow} onChange={(e) => setStartNow(e.target.checked)} data-add-meeting-start />
          Start the visit now — share my location and add photos as proof
        </label>
      )}

      {error && <div role="alert" style={{ marginTop: 14, color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "9px 12px" }}>{error}</div>}
    </Modal>
  );
}
