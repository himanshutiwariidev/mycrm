import { useContext, useCallback } from "react";
import { ContractWizardContext } from "./ContractWizardContext";
import { ACTIONS } from "./contractWizardReducer";

export function useContractWizard() {
  const ctx = useContext(ContractWizardContext);
  if (!ctx) {
    throw new Error("useContractWizard must be used within a ContractWizardProvider");
  }
  const { state, dispatch } = ctx;

  const getSelectionsForCategory = useCallback(
    (categoryId) => state.selectedServices.find((c) => c.categoryId === categoryId)?.selections || [],
    [state.selectedServices]
  );

  const isLeafEnabled = useCallback(
    (categoryId, path) => {
      const cat = state.selectedServices.find((c) => c.categoryId === categoryId);
      return !!cat?.selections?.some((s) => s.path === path);
    },
    [state.selectedServices]
  );

  const getLeafSelection = useCallback(
    (categoryId, path) => {
      const cat = state.selectedServices.find((c) => c.categoryId === categoryId);
      return cat?.selections?.find((s) => s.path === path) || null;
    },
    [state.selectedServices]
  );

  const isCategoryEnabled = useCallback(
    (categoryId) => !!state.selectedServices.find((c) => c.categoryId === categoryId)?.enabled,
    [state.selectedServices]
  );

  return { state, dispatch, ACTIONS, getSelectionsForCategory, isLeafEnabled, getLeafSelection, isCategoryEnabled };
}
