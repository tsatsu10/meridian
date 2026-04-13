// @epic-3.5-communication: Professional layout component system with enhanced light mode design system
// @persona-sarah: PM needs organized layouts for project management workflows
// @persona-jennifer: Exec needs executive dashboard layouts with clear hierarchy
// @persona-david: Team lead needs team-focused layouts with analytics sections
// @persona-mike: Dev needs efficient layouts for development workflows
// @persona-lisa: Designer needs creative layouts for design portfolio and collaboration

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArrowLeft, Settings, MoreHorizontal, Plus, Filter, Search } from "lucide-react";
import { MeridianButton } from "./meridian-button";
import { MeridianCard } from "./meridian-card";
import { MeridianBadge } from "./meridian-badge";

// Enhanced Page Container with Modern Light Mode Support
const meridianPageVariants = cva(
  [
    "min-h-screen transition-all duration-200"
  ],
  {
    variants: {
      variant: {
        default: "bg-background",
        surface: "bg-surface",
        elevated: "bg-surface-secondary", 
        gradient: "bg-gradient-surface",
        subtle: "bg-gradient-subtle",
        accent: "bg-gradient-accent",
        glass: "card-glass"
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        md: "p-6", 
        lg: "p-8",
        xl: "p-12"
      },
      maxWidth: {
        none: "",
        sm: "max-w-screen-sm mx-auto",
        md: "max-w-screen-md mx-auto",
        lg: "max-w-screen-lg mx-auto",
        xl: "max-w-screen-xl mx-auto",
        "2xl": "max-w-screen-2xl mx-auto",
        full: "max-w-full"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "lg", 
      maxWidth: "2xl"
    }
  }
);

export interface MeridianPageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianPageVariants> {
  persona?: 'pm' | 'tl' | 'exec' | 'dev' | 'design';
  withPattern?: boolean;
}

const MeridianPage = React.forwardRef<HTMLDivElement, MeridianPageProps>(
  ({ className, variant, padding, maxWidth, persona, withPattern = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        meridianPageVariants({ variant, padding, maxWidth }),
        withPattern && "relative overflow-hidden",
        className
      )}
      data-persona={persona}
      {...props}
    >
      {withPattern && (
        <div className="absolute inset-0 opacity-30">
          <svg
            className="absolute inset-0 h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid-pattern"
                width="32"
                height="32"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M.5 32V.5H32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-meridian-neutral-300"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>
      )}
      {props.children}
    </div>
  )
);
MeridianPage.displayName = "MeridianPage";

// Enhanced Page Header with Modern Styling
export interface MeridianPageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  backButton?: { label?: string; onClick: () => void };
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  avatar?: React.ReactNode;
  meta?: React.ReactNode;
  variant?: 'default' | 'compact' | 'hero' | 'modern';
  persona?: 'pm' | 'tl' | 'exec' | 'dev' | 'design';
}

