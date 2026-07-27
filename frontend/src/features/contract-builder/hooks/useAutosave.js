import { useEffect, useRef } from "react";
import { updateContract } from "@/services/clientApi";
import { buildContractPayload } from "../utils/buildContractPayload";
import { draftKey } from "./useContractDraft";
import { ACTIONS } from "../context/contractWizardReducer";

const AUTOSAVE_DELAY = 1500;

/**
 * New contracts (no id yet) autosave to localStorage only — createContract
 * always emails the client, so it must never fire silently in the
 * background. Existing contracts (edit mode, has an id) autosave via
 * updateContract, which has no email side effect.
 */
export function useAutosave({ state, dispatch }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!state.status.isDirty) return undefined;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const key = draftKey(state.meta.clientId, state.meta.contractId);

      if (!state.meta.contractId) {
        localStorage.setItem(
          key,
          JSON.stringify({ meta: state.meta, selectedServices: state.selectedServices })
        );
        dispatch({ type: ACTIONS.AUTOSAVE_SUCCESS });
        return;
      }

      dispatch({ type: ACTIONS.AUTOSAVE_START });
      try {
        const payload = buildContractPayload(state);
        await updateContract(state.meta.contractId, payload);
        localStorage.removeItem(key);
        dispatch({ type: ACTIONS.AUTOSAVE_SUCCESS });
      } catch (err) {
        dispatch({
          type: ACTIONS.AUTOSAVE_ERROR,
          payload: { message: err.response?.data?.message || "Autosave failed" },
        });
      }
    }, AUTOSAVE_DELAY);

    return () => clearTimeout(timerRef.current);
  }, [state, dispatch]);
}
