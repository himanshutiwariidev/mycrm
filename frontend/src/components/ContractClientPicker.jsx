import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileSignature, Search, UserPlus, ChevronRight, Users } from "lucide-react";
import { getAllClients } from "../services/clientApi";
import { Modal, Avatar, EmptyState, Btn } from "../pages/telecaller/teleUi";

/**
 * "New Contract" from the clients list: pick the client (search by name,
 * company, phone, email or city) and go straight into the contract builder —
 * or add a brand-new client first.
 */
export default function ContractClientPicker({ onClose, onAddClient }) {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAllClients()
      .then((res) => setClients(res.data?.clients || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? clients.filter((c) => [c.clientName, c.companyName, c.phone, c.email, c.city].some((v) => String(v || "").toLowerCase().includes(q)))
      : clients;
    return list.slice(0, 60);
  }, [clients, query]);

  const pick = (client) => navigate(`/clients/${client._id}/contracts/new`);

  return (
    <Modal
      title="New contract"
      subtitle="Who is this contract for?"
      Icon={FileSignature}
      tone="#f7931e"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="secondary" Icon={UserPlus} onClick={onAddClient}>Add new client</Btn>
        </>
      }
    >
      <div className="tc-search" style={{ maxWidth: "none", marginBottom: 12 }}>
        <Search size={15} />
        <input
          className="tc-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, company, phone, email, city…"
          autoFocus
          aria-label="Search clients"
          onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) pick(matches[0]); }}
        />
      </div>

      {loading ? (
        <EmptyState Icon={Users} title="Loading clients…" />
      ) : matches.length === 0 ? (
        <EmptyState
          Icon={Users}
          title={query ? "No client matches" : "No clients yet"}
          text="Add the client first — you'll go straight on to the contract."
          action={<Btn size="sm" Icon={UserPlus} onClick={onAddClient}>Add new client</Btn>}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "52vh", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
          {matches.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => pick(c)}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", border: "1px solid #eef0f5", borderRadius: 12, background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#f7931e"; e.currentTarget.style.background = "#fffaf4"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#eef0f5"; e.currentTarget.style.background = "#fff"; }}
            >
              <Avatar name={c.companyName || c.clientName} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 650, color: "#0f172a", fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.companyName || c.clientName}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {[c.companyName ? c.clientName : null, c.phone, c.city].filter(Boolean).join(" · ")}
                </span>
              </span>
              <ChevronRight size={16} color="#94a3b8" />
            </button>
          ))}
          {clients.length > matches.length && !query && (
            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "6px 0 0" }}>Showing 60 of {clients.length} — search to find others.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
