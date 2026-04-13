/**
 * Enhanced ProjectCard with Advanced Health Display
 * Uses new health calculation system
 */

"use client";

import { useState, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  Target,
  MoreHorizontal,
  Eye,
  FolderOpen,
  GitBranch,
  Settings,
  Archive,
  Activity,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HealthBadge } from "./health-badge";
import { TrendIndicator } from "./trend-indicator";
import { useProjectHealth } from "@/hooks/use-project-health";
import { Skeleton } from "@/components/ui/skeleton";

interface EnhancedProjectCardProps {
  project: any;
  onAction: (action: string, project: any) => void;
}

// Status mapping
const PROJECT_STATUS = {
  planning: { label: "Planning", color: "bg-yellow-500" },
  active: { label: "Active", color: "bg-blue-500" },
  completed: { label: "Completed", color: "bg-green-500" },
  paused: { label: "Paused", color: "bg-gray-500" },
  cancelled: { label: "Cancelled", color: "bg-red-500" },
};

// Priority mapping
const PROJECT_PRIORITY = {
  low: { label: "Low", color: "bg-gray-500" },
  medium: { label: "Medium", color: "bg-yellow-500" },
  high: { label: "High", color: "bg-red-500" },
  critical: { label: "Critical", color: "bg-purple-500" },
};

const getProjectColor = (name: string) => {
  const colors = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-emerald-500 to-teal-500",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-500",
    "bg-gradient-to-br from-green-500 to-blue-500",
  ];
  const index = name.length % colors.length;
  return colors[index];
};

export const EnhancedProjectCard = memo(function EnhancedProjectCard({
  project,
  onAction,
}: EnhancedProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const health = useProjectHealth(project);

  const statusInfo =
    PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] ||
    PROJECT_STATUS.active;
  const priorityInfo =
    PROJECT_PRIORITY[project.priority as keyof typeof PROJECT_PRIORITY] ||
    PROJECT_PRIORITY.medium;

  const completedTasks = project.tasks
    ? project.tasks.filter((task: any) => task.status === "completed").length
    : 0;
  const totalTasks = project.tasks ? project.tasks.length : 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const endDate = project.endDate ? new Date(project.endDate) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] glass-card border-border/50",
          isHovered && "shadow-2xl"
        )}
      >
        {/* Bulk Select Checkbox - Positioned in top right */}
        <div className="absolute top-2 right-2 z-10 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          {/* BulkSelectCheckbox component goes here */}
        </div>

        {/* Project Header with Gradient */}
        <div className={cn("h-20 relative", getProjectColor(project.name))}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-3 left-4 right-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-white font-bold text-lg truncate">
                    {project.name}
                  </h3>
                  <Badge className={cn("text-xs text-white", priorityInfo.color)}>
                    {priorityInfo.label}
                  </Badge>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card">
                  <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAction("view", project)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction("tasks", project)}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    View Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction("board", project)}>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Kanban Board
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction("settings", project)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onAction("archive", project)}
                    className="text-orange-600"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Project Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description || "No description provided"}
          </p>

          {/* Status, Health & Team */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs text-white", statusInfo.color)}
              >
                <Activity className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>

              {/* Advanced Health Display */}
              {health ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <HealthBadge
                          state={health.healthState}
                          score={health.overallScore}
                          showScore={true}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="w-80 p-4 glass-card"
                    >
                      <div className="space-y-2">
                        <h4 className="font-semibold">Health Breakdown</h4>
                        <div className="space-y-1 text-xs">
                          {health.factors.map((factor: any, idx: number) => (
                            <div key={`${factor.id || factor.name}-${idx}`} className="flex justify-between">
                              <span>{factor.name}</span>
                              <span className="font-medium">{Math.round(factor.score)}/100</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>

            {/* Trend & Risks */}
            <div className="flex items-center gap-2">
              {health && (
                <>
                  <TrendIndicator trend={health.trend} size="sm" />
                  {health.identifiedRisks && health.identifiedRisks.length > 0 && (
                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-sm bg-red-500">
                      {health.identifiedRisks.length}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-200 dark:border-blue-800">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {project.teamSize || 0}{" "}
                  {project.teamSize === 1 ? "member" : "members"}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {completedTasks}/{totalTasks} tasks
              </span>
              {endDate && (
                <span
                  className={cn(
                    daysRemaining < 0
                      ? "text-red-500"
                      : daysRemaining < 7
                        ? "text-orange-500"
                        : "text-muted-foreground"
                  )}
                >
                  {daysRemaining < 0
                    ? `${Math.abs(daysRemaining)} days overdue`
                    : daysRemaining === 0
                      ? "Due today"
                      : `${daysRemaining} days left`}
                </span>
              )}
            </div>
          </div>

          {/* Risk Summary */}
          {health && health.identifiedRisks && health.identifiedRisks.length > 0 && (
            <div className="border-t border-border/50 pt-3">
              <div className="text-xs font-medium mb-2 flex items-center gap-1">
                <span>⚠️ Key Risks ({health.identifiedRisks.length})</span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {health.identifiedRisks.slice(0, 2).map((risk: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
                {health.identifiedRisks.length > 2 && (
                  <li className="text-blue-500">+{health.identifiedRisks.length - 2} more risks</li>
                )}
              </ul>
            </div>
          )}

          {/* Project Dates */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>
                Started{" "}
                {project.startDate
                  ? format(new Date(project.startDate), "MMM dd")
                  : "N/A"}
              </span>
            </div>
            {endDate && (
              <div className="flex items-center space-x-1">
                <Target className="h-3 w-3" />
                <span>Due {format(endDate, "MMM dd")}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 glass-card"
              onClick={() => onAction("view", project)}
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 glass-card"
              onClick={() => onAction("tasks", project)}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Tasks
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 glass-card"
              onClick={() => onAction("board", project)}
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Board
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
