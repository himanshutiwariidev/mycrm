import React, { useEffect, useMemo } from "react";
import {
  BadgeCheck, BadgeIndianRupee, Building2, Calendar, Camera, CreditCard, Droplet, FileText,
  Landmark, MapPin, Phone, PhoneCall, Briefcase, Upload, ExternalLink,
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

      {/* Documents Upload (Aadhar, PAN, Other Documents) */}
      <div style={{ gridColumn: "1 / -1", padding: "14px", borderRadius: 12, background: T.inputBg, border: `1px solid ${T.borderLight}`, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary, textTransform: "uppercase", letterSpacing: ".05em" }}>
          Upload KYC &amp; Documents (Saved in Employee Record)
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 6 }}>Aadhar Card (PDF / Image)</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: T.inputBg, fontSize: 12, fontWeight: 600, color: T.textPrimary, cursor: "pointer" }}>
              <Upload size={12} /> {form.aadharDocFile ? "Change File" : "Choose Aadhar"}
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setForm((prev) => ({ ...prev, aadharDocFile: file }));
                  e.target.value = "";
                }}
              />
            </label>
            {form.aadharDocFile ? (
              <div style={{ fontSize: 11.5, color: "#16a34a", marginTop: 6, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Selected: {form.aadharDocFile.name}
              </div>
            ) : form.existingAadharDoc?.filename ? (
              <a
                href={uploadedFileUrl("user-docs", form.existingAadharDoc.filename)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#2563eb", marginTop: 6, fontWeight: 600, textDecoration: "none" }}
              >
                <ExternalLink size={11} /> {form.existingAadharDoc.originalName || "View uploaded Aadhar"}
              </a>
            ) : null}
          </div>

          <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary, marginBottom: 6 }}>PAN Card (PDF / Image)</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: T.inputBg, fontSize: 12, fontWeight: 600, color: T.textPrimary, cursor: "pointer" }}>
              <Upload size={12} /> {form.panDocFile ? "Change File" : "Choose PAN"}
              <input
                type="file"
                accept=".pdf,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setForm((prev) => ({ ...prev, panDocFile: file }));
                  e.target.value = "";
                }}
              />
            </label>
            {form.panDocFile ? (
              <div style={{ fontSize: 11.5, color: "#16a34a", marginTop: 6, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Selected: {form.panDocFile.name}
              </div>
            ) : form.existingPanDoc?.filename ? (
              <a
                href={uploadedFileUrl("user-docs", form.existingPanDoc.filename)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#2563eb", marginTop: 6, fontWeight: 600, textDecoration: "none" }}
              >
                <ExternalLink size={11} /> {form.existingPanDoc.originalName || "View uploaded PAN"}
              </a>
            ) : null}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textSecondary }}>Other Documents (Offer Letter, Resume, Certificates, etc.)</div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 7, border: `1px solid ${T.border}`, background: T.inputBg, fontSize: 12, fontWeight: 600, color: T.textPrimary, cursor: "pointer" }}>
              <Upload size={12} /> Add Documents
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) {
                    setForm((prev) => ({ ...prev, otherDocFiles: [...(prev.otherDocFiles || []), ...files] }));
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {form.otherDocFiles?.length > 0 && (
            <div style={{ fontSize: 11.5, color: "#16a34a", marginTop: 6, fontWeight: 600 }}>
              {form.otherDocFiles.length} file(s) ready to upload: {form.otherDocFiles.map((f) => f.name).join(", ")}
            </div>
          )}
          {form.existingOtherDocs?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {form.existingOtherDocs.map((doc) => (
                <a
                  key={doc._id || doc.filename}
                  href={uploadedFileUrl("user-docs", doc.filename)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "#2563eb", background: "#eff6ff", padding: "3px 9px", borderRadius: 99, textDecoration: "none", fontWeight: 600 }}
                >
                  <ExternalLink size={11} /> {doc.originalName || "Document"}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
