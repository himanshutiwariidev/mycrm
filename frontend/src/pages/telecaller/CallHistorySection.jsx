import React, { useCallback, useEffect, useState } from "react";
import { History, ChevronLeft, ChevronRight, Phone } from "lucide-react";
import { getCalls } from "../../services/telecallingApi";
import { CALL_OUTCOMES } from "../../config/telecalling";
import { SectionCard, Badge, Btn, EmptyState, fmtDateTime, fmtDuration, fmtWhen } from "./teleUi";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

function rangeParams(key) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
  const back = { today: 0, "7d": 6, "30d": 29 }[key];
  if (back === undefined) return {};
  return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - back).toISOString(), to: end };
}

/**
 * Call log table. Telecaller: their own calls. Admin: pass `telecallerId`
 * (or nothing for everyone) and `showTelecaller` to add that column.
 */
export default function CallHistorySection({ telecallerId, showTelecaller = false, embedded = false, refreshKey }) {
  const [range, setRange] = useState("7d");
  const [outcome, setOutcome] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ calls: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getCalls({ ...rangeParams(range), outcome: outcome || undefined, telecaller: telecallerId || undefined, page, limit: 25 });
      setData(res);
    } catch {
      setData({ calls: [], total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [range, outcome, page, telecallerId]);

  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { setPage(1); }, [range, outcome, telecallerId]);

  const body = (
    <SectionCard
      title={embedded ? "Call log" : undefined}
      subtitle={embedded ? `${data.total.toLocaleString("en-IN")} calls in this view` : undefined}
      Icon={embedded ? History : undefined}
      tone="#0891b2"
    >
      <div className="tc-toolbar">
        <div className="tc-segmented">
          {RANGES.map((r) => <button key={r.key} type="button" className={range === r.key ? "active" : ""} onClick={() => setRange(r.key)}>{r.label}</button>)}
        </div>
        <select className="tc-input" value={outcome} onChange={(e) => setOutcome(e.target.value)} style={{ width: "auto", minWidth: 190 }} aria-label="Filter by outcome">
          <option value="">All outcomes</option>
          {Object.entries(CALL_OUTCOMES).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
        </select>
      </div>

      {!loading && data.calls.length === 0 ? (
        <EmptyState Icon={History} title="No calls in this view" text="Try a wider date range or another outcome." />
      ) : (
        <div className="tc-table-wrap">
          <table className="tc-table" style={{ minWidth: showTelecaller ? 920 : 800 }}>
            <thead>
              <tr>
                <th>When</th>
                {showTelecaller && <th>Telecaller</th>}
                <th>Lead</th>
                <th>Outcome</th>
                <th>Duration</th>
                <th>Client response</th>
                <th>Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {data.calls.map((c) => (
                <tr key={c._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(c.calledAt)}</td>
                  {showTelecaller && <td className="tc-cell-main">{c.telecaller?.name || "—"}</td>}
                  <td>
                    <div className="tc-cell-main">{c.lead?.name || "—"}</div>
                    <div className="tc-cell-sub" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {c.lead?.company && <span>{c.lead.company} ·</span>}
                      {c.lead?.phone && <a href={`tel:${c.lead.phone}`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}><Phone size={10} />{c.lead.phone}</a>}
                    </div>
                  </td>
                  <td><Badge meta={CALL_OUTCOMES[c.outcome]} size="sm">{CALL_OUTCOMES[c.outcome]?.short || CALL_OUTCOMES[c.outcome]?.label}</Badge></td>
                  <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtDuration(c.durationSec)}</td>
                  <td style={{ maxWidth: 320 }}>
                    <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={c.notes}>{c.notes || <span className="tc-cell-sub">—</span>}</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{c.followUpAt ? fmtWhen(c.followUpAt) : <span className="tc-cell-sub">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10, marginTop: 14 }}>
          <Btn variant="secondary" size="sm" Icon={ChevronLeft} disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>Prev</Btn>
          <span style={{ fontSize: 12.5, color: "#64748b" }}>Page {data.page} of {data.pages}</span>
          <Btn variant="secondary" size="sm" disabled={page >= data.pages || loading} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={14} /></Btn>
        </div>
      )}
    </SectionCard>
  );

  if (embedded) return body;
  return (
    <div className="tc-page">
      <div className="tc-head">
        <div>
          <h1>Call History</h1>
          <p>Every call you&apos;ve logged, with what the client said.</p>
        </div>
      </div>
      {body}
    </div>
  );
}
