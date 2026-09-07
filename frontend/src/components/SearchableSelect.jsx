import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import "./SearchableSelect.css";

// Lightweight searchable dropdown — no autocomplete library exists in this project.
// `options` is [{ value, label }]. `value` is the selected option's value (or "").
// When `creatable` is set, typing a name that doesn't match any option offers
// a "+ Use <name>" row that calls onChange with the raw typed text instead of
// an option's value — for fields (like Sales Person) that accept either an
// existing record's id or a plain name that doesn't exist as a record yet.
const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", emptyLabel = "No options found", disabled, creatable = false }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  // In creatable mode, `value` may be free text with no matching option —
  // still show it in the trigger instead of falling back to the placeholder.
  const triggerLabel = selected ? selected.label : (creatable && value ? value : "");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="searchable-select" ref={containerRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={triggerLabel ? "" : "searchable-select-placeholder"}>
          {triggerLabel || placeholder}
        </span>
        <ChevronDown size={16} />
      </button>

      {open && !disabled && (
        <div className="searchable-select-panel">
          <div className="searchable-select-search">
            <Search size={14} />
            <input
              type="text"
              autoFocus
              placeholder={creatable ? "Search or type a new name..." : "Search..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="searchable-select-list">
            {creatable && query.trim() && !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase()) && (
              <div
                className="searchable-select-option searchable-select-create"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                  setQuery("");
                }}
              >
                + Use "{query.trim()}"
              </div>
            )}
            {filtered.length === 0 ? (
              !creatable && <div className="searchable-select-empty">{emptyLabel}</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  className={`searchable-select-option ${o.value === value ? "selected" : ""}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
