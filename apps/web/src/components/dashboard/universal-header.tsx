// @epic-3.5-communication: Universal header component for consistent PageHeaderActions across all pages
// @persona-sarah: PM needs consistent access to quick actions from any page
// @persona-jennifer: Exec needs streamlined header controls across all views
// @persona-david: Team lead needs team management access from any header
// @persona-mike: Dev needs minimal header with consistent actions
// @persona-lisa: Designer needs clean header design across all pages

import PageHeaderActions from "@/components/dashboard/page-header-actions";
import { cn } from "@/lib/cn";
// import { useBreadcrumbs } from "@/components/navigation/hooks/useBreadcrumbs";
// import { NavBreadcrumbs } from "@/components/navigation/components/NavBreadcrumbs";
// import type { BreadcrumbItem } from "@/components/navigation/providers/NavigationProvider";
import { PerformanceBadge } from "@/components/performance/performance-badge";
import { OfflineStatusIndicator } from "@/components/pwa/OfflineStatusIndicator";

interface UniversalHeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "minimal" | "compact" | "hero";
  showPageHeaderActions?: boolean;
  customActions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backButton?: { label?: string; onClick: () => void };
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  meta?: React.ReactNode;
}

export default function UniversalHeader({
  title,
  subtitle,
  className,
  children,
  variant = "default",
  showPageHeaderActions = true,
  customActions,
  breadcrumbs,
  backButton,
  badge,
  avatar,
  meta,
}: UniversalHeaderProps) {
  // Variant-based styling
  const headerVariants = {
    default: "flex items-center justify-between p-6 bg-white dark:bg-card border-b border-border glass-card",
    minimal: "flex items-center justify-between px-4 py-3 bg-transparent",
    compact: "flex items-center justify-between px-4 py-2 bg-white/50 dark:bg-card/50 backdrop-blur-sm border-b border-border/50",
    hero: "border-medium bg-gradient-subtle pb-8 mb-8"
  };

  const titleVariants = {
    default: "text-2xl",
    minimal: "text-xl",
    compact: "text-lg",
    hero: "text-4xl md:text-5xl"
  };

  return (
    <header className={cn(headerVariants[variant], className)}>
      <div className="flex items-center justify-between w-full">
        {/* Left Section - Title & Subtitle */}
        <div className="flex items-center space-x-4">
          {/* Back Button */}
          {backButton && (
            <button
              type="button"
              onClick={backButton.onClick}
              aria-label={backButton.label || "Back"}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">{backButton.label || 'Back'}</span>
            </button>
          )}

          {/* Avatar */}
          {avatar && (
            <div className="flex-shrink-0">
              {avatar}
            </div>
          )}

          {/* Title Section */}
          {title && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className={cn(
                  "font-bold text-foreground gradient-text",
                  titleVariants[variant]
                )}>
                  {title}
                </h1>
                {badge && badge}
              </div>
              
              {subtitle && (
                <p className="text-muted-foreground text-sm mt-1">
                  {subtitle}
                </p>
              )}

              {meta && (
                <div className="mt-2">
                  {meta}
                </div>
              )}
            </div>
          )}
          
          {children && (
            <div className="flex items-center space-x-2">
              {children}
            </div>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-3">
          {/* Performance Badge - Desktop only */}
          {variant !== 'minimal' && (
            <div className="hidden lg:block">
              <PerformanceBadge 
                showDetails={false}
                enableTracking={true}
              />
            </div>
          )}
          
          {/* Offline Indicator */}
          <OfflineStatusIndicator showDetails={false} />
          
          {/* Custom Actions */}
          {customActions && (
            <div className="flex items-center space-x-2">
              {customActions}
            </div>
          )}

          {/* Page Header Actions */}
          {showPageHeaderActions && (
            <PageHeaderActions 
              variant={variant === "hero" ? "default" : variant}
            />
          )}
        </div>
      </div>

      {/* Legacy static breadcrumbs support */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm mt-4 pt-4 border-t border-border/50">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && (
                <span className="text-muted-foreground mx-2">/</span>
              )}
              {crumb.href ? (
                <a 
                  href={crumb.href}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
} 