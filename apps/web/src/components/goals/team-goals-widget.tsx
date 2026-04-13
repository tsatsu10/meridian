/**
 * 🎯 Team Goals Widget Component
 * 
 * Displays team members' goals and aggregated progress
 * Features:
 * - Team member avatars with goal counts
 * - Expandable member goal lists
 * - Team statistics
 * - Real-time updates (Phase 3.3)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useTeamProgress } from "@/hooks/queries/goals/use-team-goals";
import { ClickableUserProfile } from "@/components/user/clickable-user-profile";

interface TeamGoalsWidgetProps {
  teamId: string;
  className?: string;
}

export function TeamGoalsWidget({ teamId, className }: TeamGoalsWidgetProps) {
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const { data, isLoading } = useTeamProgress(teamId);
  
  const toggleMemberExpanded = (userId: string) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedMembers(newExpanded);
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const teamData = data?.data || data;
  const memberProgress = teamData?.memberProgress || [];
  const stats = teamData?.stats;
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Goals
          </CardTitle>
          {stats && (
            <Badge variant="outline">
              {stats.membersWithGoals}/{stats.totalMembers} active
            </Badge>
          )}
        </div>
        
        {/* Team Statistics */}
        {stats && stats.totalGoals > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Goals</p>
              <p className="text-xl font-bold">{stats.totalGoals}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Progress</p>
              <p className="text-xl font-bold">{stats.averageProgress}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-xl font-bold text-green-600">{stats.completedGoals}</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {memberProgress.length === 0 ? (
          /* Empty State */
          <div className="text-center py-8 space-y-3">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Target className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h4 className="font-medium">No Team Goals Yet</h4>
              <p className="text-sm text-muted-foreground">
                Team members haven't created any shared goals.
              </p>
            </div>
          </div>
        ) : (
          /* Team Members List */
          <div className="space-y-3">
            {memberProgress.map((member) => {
              const isExpanded = expandedMembers.has(member.user.id);
              const hasGoals = member.goalsCount > 0;
              
              return (
                <div
                  key={member.user.id}
                  className={cn(
                    "border rounded-lg p-3 transition-all",
                    hasGoals && "hover:border-primary/50 cursor-pointer"
                  )}
                >
                  {/* Member Header */}
                  <div className="flex items-center gap-3 w-full">
                    <ClickableUserProfile
                      userId={member.user.id}
                      userEmail={member.user.email}
                      userName={member.user.name}
                      userAvatar={member.user.avatar}
                      size="md"
                      openMode="both"
                    />
                    
                    <div className="flex-1 flex items-center justify-between gap-2">
                      <button
                        onClick={() => hasGoals && toggleMemberExpanded(member.user.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                        disabled={!hasGoals}
                      >
                        {hasGoals && (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )
                        )}
                        <p className="text-xs">
                          {hasGoals ? (
                            `${member.goalsCount} goal${member.goalsCount !== 1 ? 's' : ''} · ${member.averageProgress}% avg progress`
                          ) : (
                            'No active goals'
                          )}
                        </p>
                      </button>
                    </div>
                    
                    {hasGoals && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">
                            {member.averageProgress}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.completedGoals}/{member.goalsCount}
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                  
                  {/* Expanded Member Goals */}
                  {isExpanded && hasGoals && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {member.goals.map((goal) => (
                        <div key={goal.id} className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              {goal.progress >= 100 ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{goal.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {goal.keyResultsCount} key result{goal.keyResultsCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold tabular-nums flex-shrink-0">
                              {goal.progress}%
                            </span>
                          </div>
                          <Progress value={goal.progress} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

