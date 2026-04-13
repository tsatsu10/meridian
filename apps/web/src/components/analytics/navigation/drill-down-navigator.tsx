"use client";

// @epic-2.1-workflow: Drill-down navigation for analytics insights
// @persona-jennifer: Executive needs seamless navigation between analytics views
// @persona-david: Team lead needs to explore detailed metrics

import * as React from "react";
import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Home,
  Users,
  Target,
  Clock,
  Calendar,
  BarChart2,
  MessageSquare,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface NavigationLevel {
  id: string;
  type: "workspace" | "project" | "team" | "task" | "metric" | "report";
  label: string;
  data?: any;
  children?: NavigationLevel[];
}

interface DrillDownNavigatorProps {
  currentPath: NavigationLevel[];
  onNavigate: (path: NavigationLevel[]) => void;
  workspaceId?: string;
  navigationTree?: NavigationLevel; // Optional: pass navigation tree directly
  className?: string;
}

const LEVEL_ICONS = {
  workspace: Home,
  project: Target,
  team: Users,
  task: Clock,
  metric: BarChart2,
  report: FileText,
};

// Navigation tree will be fetched from API or passed as prop
// Removed hardcoded MOCK_NAVIGATION_TREE

function findNavigationNode(
  tree: NavigationLevel,
  id: string
): NavigationLevel | null {
  if (tree.id === id) return tree;
  if (!tree.children) return null;

  for (const child of tree.children) {
    const found = findNavigationNode(child, id);
    if (found) return found;
  }

  return null;
}

function getLevelIcon(type: keyof typeof LEVEL_ICONS) {
  return LEVEL_ICONS[type] || BarChart2;
}

export function DrillDownNavigator({
  currentPath,
  onNavigate,
  workspaceId,
  navigationTree,
  className,
}: DrillDownNavigatorProps) {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);
  const [apiNavigationTree, setApiNavigationTree] = useState<NavigationLevel | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  // Fetch navigation tree from API if not provided via props
  React.useEffect(() => {
    // If navigation tree is provided via props, use it
    if (navigationTree) {
      setApiNavigationTree(navigationTree);
      return;
    }

    // Otherwise, fetch from API
    if (!workspaceId) return;

    const fetchNavigationTree = async () => {
      setIsLoadingTree(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3005'}/api/analytics/navigation/${workspaceId}`,
          {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) {
          console.warn('Navigation tree endpoint not available, using empty tree');
          setApiNavigationTree(null);
          return;
        }

        const tree = await response.json();
        setApiNavigationTree(tree);
      } catch (error) {
        console.error('Error fetching navigation tree:', error);
        setApiNavigationTree(null);
      } finally {
        setIsLoadingTree(false);
      }
    };

    fetchNavigationTree();
  }, [workspaceId, navigationTree]);

  // Use the navigation tree (from props or API)
  const activeNavigationTree = navigationTree || apiNavigationTree;

  const handleNavigate = useCallback(async (newPath: NavigationLevel[]) => {
    setIsNavigating(true);
    try {
      // Update URL query params to reflect the current drill-down path
      const params = {
        view: newPath[newPath.length - 1]?.type || "overview",
        id: newPath[newPath.length - 1]?.id || "",
      };
      
      await navigate({
        to: "/dashboard/analytics",
        search: params,
      });

      onNavigate(newPath);
    } catch (error) {
      console.error("Navigation failed:", error);
      // TODO: Show error toast
    } finally {
      setIsNavigating(false);
    }
  }, [navigate, onNavigate]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    handleNavigate(currentPath.slice(0, index + 1));
  }, [currentPath, handleNavigate]);

  const handleBack = useCallback(() => {
    if (currentPath.length > 1) {
      handleNavigate(currentPath.slice(0, -1));
    }
  }, [currentPath, handleNavigate]);

  const currentNode = currentPath[currentPath.length - 1];
  const parentNode = currentPath[currentPath.length - 2];

  // Find available child nodes for the current level
  const availableChildren = currentNode?.children || [];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Back button and current view title */}
      <div className="flex items-center justify-between">
        {currentPath.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={isNavigating}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {parentNode?.label}
          </Button>
        )}
      </div>

      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {currentPath.map((level, index) => {
            const Icon = getLevelIcon(level.type);
            const isLast = index === currentPath.length - 1;

            return (
              <BreadcrumbItem key={level.id}>
                {!isLast ? (
                  <BreadcrumbLink
                    className="flex items-center gap-2"
                    onClick={() => handleBreadcrumbClick(index)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{level.label}</span>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{level.label}</span>
                  </BreadcrumbPage>
                )}
                {!isLast && <BreadcrumbSeparator />}
              </BreadcrumbItem>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Quick navigation dropdown for available child nodes */}
      {availableChildren.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableChildren.map((child) => {
            const Icon = getLevelIcon(child.type);
            
            return (
              <Button
                key={child.id}
                variant="outline"
                size="sm"
                onClick={() => handleNavigate([...currentPath, child])}
                disabled={isNavigating}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {child.label}
                <ChevronRight className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Navigation suggestions based on current view */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-500 mb-2">
          Related Views
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {currentNode?.type === "project" && activeNavigationTree && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  const teamNode = findNavigationNode(activeNavigationTree, "team_1");
                  if (teamNode) {
                    handleNavigate([...currentPath, teamNode]);
                  }
                }}
                disabled={!activeNavigationTree}
              >
                <Users className="h-4 w-4" />
                Team Performance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  const reportNode = findNavigationNode(activeNavigationTree, "report_1");
                  if (reportNode) {
                    handleNavigate([...currentPath, reportNode]);
                  }
                }}
                disabled={!activeNavigationTree}
              >
                <Calendar className="h-4 w-4" />
                Sprint Reports
              </Button>
            </>
          )}
          {currentNode?.type === "team" && activeNavigationTree && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  const metricNode = findNavigationNode(activeNavigationTree, "metric_1");
                  if (metricNode) {
                    handleNavigate([...currentPath, metricNode]);
                  }
                }}
                disabled={!activeNavigationTree}
              >
                <BarChart2 className="h-4 w-4" />
                Performance Metrics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  const commNode = findNavigationNode(activeNavigationTree, "metric_comm");
                  if (commNode) {
                    handleNavigate([...currentPath, commNode]);
                  }
                }}
                disabled={!activeNavigationTree}
              >
                <MessageSquare className="h-4 w-4" />
                Communication Analytics
              </Button>
            </>
          )}
          {isLoadingTree && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-2">
              Loading navigation options...
            </div>
          )}
          {!isLoadingTree && !activeNavigationTree && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-2">
              No navigation data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { NavigationLevel, DrillDownNavigatorProps };