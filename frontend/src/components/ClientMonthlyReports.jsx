/* eslint-disable react-refresh/only-export-components */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Icons from "lucide-react";
import { CheckCircle2, Download, ExternalLink, FileBarChart2, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import {
  REPORT_FILE_ACCEPT, addClientReport, deleteClientReport, downloadClientReport, listClientReports,
} from "../services/clientReportApi";
import { getCategoryMeta } from "../features/contract-builder/config/serviceCategories";
import MonthFilter from "./MonthFilter";
import { addMonths, currentMonthKey, monthLabel, taskContractMonths } from "../utils/taskPeriods";

const C = {
  text: "#0f172a", sub: "#475569", muted: "#94a3b8", border: "#e8eaf0", soft: "#f8f9fc",
  green: "#16a34a", greenBg: "#dcfce7", red: "#dc2626", redBg: "#fef2f2", amber: "#b45309", amberBg: "#fef3c7", blue: "#2563eb",
};

// Short names people use for the main services.
const SERVICE_ALIAS = { rankingOptimization: "SEO", socialMedia: "SMO", googleMyBusiness: "GMB" };
export const serviceName = (categoryId) => {
  const label = getCategoryMeta(categoryId)?.label || categoryId;
  return SERVICE_ALIAS[categoryId] ? `${label} (${SERVICE_ALIAS[categoryId]})` : label;
};

const FORMAT_BADGE = {
  pdf: { label: "PDF", color: "#dc2626" },
  doc: { label: "DOC", color: "#2563eb" },
  docx: { label: "DOC", color: "#2563eb" },
  xls: { label: "XLS", color: "#16a34a" },
  xlsx: { label: "XLS", color: "#16a34a" },
  csv: { label: "CSV", color: "#0d9488" },
};
const badgeFor = (r) => (r.kind === "file"
  ? FORMAT_BADGE[r.format] || { label: "FILE", color: "#64748b" }
  : /docs\.google\.com\/spreadsheets/.test(r.url) ? { label: "SHEET", color: "#16a34a" } : { label: "LINK", color: "#64748b" });

/** "1 Oct – 31 Oct 2026" */
function periodRange(key) {
  const [y, m] = key.split("-").map(Number);
  const mon = new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
  return `1 ${mon} – ${new Date(y, m, 0).getDate()} ${mon} ${y}`;
}

/** Is the service's contract running in month `key`? */
function activeIn(service, key) {
  const range = taskContractMonths({ contractId: service });
  if (!range || key < range.startKey) return false;
  return !range.count || key <= addMonths(range.startKey, range.count - 1);
}

const serviceKey = (s) => `${s.contractId}:${s.categoryId}`;

function me() {
  try { return { role: localStorage.getItem("role") || "", userId: localStorage.getItem("userId") || "" }; } catch { return { role: "", userId: "" }; }
}

// The super admin only views reports; the assigned user, sales person and
// manager add them. A manager can remove any; others only what they added.
const VIEW_ONLY_ROLES = ["admin", "salesmanager"];

function canDelete(report) {
  const { role, userId } = me();
  if (VIEW_ONLY_ROLES.includes(role)) return false;
  return role === "manager" || String(report.uploadedBy?._id || report.uploadedBy) === userId;
}

// ─── One service in the selected month ────────────────────────────────────
function ServiceRow({ clientId, service, period, reports, onAdded, onRemoved, isPast, canAdd }) {
  const [busy, setBusy] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const fileRef = useRef(null);
  const meta = getCategoryMeta(service.categoryId);
  const Icon = Icons[meta?.icon] || Icons.Package;
  const status = reports.length
    ? { label: `Received · ${reports.length}`, color: C.green, bg: C.greenBg }
    : isPast ? { label: "Missing", color: C.red, bg: C.redBg } : { label: "Due at month end", color: C.amber, bg: C.amberBg };

  const add = async (payload) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await addClientReport({ clientId, contractId: service.contractId, categoryId: service.categoryId, period, ...payload });
      onAdded(data.report);
      setLink("");
      setLinkOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't add the report");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Remove this report?")) return;
    setRemovingId(r._id);
    try {
      await deleteClientReport(r._id);
      onRemoved(r._id);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't remove it");
    } finally {
      setRemovingId(null);
    }
  };

  const open = async (r) => {
    if (r.kind === "link") { window.open(r.url, "_blank", "noopener,noreferrer"); return; }
    try { await downloadClientReport(r); } catch { setError("Couldn't download the file"); }
  };

  const btn = (dark) => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
    fontFamily: "inherit", cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, whiteSpace: "nowrap",
    border: dark ? "none" : `1.5px solid ${C.border}`, background: dark ? C.text : "#fff", color: dark ? "#fff" : C.text,
  });

  return (
    <div data-report-row style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: "#fff4e6", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon size={16} color="#f7931e" />
        </span>
        <div style={{ flex: "1 1 140px", minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{serviceName(service.categoryId)} report</div>
          <div style={{ fontSize: 11.5, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {periodRange(period)} · {service.projectName}{service.contractNumber ? ` (${service.contractNumber})` : ""}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: status.color, background: status.bg, padding: "3px 9px", borderRadius: 99, whiteSpace: "nowrap" }}>{status.label}</span>
        {canAdd && (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" style={btn(true)} disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={13} />} Upload file
            </button>
            <button type="button" style={btn(false)} disabled={busy} onClick={() => setLinkOpen((v) => !v)}>
              <Link2 size={13} /> Google Sheet
            </button>
            <input ref={fileRef} type="file" accept={REPORT_FILE_ACCEPT} hidden
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) add({ file: f }); }} />
          </div>
        )}
      </div>

      {linkOpen && (
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the Google Sheet link — https://docs.google.com/spreadsheets/…"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (link.trim()) add({ link: link.trim() }); } }}
            style={{ flex: 1, minWidth: 0, padding: "8px 11px", borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 12.5, fontFamily: "inherit", outline: "none" }} />
          <button type="button" style={btn(true)} disabled={busy || !link.trim()} onClick={() => add({ link: link.trim() })}>Add link</button>
        </div>
      )}
      {error && <div role="alert" style={{ marginTop: 8, fontSize: 12, color: C.red }}>{error}</div>}

      {reports.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {reports.map((r) => {
            const b = badgeFor(r);
            const name = r.kind === "file" ? r.originalname : (() => { try { return new URL(r.url).hostname.replace(/^www\./, ""); } catch { return r.url; } })();
            return (
              <div key={r._id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 6px", border: `1px solid ${C.border}`, borderRadius: 10, background: C.soft, maxWidth: "100%" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: b.color, borderRadius: 5, padding: "3px 6px", flexShrink: 0 }}>{b.label}</span>
                <button type="button" onClick={() => open(r)} title={r.kind === "file" ? "Download" : r.url}
                  style={{ border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: C.blue }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{name}</span>
                    {r.kind === "file" ? <Download size={12} /> : <ExternalLink size={12} />}
                  </span>
                  <span style={{ display: "block", fontSize: 10.5, color: C.muted }}>
                    {r.uploadedBy?.name || "Team member"} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </button>
                {canDelete(r) && (
                  <button type="button" onClick={() => remove(r)} disabled={removingId === r._id} aria-label="Remove report" title="Remove"
                    style={{ border: "none", background: "none", color: C.muted, cursor: "pointer", padding: 2, display: "flex" }}>
                    {removingId === r._id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Monthly reports for one client: pick a month, see each contract service's
 * report for it (received / missing), upload a file or add a Google Sheet,
 * and a month-by-month overview below. Used on the client page and, as a
 * dialog, from the task cards.
 */
export default function ClientMonthlyReports({ clientId, canAdd: canAddProp = true }) {
  const canAdd = canAddProp && !VIEW_ONLY_ROLES.includes(me().role);
  const [services, setServices] = useState([]);
  const [reports, setReports] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    listClientReports(clientId)
      .then(({ data }) => { if (!cancelled) { setServices(data.services || []); setReports(data.reports || []); setLoaded(true); } })
      .catch((err) => { if (!cancelled) { setError(err.response?.data?.message || "Couldn't load reports"); setLoaded(true); } });
    return () => { cancelled = true; };
  }, [clientId]);

  const current = currentMonthKey();
  // Every month (up to now) in which at least one service's contract runs.
  const months = [];
  if (services.length) {
    const first = services.map((s) => taskContractMonths({ contractId: s })?.startKey).filter(Boolean).sort()[0];
    for (let k = first; k && k <= current && months.length < 120; k = addMonths(k, 1)) {
      if (services.some((s) => activeIn(s, k))) months.push(k);
    }
  }
  // Default: last month (the report people usually prepare now), else this month.
  const previous = addMonths(current, -1);
  const defaultMonth = months.includes(previous) ? previous : months[months.length - 1];
  const selected = month && months.includes(month) ? month : defaultMonth;

  const reportsFor = (s, key) => reports.filter((r) => String(r.contractId) === String(s.contractId) && r.categoryId === s.categoryId && r.period === key);
  const history = [...months].reverse();
  const visibleHistory = showAllHistory ? history : history.slice(0, 6);

  if (!loaded) return <div style={{ padding: 18, fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 8 }}><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Loading reports…</div>;
  if (error) return <div role="alert" style={{ padding: 14, fontSize: 13, color: C.red }}>{error}</div>;
  if (!services.length || !selected) {
    return (
      <div style={{ padding: "26px 0", textAlign: "center", fontSize: 13, color: C.muted, border: `1.5px dashed ${C.border}`, borderRadius: 12 }}>
        No contract services yet — monthly reports appear here once the client has a contract.
      </div>
    );
  }

  const active = services.filter((s) => activeIn(s, selected));
  // Several contracts can carry the same service, so the history columns say which one.
  const multiContract = new Set(services.map((s) => String(s.contractId))).size > 1;
  const receivedCount = active.filter((s) => reportsFor(s, selected).length).length;

  return (
    <div data-client-reports style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{periodRange(selected)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{receivedCount} of {active.length} service report{active.length === 1 ? "" : "s"} received · PDF, Word, Excel, CSV or Google Sheet</div>
        </div>
        <MonthFilter value={selected} onChange={setMonth} months={months} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
        {active.map((s) => (
          <ServiceRow
            key={`${serviceKey(s)}:${selected}`}
            clientId={clientId}
            service={s}
            period={selected}
            reports={reportsFor(s, selected)}
            isPast={selected < current}
            canAdd={canAdd}
            onAdded={(r) => setReports((prev) => [r, ...prev])}
            onRemoved={(id) => setReports((prev) => prev.filter((r) => r._id !== id))}
          />
        ))}
      </div>

      {history.length > 1 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "9px 12px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", background: C.soft }}>Report history</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 360 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "7px 12px", fontSize: 11, color: C.muted, fontWeight: 700 }}>Month</th>
                  {services.map((s) => (
                    <th key={serviceKey(s)} style={{ textAlign: "center", padding: "7px 10px", fontSize: 11, color: C.muted, fontWeight: 700, whiteSpace: "nowrap" }} title={s.projectName}>
                      {SERVICE_ALIAS[s.categoryId] || getCategoryMeta(s.categoryId)?.label || s.categoryId}
                      {multiContract && (
                        <span style={{ display: "block", fontSize: 10, fontWeight: 600, color: "#cbd5e1", marginTop: 1 }}>{s.contractNumber || s.projectName}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((k) => (
                  <tr key={k} onClick={() => setMonth(k)} style={{ cursor: "pointer", background: k === selected ? "#fff7ed" : undefined, borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "7px 12px", fontWeight: k === selected ? 700 : 500, color: C.text, whiteSpace: "nowrap" }}>{monthLabel(k, true)}</td>
                    {services.map((s) => {
                      if (!activeIn(s, k)) return <td key={serviceKey(s)} style={{ textAlign: "center", color: "#cbd5e1" }}>·</td>;
                      const n = reportsFor(s, k).length;
                      return (
                        <td key={serviceKey(s)} style={{ textAlign: "center", padding: "7px 10px" }}>
                          {n ? <CheckCircle2 size={15} color={C.green} style={{ verticalAlign: "middle" }} />
                            : k < current ? <span style={{ fontSize: 11, fontWeight: 700, color: C.red }}>Missing</span>
                              : <span style={{ fontSize: 11, color: C.muted }}>Due</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.length > 6 && (
            <button type="button" onClick={() => setShowAllHistory((v) => !v)}
              style={{ width: "100%", padding: 8, border: "none", borderTop: `1px solid ${C.border}`, background: "#fff", color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {showAllHistory ? "Show fewer months" : `Show all ${history.length} months`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The same, in a dialog — opened from a contract task card. */
export function ClientReportsDialog({ clientId, clientName, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Monthly reports" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "min(860px, 100%)", maxHeight: "calc(100vh - 32px)", overflowY: "auto", background: "#fff", borderRadius: 18, boxShadow: "0 24px 80px rgba(0,0,0,.2)", border: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: "#fff4e6", display: "grid", placeItems: "center" }}><FileBarChart2 size={17} color="#f7931e" /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Monthly reports</div>
            <div style={{ fontSize: 12.5, color: C.sub }}>{clientName}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 20px 20px" }}>
          <ClientMonthlyReports clientId={clientId} />
        </div>
      </div>
    </div>,
    document.body
  );
}
