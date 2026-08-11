import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContractWizard } from "../context/useContractWizard";
import { useStepValidation } from "../hooks/useStepValidation";
import StepIndicator from "./StepIndicator";
import ContractSummary from "../engine/ContractSummary";
import Step1ClientDetails from "../steps/Step1ClientDetails";
import Step2SelectServices from "../steps/Step2SelectServices";
import Step3ConfigureServices from "../steps/Step3ConfigureServices";
import Step4ReviewContract from "../steps/Step4ReviewContract";
import Step5GenerateContract from "../steps/Step5GenerateContract";

const STEP_COMPONENTS = {
  1: Step1ClientDetails,
  2: Step2SelectServices,
  3: Step3ConfigureServices,
  4: Step4ReviewContract,
  5: Step5GenerateContract,
};

export default function WizardShell({ client, onSubmit }) {
  const navigate = useNavigate();
  const { state, dispatch, ACTIONS } = useContractWizard();
  const { validateStep } = useStepValidation({ state, dispatch });
  const currentStep = state.currentStep;
  const StepComponent = STEP_COMPONENTS[currentStep];
  const [furthestStep, setFurthestStep] = useState(currentStep);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const goToStep = (step) => {
    dispatch({ type: ACTIONS.SET_STEP, payload: { step } });
    setFurthestStep((f) => Math.max(f, step));
  };

  const handleNext = () => {
    const { success } = validateStep(currentStep);
    if (!success) return;
    if (currentStep < 5) goToStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  };

  const handleCancel = () => {
    if (state.status.isDirty && !window.confirm("You have unsaved changes. Discard and leave?")) {
      return;
    }
    navigate(`/clients/${state.meta.clientId}`);
  };

  const toggleDarkMode = () => dispatch({ type: ACTIONS.TOGGLE_DARK_MODE });
  const showSidebar = currentStep >= 2 && currentStep <= 4;

  return (
    <div className={state.ui.darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-semibold">{state.meta.contractId ? "Edit Contract" : "New Contract"}</h1>
                {client && <p className="text-xs text-muted-foreground">for {client.clientName}</p>}
              </div>
              <div className="flex items-center gap-2">
                {state.status.isAutosaving && (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                  </span>
                )}
                {!state.status.isAutosaving && state.status.lastAutosavedAt && (
                  <span className="hidden text-xs text-muted-foreground sm:inline">Draft saved</span>
                )}
                <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="Toggle dark mode">
                  {state.ui.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <StepIndicator currentStep={currentStep} furthestStep={furthestStep} onStepClick={goToStep} isEdit={!!state.meta.contractId} />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className={showSidebar ? "grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]" : ""}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                <StepComponent client={client} onSubmit={onSubmit} />
              </motion.div>
            </AnimatePresence>
            {showSidebar && (
              <div className="hidden lg:block">
                <ContractSummary variant="sidebar" />
              </div>
            )}
          </div>
        </main>

        {showSidebar && (
          <button
            type="button"
            onClick={() => setShowMobileSummary(true)}
            className="fixed bottom-20 right-4 z-30 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg lg:hidden"
          >
            View Summary
          </button>
        )}

        <AnimatePresence>
          {showMobileSummary && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex items-end bg-black/50 lg:hidden"
              onClick={() => setShowMobileSummary(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.2 }}
                className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <ContractSummary variant="full" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
              )}
              {currentStep < 5 && (
                <Button onClick={handleNext}>
                  Next <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
