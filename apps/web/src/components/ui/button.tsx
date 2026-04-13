import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    // Base styles from Meridian design system
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-lg text-sm font-medium ring-offset-background",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "relative overflow-hidden",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-meridian-primary hover:bg-meridian-primary-600 active:bg-meridian-primary-700",
          "text-white shadow-primary hover:shadow-primary-lg",
          "border border-meridian-primary-600/20",
          "hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
        ],
        destructive: [
          "bg-meridian-error hover:bg-meridian-error-600 active:bg-meridian-error-700",
          "text-white shadow-error hover:shadow-error-lg",
          "border border-meridian-error-600/20"
        ],
        outline: [
          "border border-meridian-neutral-300 hover:border-meridian-primary-400",
          "bg-transparent hover:bg-meridian-primary-50 active:bg-meridian-primary-100",
          "text-meridian-neutral-700 hover:text-meridian-primary-700",
          "shadow-meridian-sm hover:shadow-meridian-md"
        ],
        secondary: [
          "bg-meridian-neutral-100 hover:bg-meridian-neutral-200 active:bg-meridian-neutral-300",
          "text-meridian-neutral-900 shadow-meridian-sm hover:shadow-meridian-md",
          "border border-meridian-neutral-200 hover:border-meridian-neutral-300"
        ],
        ghost: [
          "border-transparent bg-transparent",
          "hover:bg-meridian-neutral-100 active:bg-meridian-neutral-200",
          "text-meridian-neutral-700 hover:text-meridian-neutral-900"
        ],
        link: [
          "text-meridian-primary underline-offset-4 hover:underline",
          "hover:text-meridian-primary-600"
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
        default: "h-10 px-4 text-sm gap-2",
        lg: "h-11 px-6 text-base gap-2",
        xl: "h-12 px-8 text-lg gap-3",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
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

    const content = (
      <>
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
      </>
    );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {asChild ? (
          <span className="inline-flex items-center justify-center gap-2 w-full h-full">
            {content}
          </span>
        ) : content}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
