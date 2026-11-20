import React, { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Pencil } from "lucide-react";
import { createLead, updateLead } from "../../services/telecallingApi";
import { LEAD_SOURCES } from "../../config/telecalling";
import { Modal, Field, Btn } from "./teleUi";

const EMPTY = { name: "", phone: "", company: "", email: "", city: "", source: "cold list", requirement: "" };

/** Add a lead to the calling list, or edit one (pass `lead`). */
export default function LeadFormModal({ lead, onClose, onSaved }) {
  const editing = !!lead;
  const [form, setForm] = useState(() => (lead ? { ...EMPTY, ...lead } : EMPTY));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone number are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name: form.name, phone: form.phone, company: form.company, email: form.email, city: form.city, source: form.source, requirement: form.requirement };
      const { data } = editing ? await updateLead(lead._id, payload) : await createLead(payload);
      toast.success(editing ? "Lead updated" : "Lead added to your list");
      onSaved?.(data.lead);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save the lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={editing ? "Edit lead" : "Add a new lead"}
      subtitle={editing ? lead.name : "Add someone to your calling list"}
      Icon={editing ? Pencil : UserPlus}
      tone="#f7931e"
      onClose={onClose}
      width={600}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add lead"}</Btn>
        </>
      }
    >
      <form className="tc-form-grid" onSubmit={submit}>
        <Field label="Full name" required>
          <input className="tc-input" value={form.name} onChange={set("name")} placeholder="e.g. Anil Mehta" autoFocus maxLength={120} />
        </Field>
        <Field label="Phone number" required>
          <input className="tc-input" value={form.phone} onChange={set("phone")} placeholder="98765 43210" inputMode="tel" maxLength={20} />
        </Field>
        <Field label="Company / business">
          <input className="tc-input" value={form.company} onChange={set("company")} placeholder="e.g. Mehta Traders" maxLength={160} />
        </Field>
        <Field label="City">
          <input className="tc-input" value={form.city} onChange={set("city")} placeholder="e.g. Pune" maxLength={80} />
        </Field>
        <Field label="Email">
          <input className="tc-input" type="email" value={form.email} onChange={set("email")} placeholder="optional" maxLength={160} />
        </Field>
        <Field label="Lead source">
          <select className="tc-input" value={form.source} onChange={set("source")}>
            {LEAD_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Requirement" span2 hint="What are they looking for? Helps the sales team prepare.">
          <textarea className="tc-input" value={form.requirement} onChange={set("requirement")} placeholder="e.g. New website + Google ads for 2 outlets" maxLength={1000} />
        </Field>
        {error && <div role="alert" style={{ gridColumn: "1 / -1", color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "9px 12px" }}>{error}</div>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
