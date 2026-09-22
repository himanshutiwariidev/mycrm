import React, { useState, useEffect } from "react";
import { createClient, updateClient, getUsersByRole } from "../services/clientApi";
import "./ClientForm.css";

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
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [salesUsers, setSalesUsers] = useState([]);
  const [salesUsersLoading, setSalesUsersLoading] = useState(true);
  // "Other" lets a name that isn't in the sales-user list be typed directly
  // instead of picked from the dropdown.
  const [useOtherSalesPerson, setUseOtherSalesPerson] = useState(false);

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
        salesPerson: client.salesPerson?._id || client.salesPerson || client.salesPersonName || "",
        password: "",
      });
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Clearing email disables the password field below — clear any
      // already-typed password too, so a disabled input never shows a
      // stale value that isn't actually going to be submitted.
      ...(name === "email" && !value ? { password: "" } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // leadSource/clientType are optional enum fields on the backend — an empty
    // string isn't a valid enum value, so omit them entirely when left blank.
    const payload = { ...formData };
    if (!payload.leadSource) delete payload.leadSource;
    if (!payload.clientType) delete payload.clientType;
    if (!payload.salesPerson) delete payload.salesPerson;
    // Email is optional — an empty string would fail the backend's email
    // format validator (which only runs when the field is actually present),
    // so omit it entirely rather than sending "".
    if (!payload.email) delete payload.email;
    // Portal login is keyed on email — the password field is disabled in the
    // UI while email is blank, but guard here too in case a password was
    // typed before the email field was cleared.
    if (!formData.email) delete payload.password;
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
      if (client?._id) {
        await updateClient(client._id, payload);
      } else {
        await createClient(payload);
      }
      alert(client?._id ? "Client updated successfully" : "Client onboarded successfully");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="client-form-container">
      <h2>{client?._id ? "Edit Client" : "Onboard New Client"}</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="client-form">
        <div className="form-row">
            <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Enter company name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              
              placeholder="Enter email"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="Enter phone number"
            />
          </div>
          <div className="form-group">
            <label>Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              required
              placeholder="Enter client name"
            />
          </div>
        
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sales Person *</label>
            {isSalesUser ? (
              <input type="text" value={userName || "You"} disabled readOnly />
            ) : useOtherSalesPerson ? (
              <>
                <input
                  type="text"
                  name="salesPerson"
                  value={formData.salesPerson}
                  onChange={handleChange}
                  placeholder="Other"
                  autoFocus
                />
                <small
                  style={{ color: "#f7931e", fontSize: 12, cursor: "pointer", display: "inline-block", marginTop: 4 }}
                  onClick={() => {
                    setUseOtherSalesPerson(false);
                    setFormData((prev) => ({ ...prev, salesPerson: "" }));
                  }}
                >
                  ← Choose from list instead
                </small>
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
          </div>
          <div className="form-group">
            <label>Lead Source</label>
            <select name="leadSource" value={formData.leadSource} onChange={handleChange}>
              <option value="">Select lead source</option>
              <option value="cold call">Cold Call</option>
              <option value="visit">Visit</option>
              <option value="self">Self</option>
              <option value="telecaller">Telecaller</option>
              <option value="client reference">Client Reference</option>
              <option value="company reference">Company Reference</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Client Type</label>
            <select name="clientType" value={formData.clientType} onChange={handleChange}>
              <option value="">Select client type</option>
              <option value="pvt ltd">Pvt Ltd</option>
              <option value="ltd">Ltd</option>
              <option value="llp">LLP</option>
              <option value="huf">HUF</option>
              <option value="proprietor">Proprietor</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Deals In *</label>
            <select name="projectType" value={formData.projectType} onChange={handleChange} required>
              <option value="service">Service</option>
              <option value="product">Product</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Client Status</label>
            <select name="activeStatus" value={formData.activeStatus} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Dead</option>
            </select>
            <small style={{ color: "#6b7280", fontSize: 12 }}>
              Mark past clients as "Dead" when adding historical records.
            </small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>TAN No.</label>
            <input
              type="text"
              name="tanNo"
              value={formData.tanNo}
              onChange={handleChange}
              placeholder="Enter TAN No."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="Enter contact person name"
            />
          </div>
          <div className="form-group">
            <label>Designation</label>
            <input
              type="text"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              placeholder="Enter designation"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter address"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter state"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Enter country"
            />
          </div>
          <div className="form-group">
            <label>Zip Code</label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              placeholder="Enter zip code"
            />
          </div>
          <div className="form-group">
            <label>GST No.</label>
            <input
              type="text"
              name="gstNo"
              value={formData.gstNo}
              onChange={handleChange}
              placeholder="Enter Gst No."
            />
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Add any additional notes"
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Client Login Password {client?.hasLoginAccess && "(leave blank to keep unchanged)"}</label>
          <input
            type="text"
            name="password"
            value={formData.password}
            onChange={handleChange}
            minLength={6}
            disabled={!formData.email}
            placeholder={
              !formData.email
                ? "Add an email above to enable portal login"
                : client?.hasLoginAccess
                ? "Set a new password to reset"
                : "Set a password so this client can log in and view their project"
            }
          />
          <small style={{ color: "#6b7280", fontSize: 12 }}>
            {!formData.email
              ? "Portal login is tied to the client's email — add one to set a password."
              : "Must be at least 6 characters. Setting a password creates a login account for this client (role: client) so they can sign in on the main login page and see only their own project, deliverables, and payments."}
          </small>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? "Saving..." : client?._id ? "Update Client" : "Onboard Client"}
          </button>
          <button type="button" onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
