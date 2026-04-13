// @epic-3.5-communication: Professional badge component with light mode design system
// @persona-sarah: PM needs clear status indicators for task and project management
// @persona-jennifer: Exec needs polished badge styling for reports and dashboards
// @persona-david: Team lead needs team status and role indicators
// @persona-mike: Dev needs minimal, efficient status badges
// @persona-lisa: Designer needs aesthetically pleasing badge designs

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const meridianBadgeVariants = cva(
  [
    // Base styles
    "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium",
    "rounded-full border transition-all duration-200 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-meridian-neutral-100 text-meridian-neutral-700 border-meridian-neutral-200",
          "hover:bg-meridian-neutral-200 hover:text-meridian-neutral-800"
        ],
        primary: [
          "bg-meridian-primary text-white border-meridian-primary-600",
          "shadow-primary hover:shadow-primary-lg hover:bg-meridian-primary-600"
        ],
        secondary: [
          "bg-meridian-neutral-50 text-meridian-neutral-600 border-meridian-neutral-200",
          "hover:bg-meridian-neutral-100 hover:text-meridian-neutral-700"
        ],
        success: [
          "bg-meridian-success text-white border-meridian-success-600",
          "shadow-success hover:shadow-success-lg hover:bg-meridian-success-600"
        ],
        warning: [
          "bg-meridian-warning text-white border-meridian-warning-600",
          "shadow-warning hover:shadow-warning-lg hover:bg-meridian-warning-600"
        ],
        error: [
          "bg-meridian-error text-white border-meridian-error-600",
          "shadow-error hover:shadow-error-lg hover:bg-meridian-error-600"
        ],
        outline: [
          "bg-transparent text-meridian-neutral-700 border-meridian-neutral-300",
          "hover:bg-meridian-neutral-50 hover:text-meridian-neutral-800 hover:border-meridian-neutral-400"
        ],
        "outline-primary": [
          "bg-transparent text-meridian-primary-600 border-meridian-primary-300",
          "hover:bg-meridian-primary-50 hover:text-meridian-primary-700 hover:border-meridian-primary-400"
        ],
        "outline-success": [
          "bg-transparent text-meridian-success-600 border-meridian-success-300",
          "hover:bg-meridian-success-50 hover:text-meridian-success-700 hover:border-meridian-success-400"
        ],
        "outline-warning": [
          "bg-transparent text-meridian-warning-600 border-meridian-warning-300",
          "hover:bg-meridian-warning-50 hover:text-meridian-warning-700 hover:border-meridian-warning-400"
        ],
        "outline-error": [
          "bg-transparent text-meridian-error-600 border-meridian-error-300",
          "hover:bg-meridian-error-50 hover:text-meridian-error-700 hover:border-meridian-error-400"
        ],
        soft: [
          "bg-meridian-primary-50 text-meridian-primary-700 border-meridian-primary-200",
          "hover:bg-meridian-primary-100 hover:text-meridian-primary-800"
        ],
        "soft-success": [
          "bg-meridian-success-50 text-meridian-success-700 border-meridian-success-200",
          "hover:bg-meridian-success-100 hover:text-meridian-success-800"
        ],
        "soft-warning": [
          "bg-meridian-warning-50 text-meridian-warning-700 border-meridian-warning-200",
          "hover:bg-meridian-warning-100 hover:text-meridian-warning-800"
        ],
        "soft-error": [
          "bg-meridian-error-50 text-meridian-error-700 border-meridian-error-200",
          "hover:bg-meridian-error-100 hover:text-meridian-error-800"
        ],
        gradient: [
          "bg-gradient-primary text-white border-transparent",
          "shadow-primary hover:shadow-primary-lg hover:opacity-90"
        ],
        glass: [
          "glass-light-subtle text-meridian-neutral-700",
          "border-glass-border-light-subtle backdrop-blur-lg",
          "hover:bg-glass-bg-light hover:text-meridian-neutral-800"
        ]
      },
      size: {
        xs: "text-xs px-2 py-0.5 gap-1",
        sm: "text-xs px-2.5 py-0.5 gap-1.5",
        md: "text-sm px-3 py-1 gap-1.5",
        lg: "text-sm px-4 py-1.5 gap-2",
        xl: "text-base px-5 py-2 gap-2"
      },
      persona: {
        none: "",
        pm: [
          "theme-pm",
          "[&[data-variant=primary]]:bg-persona-pm-primary [&[data-variant=primary]]:border-persona-pm-primary",
          "[&[data-variant=soft]]:bg-persona-pm-bg [&[data-variant=soft]]:text-persona-pm-primary [&[data-variant=soft]]:border-persona-pm-border"
        ],
        tl: [
          "theme-tl",
          "[&[data-variant=primary]]:bg-persona-tl-primary [&[data-variant=primary]]:border-persona-tl-primary",
          "[&[data-variant=soft]]:bg-persona-tl-bg [&[data-variant=soft]]:text-persona-tl-primary [&[data-variant=soft]]:border-persona-tl-border"
        ],
        exec: [
          "theme-exec",
          "[&[data-variant=primary]]:bg-persona-exec-primary [&[data-variant=primary]]:border-persona-exec-primary",
          "[&[data-variant=soft]]:bg-persona-exec-bg [&[data-variant=soft]]:text-persona-exec-primary [&[data-variant=soft]]:border-persona-exec-border"
        ],
        dev: [
          "theme-dev",
          "[&[data-variant=primary]]:bg-persona-dev-primary [&[data-variant=primary]]:border-persona-dev-primary",
          "[&[data-variant=soft]]:bg-persona-dev-bg [&[data-variant=soft]]:text-persona-dev-primary [&[data-variant=soft]]:border-persona-dev-border"
        ],
        design: [
          "theme-design",
          "[&[data-variant=primary]]:bg-persona-design-primary [&[data-variant=primary]]:border-persona-design-primary",
          "[&[data-variant=soft]]:bg-persona-design-bg [&[data-variant=soft]]:text-persona-design-primary [&[data-variant=soft]]:border-persona-design-border"
        ]
      },
      interactive: {
        true: "cursor-pointer hover:scale-105 active:scale-95",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
      persona: "none",
      interactive: false
    }
  }
);

