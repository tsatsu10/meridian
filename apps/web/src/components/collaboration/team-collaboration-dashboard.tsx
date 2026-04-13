// @epic-3.4-teams: Team Collaboration Dashboard with Real-time Insights and Analytics
}

  // Load team collaboration data from API
  const loadTeamData = async () => {
    try {
      setIsLoading(true);
      const [teamMetrics, teamMemberStats, collaborationInsights] = await Promise.all([
        apiClient.teams.metrics.collaboration(),
        apiClient.teams.members.stats(),
        apiClient.teams.insights.recent()
      ]);
      setMetrics(teamMetrics || { totalMembers: 0, activeMembers: 0, collaborationScore: 0, tasksCompleted: 0, avgResponseTime: 0, avgSessionDuration: 0 });
      setMemberStats(teamMemberStats || []);
      setInsights(collaborationInsights || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load team collaboration data:', error);
      setMetrics({ totalMembers: 0, activeMembers: 0, collaborationScore: 0, tasksCompleted: 0, avgResponseTime: 0, avgSessionDuration: 0 });
      setMemberStats([]);
      setInsights([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadTeamData();
  }, []);
// @epic-3.4-teams: Team Collaboration Dashboard with Real-time Insights and Analytics
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';
import { apiClient } from '@/lib/api-client';
import { EnhancedPresenceIndicators } from './enhanced-presence-indicators';
import { EnhancedActivityStreams } from './enhanced-activity-streams';
import { EnhancedDiscussionSystem } from './enhanced-discussion-system';
import { useResourceCollaboration } from './enhanced-live-cursors';
import { cn } from '@/lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Target,
  Clock,
  Star,
  Zap,
  Eye,
  BarChart3,
  PieChart,
  Calendar,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Brain,
  Award,
  Coffee,
  Lightbulb
} from 'lucide-react';
import { formatDistanceToNow, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface TeamCollaborationMetrics {
  totalMembers: number;
  activeMembers: number;
  onlineNow: number;
  avgSessionDuration: number;
  totalActivities: number;
  activitiesChange: number;
  messagesExchanged: number;
  messagesChange: number;
  collaborationScore: number;
  scoreChange: number;
  projectsActive: number;
  tasksCompleted: number;
  tasksCompletedChange: number;
}

export interface TeamMemberStats {
  email: string;
  name: string;
  avatar?: string;
  role: string;
  activitiesCount: number;
  messagesCount: number;
  tasksCompleted: number;
  lastActive: Date;
  collaborationScore: number;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentProject?: string;
  specializations: string[];
  achievements: Array<{
    type: 'contributor' | 'collaborator' | 'problem-solver' | 'innovator';
    earned: Date;
    description: string;
  }>;
}

export interface CollaborationInsight {
  id: string;
  type: 'productivity' | 'communication' | 'teamwork' | 'performance' | 'suggestion';
  severity: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  actionable: boolean;
  metrics?: Record<string, number>;
  timestamp: Date;
  dismissed?: boolean;
}

interface TeamCollaborationDashboardProps {
  teamId?: string;
  workspaceId?: string;
  timeRange?: 'today' | 'week' | 'month' | 'quarter';
  showRealTimeFeatures?: boolean;
  showInsights?: boolean;
  showMemberDetails?: boolean;
  className?: string;
}

export function TeamCollaborationDashboard({
  teamId,
  workspaceId,
  timeRange = 'week',
  showRealTimeFeatures = true,
  showInsights = true,
  showMemberDetails = true,
  className = ''
}: TeamCollaborationDashboardProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Dashboard state
  const [selectedView, setSelectedView] = useState<'overview' | 'activity' | 'discussions' | 'insights'>('overview');
  const [metrics, setMetrics] = useState<TeamCollaborationMetrics>({
    totalMembers: 0,
    activeMembers: 0,
    onlineNow: 0,
    avgSessionDuration: 0,
    totalActivities: 0,
    activitiesChange: 0,
    messagesExchanged: 0,
    messagesChange: 0,
    collaborationScore: 0,
    scoreChange: 0,
    projectsActive: 0,
    tasksCompleted: 0,
    tasksCompletedChange: 0
  });

  const [memberStats, setMemberStats] = useState<TeamMemberStats[]>([]);
  const [insights, setInsights] = useState<CollaborationInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Real-time collaboration data
  const { activeCollaborators, isConnected } = useResourceCollaboration(
    workspaceId || workspace?.id || '',
    'workspace'
  );


  // Calculate team health score
  const teamHealthScore = useMemo(() => {
    const factors = [
      metrics.collaborationScore,
      (metrics.activeMembers / metrics.totalMembers) * 100,
      Math.min(100, (metrics.tasksCompleted / 30) * 100), // Normalize task completion
      Math.min(100, (metrics.avgSessionDuration / 8) * 100) // Normalize session duration
    ];

    return Math.round(factors.reduce((a, b) => a + b, 0) / factors.length);
  }, [metrics]);

  // Get trend icon
  const getTrendIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  // Get achievement icon
  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'contributor': return <Award className="w-4 h-4 text-yellow-600" />;
      case 'collaborator': return <Users className="w-4 h-4 text-blue-600" />;
      case 'problem-solver': return <Lightbulb className="w-4 h-4 text-purple-600" />;
      case 'innovator': return <Zap className="w-4 h-4 text-orange-600" />;
      default: return <Star className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get insight icon
  const getInsightIcon = (type: string, severity: string) => {
    switch (type) {
      case 'productivity': return <Target className="w-4 h-4" />;
      case 'communication': return <MessageSquare className="w-4 h-4" />;
      case 'teamwork': return <Users className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      case 'suggestion': return <Lightbulb className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Render overview content
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Health</p>
                <p className="text-2xl font-bold">{teamHealthScore}%</p>
              </div>
              <div className="text-right">
                {getTrendIcon(metrics.scoreChange)}
                <Progress value={teamHealthScore} className="w-16 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                <p className="text-2xl font-bold">{metrics.activeMembers}/{metrics.totalMembers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">{metrics.tasksCompleted}</p>
              </div>
              <div className="text-right">
                {getTrendIcon(metrics.tasksCompletedChange)}
                <span className="text-sm text-muted-foreground">
                  {metrics.tasksCompletedChange > 0 ? '+' : ''}{metrics.tasksCompletedChange}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Online Now</p>
                <p className="text-2xl font-bold">{metrics.onlineNow}</p>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time presence */}
      {showRealTimeFeatures && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Live Team Presence</span>
              {isConnected && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Live
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedPresenceIndicators
              mode="detailed"
              showOfflineUsers={false}
              showCurrentActivity={true}
              showConnectionQuality={true}
              maxDisplayUsers={10}
            />
          </CardContent>
        </Card>
      )}

      {/* Team member statistics */}
      {showMemberDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Member Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {memberStats.map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                          member.status === 'online' && "bg-green-500",
                          member.status === 'away' && "bg-yellow-500",
                          member.status === 'busy' && "bg-red-500",
                          member.status === 'offline' && "bg-gray-400"
                        )} />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{member.name}</span>
                          <Badge variant="outline" className="text-xs">{member.role}</Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{member.tasksCompleted} tasks</span>
                          <span>{member.messagesCount} messages</span>
                          <span>Score: {member.collaborationScore}</span>
                        </div>
                        {member.achievements.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            {member.achievements.slice(0, 3).map((achievement, index) => (
                              <div key={index} className="flex items-center space-x-1">
                                {getAchievementIcon(achievement.type)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Last active {formatDistanceToNow(member.lastActive, { addSuffix: true })}
                      </p>
                      {member.currentProject && (
                        <p className="text-xs text-blue-600">{member.currentProject}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Quick insights */}
      {showInsights && insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5" />
              <span>Team Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={cn(
                    "p-1 rounded",
                    insight.severity === 'success' && "bg-green-100 text-green-600",
                    insight.severity === 'warning' && "bg-yellow-100 text-yellow-600",
                    insight.severity === 'error' && "bg-red-100 text-red-600",
                    insight.severity === 'info' && "bg-blue-100 text-blue-600"
                  )}>
                    {getInsightIcon(insight.type, insight.severity)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.actionable && (
                      <Button variant="outline" size="sm" className="mt-2">
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className={cn("w-full space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Collaboration Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights and analytics for your team
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => setLastUpdated(new Date())}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </span>
        </div>
      </div>

      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="discussions">Discussions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {renderOverview()}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <EnhancedActivityStreams
            workspaceId={workspaceId || workspace?.id}
            teamId={teamId}
            maxItems={50}
            showInsights={true}
            showFilters={true}
            enableGrouping={true}
            enableSearch={true}
          />
        </TabsContent>

        <TabsContent value="discussions" className="space-y-6">
          <EnhancedDiscussionSystem
            roomId={`team-${teamId || 'general'}`}
            resourceType="team"
            resourceId={teamId}
            showAIInsights={true}
            showThreading={true}
            showReactions={true}
            showPresence={true}
          />
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getInsightIcon(insight.type, insight.severity)}
                    <span>{insight.title}</span>
                    <Badge variant={insight.severity === 'error' ? 'destructive' : 'outline'}>
                      {insight.severity}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{insight.description}</p>
                  {insight.metrics && (
                    <div className="space-y-2">
                      {Object.entries(insight.metrics).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="font-medium">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {insight.actionable && (
                    <Button className="w-full mt-4">Take Action</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
