import { useCallback, useEffect } from "react";

const STORAGE_KEY = "contract-builder-dark-mode";

/** Scoped dark mode: toggles `.dark` only on the wizard root wrapper, persisted per-browser. Does not affect the rest of the app. */
export function useDarkModeToggle(darkMode, toggle) {
  const applyClass = useCallback((root, enabled) => {
    if (!root) return;
    root.classList.toggle("dark", enabled);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true" && !darkMode) toggle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(darkMode));
  }, [darkMode]);

  return { applyClass };
}
