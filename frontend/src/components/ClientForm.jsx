import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  UserRound, Building2, MapPin, NotebookPen, ChevronDown, FileSignature, Save, Loader2,
} from "lucide-react";
import { createClient, updateClient, getUsersByRole } from "../services/clientApi";
import { CLIENT_CATEGORIES } from "../config/clientCategories";
import "./ClientForm.css";
import "./ClientFormSections.css";

const LEAD_SOURCES = [
  { value: "cold call", label: "Cold Call" },
  { value: "visit", label: "Visit" },
  { value: "self", label: "Self" },
  { value: "telecaller", label: "Telecaller" },
  { value: "client reference", label: "Client Reference" },
  { value: "company reference", label: "Company Reference" },
  { value: "other", label: "Other" },
];

const CLIENT_TYPES = [
  { value: "pvt ltd", label: "Pvt Ltd" },
  { value: "ltd", label: "Ltd" },
  { value: "llp", label: "LLP" },
  { value: "huf", label: "HUF" },
  { value: "proprietor", label: "Proprietor" },
  { value: "other", label: "Other" },
];

const labelOf = (list, value) => list.find((o) => o.value === value)?.label;

/** One-tap choice chips (click the active chip again to clear an optional choice). */
function Chips({ options, value, onChange, allowClear = true }) {
  return (
    <div className="cf-chips" role="radiogroup">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`cf-chip${active ? " active" : ""}`}
            onClick={() => onChange(active && allowClear ? "" : o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Collapsible group of fields; the header shows what's already filled. */
function Section({ id, Icon, title, summary, open, onToggle, optional = true, children }) {
  return (
    <section className={`cf-section${open ? " open" : ""}`}>
      <button type="button" className="cf-section-head" onClick={() => onToggle(id)} aria-expanded={open}>
        <span className="cf-section-icon"><Icon size={16} strokeWidth={2.2} /></span>
        <span className="cf-section-titles">
          <span className="cf-section-title">
            {title}
            {optional && <span className="cf-optional">Optional</span>}
          </span>
          {!open && <span className="cf-section-summary">{summary || "Not filled yet — click to add"}</span>}
        </span>
        <ChevronDown size={17} className="cf-chevron" />
      </button>
      {open && <div className="cf-section-body">{children}</div>}
    </section>
  );
}

const Field = ({ label, required, hint, full, children }) => (
  <div className={`cf-field${full ? " full" : ""}`}>
    <label>{label}{required && <em> *</em>}</label>
    {children}
    {hint && <small>{hint}</small>}
  </div>
);

/**
 * Add / edit a client. Every field is kept, but grouped: the essentials are
 * always visible, everything else sits in labelled sections that show what's
 * filled (and open automatically when editing a client that has data there).
 * For a new client, "Save & create contract" goes straight to the contract
 * builder via onSuccess(savedClient, "contract").
 */
const ClientForm = ({ client, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    email: "",
    phone: "",
    companyName: "",
    gstNo: "",
    tanNo: "",
    salesPerson: "",
    leadSource: "",
    clientType: "",
    businessCategory: "",
    projectType: "service",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
    contactPerson: "",
    designation: "",
    status: "open",
    // "active" for current/ongoing clients, "inactive" (labeled "Dead" in the
    // UI) for past clients — lets old clients be entered into the CRM as
    // historical records instead of implying they're still being worked.
    activeStatus: "active",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [submitIntent, setSubmitIntent] = useState("save");
  const [error, setError] = useState("");
  const [salesUsers, setSalesUsers] = useState([]);
  const [salesUsersLoading, setSalesUsersLoading] = useState(true);
  // "Other" lets a name that isn't in the sales-user list be typed directly
  // instead of picked from the dropdown.
  const [useOtherSalesPerson, setUseOtherSalesPerson] = useState(false);
  const isEdit = !!client?._id;
  const [openSections, setOpenSections] = useState(() => new Set());

  // A logged-in Sales Person is always force-assigned to their own new
  // clients on the backend (see createClient), regardless of what this form
  // submits — so for them the field is locked to their own name instead of
  // offering a choice that would silently be overridden.
  const userRole = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const userName = localStorage.getItem("userName");
  const isSalesUser = userRole === "sales";

  useEffect(() => {
    if (client) {
      setFormData({
        ...client,
        businessCategory: client.businessCategory || "",
        salesPerson: client.salesPerson?._id || client.salesPerson || client.salesPersonName || "",
      });
      // Editing: open every section that already has something in it.
      const has = (...keys) => keys.some((k) => client[k]);
      setOpenSections(new Set([
        has("clientType", "leadSource", "gstNo", "tanNo") || client.activeStatus === "inactive" ? "business" : null,
        has("address", "city", "state", "country", "zipCode") ? "address" : null,
        has("notes") ? "notes" : null,
      ].filter(Boolean)));
    } else if (isSalesUser) {
      setFormData((prev) => ({ ...prev, salesPerson: userId || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  useEffect(() => {
    // Sales Persons can't reassign a client to anyone else, so there's no
    // need to fetch the full list for them.
    if (isSalesUser) {
      setSalesUsersLoading(false);
      return undefined;
    }

    let isMounted = true;
    getUsersByRole("sales")
      .then((res) => {
        if (!isMounted) return;
        const users = res.data || [];
        setSalesUsers(users);
        // Editing a client whose sales person is a typed name (not one of
        // these users) — switch straight to the "Other" text input instead
        // of silently showing an empty dropdown.
        setFormData((prev) => {
          if (prev.salesPerson && !users.some((u) => u._id === prev.salesPerson)) {
            setUseOtherSalesPerson(true);
          }
          return prev;
        });
      })
      .catch(() => {
        if (isMounted) setSalesUsers([]);
      })
      .finally(() => {
        if (isMounted) setSalesUsersLoading(false);
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setValue = (name, value) => setFormData((prev) => ({ ...prev, [name]: value }));
  const handleChange = (e) => setValue(e.target.name, e.target.value);

  const toggleSection = (id) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSubmit = async (e, intent = "save") => {
    e?.preventDefault();
    if (!formData.clientName?.trim() || !formData.phone?.trim()) {
      setError("Client name and phone number are required.");
      return;
    }
    setSubmitIntent(intent);
    setLoading(true);
    setError("");

    // leadSource/clientType are optional enum fields on the backend — an empty
    // string isn't a valid enum value, so omit them entirely when left blank.
    const payload = { ...formData };
    if (!payload.leadSource) delete payload.leadSource;
    if (!payload.clientType) delete payload.clientType;
    // Category is optional too: omit when blank — or, when editing a client
    // that had one, send null so clearing it actually clears it.
    if (!payload.businessCategory) {
      if (isEdit && client?.businessCategory) payload.businessCategory = null;
      else delete payload.businessCategory;
    }
    if (!payload.salesPerson) delete payload.salesPerson;
    // Email is optional — an empty string would fail the backend's email
    // format validator (which only runs when the field is actually present),
    // so omit it entirely rather than sending "".
    if (!payload.email) delete payload.email;
    // Client portal login isn't set from this form — never send a password,
    // so an existing client's login is left exactly as it is.
    delete payload.password;
    // These are populated/relational/computed fields carried on `client` for display —
    // never echo them back on submit, or a populated object (e.g. assignedUser:{_id,name})
    // would get cast into its own ObjectId field and fail.
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.hasLoginAccess;
    delete payload.assignedUser;
    delete payload.assignedBy;
    delete payload.assignedDate;
    delete payload.remarks;
    delete payload.workProgress;
    delete payload.totalProjects;
    delete payload.totalAmount;
    delete payload.onboardedAt;

    try {
      const response = isEdit ? await updateClient(client._id, payload) : await createClient(payload);
      const saved = response?.data?.client || client;
      toast.success(isEdit ? "Client updated" : intent === "contract" ? "Client added — now set up the contract" : "Client added");
      onSuccess(saved, intent);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  // ── Collapsed-section summaries ─────────────────────────────────────────
  const join = (...parts) => parts.filter(Boolean).join(" · ");
  const businessSummary = join(
    labelOf(CLIENT_TYPES, formData.clientType),
    labelOf(LEAD_SOURCES, formData.leadSource),
    formData.activeStatus === "inactive" && "Dead",
    formData.gstNo && `GST ${formData.gstNo}`,
    formData.tanNo && `TAN ${formData.tanNo}`
  );
  const addressSummary = join(formData.address, formData.city, formData.state, formData.country, formData.zipCode);
  const notesSummary = formData.notes ? formData.notes.slice(0, 80) : "";

  return (
    <div className="client-form-container cf-container">
      <div className="cf-head">
        <h2>{isEdit ? "Edit Client" : "Add New Client"}</h2>
        <p>{isEdit ? "Update any section below." : "Only the starred fields are required — add the rest now or later."}</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={(e) => handleSubmit(e, "save")} className="cf-form" noValidate>
        {/* ── Essentials ───────────────────────────────────────────────── */}
        <section className="cf-section open cf-essentials">
          <div className="cf-section-head static">
            <span className="cf-section-icon"><UserRound size={16} strokeWidth={2.2} /></span>
            <span className="cf-section-titles"><span className="cf-section-title">Essentials</span></span>
          </div>
          <div className="cf-section-body">
            <Field label="Client Name" required>
              <input type="text" name="clientName" value={formData.clientName} onChange={handleChange} required placeholder="Full name" autoFocus={!isEdit} />
            </Field>
            <Field label="Phone" required>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required placeholder="Phone number" inputMode="tel" />
            </Field>
            <Field label="Company Name">
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Business / brand name" />
            </Field>
            <Field label="Email">
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" />
            </Field>
            <Field label="Deals In" required>
              <Chips
                options={[{ value: "service", label: "Service" }, { value: "product", label: "Product" }]}
                value={formData.projectType}
                onChange={(v) => setValue("projectType", v)}
                allowClear={false}
              />
            </Field>
            <Field label="Category">
              <select name="businessCategory" value={formData.businessCategory} onChange={handleChange}>
                <option value="">Select category</option>
                {CLIENT_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Sales Person" required>
              {isSalesUser ? (
                <input type="text" value={userName || "You"} disabled readOnly />
              ) : useOtherSalesPerson ? (
                <>
                  <input type="text" name="salesPerson" value={formData.salesPerson} onChange={handleChange} placeholder="Type the sales person's name" autoFocus />
                  <button
                    type="button"
                    className="cf-link"
                    onClick={() => {
                      setUseOtherSalesPerson(false);
                      setFormData((prev) => ({ ...prev, salesPerson: "" }));
                    }}
                  >
                    ← Choose from list instead
                  </button>
                </>
              ) : (
                <select
                  value={formData.salesPerson}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__other__") {
                      setUseOtherSalesPerson(true);
                      setFormData((prev) => ({ ...prev, salesPerson: "" }));
                    } else {
                      setFormData((prev) => ({ ...prev, salesPerson: value }));
                    }
                  }}
                  disabled={salesUsersLoading}
                >
                  <option value="">{salesUsersLoading ? "Loading sales users..." : "Select sales person"}</option>
                  {salesUsers.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                  <option value="__other__">Other</option>
                </select>
              )}
            </Field>
          </div>
        </section>

        {/* ── Business & tax ───────────────────────────────────────────── */}
        <Section id="business" Icon={Building2} title="Business & tax details" summary={businessSummary} open={openSections.has("business")} onToggle={toggleSection}>
          <Field label="Client Type">
            <select name="clientType" value={formData.clientType} onChange={handleChange}>
              <option value="">Select client type</option>
              {CLIENT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Lead Source">
            <select name="leadSource" value={formData.leadSource} onChange={handleChange}>
              <option value="">Select lead source</option>
              {LEAD_SOURCES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Client Status" hint='Mark past clients as "Dead" when adding historical records.'>
            <select name="activeStatus" value={formData.activeStatus} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Dead</option>
            </select>
          </Field>
          <Field label="GST No.">
            <input type="text" name="gstNo" value={formData.gstNo} onChange={handleChange} placeholder="e.g. 27AAAAA0000A1Z5" />
          </Field>
          <Field label="TAN No.">
            <input type="text" name="tanNo" value={formData.tanNo} onChange={handleChange} placeholder="e.g. PNEA12345B" />
          </Field>
        </Section>

        {/* ── Address ─────────────────────────────────────────────────── */}
        <Section id="address" Icon={MapPin} title="Address" summary={addressSummary} open={openSections.has("address")} onToggle={toggleSection}>
          <Field label="Address" full>
            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Street, building, area" />
          </Field>
          <Field label="City">
            <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="City" />
          </Field>
          <Field label="State">
            <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="State" />
          </Field>
          <Field label="Country">
            <input type="text" name="country" value={formData.country} onChange={handleChange} placeholder="Country" />
          </Field>
          <Field label="Zip Code">
            <input type="text" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="PIN / ZIP" inputMode="numeric" />
          </Field>
        </Section>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <Section id="notes" Icon={NotebookPen} title="Notes" summary={notesSummary} open={openSections.has("notes")} onToggle={toggleSection}>
          <Field label="Notes" full>
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Add any additional notes" rows="3" />
          </Field>
        </Section>

        <div className="cf-footer">
          <button type="button" onClick={onCancel} className="cf-btn cf-btn-ghost">Cancel</button>
          <div className="cf-footer-actions">
            <button type="submit" disabled={loading} className={`cf-btn ${isEdit ? "cf-btn-primary" : "cf-btn-secondary"}`}>
              {loading && submitIntent === "save" ? <Loader2 size={15} className="cf-spin" /> : <Save size={15} />}
              {isEdit ? "Update Client" : "Save client"}
            </button>
            {!isEdit && (
              <button type="button" disabled={loading} className="cf-btn cf-btn-primary" onClick={(e) => handleSubmit(e, "contract")}>
                {loading && submitIntent === "contract" ? <Loader2 size={15} className="cf-spin" /> : <FileSignature size={15} />}
                Save &amp; create contract
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
