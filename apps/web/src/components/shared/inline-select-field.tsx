import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";

interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: React.ReactNode;
}

interface InlineSelectFieldProps {
  value: string;
  options: SelectOption[];
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  canEdit?: boolean;
  variant?: "badge" | "button";
}

export function InlineSelectField({
  value,
  options,
  onSave,
  disabled = false,
  placeholder = "Select...",
  className,
  canEdit = true,
  variant = "badge",
}: InlineSelectFieldProps) {
  const [isSaving, setIsSaving] = useState(false);

  const currentOption = options.find((opt) => opt.value === value);

  const handleSelect = async (newValue: string) => {
    if (newValue === value || disabled || !canEdit) return;

    setIsSaving(true);
    try {
      await onSave(newValue);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) {
    if (variant === "badge") {
      return (
        <Badge variant="secondary" className={cn(currentOption?.color, className)}>
          {currentOption?.icon}
          {currentOption?.label || placeholder}
        </Badge>
      );
    }
    return (
      <span className={className}>
        {currentOption?.label || placeholder}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled || isSaving}>
        {variant === "badge" ? (
          <Badge
            variant="secondary"
            className={cn(
              "cursor-pointer hover:opacity-80 transition-opacity",
              currentOption?.color,
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            role="button"
            aria-label={`Change ${currentOption?.label || placeholder}`}
          >
            {currentOption?.icon}
            {currentOption?.label || placeholder}
            <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
          </Badge>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || isSaving}
            className={cn(className)}
            aria-label={`Change ${currentOption?.label || placeholder}`}
          >
            {currentOption?.icon}
            {currentOption?.label || placeholder}
            <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent role="menu">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={isSaving}
            className="flex items-center justify-between"
            role="menuitem"
          >
            <span className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </span>
            {option.value === value && (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default InlineSelectField;

