import React, { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function TagsInput({ value = [], onChange, placeholder = "Type and press Enter" }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index) => onChange(value.filter((_, i) => i !== index));

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
      {value.map((tag, index) => (
        <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button type="button" onClick={() => removeTag(index)} className="rounded-full hover:bg-black/10">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length ? "" : placeholder}
        className="h-6 flex-1 min-w-24 border-none p-0 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
