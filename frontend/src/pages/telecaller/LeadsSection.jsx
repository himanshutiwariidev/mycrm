import React, { useCallback, useEffect, useState } from "react";
import { Search, UserPlus, Phone, PhoneCall, Pencil, Users, BellRing } from "lucide-react";
import { getLeads } from "../../services/telecallingApi";
import { CALL_OUTCOMES, LEAD_STATUS } from "../../config/telecalling";
import { SectionCard, Badge, Btn, Avatar, EmptyState, fmtAgo, fmtWhen, isOverdue } from "./teleUi";

const FILTERS = ["all", "due", "new", "follow-up", "interested", "meeting-scheduled", "converted", "not-interested", "unreachable"];

export default function LeadsSection({ initialFilter = "all", onLogCall, onAddLead, onEditLead, refreshKey }) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState({ leads: [], statusCounts: {}, total: 0 });
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { q: debounced || undefined };
      if (filter === "due") params.due = "today";
      else if (filter !== "all") params.status = filter;
      const [res, due] = await Promise.all([getLeads(params), getLeads({ due: "today" })]);
      setData(res.data);
      setDueCount(due.data.leads.length);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load leads");
    } finally {
      setLoading(false);
    }
  }, [filter, debounced]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const countFor = (f) => (f === "all" ? data.total : f === "due" ? dueCount : data.statusCounts[f] || 0);
  const labelFor = (f) => (f === "all" ? "All leads" : f === "due" ? "Due today" : LEAD_STATUS[f].label);

  return (
    <div className="tc-page">
      <div className="tc-head">
        <div>
          <h1>My Leads</h1>
          <p>Your calling list — log every call so nothing slips.</p>
        </div>
        <div className="tc-head-actions">
          <Btn Icon={UserPlus} onClick={onAddLead}>Add lead</Btn>
        </div>
      </div>

      <SectionCard>
        <div className="tc-toolbar">
          <div className="tc-search">
            <Search size={15} />
            <input className="tc-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, company, phone, city…" aria-label="Search leads" />
          </div>
          <span style={{ fontSize: 12.5, color: "#94a3b8" }}>{loading ? "Loading…" : `${data.leads.length} shown`}</span>
        </div>

        <div className="tc-chips" role="tablist">
          {FILTERS.filter((f) => f === "all" || f === "due" || countFor(f) > 0 || filter === f).map((f) => (
            <button key={f} type="button" className={`tc-chip${filter === f ? " active" : ""}`} onClick={() => setFilter(f)} role="tab" aria-selected={filter === f}>
              {f === "due" && <BellRing size={12} />}
              {labelFor(f)} <span className="tc-chip-count">{countFor(f)}</span>
            </button>
          ))}
        </div>

        {error && <div role="alert" style={{ marginBottom: 12, color: "#dc2626", fontSize: 13 }}>{error}</div>}

        {!loading && data.leads.length === 0 ? (
          <EmptyState
            Icon={filter === "due" ? BellRing : Users}
            title={filter === "due" ? "No follow-ups due" : debounced ? "No leads match your search" : "No leads here yet"}
            text={filter === "due" ? "Great — you're on top of your calls." : "Add the people you're going to call."}
            action={filter !== "due" && <Btn size="sm" Icon={UserPlus} onClick={onAddLead}>Add lead</Btn>}
          />
        ) : (
          <div className="tc-table-wrap">
            <table className="tc-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Last call</th>
                  <th>Next follow-up</th>
                  <th style={{ textAlign: "center" }}>Calls</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((lead) => {
                  const last = lead.lastOutcome && CALL_OUTCOMES[lead.lastOutcome];
                  const overdue = isOverdue(lead.nextFollowUpAt);
                  return (
                    <tr key={lead._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar name={lead.name} />
                          <div style={{ minWidth: 0 }}>
                            <div className="tc-cell-main">{lead.name}</div>
                            <div className="tc-cell-sub">{[lead.company, lead.city].filter(Boolean).join(" · ") || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td><a className="tc-phone" href={`tel:${lead.phone}`}><Phone size={13} /> {lead.phone}</a></td>
                      <td><Badge meta={LEAD_STATUS[lead.status]} /></td>
                      <td>
                        {last ? (
                          <>
                            <Badge meta={last} size="sm">{last.short || last.label}</Badge>
                            <div className="tc-cell-sub" style={{ marginTop: 3 }}>{fmtAgo(lead.lastCallAt)}</div>
                          </>
                        ) : <span className="tc-cell-sub">Not called yet</span>}
                      </td>
                      <td>
                        {lead.nextFollowUpAt ? (
                          <span style={{ fontWeight: 600, fontSize: 12.5, color: overdue ? "#dc2626" : "#0f172a" }}>
                            {fmtWhen(lead.nextFollowUpAt)}{overdue && <span className="tc-cell-sub" style={{ color: "#dc2626" }}> · overdue</span>}
                          </span>
                        ) : <span className="tc-cell-sub">—</span>}
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#0f172a" }}>{lead.callCount || 0}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button type="button" className="tc-icon-btn" onClick={() => onEditLead(lead)} aria-label={`Edit ${lead.name}`} title="Edit lead"><Pencil size={15} /></button>
                          <Btn size="sm" Icon={PhoneCall} onClick={() => onLogCall(lead)}>Log call</Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
