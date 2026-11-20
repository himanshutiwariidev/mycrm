import React, { useCallback, useEffect, useState } from "react";
import {
  MapPin, Users, Building2, Timer, Radio, Download, RefreshCw, ChevronLeft, ChevronRight, AlertTriangle,
} from "lucide-react";
import { getUsersByRole } from "../../services/clientApi";
import { getAllClientVisits, mapUrl } from "../../services/clientVisitApi";
import { T, KpiCard, kpiGridStyle, escapeCsvValue } from "./shared";
import { Card, Chip, Empty, th, td, linkBtn } from "./salesUi";
import {
  fmtDateTime, fmtTime, fmtDuration, visitMinutes, hasFix, clientLabel, LOW_ACCURACY_METRES,
} from "./visitFormat";

const PAGE_SIZE = 50;

const RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

function rangeToDates(range) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "today": return { from: startOfToday.toISOString() };
    case "7d": return { from: new Date(startOfToday.getTime() - 6 * 86400000).toISOString() };
    case "30d": return { from: new Date(startOfToday.getTime() - 29 * 86400000).toISOString() };
    case "month": return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
    default: return {};
  }
}

const selectStyle = {
  padding: "9px 12px", background: T.inputBg, border: `1.5px solid ${T.inputBorder}`, borderRadius: 9,
  color: T.textPrimary, fontSize: 13, outline: "none", fontFamily: "inherit", minWidth: 150,
};

function FixCell({ fix, label }) {
  if (!hasFix(fix)) {
    return <span style={{ fontSize: 12, color: T.textMuted }}>{label}: not shared</span>;
  }
  const low = Number.isFinite(fix.accuracy) && fix.accuracy > LOW_ACCURACY_METRES;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <a
        href={mapUrl(fix.lat, fix.lng)}
        target="_blank"
        rel="noopener noreferrer"
        title={`${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)}`}
        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#2563eb", fontSize: 12, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}
      >
        <MapPin size={12} /> {label}
        {Number.isFinite(fix.accuracy) && <span style={{ color: T.textMuted, fontWeight: 500 }}>±{fix.accuracy} m</span>}
      </a>
      {low && <Chip label="Low accuracy" />}
    </div>
  );
}

function toCsv(visits) {
  const header = [
    "Sales Person", "Client", "Company", "City", "Status", "Check-in Time", "Check-in Lat", "Check-in Lng", "Check-in Accuracy (m)",
    "Check-out Time", "Check-out Lat", "Check-out Lng", "Duration (min)", "Purpose", "Outcome",
  ];
  const rows = visits.map((v) => [
    v.salesPerson?.name, v.clientId?.clientName, v.clientId?.companyName, v.clientId?.city,
    v.status === "completed" ? "Completed" : "In Meeting",
    v.checkIn?.at ? new Date(v.checkIn.at).toLocaleString("en-IN") : "",
    v.checkIn?.lat, v.checkIn?.lng, v.checkIn?.accuracy,
    v.checkOut?.at ? new Date(v.checkOut.at).toLocaleString("en-IN") : "",
    v.checkOut?.lat, v.checkOut?.lng,
    v.status === "completed" ? Math.round(visitMinutes(v)) : "",
    v.purpose, v.outcome,
  ]);
  return [header, ...rows].map((r) => r.map(escapeCsvValue).join(",")).join("\n");
}