export interface MeridianBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianBadgeVariants> {
  icon?: React.ReactNode;
  dot?: boolean;
  closeable?: boolean;
  onClose?: () => void;
}

const MeridianBadge = React.forwardRef<HTMLDivElement, MeridianBadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    persona, 
    interactive,
    icon, 
    dot, 
    closeable, 
    onClose,
    children, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(meridianBadgeVariants({ variant, size, persona, interactive, className }))}
        data-variant={variant}
        {...props}
      >
        {/* Status dot */}
        {dot && (
          <span className="w-2 h-2 rounded-full bg-current opacity-75" />
        )}

        {/* Icon */}
        {icon && (
          <span className="flex-shrink-0">
            {icon}
          </span>
        )}

        {/* Content */}
        <span className="flex-1 truncate">
          {children}
        </span>

        {/* Close button */}
        {closeable && onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
            aria-label="Remove badge"
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
MeridianBadge.displayName = "MeridianBadge";

// Specialized Badge Components

export interface StatusBadgeProps extends Omit<MeridianBadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled' | 'draft';
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, ...props }, ref) => {
    const statusConfig = {
      active: { variant: 'success' as const, dot: true, children: 'Active' },
      inactive: { variant: 'default' as const, dot: true, children: 'Inactive' },
      pending: { variant: 'warning' as const, dot: true, children: 'Pending' },
      completed: { variant: 'success' as const, dot: true, children: 'Completed' },
      cancelled: { variant: 'error' as const, dot: true, children: 'Cancelled' },
      draft: { variant: 'outline' as const, dot: true, children: 'Draft' }
    };

    const config = statusConfig[status];

    return (
      <MeridianBadge
        ref={ref}
        variant={config.variant}
        dot={config.dot}
        {...props}
      >
        {config.children}
      </MeridianBadge>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export interface PriorityBadgeProps extends Omit<MeridianBadgeProps, 'variant'> {
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const PriorityBadge = React.forwardRef<HTMLDivElement, PriorityBadgeProps>(
  ({ priority, ...props }, ref) => {
    const priorityConfig = {
      low: { variant: 'soft' as const, children: 'Low' },
      medium: { variant: 'soft-warning' as const, children: 'Medium' },
      high: { variant: 'warning' as const, children: 'High' },
      urgent: { variant: 'error' as const, children: 'Urgent' }
    };

    const config = priorityConfig[priority];

    return (
      <MeridianBadge
        ref={ref}
        variant={config.variant}
        {...props}
      >
        {config.children}
      </MeridianBadge>
    );
  }
);
PriorityBadge.displayName = "PriorityBadge";

export interface RoleBadgeProps extends Omit<MeridianBadgeProps, 'variant' | 'persona'> {
  role: 'admin' | 'manager' | 'member' | 'viewer' | 'guest';
  persona?: 'pm' | 'tl' | 'exec' | 'dev' | 'design';
}

const RoleBadge = React.forwardRef<HTMLDivElement, RoleBadgeProps>(
  ({ role, persona, ...props }, ref) => {
    const roleConfig = {
      admin: { variant: 'primary' as const, children: 'Admin' },
      manager: { variant: 'soft' as const, children: 'Manager' },
      member: { variant: 'outline-primary' as const, children: 'Member' },
      viewer: { variant: 'outline' as const, children: 'Viewer' },
      guest: { variant: 'default' as const, children: 'Guest' }
    };

    const config = roleConfig[role];

    return (
      <MeridianBadge
        ref={ref}
        variant={config.variant}
        persona={persona}
        {...props}
      >
        {config.children}
      </MeridianBadge>
    );
  }
);
RoleBadge.displayName = "RoleBadge";

export {
  MeridianBadge,
  StatusBadge,
  PriorityBadge,
  RoleBadge,
  meridianBadgeVariants
}; 