const MeridianPageHeader = React.forwardRef<HTMLDivElement, MeridianPageHeaderProps>(
  ({ 
    className,
    title,
    description,
    breadcrumbs,
    backButton,
    actions,
    badge,
    avatar,
    meta,
    variant = 'default',
    persona,
    ...props 
  }, ref) => {
    const headerVariants = cva(
      [
        "border-b transition-all duration-200"
      ],
      {
        variants: {
          variant: {
            default: "border-soft bg-background/95 backdrop-blur-sm pb-6 mb-8",
            compact: "border-soft bg-background/95 backdrop-blur-sm pb-4 mb-6", 
            hero: "border-medium bg-gradient-subtle pb-8 mb-12",
            modern: "border-soft bg-surface shadow-soft pb-6 mb-8"
          }
        }
      }
    );

    return (
      <div
        ref={ref}
        className={cn(headerVariants({ variant }), className)}
        data-persona={persona}
        {...props}
      >
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm mb-4">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-soft">/</span>
                )}
                {crumb.href ? (
                  <a 
                    href={crumb.href}
                    className="text-medium hover:text-meridian-primary transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-strong font-medium">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Back Button */}
            {backButton && (
              <MeridianButton
                variant="ghost"
                size="sm"
                onClick={backButton.onClick}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                className="mt-1"
              >
                {backButton.label || 'Back'}
              </MeridianButton>
            )}

            {/* Avatar */}
            {avatar && (
              <div className="flex-shrink-0 mt-1">
                {avatar}
              </div>
            )}

            {/* Title Section */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className={cn(
                  "font-bold text-meridian-neutral-900 truncate",
                  variant === 'hero' ? "text-h1" : variant === 'compact' ? "text-h3" : "text-h2"
                )}>
                  {title}
                </h1>
                {badge && badge}
              </div>

              {description && (
                <p className={cn(
                  "text-medium leading-relaxed",
                  variant === 'hero' ? "text-lg" : "text-base",
                  variant === 'compact' && "text-sm"
                )}>
                  {description}
                </p>
              )}

              {meta && (
                <div className="mt-3">
                  {meta}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-start gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);
MeridianPageHeader.displayName = "MeridianPageHeader";

// Enhanced Page Content with Modern Cards
const meridianPageContentVariants = cva(
  [
    "flex-1 transition-all duration-200"
  ],
  {
    variants: {
      variant: {
        default: "",
        card: "card-modern p-6",
        elevated: "card-elevated p-6", 
        glass: "card-glass p-6"
      },
      spacing: {
        none: "",
        sm: "space-y-4",
        md: "space-y-6",
        lg: "space-y-8",
        xl: "space-y-12"
      }
    },
    defaultVariants: {
      variant: "default",
      spacing: "md"
    }
  }
);

export interface MeridianPageContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianPageContentVariants> {}

const MeridianPageContent = React.forwardRef<HTMLDivElement, MeridianPageContentProps>(
  ({ className, variant, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(meridianPageContentVariants({ variant, spacing, className }))}
      {...props}
    />
  )
);
MeridianPageContent.displayName = "MeridianPageContent";

// Enhanced Section Component
const meridianSectionVariants = cva(
  [
    "transition-all duration-200"
  ],
  {
    variants: {
      variant: {
        default: "",
        card: "card-modern p-6",
        elevated: "card-elevated p-6",
        glass: "card-glass p-6",
        outlined: "border border-soft rounded-lg p-6"
      },
      spacing: {
        none: "",
        sm: "mb-4",
        md: "mb-6", 
        lg: "mb-8",
        xl: "mb-12"
      }
    },
    defaultVariants: {
      variant: "default",
      spacing: "md"
    }
  }
);

export interface MeridianSectionProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianSectionVariants> {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const MeridianSection = React.forwardRef<HTMLDivElement, MeridianSectionProps>(
  ({ 
    className,
    title,
    description,
    actions,
    variant,
    spacing,
    collapsible = false,
    defaultCollapsed = false,
    children,
    ...props 
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
      <div
        ref={ref}
        className={cn(meridianSectionVariants({ variant, spacing, className }))}
        {...props}
      >
        {(title || description || actions) && (
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 min-w-0">
              {title && (
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-h3 font-semibold text-strong">
                    {title}
                  </h2>
                  {collapsible && (
                    <MeridianButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      className="p-1"
                    >
                      <span className={cn(
                        "transition-transform duration-200",
                        isCollapsed ? "rotate-0" : "rotate-90"
                      )}>
                        ▶
                      </span>
                    </MeridianButton>
                  )}
                </div>
              )}
              {description && (
                <p className="text-medium text-sm">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        )}

        {(!collapsible || !isCollapsed) && (
          <div className={cn(
            "transition-all duration-200",
            collapsible && isCollapsed && "hidden"
          )}>
            {children}
          </div>
        )}
      </div>
    );
  }
);
MeridianSection.displayName = "MeridianSection";

// Grid Container
const meridianGridVariants = cva(
  [
    "grid gap-6"
  ],
  {
    variants: {
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-1 md:grid-cols-2",
        3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        auto: "grid-cols-[repeat(auto-fit,minmax(250px,1fr))]"
      },
      gap: {
        none: "gap-0",
        sm: "gap-3",
        md: "gap-6",
        lg: "gap-8",
        xl: "gap-12"
      }
    },
    defaultVariants: {
      cols: 3,
      gap: "md"
    }
  }
);

export interface MeridianGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianGridVariants> {}

const MeridianGrid = React.forwardRef<HTMLDivElement, MeridianGridProps>(
  ({ className, cols, gap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(meridianGridVariants({ cols, gap, className }))}
      {...props}
    />
  )
);
MeridianGrid.displayName = "MeridianGrid";

// Sidebar Layout
export interface MeridianSidebarLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  sidebar: React.ReactNode;
  sidebarWidth?: string;
  sidebarPosition?: 'left' | 'right';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const MeridianSidebarLayout = React.forwardRef<HTMLDivElement, MeridianSidebarLayoutProps>(
  ({ 
    className,
    sidebar,
    sidebarWidth = "320px",
    sidebarPosition = "left",
    collapsible = false,
    defaultCollapsed = false,
    children,
    ...props 
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    return (
      <div
        ref={ref}
        className={cn("flex gap-6", className)}
        {...props}
      >
        {/* Sidebar */}
        {sidebarPosition === 'left' && (
          <aside
            className={cn(
              "flex-shrink-0 transition-all duration-200",
              isCollapsed ? "w-16" : `w-[${sidebarWidth}]`
            )}
          >
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* Right Sidebar */}
        {sidebarPosition === 'right' && (
          <aside
            className={cn(
              "flex-shrink-0 transition-all duration-200",
              isCollapsed ? "w-16" : `w-[${sidebarWidth}]`
            )}
          >
            {sidebar}
          </aside>
        )}

        {/* Collapse Toggle */}
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-meridian-md border border-meridian-neutral-200 hover:shadow-meridian-lg transition-all"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
MeridianSidebarLayout.displayName = "MeridianSidebarLayout";

// Persona-Specific Layout Presets
export interface PersonaLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

// PM Layout - Focused on project organization
const PMLayout = ({ children, title, description, actions }: PersonaLayoutProps) => (
  <MeridianPage persona="pm" variant="default">
    <MeridianPageHeader
      persona="pm"
      title={title}
      description={description}
      actions={actions}
      badge={<MeridianBadge variant="soft" persona="pm">Project Manager</MeridianBadge>}
    />
    <MeridianPageContent spacing="lg">
      {children}
    </MeridianPageContent>
  </MeridianPage>
);

// Executive Layout - Focused on high-level insights
const ExecutiveLayout = ({ children, title, description, actions }: PersonaLayoutProps) => (
  <MeridianPage persona="exec" variant="gradient" maxWidth="full">
    <MeridianPageHeader
      persona="exec"
      variant="hero"
      title={title}
      description={description}
      actions={actions}
      badge={<MeridianBadge variant="gradient" persona="exec">Executive</MeridianBadge>}
    />
    <MeridianPageContent spacing="xl">
      {children}
    </MeridianPageContent>
  </MeridianPage>
);

// Team Lead Layout - Focused on team analytics
const TeamLeadLayout = ({ children, title, description, actions }: PersonaLayoutProps) => (
  <MeridianPage persona="tl" variant="default">
    <MeridianPageHeader
      persona="tl"
      title={title}
      description={description}
      actions={actions}
      badge={<MeridianBadge variant="success" persona="tl">Team Lead</MeridianBadge>}
    />
    <MeridianPageContent spacing="lg">
      {children}
    </MeridianPageContent>
  </MeridianPage>
);

// Developer Layout - Focused on efficiency
const DeveloperLayout = ({ children, title, description, actions }: PersonaLayoutProps) => (
  <MeridianPage persona="dev" variant="default" padding="md">
    <MeridianPageHeader
      persona="dev"
      variant="compact"
      title={title}
      description={description}
      actions={actions}
      badge={<MeridianBadge variant="warning" persona="dev">Developer</MeridianBadge>}
    />
    <MeridianPageContent spacing="md">
      {children}
    </MeridianPageContent>
  </MeridianPage>
);

// Designer Layout - Focused on visual appeal
const DesignerLayout = ({ children, title, description, actions }: PersonaLayoutProps) => (
  <MeridianPage persona="design" variant="glass">
    <MeridianPageHeader
      persona="design"
      title={title}
      description={description}
      actions={actions}
      badge={<MeridianBadge variant="gradient" persona="design">Designer</MeridianBadge>}
    />
    <MeridianPageContent spacing="lg">
      {children}
    </MeridianPageContent>
  </MeridianPage>
);

export {
  MeridianPage,
  MeridianPageHeader,
  MeridianPageContent,
  MeridianSection,
  MeridianGrid,
  MeridianSidebarLayout,
  PMLayout,
  ExecutiveLayout,
  TeamLeadLayout,
  DeveloperLayout,
  DesignerLayout,
  meridianPageVariants,
  meridianPageContentVariants,
  meridianSectionVariants,
  meridianGridVariants
}; 