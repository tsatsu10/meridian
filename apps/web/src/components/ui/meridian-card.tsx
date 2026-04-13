// @epic-3.5-communication: Professional card component with light mode design system
// @persona-sarah: PM needs clean, organized card layouts for task overview
// @persona-jennifer: Exec needs polished card presentation for dashboards
// @persona-david: Team lead needs clear visual hierarchy in cards
// @persona-mike: Dev needs efficient, minimal card design
// @persona-lisa: Designer needs aesthetically pleasing card components

import React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const meridianCardVariants = cva(
  [
    // Base styles
    "rounded-xl border transition-all duration-300 ease-out",
    "bg-background/80 backdrop-blur-sm",
    "shadow-meridian-sm hover:shadow-meridian-md",
    "relative overflow-hidden"
  ],
  {
    variants: {
      variant: {
        default: [
          "border-border bg-card text-card-foreground",
          "hover:bg-card/90 hover:border-border-strong"
        ],
        elevated: [
          "border-border bg-card text-card-foreground shadow-meridian-lg",
          "hover:shadow-meridian-xl hover:bg-card/95",
          "hover:-translate-y-1"
        ],
        glass: [
          "glass-card-light border-glass-border-light",
          "hover:bg-glass-bg-light"
        ],
        primary: [
          "border-primary/20 bg-primary/5 text-foreground",
          "hover:bg-primary/10 hover:border-primary/30",
          "shadow-primary"
        ],
        success: [
          "border-meridian-success/20 bg-meridian-success/5 text-foreground",
          "hover:bg-meridian-success/10 hover:border-meridian-success/30",
          "shadow-success"
        ],
        warning: [
          "border-meridian-warning/20 bg-meridian-warning/5 text-foreground",
          "hover:bg-meridian-warning/10 hover:border-meridian-warning/30",
          "shadow-warning"
        ],
        error: [
          "border-meridian-error/20 bg-meridian-error/5 text-foreground",
          "hover:bg-meridian-error/10 hover:border-meridian-error/30",
          "shadow-error"
        ],
        gradient: [
          "border-transparent bg-gradient-to-br from-primary/10 via-background to-secondary/10",
          "hover:from-primary/15 hover:to-secondary/15",
          "shadow-meridian-md hover:shadow-meridian-lg"
        ]
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
        xl: "p-10"
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        false: ""
      },
      persona: {
        none: "",
        pm: [
          "theme-pm",
          "border-persona-pm-border bg-persona-pm-bg/50",
          "hover:bg-persona-pm-bg/70"
        ],
        tl: [
          "theme-tl",
          "border-persona-tl-border bg-persona-tl-bg/50",
          "hover:bg-persona-tl-bg/70"
        ],
        exec: [
          "theme-exec",
          "border-persona-exec-border bg-persona-exec-bg/50",
          "hover:bg-persona-exec-bg/70"
        ],
        dev: [
          "theme-dev",
          "border-persona-dev-border bg-persona-dev-bg/50",
          "hover:bg-persona-dev-bg/70"
        ],
        design: [
          "theme-design",
          "border-persona-design-border bg-persona-design-bg/50",
          "hover:bg-persona-design-bg/70"
        ]
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      interactive: false,
      persona: "none"
    }
  }
);

export interface MeridianCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianCardVariants> {
  asChild?: boolean;
}

const MeridianCard = React.forwardRef<HTMLDivElement, MeridianCardProps>(
  ({ className, variant, size, interactive, persona, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "div" : "div";

    return (
      <Comp
        className={cn(meridianCardVariants({ variant, size, interactive, persona, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
MeridianCard.displayName = "MeridianCard";

const meridianCardHeaderVariants = cva(
  [
    "flex flex-col space-y-1.5 pb-4",
    "border-b border-border/50"
  ],
  {
    variants: {
      variant: {
        default: "",
        centered: "text-center items-center",
        split: "flex-row items-start justify-between space-y-0"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface MeridianCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianCardHeaderVariants> {}

const MeridianCardHeader = React.forwardRef<HTMLDivElement, MeridianCardHeaderProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(meridianCardHeaderVariants({ variant, className }))}
      {...props}
    />
  )
);
MeridianCardHeader.displayName = "MeridianCardHeader";

const MeridianCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-h4 font-semibold leading-none tracking-tight text-foreground",
      className
    )}
    {...props}
  />
));
MeridianCardTitle.displayName = "MeridianCardTitle";

const MeridianCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
MeridianCardDescription.displayName = "MeridianCardDescription";

const MeridianCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-4", className)} {...props} />
));
MeridianCardContent.displayName = "MeridianCardContent";

const meridianCardFooterVariants = cva(
  [
    "flex items-center pt-4",
    "border-t border-border/50"
  ],
  {
    variants: {
      variant: {
        default: "justify-start",
        centered: "justify-center",
        split: "justify-between",
        end: "justify-end"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface MeridianCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianCardFooterVariants> {}

const MeridianCardFooter = React.forwardRef<HTMLDivElement, MeridianCardFooterProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(meridianCardFooterVariants({ variant, className }))}
      {...props}
    />
  )
);
MeridianCardFooter.displayName = "MeridianCardFooter";

// Specialized Card Components

export interface StatsCardProps extends MeridianCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorScheme?: "primary" | "success" | "warning" | "error";
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ 
    title, 
    value, 
    description, 
    icon, 
    trend, 
    colorScheme = "primary",
    className,
    ...props 
  }, ref) => {
    const trendColor = trend?.isPositive ? "text-meridian-success" : "text-meridian-error";
    const trendIcon = trend?.isPositive ? "↗" : "↘";

    return (
      <MeridianCard
        ref={ref}
        variant="elevated"
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        {/* Background decoration */}
        <div className={cn(
          "absolute top-0 right-0 w-20 h-20 opacity-10 -mr-10 -mt-10 rounded-full",
          colorScheme === "primary" && "bg-meridian-primary",
          colorScheme === "success" && "bg-meridian-success",
          colorScheme === "warning" && "bg-meridian-warning",
          colorScheme === "error" && "bg-meridian-error"
        )} />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-caption text-muted-foreground">{title}</p>
            {icon && (
              <div className={cn(
                "p-2 rounded-lg",
                colorScheme === "primary" && "bg-meridian-primary/10 text-meridian-primary",
                colorScheme === "success" && "bg-meridian-success/10 text-meridian-success",
                colorScheme === "warning" && "bg-meridian-warning/10 text-meridian-warning",
                colorScheme === "error" && "bg-meridian-error/10 text-meridian-error"
              )}>
                {icon}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-display-md font-bold text-foreground">{value}</p>
            
            {(description || trend) && (
              <div className="flex items-center justify-between">
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
                {trend && (
                  <div className={cn("flex items-center text-sm font-medium", trendColor)}>
                    <span className="mr-1">{trendIcon}</span>
                    {Math.abs(trend.value)}%
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </MeridianCard>
    );
  }
);
StatsCard.displayName = "StatsCard";

export interface ActionCardProps extends MeridianCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  href?: string;
}

const ActionCard = React.forwardRef<HTMLDivElement, ActionCardProps>(
  ({ title, description, icon, action, href, className, ...props }, ref) => {
    const isClickable = !!(href || props.onClick);

    return (
      <MeridianCard
        ref={ref}
        variant="default"
        interactive={isClickable}
        className={cn("group", className)}
        {...props}
      >
        <div className="flex items-start space-x-4">
          {icon && (
            <div className="flex-shrink-0 p-3 bg-primary/10 text-primary rounded-lg group-hover:bg-primary/20 transition-colors">
              {icon}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="text-h5 font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
          
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </MeridianCard>
    );
  }
);
ActionCard.displayName = "ActionCard";

export {
  MeridianCard,
  MeridianCardHeader,
  MeridianCardFooter,
  MeridianCardTitle,
  MeridianCardDescription,
  MeridianCardContent,
  StatsCard,
  ActionCard
}; 