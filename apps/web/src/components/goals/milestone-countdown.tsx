/**
 * 🎯 Milestone Countdown Widget
 * 
 * Displays upcoming milestones with visual countdown timers
 * Features:
 * - Large countdown numbers
 * - Color-coded urgency
 * - Progress indicators
 * - Quick actions
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flag,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";

interface MilestoneCountdownProps {
  userId: string;
  className?: string;
}

interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: string;
  status: string;
  daysRemaining: number;
  hoursRemaining: number;
  urgency: 'safe' | 'warning' | 'urgent' | 'overdue';
  urgencyColor: string;
  isOverdue: boolean;
  isToday: boolean;
}

export function MilestoneCountdown({ userId, className }: MilestoneCountdownProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['upcoming-milestones', userId],
    queryFn: async () => {
      const response = await api.get('/api/goals/milestones/countdown/upcoming');
      return response?.data || response;
    },
    refetchInterval: 60000, // Refresh every minute
  });
  
  const milestones: Milestone[] = (data?.data || data) || [];
  
  const getUrgencyStyles = (urgency: string) => {
    switch (urgency) {
      case 'safe':
        return {
          bg: 'bg-green-50 dark:bg-green-950',
          text: 'text-green-900 dark:text-green-100',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950',
          text: 'text-yellow-900 dark:text-yellow-100',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600',
        };
      case 'urgent':
        return {
          bg: 'bg-red-50 dark:bg-red-950',
          text: 'text-red-900 dark:text-red-100',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600',
        };
      case 'overdue':
        return {
          bg: 'bg-gray-50 dark:bg-gray-950',
          text: 'text-gray-900 dark:text-gray-100',
          border: 'border-gray-200 dark:border-gray-800',
          icon: 'text-gray-600',
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950',
          text: 'text-blue-900 dark:text-blue-100',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600',
        };
    }
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Upcoming Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Upcoming Milestones
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          /* Empty State */
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Flag className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h4 className="font-medium">No Upcoming Milestones</h4>
              <p className="text-sm text-muted-foreground">
                Create milestones to track important deadlines.
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Milestone
            </Button>
          </div>
        ) : (
          /* Milestones List */
          <div className="space-y-3">
            {milestones.map((milestone) => {
              const styles = getUrgencyStyles(milestone.urgency);
              
              return (
                <div
                  key={milestone.id}
                  className={cn(
                    "border rounded-lg p-4 transition-all",
                    styles.bg,
                    styles.border
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Countdown Circle */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className={cn(
                        "w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center",
                        styles.border
                      )}>
                        {milestone.isOverdue ? (
                          <>
                            <AlertTriangle className={cn("h-6 w-6", styles.icon)} />
                          </>
                        ) : (
                          <>
                            <span className={cn("text-2xl font-bold tabular-nums", styles.text)}>
                              {milestone.daysRemaining}
                            </span>
                            <span className={cn("text-xs", styles.text)}>
                              {milestone.daysRemaining === 1 ? 'day' : 'days'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Milestone Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn("font-medium truncate", styles.text)}>
                          {milestone.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn(styles.text, styles.border, "flex-shrink-0")}
                        >
                          {milestone.priority}
                        </Badge>
                      </div>
                      
                      {milestone.description && (
                        <p className={cn("text-sm mt-1 line-clamp-2", styles.text, "opacity-80")}>
                          {milestone.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={cn("flex items-center gap-1", styles.text)}>
                          <Calendar className="h-3 w-3" />
                          {milestone.isOverdue ? 'Overdue since' : 'Due'} {format(new Date(milestone.dueDate), 'MMM dd, yyyy')}
                        </span>
                        
                        {milestone.isToday && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            TODAY
                          </Badge>
                        )}
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

