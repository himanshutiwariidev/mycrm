import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createContract, updateContract, uploadContractPi } from "@/services/clientApi";
import { ContractWizardProvider } from "../context/ContractWizardContext";
import { useContractWizard } from "../context/useContractWizard";
import { useContractDraft, draftKey } from "../hooks/useContractDraft";
import { useAutosave } from "../hooks/useAutosave";
import { useBeforeUnloadWarning } from "../hooks/useBeforeUnloadWarning";
import { buildContractPayload } from "../utils/buildContractPayload";
import WizardShell from "../components/WizardShell";

function ContractBuilderInner({ clientId, contractId }) {
  const navigate = useNavigate();
  const { state, dispatch, ACTIONS } = useContractWizard();
  const { loading, loadError, client } = useContractDraft({ clientId, contractId, dispatch });

  useAutosave({ state, dispatch });
  useBeforeUnloadWarning(state.status.isDirty);

  const handleSubmit = async () => {
    dispatch({ type: ACTIONS.SUBMIT_START });
    try {
      const payload = buildContractPayload(state);
      const isEdit = !!state.meta.contractId;
      // logEdit marks this as the deliberate, final save (vs. autosave's silent
      // background PUTs on the same route) so the backend logs one activity
      // entry — see updateContract in clientController.js.
      const response = isEdit
        ? await updateContract(state.meta.contractId, { ...payload, logEdit: true })
        : await createContract(payload);

      const savedContractId = response.data?.contract?._id || state.meta.contractId;

      if (state.piFile && savedContractId) {
        try {
          await uploadContractPi(savedContractId, state.piFile);
        } catch (piErr) {
          toast.error(piErr.response?.data?.message || "Contract saved, but the PI upload failed");
        }
      }

      localStorage.removeItem(draftKey(clientId, contractId));
      dispatch({ type: ACTIONS.SUBMIT_SUCCESS, payload: { contractId: savedContractId } });
      toast.success(isEdit ? "Contract updated successfully" : "Contract created — visible to the client in their portal");
      navigate(`/clients/${clientId}`);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to save contract";
      dispatch({ type: ACTIONS.SUBMIT_ERROR, payload: { message } });
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError && contractId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
        <p className="text-sm text-destructive">{loadError}</p>
        <button className="text-sm text-primary underline" onClick={() => navigate(`/clients/${clientId}`)}>
          Back to client
        </button>
      </div>
    );
  }

  return <WizardShell client={client} onSubmit={handleSubmit} />;
}

export default function ContractBuilderPage() {
  const { clientId, contractId } = useParams();

  return (
    <ContractWizardProvider clientId={clientId}>
      <ContractBuilderInner clientId={clientId} contractId={contractId} />
    </ContractWizardProvider>
  );
}
