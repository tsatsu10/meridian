// @epic-3.5-communication: Professional button component with light mode design system
// @persona-sarah: PM needs clear, action-oriented buttons for task management
// @persona-jennifer: Exec needs polished, executive-level button styling
// @persona-david: Team lead needs efficient button interactions
// @persona-mike: Dev needs minimal, fast-loading button components
// @persona-lisa: Designer needs aesthetically pleasing button designs

import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const meridianButtonVariants = cva(
  [
    // Base styles
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-medium ring-offset-background",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative overflow-hidden"
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-meridian-primary hover:bg-meridian-primary-600 active:bg-meridian-primary-700",
          "text-white shadow-primary hover:shadow-primary-lg",
          "border border-meridian-primary-600/20",
          "hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
        ],
        secondary: [
          "bg-meridian-neutral-100 hover:bg-meridian-neutral-200 active:bg-meridian-neutral-300",
          "text-meridian-neutral-900 shadow-meridian-sm hover:shadow-meridian-md",
          "border border-meridian-neutral-200 hover:border-meridian-neutral-300"
        ],
        outline: [
          "border border-meridian-neutral-300 hover:border-meridian-primary-400",
          "bg-transparent hover:bg-meridian-primary-50 active:bg-meridian-primary-100",
          "text-meridian-neutral-700 hover:text-meridian-primary-700",
          "shadow-meridian-sm hover:shadow-meridian-md"
        ],
        ghost: [
          "border-transparent bg-transparent",
          "hover:bg-meridian-neutral-100 active:bg-meridian-neutral-200",
          "text-meridian-neutral-700 hover:text-meridian-neutral-900"
        ],
        destructive: [
          "bg-meridian-error hover:bg-meridian-error-600 active:bg-meridian-error-700",
          "text-white shadow-error hover:shadow-error-lg",
          "border border-meridian-error-600/20"
        ],
        success: [
          "bg-meridian-success hover:bg-meridian-success-600 active:bg-meridian-success-700",
          "text-white shadow-success hover:shadow-success-lg",
          "border border-meridian-success-600/20"
        ],
        warning: [
          "bg-meridian-warning hover:bg-meridian-warning-600 active:bg-meridian-warning-700",
          "text-white shadow-warning hover:shadow-warning-lg",
          "border border-meridian-warning-600/20"
        ],
        gradient: [
          "bg-gradient-primary hover:opacity-90 active:opacity-80",
          "text-white shadow-primary hover:shadow-primary-lg",
          "border border-meridian-primary-600/20",
          "hover:scale-[1.02] hover:-translate-y-0.5"
        ],
        glass: [
          "glass-light hover:bg-glass-bg-light",
          "text-meridian-neutral-700 hover:text-meridian-neutral-900",
          "border border-glass-border-light hover:border-glass-border-light-subtle",
          "backdrop-blur-lg"
        ]
      },
      size: {
        xs: "h-7 px-2 text-xs gap-1",
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-10 px-4 text-sm gap-2",
        lg: "h-11 px-6 text-base gap-2",
        xl: "h-12 px-8 text-lg gap-3",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0"
      },
      persona: {
        none: "",
        pm: [
          "theme-pm",
          "[&[data-variant=primary]]:bg-persona-pm-primary [&[data-variant=primary]]:hover:bg-persona-pm-primary/90",
          "[&[data-variant=outline]]:border-persona-pm-border [&[data-variant=outline]]:hover:bg-persona-pm-bg",
          "[&[data-variant=outline]]:text-persona-pm-primary [&[data-variant=outline]]:hover:text-persona-pm-primary/90"
        ],
        tl: [
          "theme-tl",
          "[&[data-variant=primary]]:bg-persona-tl-primary [&[data-variant=primary]]:hover:bg-persona-tl-primary/90",
          "[&[data-variant=outline]]:border-persona-tl-border [&[data-variant=outline]]:hover:bg-persona-tl-bg",
          "[&[data-variant=outline]]:text-persona-tl-primary [&[data-variant=outline]]:hover:text-persona-tl-primary/90"
        ],
        exec: [
          "theme-exec",
          "[&[data-variant=primary]]:bg-persona-exec-primary [&[data-variant=primary]]:hover:bg-persona-exec-primary/90",
          "[&[data-variant=outline]]:border-persona-exec-border [&[data-variant=outline]]:hover:bg-persona-exec-bg",
          "[&[data-variant=outline]]:text-persona-exec-primary [&[data-variant=outline]]:hover:text-persona-exec-primary/90"
        ],
        dev: [
          "theme-dev",
          "[&[data-variant=primary]]:bg-persona-dev-primary [&[data-variant=primary]]:hover:bg-persona-dev-primary/90",
          "[&[data-variant=outline]]:border-persona-dev-border [&[data-variant=outline]]:hover:bg-persona-dev-bg",
          "[&[data-variant=outline]]:text-persona-dev-primary [&[data-variant=outline]]:hover:text-persona-dev-primary/90"
        ],
        design: [
          "theme-design",
          "[&[data-variant=primary]]:bg-persona-design-primary [&[data-variant=primary]]:hover:bg-persona-design-primary/90",
          "[&[data-variant=outline]]:border-persona-design-border [&[data-variant=outline]]:hover:bg-persona-design-bg",
          "[&[data-variant=outline]]:text-persona-design-primary [&[data-variant=outline]]:hover:text-persona-design-primary/90"
        ]
      },
      loading: {
        true: "pointer-events-none",
        false: ""
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      persona: "none",
      loading: false
    }
  }
);

