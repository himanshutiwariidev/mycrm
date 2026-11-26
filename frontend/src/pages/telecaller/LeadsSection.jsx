import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, UserPlus, Phone, PhoneCall, Pencil, Users, BellRing, Upload, Download, X } from "lucide-react";
import { getLeads, importLeads } from "../../services/telecallingApi";
import { CALL_OUTCOMES, LEAD_STATUS } from "../../config/telecalling";
import { SectionCard, Badge, Btn, Avatar, EmptyState, fmtAgo, fmtWhen, isOverdue } from "./teleUi";

const FILTERS = ["all", "due", "new", "follow-up", "interested", "meeting-scheduled", "converted", "not-interested", "unreachable"];

const SAMPLE_CSV = [
  "name,phone,company,email,city,source,requirement",
  "Rahul Sharma,9876543210,Sharma Traders,rahul@sharmatraders.in,Delhi,cold list,Interested in SEO & Google Ads package",
  "Priya Verma,+91 9811223344,Verma Interiors,priya@vermainteriors.com,Mumbai,website,Needs website redesign and social media marketing",
].join("\n");

export default function LeadsSection({ initialFilter = "all", onLogCall, onAddLead, onEditLead, refreshKey }) {
  const [filter, setFilter] = useState(initialFilter);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState({ leads: [], statusCounts: {}, total: 0 });
  const [dueCount, setDueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importInputRef = useRef(null);

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

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const response = await importLeads(file);
      setImportResult({ ok: true, ...response.data.summary });
      await load();
    } catch (err) {
      setImportResult({ ok: false, message: err.response?.data?.message || "Import failed" });
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "telecaller-leads-sample.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tc-page">
      <input ref={importInputRef} type="file" accept=".csv,.xls,.xlsx,.numbers" onChange={handleImportFile} style={{ display: "none" }} />

      <div className="tc-head">
        <div>
          <h1>My Leads</h1>
          <p>Your calling list — log every call so nothing slips.</p>
        </div>
        <div className="tc-head-actions">
          <Btn variant="ghost" Icon={Download} onClick={handleDownloadSample}>Sample CSV</Btn>
          <Btn variant="secondary" Icon={Upload} onClick={() => importInputRef.current?.click()} disabled={importing}>
            {importing ? "Importing…" : "Import leads"}
          </Btn>
          <Btn Icon={UserPlus} onClick={onAddLead}>Add lead</Btn>
        </div>
      </div>

      {importResult && (
        <div
          role={importResult.ok ? "status" : "alert"}
          style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
            marginBottom: 14, padding: "12px 16px", borderRadius: 12, fontSize: 13,
            background: importResult.ok ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${importResult.ok ? "#bbf7d0" : "#fecaca"}`,
            color: importResult.ok ? "#166534" : "#991b1b",
          }}
        >
          <div>
            {importResult.ok ? (
              <>
                <strong>Import completed:</strong>{" "}
                {importResult.totalRows} rows · {importResult.leadsCreated} imported · {importResult.duplicatesSkipped} duplicates skipped · {importResult.skippedRows - importResult.duplicatesSkipped} invalid
                {importResult.errors?.length > 0 && (
                  <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                    {importResult.errors.slice(0, 5).map((e) => (
                      <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>
                    ))}
                    {importResult.errors.length > 5 && <li>+{importResult.errors.length - 5} more rows skipped</li>}
                  </ul>
                )}
              </>
            ) : (
              <><strong>Import failed:</strong> {importResult.message}</>
            )}
          </div>
          <button
            type="button"
            onClick={() => setImportResult(null)}
            aria-label="Dismiss"
            style={{ border: "none", background: "none", cursor: "pointer", color: "inherit", padding: 2 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

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
