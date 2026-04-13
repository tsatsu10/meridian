// Standardized page layout with consistent spacing and structure
import React from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StandardPageLayoutProps {
  children: React.ReactNode;
  
  // Header configuration
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  
  // Navigation
  showBackButton?: boolean;
  backHref?: string;
  onBack?: () => void;
  
  // Actions
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  };
  
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  
  // Layout options
  fullWidth?: boolean;
  noPadding?: boolean;
  noHeader?: boolean;
  headerContent?: React.ReactNode;
  
  // SEO and accessibility
  description?: string;
  className?: string;
}

export const StandardPageLayout: React.FC<StandardPageLayoutProps> = ({
  children,
  title,
  subtitle,
  icon: Icon,
  badge,
  showBackButton = false,
  backHref,
  onBack,
  primaryAction,
  secondaryActions = [],
  fullWidth = false,
  noPadding = false,
  noHeader = false,
  headerContent,
  description,
  className,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      window.history.pushState(null, '', backHref);
    } else {
      window.history.back();
    }
  };

  return (
    <div className={cn('flex flex-col min-h-0 flex-1', className)}>
      {/* Page Header */}
      {!noHeader && (
        <div className={cn(
          'flex flex-col gap-4 pb-4',
          !noPadding && 'px-6 pt-6'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Back Button */}
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="shrink-0"
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              
              {/* Title Section */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {Icon && (
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                )}
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight truncate">
                      {title}
                    </h1>
                    {badge && (
                      <Badge variant="secondary" className="shrink-0">
                        {badge}
                      </Badge>
                    )}
                  </div>
                  
                  {subtitle && (
                    <p className="text-muted-foreground text-sm mt-1 truncate">
                      {subtitle}
                    </p>
                  )}
                  
                  {description && (
                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Secondary Actions Dropdown */}
              {secondaryActions.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {secondaryActions.map((action, index) => {
                      const ActionIcon = action.icon;
                      return (
                        <DropdownMenuItem
                          key={index}
                          onClick={action.onClick}
                          disabled={action.disabled}
                        >
                          {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                          {action.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              
              {/* Primary Action */}
              {primaryAction && (
                <Button
                  variant={primaryAction.variant || 'default'}
                  size="sm"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled || primaryAction.loading}
                  className="shrink-0"
                >
                  {primaryAction.loading ? 'Loading...' : primaryAction.label}
                </Button>
              )}
            </div>
          </div>
          
          {/* Custom Header Content */}
          {headerContent && (
            <div className="w-full">
              {headerContent}
            </div>
          )}
          
          <Separator />
        </div>
      )}
      
      {/* Page Content */}
      <div className={cn(
        'flex-1 min-h-0',
        !fullWidth && 'max-w-7xl mx-auto w-full',
        !noPadding && !noHeader && 'px-6 pb-6',
        !noPadding && noHeader && 'p-6'
      )}>
        {children}
      </div>
    </div>
  );
};

// Specialized layout for dashboard pages
export const DashboardPageLayout: React.FC<StandardPageLayoutProps> = (props) => {
  return (
    <StandardPageLayout
      {...props}
      fullWidth={props.fullWidth ?? true}
    />
  );
};

// Specialized layout for settings pages
export const SettingsPageLayout: React.FC<StandardPageLayoutProps> = (props) => {
  return (
    <StandardPageLayout
      {...props}
      showBackButton={props.showBackButton ?? true}
      fullWidth={false}
    />
  );
};

// Specialized layout for detail pages (like task/project details)
export const DetailPageLayout: React.FC<StandardPageLayoutProps> = (props) => {
  return (
    <StandardPageLayout
      {...props}
      showBackButton={props.showBackButton ?? true}
      fullWidth={false}
    />
  );
};

// Layout with tabs
interface TabbedPageLayoutProps extends StandardPageLayoutProps {
  tabs: Array<{
    id: string;
    label: string;
    href?: string;
    isActive?: boolean;
    count?: number;
  }>;
  onTabChange?: (tabId: string) => void;
}

export const TabbedPageLayout: React.FC<TabbedPageLayoutProps> = ({
  tabs,
  onTabChange,
  ...props
}) => {
  const tabsElement = (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange?.(tab.id)}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors duration-200',
            'border-b-2 border-transparent hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            tab.isActive
              ? 'text-foreground border-primary'
              : 'text-muted-foreground hover:border-muted-foreground'
          )}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.count !== undefined && (
              <Badge
                variant={tab.isActive ? 'default' : 'secondary'}
                className="h-5 px-1.5 text-xs"
              >
                {tab.count}
              </Badge>
            )}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <StandardPageLayout
      {...props}
      headerContent={
        <div className="flex flex-col gap-4">
          {props.headerContent}
          {tabsElement}
        </div>
      }
    />
  );
};

export default StandardPageLayout;