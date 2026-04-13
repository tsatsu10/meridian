// Standalone breadcrumbs bar that can be added anywhere
// @epic-3.5-communication: Navigation breadcrumbs for clear user orientation
// @persona-sarah: PM needs to quickly understand where they are in the hierarchy
// @persona-mike: Dev needs minimal navigation that doesn't interfere

import React from 'react';
import { cn } from '@/lib/cn';
import { useBreadcrumbs } from '../hooks/useBreadcrumbs';
import { NavBreadcrumbs } from './NavBreadcrumbs';
import type { BreadcrumbItem } from '../providers/NavigationProvider';

interface BreadcrumbsBarProps {
  /** Additional CSS classes */
  className?: string;
  
  /** Whether to show on mobile devices */
  showOnMobile?: boolean;
  
  /** Breadcrumb configuration */
  config?: {
    custom?: BreadcrumbItem[];
    includeHome?: boolean;
    includeWorkspace?: boolean;
    maxItems?: number;
  };
  
  /** Visual variant */
  variant?: 'default' | 'minimal' | 'compact';
  
  /** Show home icon for first breadcrumb */
  showHomeIcon?: boolean;
}

const variantStyles = {
  default: 'px-4 py-3 border-b border-border bg-background',
  minimal: 'px-4 py-2 bg-transparent',
  compact: 'px-3 py-1.5 border-b border-border/50 bg-background/50'
};

export function BreadcrumbsBar({ 
  className,
  showOnMobile = false,
  config = {},
  variant = 'default',
  showHomeIcon = true
}: BreadcrumbsBarProps) {
  // Initialize breadcrumbs
  useBreadcrumbs(config);
  
  return (
    <div 
      className={cn(
        variantStyles[variant],
        !showOnMobile && 'hidden md:block',
        className
      )}
      role="navigation"
      aria-label="Breadcrumb navigation bar"
    >
      <NavBreadcrumbs showHomeIcon={showHomeIcon} />
    </div>
  );
}

// Compact variant for tight spaces
export function CompactBreadcrumbsBar(props: Omit<BreadcrumbsBarProps, 'variant'>) {
  return <BreadcrumbsBar {...props} variant="compact" />;
}

// Minimal variant with no background
export function MinimalBreadcrumbsBar(props: Omit<BreadcrumbsBarProps, 'variant'>) {
  return <BreadcrumbsBar {...props} variant="minimal" />;
}

// Mobile-only breadcrumbs bar
export function MobileBreadcrumbsBar(props: Omit<BreadcrumbsBarProps, 'showOnMobile'>) {
  return (
    <BreadcrumbsBar 
      {...props} 
      showOnMobile={true} 
      className={cn('md:hidden', props.className)}
    />
  );
}

export default BreadcrumbsBar;

