import React from "react";
import { FileText, Paperclip, UploadCloud, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useContractWizard } from "../context/useContractWizard";
import { Field, QuickChips, SectionCard, SECTION_IDS } from "./ui";

// Short chip labels; the full wording goes into the field.
const TERM_PRESETS = [
  { label: "100% advance", value: "100% advance" },
  { label: "50% + 50%", value: "50% upfront, 50% on completion" },
  { label: "Monthly", value: "Monthly in advance" },
];

/** Payment terms, internal notes and the PI attachment — side by side. */
export default function TermsSection() {
  const { state, dispatch, ACTIONS } = useContractWizard();
  const m = state.meta;
  const setField = (field, value) => dispatch({ type: ACTIONS.SET_META_FIELD, payload: { field, value } });

  const handlePiChange = (e) => {
    const file = e.target.files?.[0] || null;
    dispatch({ type: ACTIONS.SET_PI_FILE, payload: { file } });
    e.target.value = "";
  };

  return (
    <SectionCard id={SECTION_IDS.terms} Icon={FileText} title="Terms, notes & documents" subtitle="Optional — shown on the contract and kept for your records">
      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-3">
        <Field label="Payment Terms" htmlFor="cb-terms"
          hint={<QuickChips items={TERM_PRESETS.map((t) => ({ label: t.label, active: m.paymentTerms === t.value, onClick: () => setField("paymentTerms", t.value) }))} />}>
          <Textarea id="cb-terms" value={m.paymentTerms} onChange={(e) => setField("paymentTerms", e.target.value)} placeholder="e.g. 50% upfront, 50% on completion" rows={3} className="min-h-[84px] resize-y" />
        </Field>
        <Field label="Additional Notes" htmlFor="cb-notes">
          <Textarea id="cb-notes" value={m.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Internal notes about this contract" rows={3} className="min-h-[84px] resize-y" />
        </Field>
        <Field label="PI (Proforma Invoice)">
          {state.piFile ? (
            <div className="flex min-h-[84px] items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{state.piFile.name}</span>
                  <span className="block text-xs text-muted-foreground">{Math.ceil(state.piFile.size / 1024)} KB · uploaded when you generate</span>
                </span>
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Remove PI"
                onClick={() => dispatch({ type: ACTIONS.SET_PI_FILE, payload: { file: null } })}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex min-h-[84px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
              <UploadCloud className="h-5 w-5" />
              <span>Click to attach the PI</span>
              <span className="text-[11px]">PDF, image, Word or Excel</span>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handlePiChange} />
            </label>
          )}
        </Field>
      </div>
    </SectionCard>
  );
}
