import React, { useEffect, useMemo } from "react";
import {
  BadgeCheck, BadgeIndianRupee, Building2, Calendar, Camera, CreditCard, Droplet, FileText,
  Landmark, MapPin, Phone, PhoneCall, Briefcase,
} from "lucide-react";
import { FieldIcon, FormField, T, baseInp, baseInpNoIcon } from "./shared";
import { uploadedFileUrl } from "../../utils/uploads";

export default function UserProfileFields({ form, setForm, existingPhoto }) {
  const previewUrl = useMemo(() => (form.photoFile ? URL.createObjectURL(form.photoFile) : ""), [form.photoFile]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const photoSrc = previewUrl || (existingPhoto ? uploadedFileUrl("user-photos", existingPhoto) : "");

  return (
    <>
      <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 16, padding: "12px 14px", borderRadius: 12, background: T.inputBg, border: `1px solid ${T.borderLight}` }}>
        <div
          style={{
            width: 68, height: 84, borderRadius: 10, flexShrink: 0, overflow: "hidden",
            border: `1.5px dashed ${photoSrc ? T.border : T.brand}`, background: "#fff",
            display: "grid", placeItems: "center", color: T.textMuted,
          }}
        >
          {photoSrc ? (
            <img src={photoSrc} alt="Passport preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <Camera size={20} strokeWidth={1.8} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>Passport Size Photo</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2, marginBottom: 8 }}>JPG, PNG, WebP or HEIC (auto-resized for ID card)</div>
          <label
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8,
              border: `1.5px solid ${T.border}`, background: "#fff", color: T.textPrimary,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            <Camera size={13} /> {photoSrc ? "Change Photo" : "Upload Photo"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setForm((prev) => ({ ...prev, photoFile: file }));
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>

      <FormField label="Employee ID / Code">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={BadgeCheck} />
          <input className="inp" style={baseInp} type="text" placeholder="e.g. Emp001" value={form.empCode || ""} onChange={(e) => setForm({ ...form, empCode: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Mobile No">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Phone} />
          <input className="inp" style={baseInp} type="text" placeholder="e.g. 9876543210" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Emergency Contact No">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={PhoneCall} />
          <input className="inp" style={baseInp} type="text" placeholder="e.g. 9811223344" value={form.emergencyContact || ""} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Blood Group">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Droplet} />
          <select className="inp" style={{ ...baseInp, appearance: "none" }} value={form.bloodGroup || ""} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
            <option value="">Select blood group</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>
      </FormField>

      <FormField label="Designation">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Briefcase} />
          <input className="inp" style={baseInp} type="text" placeholder="e.g. Senior Executive" value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Department">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Building2} />
          <input className="inp" style={baseInp} type="text" placeholder="e.g. Sales / Marketing" value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Date of Joining (DOJ)">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Calendar} />
          <input className="inp" style={baseInp} type="date" value={form.doj || ""} onChange={(e) => setForm({ ...form, doj: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Salary (₹)">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={BadgeIndianRupee} />
          <input className="inp" style={baseInp} type="number" min="0" placeholder="e.g. 35000" value={form.salary ?? ""} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
        </div>
      </FormField>

      <FormField label="PAN Number">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={CreditCard} />
          <input className="inp" style={{ ...baseInp, textTransform: "uppercase" }} type="text" placeholder="e.g. ABCDE1234F" maxLength={20} value={form.pan || ""} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
        </div>
      </FormField>

      <FormField label="Aadhar Number">
        <div style={{ position: "relative" }}>
          <FieldIcon icon={FileText} />
          <input className="inp" style={baseInp} type="text" placeholder="e.g. 1234 5678 9012" maxLength={24} value={form.aadhar || ""} onChange={(e) => setForm({ ...form, aadhar: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Bank Account" span2>
        <div style={{ position: "relative" }}>
          <FieldIcon icon={Landmark} />
          <input className="inp" style={baseInp} type="text" placeholder="Account number / IFSC / Bank name" value={form.bankAccount || ""} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Address" span2>
        <div style={{ position: "relative" }}>
          <FieldIcon icon={MapPin} />
          <input className="inp" style={baseInp} type="text" placeholder="Full residential address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
      </FormField>

      <FormField label="Remarks" span2>
        <textarea className="inp" style={{ ...baseInpNoIcon, minHeight: 68, resize: "vertical" }} placeholder="Any additional notes or remarks..." value={form.remarks || ""} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
      </FormField>
    </>
  );
}
