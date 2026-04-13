/**
 * 🎯 Goal Detail Modal Component
 * 
 * Detailed view of a goal with:
 * - Progress history chart
 * - Key results with inline editing
 * - Quick progress updates
 * - Analytics (velocity, estimates, health score)
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  BarChart3,
  Activity,
  Zap,
} from "lucide-react";
import { useGoalDetail, useGoalAnalytics, useGoalProgress } from "@/hooks/queries/goals";
import { useUpdateKeyResult, useDeleteGoal } from "@/hooks/mutations/goals";
import { cn } from "@/lib/cn";
import { format, differenceInDays } from "date-fns";

interface GoalDetailModalProps {
  goalId: string;
  open: boolean;
  onClose: () => void;
}

export function GoalDetailModal({ goalId, open, onClose }: GoalDetailModalProps) {
  const [editingKRId, setEditingKRId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  
  const { data: goalData, isLoading } = useGoalDetail(goalId);
  const { data: analytics } = useGoalAnalytics(goalId);
  const { data: progressHistory } = useGoalProgress(goalId);
  
  const updateKRMutation = useUpdateKeyResult();
  const deleteGoalMutation = useDeleteGoal();
  
  const goal = goalData?.data;
  const keyResults = goal?.keyResults || [];
  
  const handleUpdateKR = async (krId: string) => {
    if (!goal) return;
    
    await updateKRMutation.mutateAsync({
      id: krId,
      goalId: goal.id,
      currentValue: editValue,
    });
    
    setEditingKRId(null);
    setEditValue(0);
  };
  
  const handleDelete = async () => {
    if (!goal) return;
    
    if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      await deleteGoalMutation.mutateAsync(goal.id);
      onClose();
    }
  };
  
  const getProgressBarColor = (progress: number) => {
    if (progress >= 100) return "bg-green-500";
    if (progress >= 75) return "bg-blue-500";
    if (progress >= 50) return "bg-yellow-500";
    if (progress >= 25) return "bg-orange-500";
    return "bg-red-500";
  };
  
  if (isLoading || !goal) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Target className="h-6 w-6 text-primary" />
                {goal.title}
              </DialogTitle>
              {goal.description && (
                <DialogDescription className="mt-2">
                  {goal.description}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        {/* Meta Information */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Badge variant="outline">
            {goal.type}
          </Badge>
          <Badge variant="outline">
            {goal.timeframe}
          </Badge>
          <Badge variant="outline">
            {goal.priority} priority
          </Badge>
          <Badge variant="outline">
            {goal.privacy}
          </Badge>
          {goal.endDate && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due {format(new Date(goal.endDate), 'MMM dd, yyyy')}
            </Badge>
          )}
        </div>
        
        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">{goal.progress}%</p>
          </div>
          
          {analytics && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Velocity</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {analytics.velocity > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  )}
                  {analytics.velocity}%/day
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Health Score</p>
                <p className={cn(
                  "text-2xl font-bold",
                  analytics.healthScore >= 70 && "text-green-600",
                  analytics.healthScore < 70 && analytics.healthScore >= 40 && "text-yellow-600",
                  analytics.healthScore < 40 && "text-red-600"
                )}>
                  {analytics.healthScore}/100
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Key Results</p>
                <p className="text-2xl font-bold">
                  {analytics.completedKeyResults}/{analytics.keyResultsCount}
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Progress Chart */}
        {analytics && analytics.progressTrend.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Progress Trend (Last 7 Days)
            </h4>
            <div className="h-24 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 flex items-end gap-1">
              {analytics.progressTrend.map((entry, index) => (
                <div
                  key={index}
                  className="flex-1 bg-primary rounded-t transition-all hover:opacity-80"
                  style={{ height: `${entry.value}%` }}
                  title={`${entry.date}: ${entry.value}%`}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Key Results */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Key Results ({keyResults.length})
            </h4>
          </div>
          
          {keyResults.length > 0 ? (
            <div className="space-y-3">
              {keyResults.map((kr: any) => {
                const current = parseFloat(kr.currentValue);
                const target = parseFloat(kr.targetValue);
                const progress = Math.min((current / target) * 100, 100);
                const isEditing = editingKRId === kr.id;
                
                return (
                  <div key={kr.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{kr.title}</h5>
                        {kr.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {kr.description}
                          </p>
                        )}
                      </div>
                      <Badge variant={kr.status === 'completed' ? 'default' : 'outline'}>
                        {kr.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                              className="w-24 h-7 text-xs"
                              min={0}
                              max={target}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleUpdateKR(kr.id)}
                              className="h-7 text-xs"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingKRId(null)}
                              className="h-7 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingKRId(kr.id);
                              setEditValue(current);
                            }}
                            className="font-bold tabular-nums hover:text-primary transition-colors"
                          >
                            {current}/{target} {kr.unit}
                          </button>
                        )}
                      </div>
                      <Progress 
                        value={progress} 
                        className={cn("h-2", getProgressBarColor(progress))}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {progress.toFixed(1)}% Complete
                      </p>
                    </div>
                    
                    {kr.dueDate && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due: {format(new Date(kr.dueDate), 'MMM dd, yyyy')}
                        {differenceInDays(new Date(kr.dueDate), new Date()) >= 0 && (
                          <span>({differenceInDays(new Date(kr.dueDate), new Date())} days left)</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No key results yet. Add them to track progress.
            </div>
          )}
        </div>
        
        {/* Analytics Insights */}
        {analytics && analytics.estimatedCompletion && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Insights
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              {analytics.velocity > 0 && (
                <li>• You're making progress at {analytics.velocity}% per day</li>
              )}
              {analytics.estimatedCompletion && (
                <li>• Estimated completion: {format(new Date(analytics.estimatedCompletion), 'MMM dd, yyyy')}</li>
              )}
              {analytics.daysSinceLastUpdate > 7 && (
                <li className="text-amber-700 dark:text-amber-300">
                  ⚠️ No updates in {analytics.daysSinceLastUpdate} days
                </li>
              )}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

