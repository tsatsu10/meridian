// Accessible breadcrumb navigation with responsive design
import React from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/cn';
import { useNavigation } from '../providers/NavigationProvider';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ChevronRight, Home, MoreHorizontal } from 'lucide-react';

interface NavBreadcrumbsProps {
  className?: string;
  isMobile?: boolean;
  maxVisibleItems?: number;
  showHomeIcon?: boolean;
  separator?: React.ReactNode;
}

export const NavBreadcrumbs: React.FC<NavBreadcrumbsProps> = ({
  className,
  isMobile = false,
  maxVisibleItems = 3,
  showHomeIcon = true,
  separator,
}) => {
  const { state } = useNavigation();
  const breadcrumbs = state.breadcrumbs;
  
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return null;
  }
  
  // Custom separator component
  const Separator = separator || (
    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
  );
  
  // Handle responsive breadcrumb display
  const getVisibleBreadcrumbs = () => {
    if (isMobile) {
      // On mobile, show only current page and one parent
      const current = breadcrumbs[breadcrumbs.length - 1];
      const parent = breadcrumbs[breadcrumbs.length - 2];
      
      return {
        visible: parent ? [parent, current] : [current],
        hidden: breadcrumbs.slice(0, -2),
      };
    }
    
    // On desktop, respect maxVisibleItems
    if (breadcrumbs.length <= maxVisibleItems) {
      return {
        visible: breadcrumbs,
        hidden: [],
      };
    }
    
    // Show first item, ellipsis, and last few items
    const firstItem = breadcrumbs[0];
    const lastItems = breadcrumbs.slice(-(maxVisibleItems - 1));
    const hiddenItems = breadcrumbs.slice(1, -(maxVisibleItems - 1));
    
    return {
      visible: [firstItem, ...lastItems],
      hidden: hiddenItems,
    };
  };
  
  const { visible, hidden } = getVisibleBreadcrumbs();
  const hasHiddenItems = hidden.length > 0;
  
  return (
    <nav 
      aria-label="Breadcrumb navigation"
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1" role="list">
        {/* Home icon for first item if enabled */}
        {showHomeIcon && visible[0] && visible[0].id === 'home' && (
          <li className="flex items-center">
            <Link
              to={visible[0].href || '/dashboard'}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm p-1"
              aria-label="Go to dashboard"
            >
              <Home className="h-4 w-4" />
              <span className="sr-only">{visible[0].label}</span>
            </Link>
            {visible.length > 1 && (
              <span className="mx-2" aria-hidden="true">
                {Separator}
              </span>
            )}
          </li>
        )}
        
        {/* Regular breadcrumb items */}
        {visible.map((breadcrumb, index) => {
          // Skip home if we already rendered it with icon
          if (showHomeIcon && breadcrumb.id === 'home') {
            return null;
          }
          
          const isLast = index === visible.length - 1;
          const adjustedIndex = showHomeIcon && visible[0]?.id === 'home' ? index : index + 1;
          
          return (
            <li key={breadcrumb.id} className="flex items-center">
              {/* Hidden items dropdown */}
              {hasHiddenItems && index === 1 && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 text-muted-foreground hover:text-foreground"
                        aria-label={`Show ${hidden.length} hidden navigation items`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      {hidden.map((hiddenItem) => (
                        <DropdownMenuItem key={hiddenItem.id} asChild>
                          <Link
                            to={hiddenItem.href || '#'}
                            className="flex items-center gap-2 w-full"
                          >
                            <span className="truncate">{hiddenItem.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <span className="mx-2" aria-hidden="true">
                    {Separator}
                  </span>
                </>
              )}
              
              {/* Breadcrumb item */}
              {breadcrumb.href && !isLast ? (
                <Link
                  to={breadcrumb.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1 py-0.5 truncate max-w-[200px]"
                  title={breadcrumb.label}
                >
                  {breadcrumb.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'truncate max-w-[200px]',
                    isLast 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                  title={breadcrumb.label}
                >
                  {breadcrumb.label}
                </span>
              )}
              
              {/* Separator */}
              {!isLast && (
                <span className="mx-2" aria-hidden="true">
                  {Separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Compact breadcrumb variant for tight spaces
export const CompactBreadcrumbs: React.FC<Omit<NavBreadcrumbsProps, 'maxVisibleItems'>> = (props) => {
  return (
    <NavBreadcrumbs
      {...props}
      maxVisibleItems={2}
      className={cn('text-xs', props.className)}
    />
  );
};

// Mobile-optimized breadcrumbs
export const MobileBreadcrumbs: React.FC<Omit<NavBreadcrumbsProps, 'isMobile' | 'maxVisibleItems'>> = (props) => {
  return (
    <NavBreadcrumbs
      {...props}
      isMobile={true}
      showHomeIcon={false}
      className={cn('overflow-x-auto scrollbar-hide', props.className)}
    />
  );
};

export default NavBreadcrumbs;