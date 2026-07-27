import React, { createContext, useMemo, useReducer } from "react";
import { contractWizardReducer, createInitialState } from "./contractWizardReducer";

export const ContractWizardContext = createContext(null);

export function ContractWizardProvider({ clientId, children }) {
  const [state, dispatch] = useReducer(contractWizardReducer, { clientId }, createInitialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <ContractWizardContext.Provider value={value}>{children}</ContractWizardContext.Provider>;
}