export default function ClientVisitsSection() {
  const [salesPeople, setSalesPeople] = useState([]);
  const [filters, setFilters] = useState({ salesPerson: "", range: "7d", status: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUsersByRole("sales")
      .then(({ data: users }) => setSalesPeople(Array.isArray(users) ? users : []))
      .catch(() => setSalesPeople([]));
  }, []);

  const queryParams = useCallback(
    (extra = {}) => ({
      ...rangeToDates(filters.range),
      ...(filters.salesPerson ? { salesPerson: filters.salesPerson } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...extra,
    }),
    [filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res } = await getAllClientVisits(queryParams({ page, limit: PAGE_SIZE }));
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't load client visits");
    } finally {
      setLoading(false);
    }
  }, [queryParams, page]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let p = 1; p <= 50; p += 1) {
        const { data: res } = await getAllClientVisits(queryParams({ page: p, limit: 200 }));
        all.push(...(res.visits || []));
        if (p >= res.pages) break;
      }
      const blob = new Blob([`\uFEFF${toCsv(all)}`], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `client-visits-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't export visits");
    } finally {
      setExporting(false);
    }
  };

  const s = data?.summary;
  const visits = data?.visits || [];

  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Client Visits</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
            Location check-ins shared by sales people when they attend client meetings
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={linkBtn} onClick={load} disabled={loading}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" style={linkBtn} onClick={exportCsv} disabled={exporting || !visits.length}>
            <Download size={13} /> {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <select aria-label="Sales person" style={selectStyle} value={filters.salesPerson} onChange={(e) => setFilter("salesPerson", e.target.value)}>
          <option value="">All sales people</option>
          {salesPeople.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
        </select>
        <select aria-label="Date range" style={selectStyle} value={filters.range} onChange={(e) => setFilter("range", e.target.value)}>
          {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select aria-label="Status" style={selectStyle} value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
          <option value="">Any status</option>
          <option value="in-progress">In meeting now</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {error && (
        <div role="alert" style={{ padding: "12px 14px", borderRadius: 12, background: T.redBg, border: `1px solid ${T.redBorder}`, color: T.red, fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {s && (
        <div style={kpiGridStyle}>
          <KpiCard Icon={MapPin} label="Visits" value={s.totalVisits} color={T.brand} bgColor={T.brandLight} />
          <KpiCard Icon={Building2} label="Clients Met" value={s.uniqueClients} color="#2563eb" bgColor="#eff6ff" />
          <KpiCard Icon={Users} label="Sales People" value={s.activeSalesPeople} color="#7c3aed" bgColor="#f5f3ff" />
          <KpiCard Icon={Radio} label="In Meeting Now" value={s.inProgress} color="#c2410c" bgColor="#ffedd5" />
          <KpiCard Icon={Timer} label="Time With Clients" value={fmtDuration(s.totalMinutes)} color={T.green} bgColor={T.greenBg} />
        </div>
      )}

      <Card
        Icon={MapPin} iconColor={T.red} iconBg={T.redBg}
        title="Visit records"
        subtitle={data ? `${data.total} record${data.total === 1 ? "" : "s"} · newest first` : "Loading…"}
      >
        {!data && loading ? (
          <Empty Icon={RefreshCw}>Loading visits…</Empty>
        ) : visits.length === 0 ? (
          <Empty>No client visits for these filters</Empty>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={th()}>Sales Person</th>
                    <th style={th()}>Client</th>
                    <th style={th()}>Check-in</th>
                    <th style={th()}>Check-out</th>
                    <th style={th()}>Location</th>
                    <th style={th()}>Purpose / Outcome</th>
                    <th style={th()}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => {
                    const done = v.status === "completed";
                    return (
                      <tr key={v._id}>
                        <td style={td({ fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap" })}>{v.salesPerson?.name || "—"}</td>
                        <td style={td()}>
                          <div style={{ fontWeight: 600, color: T.textPrimary }}>{clientLabel(v.clientId)}</div>
                          <div style={{ fontSize: 11.5, color: T.textMuted }}>
                            {[v.clientId?.companyName ? v.clientId?.clientName : null, v.clientId?.city].filter(Boolean).join(" · ") || " "}
                          </div>
                        </td>
                        <td style={td({ whiteSpace: "nowrap", color: T.textSecondary })}>{fmtDateTime(v.checkIn?.at)}</td>
                        <td style={td({ whiteSpace: "nowrap", color: T.textSecondary })}>
                          {done ? (
                            <>
                              <div>{fmtTime(v.checkOut?.at)}</div>
                              <div style={{ fontSize: 11.5, color: T.textMuted }}>{fmtDuration(visitMinutes(v))}</div>
                            </>
                          ) : (
                            <span style={{ color: "#c2410c", fontWeight: 600 }}>{fmtDuration(visitMinutes(v))} so far</span>
                          )}
                        </td>
                        <td style={td()}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <FixCell fix={v.checkIn} label="Check-in" />
                            {done && <FixCell fix={v.checkOut} label="Check-out" />}
                          </div>
                        </td>
                        <td style={td({ color: T.textSecondary, maxWidth: 280 })}>
                          {v.purpose && <div><span style={{ color: T.textMuted }}>Purpose:</span> {v.purpose}</div>}
                          {v.outcome && <div style={{ marginTop: v.purpose ? 3 : 0 }}><span style={{ color: T.textMuted }}>Outcome:</span> {v.outcome}</div>}
                          {!v.purpose && !v.outcome && <span style={{ color: T.textMuted }}>—</span>}
                        </td>
                        <td style={td()}><Chip label={done ? "Completed" : "In Meeting"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {data.pages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
                <button type="button" style={linkBtn} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={13} /> Prev
                </button>
                <span style={{ fontSize: 12.5, color: T.textSecondary }}>Page {data.page} of {data.pages}</span>
                <button type="button" style={linkBtn} disabled={page >= data.pages || loading} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}

            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.textMuted, marginTop: 12 }}>
              <AlertTriangle size={12} /> Times are recorded by the server. "Low accuracy" means the device reported more than ±{LOW_ACCURACY_METRES} m.
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
