import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { sanitizeString } from "@/utils/xss-protection";

interface InlineEditableFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  maxLength?: number;
  multiline?: boolean;
  canEdit?: boolean;
}

export function InlineEditableField({
  value,
  onSave,
  disabled = false,
  placeholder = "Click to edit",
  className,
  inputClassName,
  maxLength = 200,
  multiline = false,
  canEdit = true,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    const sanitized = sanitizeString(editValue.trim());
    
    if (sanitized === value || !sanitized) {
      setIsEditing(false);
      setEditValue(value);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(sanitized);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!canEdit) {
    return <span className={className}>{value || placeholder}</span>;
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => !disabled && setIsEditing(true)}
        disabled={disabled}
        className={cn(
          "text-left hover:bg-muted/50 rounded px-2 py-1 -mx-2 -my-1 transition-colors group",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        aria-label={`Edit ${value}`}
      >
        <span className="flex items-center gap-2">
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <Pencil
            className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        </span>
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        disabled={isSaving || disabled}
        maxLength={maxLength}
        className={cn("h-8", inputClassName)}
        placeholder={placeholder}
        aria-label="Edit field"
      />
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving || disabled}
          className="h-8 w-8 p-0"
          aria-label="Save"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving || disabled}
          className="h-8 w-8 p-0"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export default InlineEditableField;

