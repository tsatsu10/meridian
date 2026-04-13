// @epic-3.5-communication: Professional form component system with light mode design system
// @persona-sarah: PM needs efficient forms for project and task creation
// @persona-jennifer: Exec needs polished forms for strategic inputs
// @persona-david: Team lead needs team management forms and reporting
// @persona-mike: Dev needs minimal, fast forms for development workflows
// @persona-lisa: Designer needs aesthetically pleasing form components

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, Loader2, Eye, EyeOff } from "lucide-react";

// Form Field Container
const meridianFormFieldVariants = cva(
  [
    "space-y-2",
    "transition-all duration-200 ease-out"
  ],
  {
    variants: {
      size: {
        sm: "space-y-1",
        md: "space-y-2", 
        lg: "space-y-3"
      }
    },
    defaultVariants: {
      size: "md"
    }
  }
);

export interface MeridianFormFieldProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianFormFieldVariants> {
  error?: string;
  success?: string;
  info?: string;
  required?: boolean;
}

const MeridianFormField = React.forwardRef<HTMLDivElement, MeridianFormFieldProps>(
  ({ className, size, error, success, info, required, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(meridianFormFieldVariants({ size, className }))}
        {...props}
      >
        {children}
        
        {/* Validation Messages */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-meridian-error">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="flex items-center gap-2 text-sm text-meridian-success">
            <CheckCircle className="h-4 w-4" />
            <span>{success}</span>
          </div>
        )}
        
        {info && !error && !success && (
          <div className="flex items-center gap-2 text-sm text-meridian-neutral-600">
            <Info className="h-4 w-4" />
            <span>{info}</span>
          </div>
        )}
      </div>
    );
  }
);
MeridianFormField.displayName = "MeridianFormField";

