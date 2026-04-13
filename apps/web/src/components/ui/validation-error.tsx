import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

interface ValidationErrorProps {
  errors: ValidationError[];
  onDismiss?: () => void;
  className?: string;
  title?: string;
  variant?: "error" | "warning" | "info";
}

export function ValidationError({ 
  errors, 
  onDismiss, 
  className, 
  title = "Validation Error",
  variant = "error"
}: ValidationErrorProps) {
  if (!errors || errors.length === 0) {
    return null;
  }

  const variantStyles = {
    error: {
      container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      icon: "text-red-500",
      title: "text-red-700 dark:text-red-300",
      message: "text-red-600 dark:text-red-400"
    },
    warning: {
      container: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
      icon: "text-yellow-500",
      title: "text-yellow-700 dark:text-yellow-300",
      message: "text-yellow-600 dark:text-yellow-400"
    },
    info: {
      container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
      icon: "text-blue-500",
      title: "text-blue-700 dark:text-blue-300",
      message: "text-blue-600 dark:text-blue-400"
    }
  };

  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "p-3 border rounded-lg",
      styles.container,
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className={cn("w-4 h-4", styles.icon)} />
          <span className={cn("font-medium text-sm", styles.title)}>
            {title} {errors.length > 1 && `(${errors.length})`}
          </span>
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-auto p-1 hover:bg-transparent"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <div className="space-y-1">
        {errors.map((error, index) => (
          <div key={index} className={cn("text-sm", styles.message)}>
            <span className="font-medium">{error.field}:</span> {error.message}
          </div>
        ))}
      </div>
    </div>
  );
}

interface FieldValidationErrorProps {
  error?: string;
  className?: string;
}

export function FieldValidationError({ error, className }: FieldValidationErrorProps) {
  if (!error) {
    return null;
  }

  return (
    <p className={cn("text-sm text-red-500 mt-1", className)}>
      {error}
    </p>
  );
} 