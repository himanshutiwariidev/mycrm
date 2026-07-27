import { useEffect } from "react";

/** Warns on tab close/refresh while there are unsaved changes. No react-router
 * blocker is used since the app runs a plain <BrowserRouter>/<Routes>, not a
 * data router — in-app navigation is guarded separately via confirm() on the
 * wizard's own Cancel/Back controls (see UnsavedChangesGuard). */
export function useBeforeUnloadWarning(isDirty) {
  useEffect(() => {
    function handler(e) {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
