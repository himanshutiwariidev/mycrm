import { useEffect, useSyncExternalStore } from "react";
import API from "../services/api";

// The client's industry — "Category" in the client form. No fixed list: they
// live on the server (backend/models/ClientCategory.js) and are added from the
// form's "+" button. Loaded once and shared by every screen that shows them.

const EMPTY = [];
let cache = null; // [{ _id, name, value }]
let pending = null;
const listeners = new Set();
const publish = (list) => { cache = list; listeners.forEach((fn) => fn()); };
const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const snapshot = () => cache || EMPTY;

function load() {
  if (!pending) {
    pending = API.get("/client-categories")
      .then(({ data }) => publish(data.categories || []))
      .catch(() => { pending = null; if (!cache) publish([]); });
  }
  return pending;
}

/** { categories, addCategory(name) → category } */
export function useClientCategories() {
  const categories = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => { if (!cache) load(); }, []);

  const addCategory = async (name) => {
    const { data } = await API.post("/client-categories", { name });
    const list = cache || [];
    if (!list.some((c) => c.value === data.category.value)) {
      publish([...list, data.category].sort((a, b) => a.name.localeCompare(b.name)));
    }
    return data;
  };

  return { categories, addCategory };
}

/** Display name of a saved category value (falls back to a tidied value). */
export function clientCategoryLabel(value, categories = cache || []) {
  if (!value) return "";
  return categories.find((c) => c.value === value)?.name
    || String(value).split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
