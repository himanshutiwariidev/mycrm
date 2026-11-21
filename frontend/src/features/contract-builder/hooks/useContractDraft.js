import { useEffect, useState } from "react";
import { getClientById, getContractById } from "@/services/clientApi";
import { ACTIONS } from "../context/contractWizardReducer";

export function draftKey(clientId, contractId) {
  return `contract-draft-${clientId}-${contractId || "new"}`;
}

// Keep the server's full timestamp. Cutting it to "YYYY-MM-DD" took the UTC
// calendar day, so a date picked in India (local midnight = 18:30 UTC the day
// before) came back one day earlier — and every edit + save shifted it again.
const keepDate = (value) => (value ? String(value) : "");

/** Local midnight today (or `years` from today), as an ISO timestamp. */
function localDayIso({ years = 0 } = {}) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

function reverseMapContractToState(contract) {
  return {
    meta: {
      contractId: contract._id,
      projectName: contract.projectName || "",
      packageType: contract.packageType || "",
      timeline: contract.timeline || "",
      contractStartDate: keepDate(contract.contractStartDate),
      validUntil: keepDate(contract.validUntil),
      paymentTerms: contract.paymentTerms || "",
      notes: contract.notes || "",
      currency: contract.currency || "INR",
      // preTaxAmount is the base amount before GST; legacy contracts (created
      // before GST support) never had it, so projectAmount doubles as the base.
      contractAmount: contract.preTaxAmount ?? contract.projectAmount ?? "",
      amountReceived: contract.receivedAmount ?? "",
      dueDate: keepDate(contract.nextDueDate),
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

// "Renew Contract" starting point — loads an existing contract as a template
// for a brand-new one (same services/pricing package), instead of editing it
// in place. Unlike reverseMapContractToState, this deliberately omits
// contractId (so the wizard submits via createContract, not updateContract),
// resets the fields that belong to a fresh billing cycle (dates, amount
// received, due date), and nudges the project name so "SEO" reads as
// "SEO Renewal" without doubling up on a contract already named that.
function reverseMapContractToRenewalState(contract) {

  const baseName = contract.projectName || "";
  const projectName = /renewal/i.test(baseName) ? baseName : `${baseName} Renewal`;

  return {
    meta: {
      renewedFromContractId: contract._id,
      projectName,
      packageType: contract.packageType || "",
      timeline: contract.timeline || "",
      contractStartDate: localDayIso(),
      validUntil: localDayIso({ years: 1 }),
      paymentTerms: contract.paymentTerms || "",
      notes: contract.notes || "",
      currency: contract.currency || "INR",
      contractAmount: contract.preTaxAmount ?? contract.projectAmount ?? "",
      amountReceived: "",
      dueDate: "",
      paymentMethod: contract.paymentMethod || contract.payments?.[0]?.method || "Cash",
      gstEnabled: contract.gstEnabled || false,
      gstPercent: contract.gstEnabled ? String(contract.gstPercent ?? "18") : "18",
      tdsEnabled: contract.tdsEnabled || false,
      tdsPercent: contract.tdsEnabled ? String(contract.tdsPercent ?? "") : "",
    },
    selectedServices: Array.isArray(contract.selectedServices) ? contract.selectedServices : [],
  };
}

/** Hydrates the wizard on mount: an existing contract from the server (edit mode), a renewal template from an existing contract (renew mode), or a saved localStorage draft (new mode). */
export function useContractDraft({ clientId, contractId, renewFromContractId, dispatch }) {
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
      } else if (renewFromContractId) {
        try {
          const contractRes = await getContractById(renewFromContractId);
          if (!cancelled) {
            dispatch({ type: ACTIONS.HYDRATE_FROM_SERVER, payload: reverseMapContractToRenewalState(contractRes.data) });
          }
        } catch (err) {
          if (!cancelled) setLoadError("Could not load the contract being renewed.");
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
  }, [clientId, contractId, renewFromContractId, dispatch]);

  return { loading, loadError, client };
}
