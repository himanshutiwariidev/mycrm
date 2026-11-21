import React from "react";
import { FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import DateField from "../engine/DateField";
import { useContractWizard } from "../context/useContractWizard";
import { Field, QuickChips, SectionCard, SECTION_IDS } from "./ui";
import { PACKAGE_TYPES } from "../config/packageTypes";
import PackageStars from "@/components/PackageStars";

const DURATIONS = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "1 year" },
];

/** Project name, contract period and timeline — one compact row each. */
export default function ProjectSection({ errors = {}, done }) {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const m = state.meta;
  const isEdit = !!m.contractId;
  const setField = (field, value) => dispatch({ type: ACTIONS.SET_META_FIELD, payload: { field, value } });

  // Quick duration: fills the end date from the start date (today if none yet)
  // and the timeline text (only if it's empty or was set by a chip earlier).
  const setDuration = ({ months, label }) => {
    const startIso = m.contractStartDate || (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })();
    const end = new Date(startIso);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);
    if (!m.contractStartDate) setField("contractStartDate", startIso);
    setField("validUntil", end.toISOString());
    if (!m.timeline || DURATIONS.some((d) => d.label === m.timeline)) setField("timeline", label);
  };

  return (
    <SectionCard id={SECTION_IDS.project} Icon={FolderKanban} title="Project" subtitle="What the contract is for and how long it runs" done={done}>
      {/* Desktop: all four fields on one row — dates get the most room (so a
          long date like "September 30th, 2026" isn't cut), the name a bit
          more than a date, the short timeline the least. */}
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.75fr)]">
        <Field label="Project Name" htmlFor="cb-project-name" required error={errors.projectName?.[0]} className="sm:col-span-2 xl:col-span-1">
          <Input
            id="cb-project-name"
            value={m.projectName}
            onChange={(e) => setField("projectName", e.target.value)}
            placeholder="e.g. Q3 Digital Growth Campaign"
            autoFocus={!isEdit}
          />
        </Field>
        <Field label="Contract Start Date">
          <DateField value={m.contractStartDate} onChange={(value) => setField("contractStartDate", value)} placeholder="Start date" />
        </Field>
        <Field label="Contract End Date">
          <DateField value={m.validUntil} onChange={(value) => setField("validUntil", value)} placeholder="End date" />
        </Field>
        <Field label="Timeline" htmlFor="cb-timeline">
          <Input id="cb-timeline" value={m.timeline} onChange={(e) => setField("timeline", e.target.value)} placeholder="e.g. 3 months" />
        </Field>
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 sm:col-span-2 xl:col-span-4">
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Package type">
            <span className="text-[13px] font-medium">Package type</span>
            {PACKAGE_TYPES.map((p) => {
              const active = m.packageType === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  // Tap the selected package again to clear it (it's optional).
                  onClick={() => setField("packageType", active ? "" : p.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background text-muted-foreground hover:border-primary hover:text-primary"}`}
                >
                  <PackageStars packageType={p.value} size={12} color={active ? "#fde68a" : "#f59e0b"} />
                  {p.label}
                </button>
              );
            })}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-xs text-muted-foreground">Quick duration — sets the end date{m.contractStartDate ? "" : " (starting today)"} and timeline:</span>
            <QuickChips items={DURATIONS.map((d) => ({ label: d.label, active: m.timeline === d.label, onClick: () => setDuration(d) }))} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
