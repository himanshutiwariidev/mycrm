import { useCallback } from "react";
import { buildStepSchema } from "../config/validation";
import { getLeafConfig } from "../utils/configLookup";
import { ACTIONS } from "../context/contractWizardReducer";

export function useStepValidation({ state, dispatch }) {
  const validateStep = useCallback(
    (step) => {
      const result = buildStepSchema(step, state, getLeafConfig);
      const success = result.success !== false;
      dispatch({ type: ACTIONS.SET_STEP_ERRORS, payload: { step, errors: success ? null : result } });
      return { success, result };
    },
    [state, dispatch]
  );

  return { validateStep };
}
