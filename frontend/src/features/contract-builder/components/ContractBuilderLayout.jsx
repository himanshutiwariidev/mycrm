import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Moon, Send, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useContractWizard } from "../context/useContractWizard";
import { buildStepSchema } from "../config/validation";
import { getLeafConfig } from "../utils/configLookup";
import { getCategoryMeta } from "../config/serviceCategories";
import ContractSummary from "../engine/ContractSummary";
import ProjectSection from "../sections/ProjectSection";
import ValueSection from "../sections/ValueSection";
import ServicesSection from "../sections/ServicesSection";
import TermsSection from "../sections/TermsSection";
import { scrollToSection } from "../sections/ui";

// Field errors from the details schema that belong to the Project card;
// everything else in that schema is on the Value & payment card.
const PROJECT_FIELDS = ["projectName", "clientId", "timeline", "validUntil"];

/**
 * The contract builder on ONE page (it used to be a 3-step wizard): Project,
 * Value & payment, Services and Terms stacked as compact cards, with a sticky
 * live summary on the right that replaces the old Review step. Validation is
 * the same as before; it runs on Generate, shows every problem in place and
 * scrolls to the first one — then keeps updating as things are fixed.
 */
export default function ContractBuilderLayout({ client, onSubmit }) {
  const navigate = useNavigate();
  const { state, dispatch, ACTIONS } = useContractWizard();
  const isEdit = !!state.meta.contractId;
  const [attempted, setAttempted] = useState(false);

  // Same validators as the old steps 1–3, run live (they're cheap) so the
  // checklist, section ticks and error messages always reflect the form.
  const details = buildStepSchema(1, state, getLeafConfig);
  const picked = buildStepSchema(2, state, getLeafConfig);
  const configured = buildStepSchema(3, state, getLeafConfig);

  const fieldErrors = details.success ? {} : details.error.flatten().fieldErrors;
  const projectError = PROJECT_FIELDS.map((k) => fieldErrors[k]?.[0]).find(Boolean);
  const valueError = Object.keys(fieldErrors).filter((k) => !PROJECT_FIELDS.includes(k)).map((k) => fieldErrors[k][0])[0];
  const configProblems = configured.success ? [] : state.selectedServices.filter((c) => c.enabled).flatMap((cat) =>
    cat.selections
      .filter((sel) => configured.errorsByPath?.[sel.path])
      .map((sel) => `${sel.label} (${getCategoryMeta(cat.categoryId)?.label || cat.categoryId})`));
  const servicesError = !picked.success ? picked.message : configProblems.length ? `Check details in ${configProblems[0]}` : null;

  const sections = [
    { key: "project", label: "Project", ok: !projectError, error: projectError },
    { key: "value", label: "Value & payment", ok: !valueError, error: valueError },
    { key: "services", label: "Services", ok: !servicesError, error: servicesError },
    { key: "terms", label: "Terms & documents", ok: Boolean(state.meta.paymentTerms || state.meta.notes || state.piFile), optional: true },
  ];
  const checklist = [
    { key: "project", label: "Project name added", ok: !projectError, error: attempted ? projectError : null },
    { key: "value", label: "Contract value set", ok: !valueError, error: attempted ? valueError : null },
    { key: "services", label: "Services & packages chosen", ok: !servicesError, error: attempted ? servicesError : null },
  ];

  const handleGenerate = () => {
    setAttempted(true);
    const firstProblem = sections.find((s) => !s.optional && !s.ok);
    if (firstProblem) {
      scrollToSection(firstProblem.key);
      toast.error(firstProblem.error || "Some details are missing");
      return;
    }
    onSubmit();
  };

  const handleCancel = () => {
    if (state.status.isDirty && !window.confirm("You have unsaved changes. Discard and leave?")) return;
    navigate(`/clients/${state.meta.clientId}`);
  };

  const title = isEdit ? "Edit Contract" : state.meta.renewedFromContractId ? "Renew Contract" : "New Contract";
  const submitting = state.status.isSubmitting;

  return (
    <div className={state.ui.darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-muted/40 text-foreground dark:bg-background">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Button variant="ghost" size="icon" onClick={handleCancel} title="Back to client" aria-label="Back to client">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                  <h1 className="text-lg font-semibold leading-tight">{title}</h1>
                  <p className="truncate text-xs text-muted-foreground">
                    {client ? <>for <span className="font-medium text-foreground">{client.companyName || client.clientName}</span>{client.companyName ? ` · ${client.clientName}` : ""}</> : " "}
                    {state.meta.renewedFromContractId && " — the original contract is marked renewed when this is saved"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {state.status.isAutosaving ? (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
                ) : state.status.lastAutosavedAt ? (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex"><CheckCircle2 className="h-3 w-3" /> Draft saved</span>
                ) : null}
                <Button variant="ghost" size="icon" onClick={() => dispatch({ type: ACTIONS.TOGGLE_DARK_MODE })} title="Toggle dark mode" aria-label="Toggle dark mode">
                  {state.ui.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button variant="outline" onClick={handleCancel} className="hidden sm:inline-flex">Cancel</Button>
                <Button onClick={handleGenerate} disabled={submitting}>
                  {submitting
                    ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
                    : <><Send className="mr-1.5 h-4 w-4" /> {isEdit ? "Update" : "Generate"}<span className="hidden sm:inline">{" "}Contract</span></>}
                </Button>
              </div>
            </div>

            <nav className="-mb-px flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none]" aria-label="Sections">
              {sections.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => scrollToSection(s.key)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    attempted && !s.ok && !s.optional
                      ? "border-destructive/40 bg-destructive/5 text-destructive"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {s.ok
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    : <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{i + 1}</span>}
                  {s.label}
                  {s.optional && <span className="text-[10px] text-muted-foreground">(optional)</span>}
                </button>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <ProjectSection errors={attempted ? fieldErrors : {}} done={!projectError && state.meta.projectName.trim().length >= 3} />
            <ValueSection errors={attempted ? fieldErrors : {}} done={!valueError && Number(state.meta.contractAmount) > 0} />
            <ServicesSection
              pickError={attempted && !picked.success ? picked.message : null}
              configProblems={attempted ? configProblems : []}
              done={!servicesError}
            />
            <TermsSection />
          </div>
          <aside className="min-w-0 lg:sticky lg:top-[118px] lg:max-h-[calc(100vh-134px)] lg:overflow-y-auto lg:rounded-xl">
            <ContractSummary client={client} checklist={checklist} onJump={scrollToSection} onGenerate={handleGenerate} submitting={submitting} />
          </aside>
        </main>
      </div>
    </div>
  );
}
