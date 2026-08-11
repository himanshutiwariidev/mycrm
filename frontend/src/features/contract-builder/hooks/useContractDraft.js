import { useEffect, useState } from "react";
import { getClientById, getContractById } from "@/services/clientApi";
import { ACTIONS } from "../context/contractWizardReducer";

export function draftKey(clientId, contractId) {
  return `contract-draft-${clientId}-${contractId || "new"}`;
}

function reverseMapContractToState(contract) {
  return {
    meta: {
      contractId: contract._id,
      projectName: contract.projectName || "",
      timeline: contract.timeline || "",
      contractStartDate: contract.contractStartDate ? String(contract.contractStartDate).slice(0, 10) : "",
      validUntil: contract.validUntil ? String(contract.validUntil).slice(0, 10) : "",
      paymentTerms: contract.paymentTerms || "",
      notes: contract.notes || "",
      currency: contract.currency || "INR",
      // preTaxAmount is the base amount before GST; legacy contracts (created
      // before GST support) never had it, so projectAmount doubles as the base.
      contractAmount: contract.preTaxAmount ?? contract.projectAmount ?? "",
      amountReceived: contract.receivedAmount ?? "",
      dueDate: contract.nextDueDate ? String(contract.nextDueDate).slice(0, 10) : "",
      // Falls back to the first payment's method for contracts saved before
      // paymentMethod became its own top-level field.
      paymentMethod: contract.paymentMethod || contract.payments?.[0]?.method || "Cash",
      gstEnabled: contract.gstEnabled || false,
      gstPercent: contract.gstEnabled ? String(contract.gstPercent ?? "18") : "18",
      tdsEnabled: contract.tdsEnabled || false,
      tdsPercent: contract.tdsEnabled ? String(contract.tdsPercent ?? "") : "",
    },
    selectedServices: Array.isArray(contract.selectedServices) ? contract.selectedServices : [],
  };
}

/** Hydrates the wizard on mount: an existing contract from the server (edit mode), or a saved localStorage draft (new mode). */
export function useContractDraft({ clientId, contractId, dispatch }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [client, setClient] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function hydrate() {
      try {
        const clientRes = await getClientById(clientId);
        if (!cancelled) setClient(clientRes.data?.client || null);
      } catch (err) {
        if (!cancelled) setLoadError("Could not load client details.");
      }

      if (contractId) {
        try {
          const contractRes = await getContractById(contractId);
          if (!cancelled) {
            dispatch({ type: ACTIONS.HYDRATE_FROM_SERVER, payload: reverseMapContractToState(contractRes.data) });
          }
        } catch (err) {
          if (!cancelled) setLoadError("Could not load this contract.");
        }
      } else {
        const saved = localStorage.getItem(draftKey(clientId, contractId));
        if (saved) {
          try {
            dispatch({ type: ACTIONS.HYDRATE_FROM_LOCALSTORAGE, payload: JSON.parse(saved) });
          } catch (err) {
            localStorage.removeItem(draftKey(clientId, contractId));
          }
        }
      }

      if (!cancelled) setLoading(false);
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [clientId, contractId, dispatch]);

  return { loading, loadError, client };
}
