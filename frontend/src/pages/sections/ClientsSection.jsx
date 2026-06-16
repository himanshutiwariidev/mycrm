import React from "react";
import { Building2, CheckCircle2, DollarSign, FileText, Plus } from "lucide-react";
import { ChartCard, KpiCard, T } from "./shared";

export default function ClientsSection({ clients, proposals, reminders }) {
  return (
    <div className="fade-up">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 19, color: T.textPrimary }}>Client Management</h2>
          <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>Overview of clients, proposals and payment reminders</p>
        </div>
        <button className="pri-btn" onClick={() => window.location.href = "/clients"} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} strokeWidth={2.5} /> Manage Clients
        </button>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard Icon={Building2} label="Total Clients" value={clients.length} color="#16a34a" bgColor={T.greenBg} />
        <KpiCard Icon={FileText} label="Proposals" value={proposals.length} color="#0891b2" bgColor="#ecfeff" />
        <KpiCard Icon={DollarSign} label="Reminders" value={reminders.length} color={T.brand} bgColor={T.brandLight} />
        <KpiCard Icon={CheckCircle2} label="Active" value={clients.filter(c => c.status === "active").length} color={T.yellow} bgColor={T.yellowBg} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <ChartCard title="Recent Clients" subtitle={`${clients.length} total clients`}>
          {clients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted, fontSize: 13 }}>No clients yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {clients.slice(0, 5).map((client, i) => (
                <div key={client._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? `1px solid ${T.borderLight}` : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: T.textPrimary }}>{client.clientName}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{client.email}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, color: client.status === "active" ? T.green : T.slate, background: client.status === "active" ? T.greenBg : T.slateBg, border: `1px solid ${client.status === "active" ? "#bbf7d0" : "#e2e8f0"}` }}>
                    {client.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Proposal Status" subtitle={`${proposals.length} total proposals`}>
          {proposals.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted, fontSize: 13 }}>No proposals yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["sent", T.brand], ["accepted", T.green], ["rejected", T.red], ["draft", T.slate]].map(([status, color]) => {
                const count = proposals.filter(p => p.proposalStatus === status).length;
                const percentage = proposals.length > 0 ? (count / proposals.length) * 100 : 0;
                return count > 0 ? (
                  <div key={status} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ minWidth: 60, fontSize: 12, fontWeight: 600, color: T.textSecondary, textTransform: "capitalize" }}>{status}</span>
                    <div style={{ flex: 1, height: 6, background: T.borderLight, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${percentage}%`, background: color, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 30, textAlign: "right", color }}>{count}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </ChartCard>
      </div>

      <div style={{ background: T.brandLight, border: `1px solid ${T.brandMid}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
        <FileText size={32} color={T.brand} style={{ margin: "0 auto 12px", display: "block" }} />
        <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 8 }}>Manage All Client Operations</h3>
        <p style={{ fontSize: 13, color: T.textSecondary, marginBottom: 16 }}>Create clients, send proposals, and manage payment reminders from the dedicated clients section.</p>
        <button className="pri-btn" onClick={() => window.location.href = "/clients"} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: T.brand, color: "#fff", borderRadius: 9, fontSize: 13, fontWeight: 600, transition: "all .2s", border: "none", cursor: "pointer" }}>
          <Building2 size={14} strokeWidth={2.2} /> Go to Clients Dashboard
        </button>
      </div>
    </div>
  );
}
