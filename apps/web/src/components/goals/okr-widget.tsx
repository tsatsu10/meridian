/**
 * 🎯 Personal OKR Widget Component
 * 
 * Dashboard widget displaying user's objectives and key results
 * Features:
 * - Circular progress indicators
 * - Expandable key results
 * - Status badges
 * - Quick actions
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle,
  Circle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useGoals } from "@/hooks/queries/goals";
import { CreateGoalModal } from "./create-goal-modal";
import { format, differenceInDays } from "date-fns";

interface OKRWidgetProps {
  workspaceId: string;
  userId: string;
  className?: string;
}

export function OKRWidget({ workspaceId, userId, className }: OKRWidgetProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  
  const { data: goalsData, isLoading } = useGoals(workspaceId, {
    status: 'active',
  });
  
  const goals = goalsData?.data || [];
  
  const toggleGoalExpanded = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };
  
  const getStatusColor = (progress: number) => {
    if (progress >= 100) return "text-green-600";
    if (progress >= 75) return "text-blue-600";
    if (progress >= 50) return "text-yellow-600";
    if (progress >= 25) return "text-orange-600";
    return "text-red-600";
  };
  
  const getStatusBadge = (progress: number, endDate?: string) => {
    if (progress >= 100) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    }
    
    if (endDate) {
      const daysLeft = differenceInDays(new Date(endDate), new Date());
      if (daysLeft < 0) {
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      }
      if (daysLeft <= 7 && progress < 70) {
        return <Badge className="bg-orange-100 text-orange-800">At Risk</Badge>;
      }
    }
    
    if (progress >= 25) {
      return <Badge className="bg-blue-100 text-blue-800">On Track</Badge>;
    }
    
    return <Badge className="bg-gray-100 text-gray-800">Not Started</Badge>;
  };
  
  const getKRProgress = (currentValue: number, targetValue: number) => {
    return Math.min((currentValue / targetValue) * 100, 100);
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Personal OKRs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Personal OKRs
            </CardTitle>
            <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-lg">No Goals Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Set your first objective with measurable key results to track your progress.
                </p>
              </div>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Goal
              </Button>
            </div>
          ) : (
            /* Goals List */
            <div className="space-y-4">
              {goals.map((goal: any) => {
                const isExpanded = expandedGoals.has(goal.id);
                const keyResults = goal.keyResults || [];
                const completedKRs = keyResults.filter((kr: any) => 
                  getKRProgress(parseFloat(kr.currentValue), parseFloat(kr.targetValue)) >= 100
                ).length;
                
                return (
                  <div
                    key={goal.id}
                    className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    {/* Goal Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => toggleGoalExpanded(goal.id)}
                          className="flex items-center gap-2 w-full text-left group"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                            {goal.title}
                          </h4>
                        </button>
                        
                        <div className="flex items-center gap-2 mt-2 ml-6">
                          {getStatusBadge(goal.progress, goal.endDate)}
                          <span className="text-xs text-muted-foreground">
                            {keyResults.length > 0 && `${completedKRs}/${keyResults.length} KRs`}
                          </span>
                          {goal.endDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(goal.endDate), 'MMM dd')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Circular Progress */}
                      <div className="flex flex-col items-center">
                        <div className="relative w-16 h-16">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-gray-200 dark:text-gray-700"
                            />
                            <path
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeDasharray={`${goal.progress}, 100`}
                              className={getStatusColor(goal.progress)}
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold">{goal.progress}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Goal Description */}
                    {goal.description && !isExpanded && (
                      <p className="text-sm text-muted-foreground mt-2 ml-6 line-clamp-2">
                        {goal.description}
                      </p>
                    )}
                    
                    {/* Expanded Key Results */}
                    {isExpanded && (
                      <div className="mt-4 ml-6 space-y-3 border-t pt-3">
                        {goal.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {goal.description}
                          </p>
                        )}
                        
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-muted-foreground">
                            Key Results
                          </h5>
                          {keyResults.length > 0 ? (
                            keyResults.map((kr: any) => {
                              const krProgress = getKRProgress(
                                parseFloat(kr.currentValue),
                                parseFloat(kr.targetValue)
                              );
                              
                              return (
                                <div key={kr.id} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      {krProgress >= 100 ? (
                                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      ) : krProgress > 0 ? (
                                        <Circle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                      ) : (
                                        <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                      )}
                                      <span className="text-sm">{kr.title}</span>
                                    </div>
                                    <span className="text-sm font-medium tabular-nums">
                                      {parseFloat(kr.currentValue)}/{parseFloat(kr.targetValue)} {kr.unit}
                                    </span>
                                  </div>
                                  <Progress value={krProgress} className="h-1.5" />
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              No key results yet. Add them to track progress.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      <CreateGoalModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        workspaceId={workspaceId}
      />
    </>
  );
}