export interface MeridianButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof meridianButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const MeridianButton = React.forwardRef<HTMLButtonElement, MeridianButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    persona,
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    asChild = false, 
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";

    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(meridianButtonVariants({ variant, size, persona, loading, className }))}
        ref={ref}
        disabled={isDisabled}
        data-variant={variant}
        {...props}
      >
        {/* Loading state */}
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}

        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}

        {/* Button content */}
        <span className="flex-1">
          {loading && loadingText ? loadingText : children}
        </span>

        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}

        {/* Ripple effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-lg">
          <span className="absolute inset-0 bg-white/20 translate-y-full group-active:translate-y-0 transition-transform duration-150" />
        </span>
      </Comp>
    );
  }
);
MeridianButton.displayName = "MeridianButton";

// Specialized Button Components

export interface IconButtonProps extends Omit<MeridianButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  label?: string;
  tooltip?: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, tooltip, size = "icon", variant = "ghost", className, ...props }, ref) => {
    return (
      <MeridianButton
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        aria-label={label || tooltip}
        title={tooltip}
        {...props}
      >
        {icon}
      </MeridianButton>
    );
  }
);
IconButton.displayName = "IconButton";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "segmented";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = "default", size = "md", orientation = "horizontal", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex",
          orientation === "horizontal" ? "flex-row" : "flex-col",
          variant === "segmented" && [
            "rounded-lg border border-meridian-neutral-200 bg-meridian-neutral-50 p-1",
            "[&>button]:rounded-md [&>button]:border-0",
            "[&>button:not([data-state=active])]:bg-transparent",
            "[&>button:not([data-state=active])]:shadow-none",
            "[&>button[data-state=active]]:bg-white [&>button[data-state=active]]:shadow-meridian-sm"
          ],
          variant === "default" && [
            orientation === "horizontal" ? "space-x-2" : "space-y-2"
          ],
          className
        )}
        {...props}
      />
    );
  }
);
ButtonGroup.displayName = "ButtonGroup";

export interface FloatingActionButtonProps extends MeridianButtonProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  offset?: string;
}

const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ 
    position = "bottom-right", 
    offset = "1.5rem",
    className, 
    size = "lg",
    variant = "primary",
    ...props 
  }, ref) => {
    const positionClasses = {
      "bottom-right": "bottom-6 right-6",
      "bottom-left": "bottom-6 left-6", 
      "top-right": "top-6 right-6",
      "top-left": "top-6 left-6"
    };

    return (
      <MeridianButton
        ref={ref}
        variant={variant}
        size={size}
        className={cn(
          "fixed z-50 rounded-full shadow-meridian-xl hover:shadow-meridian-2xl",
          "transition-all duration-300 ease-out",
          "hover:scale-110 active:scale-95",
          positionClasses[position],
          className
        )}
        style={{ 
          [position.includes('bottom') ? 'bottom' : 'top']: offset,
          [position.includes('right') ? 'right' : 'left']: offset
        }}
        {...props}
      />
    );
  }
);
FloatingActionButton.displayName = "FloatingActionButton";

export {
  MeridianButton,
  IconButton,
  ButtonGroup,
  FloatingActionButton,
  meridianButtonVariants
}; 