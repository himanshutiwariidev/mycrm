import React, { useRef } from "react";
import { Paperclip, X, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Client-side-only file staging: keeps {name, size, objectUrl} references in
 * wizard state. Not wired to a real upload endpoint — no backend endpoint
 * exists today for per-service-item attachments (only client-level PI
 * attachments do). Persisting real binaries is a follow-up, not this pass.
 */
export default function AttachmentUploader({ value = [], onChange, className }) {
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).map((file) => ({
      name: file.name,
      size: file.size,
      objectUrl: URL.createObjectURL(file),
    }));
    onChange([...(value || []), ...files]);
  };

  const removeAt = (index) => {
    onChange((value || []).filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
      >
        <UploadCloud className="h-4 w-4" />
        Click to attach files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {value?.length > 0 && (
        <ul className="space-y-1">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-1.5 text-xs"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-muted-foreground">({Math.ceil(file.size / 1024)} KB)</span>
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeAt(index)}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