// Form Label
const meridianFormLabelVariants = cva(
  [
    "text-sm font-medium text-meridian-neutral-700",
    "transition-colors duration-200"
  ],
  {
    variants: {
      variant: {
        default: "",
        required: "after:content-['*'] after:ml-1 after:text-meridian-error",
        optional: "after:content-['(optional)'] after:ml-1 after:text-meridian-neutral-500 after:font-normal"
      },
      size: {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface MeridianFormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof meridianFormLabelVariants> {}

const MeridianFormLabel = React.forwardRef<HTMLLabelElement, MeridianFormLabelProps>(
  ({ className, variant, size, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(meridianFormLabelVariants({ variant, size, className }))}
      {...props}
    />
  )
);
MeridianFormLabel.displayName = "MeridianFormLabel";

// Form Input
const meridianFormInputVariants = cva(
  [
    "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm",
    "ring-offset-background transition-all duration-200 ease-out",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium",
    "placeholder:text-muted-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "group-focus-within:ring-2 group-focus-within:ring-offset-2"
  ],
  {
    variants: {
      variant: {
        default: [
          "border-meridian-neutral-300 hover:border-meridian-neutral-400",
          "focus-visible:border-meridian-primary focus-visible:ring-meridian-primary/20",
          "group-focus-within:border-meridian-primary group-focus-within:ring-meridian-primary/20"
        ],
        error: [
          "border-meridian-error hover:border-meridian-error-600",
          "focus-visible:border-meridian-error focus-visible:ring-meridian-error/20"
        ],
        success: [
          "border-meridian-success hover:border-meridian-success-600",
          "focus-visible:border-meridian-success focus-visible:ring-meridian-success/20"
        ],
        glass: [
          "glass-light border-glass-border-light backdrop-blur-lg",
          "hover:bg-glass-bg-light focus-visible:bg-glass-bg-light",
          "focus-visible:border-meridian-primary focus-visible:ring-meridian-primary/20"
        ]
      },
      size: {
        sm: "h-8 px-2 py-1 text-xs",
        md: "h-10 px-3 py-2 text-sm",
        lg: "h-12 px-4 py-3 text-base",
        xl: "h-14 px-5 py-4 text-lg"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface MeridianFormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof meridianFormInputVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean;
  success?: boolean;
}

const MeridianFormInput = React.forwardRef<HTMLInputElement, MeridianFormInputProps>(
  ({ 
    className, 
    variant, 
    size,
    loading,
    leftIcon,
    rightIcon,
    error,
    success,
    type = "text",
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [inputVariant, setInputVariant] = React.useState(variant);

    React.useEffect(() => {
      if (error) setInputVariant('error');
      else if (success) setInputVariant('success');
      else setInputVariant(variant);
    }, [error, success, variant]);

    const isPasswordType = type === 'password';
    const actualType = isPasswordType && showPassword ? 'text' : type;

    return (
      <div className="relative group">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-meridian-neutral-500 pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={actualType}
          className={cn(
            meridianFormInputVariants({ variant: inputVariant, size, className }),
            leftIcon && "pl-10",
            (rightIcon || isPasswordType || loading) && "pr-10"
          )}
          ref={ref}
          disabled={loading}
          {...props}
        />

        {/* Right Side Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-meridian-neutral-500" />
          )}

          {isPasswordType && !loading && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-meridian-neutral-500 hover:text-meridian-neutral-700 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}

          {rightIcon && !loading && !isPasswordType && (
            <div className="text-meridian-neutral-500">
              {rightIcon}
            </div>
          )}
        </div>
      </div>
    );
  }
);
MeridianFormInput.displayName = "MeridianFormInput";

// Form Textarea
export interface MeridianFormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof meridianFormInputVariants> {
  error?: boolean;
  success?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const MeridianFormTextarea = React.forwardRef<HTMLTextAreaElement, MeridianFormTextareaProps>(
  ({ 
    className, 
    variant, 
    size,
    error,
    success,
    resize = 'vertical',
    ...props 
  }, ref) => {
    const [inputVariant, setInputVariant] = React.useState(variant);

    React.useEffect(() => {
      if (error) setInputVariant('error');
      else if (success) setInputVariant('success');
      else setInputVariant(variant);
    }, [error, success, variant]);

    return (
      <textarea
        className={cn(
          meridianFormInputVariants({ variant: inputVariant, size }),
          "min-h-[80px]",
          resize === 'none' && "resize-none",
          resize === 'vertical' && "resize-y",
          resize === 'horizontal' && "resize-x",
          resize === 'both' && "resize",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
MeridianFormTextarea.displayName = "MeridianFormTextarea";

// Form Select
export interface MeridianFormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof meridianFormInputVariants> {
  error?: boolean;
  success?: boolean;
  placeholder?: string;
}

const MeridianFormSelect = React.forwardRef<HTMLSelectElement, MeridianFormSelectProps>(
  ({ 
    className, 
    variant, 
    size,
    error,
    success,
    placeholder,
    children,
    ...props 
  }, ref) => {
    const [inputVariant, setInputVariant] = React.useState(variant);

    React.useEffect(() => {
      if (error) setInputVariant('error');
      else if (success) setInputVariant('success');
      else setInputVariant(variant);
    }, [error, success, variant]);

    return (
      <div className="relative">
        <select
          className={cn(
            meridianFormInputVariants({ variant: inputVariant, size }),
            "appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K')] bg-no-repeat",
            "bg-[length:12px_8px] bg-[right_12px_center] pr-10",
            className
          )}
          ref={ref}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
      </div>
    );
  }
);
MeridianFormSelect.displayName = "MeridianFormSelect";

// Form Checkbox
export interface MeridianFormCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MeridianFormCheckbox = React.forwardRef<HTMLInputElement, MeridianFormCheckboxProps>(
  ({ 
    className, 
    label,
    description,
    error,
    size = 'md',
    id,
    ...props 
  }, ref) => {
    const checkboxId = id || React.useId();
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };

    return (
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          id={checkboxId}
          className={cn(
            "rounded border-2 text-meridian-primary transition-all duration-200",
            "focus:ring-2 focus:ring-meridian-primary/20 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-meridian-error" : "border-meridian-neutral-300 hover:border-meridian-neutral-400",
            sizeClasses[size],
            className
          )}
          ref={ref}
          {...props}
        />
        
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label 
                htmlFor={checkboxId}
                className={cn(
                  "font-medium cursor-pointer transition-colors",
                  error ? "text-meridian-error" : "text-meridian-neutral-700 hover:text-meridian-neutral-900",
                  size === 'sm' ? "text-sm" : size === 'lg' ? "text-base" : "text-sm"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                "text-meridian-neutral-600",
                size === 'sm' ? "text-xs" : "text-sm",
                label && "mt-1"
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
MeridianFormCheckbox.displayName = "MeridianFormCheckbox";

// Form Radio Group
export interface MeridianFormRadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const MeridianFormRadio = React.forwardRef<HTMLInputElement, MeridianFormRadioProps>(
  ({ 
    className, 
    label,
    description,
    error,
    size = 'md',
    id,
    ...props 
  }, ref) => {
    const radioId = id || React.useId();
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };

    return (
      <div className="flex items-start space-x-3">
        <input
          type="radio"
          id={radioId}
          className={cn(
            "rounded-full border-2 text-meridian-primary transition-all duration-200",
            "focus:ring-2 focus:ring-meridian-primary/20 focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-meridian-error" : "border-meridian-neutral-300 hover:border-meridian-neutral-400",
            sizeClasses[size],
            className
          )}
          ref={ref}
          {...props}
        />
        
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label 
                htmlFor={radioId}
                className={cn(
                  "font-medium cursor-pointer transition-colors",
                  error ? "text-meridian-error" : "text-meridian-neutral-700 hover:text-meridian-neutral-900",
                  size === 'sm' ? "text-sm" : size === 'lg' ? "text-base" : "text-sm"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                "text-meridian-neutral-600",
                size === 'sm' ? "text-xs" : "text-sm",
                label && "mt-1"
              )}>
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);
MeridianFormRadio.displayName = "MeridianFormRadio";

export {
  MeridianFormField,
  MeridianFormLabel,
  MeridianFormInput,
  MeridianFormTextarea,
  MeridianFormSelect,
  MeridianFormCheckbox,
  MeridianFormRadio,
  meridianFormFieldVariants,
  meridianFormLabelVariants,
  meridianFormInputVariants
}; 