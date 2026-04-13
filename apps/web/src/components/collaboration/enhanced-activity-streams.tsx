// @epic-3.4-teams: Enhanced Team Activity Streams with Smart Filtering and Insights
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';
import { useAuth } from '@/components/providers/unified-context-provider';
import useWorkspaceStore from '@/store/workspace';
import { EnhancedPresenceIndicators } from './enhanced-presence-indicators';
import { cn } from '@/lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Filter,
  Search,
  TrendingUp,
  Clock,
  Users,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
  Star,
  Eye,
  Edit,
  Calendar,
  Zap,
  Target,
  BarChart3,
  PieChart,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format, startOfDay, endOfDay, isToday, isYesterday, isThisWeek } from 'date-fns';

export interface ActivityItem {
  id: string;
  type: 'task' | 'project' | 'comment' | 'file' | 'meeting' | 'milestone' | 'team' | 'system';
  action: string;
  userEmail: string;
  userName: string;
  userAvatar?: string;
  target?: {
    type: string;
    id: string;
    name: string;
    url?: string;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isLive?: boolean;
  aggregatedCount?: number;
  relatedItems?: ActivityItem[];
}

export interface ActivityFilter {
  type?: string[];
  user?: string[];
  priority?: string[];
  timeRange?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  search?: string;
  showAggregated?: boolean;
}

export interface ActivityInsights {
  totalActivities: number;
  activeUsers: number;
  topContributors: Array<{ userEmail: string; count: number }>;
  activityByType: Record<string, number>;
  activityByHour: Record<string, number>;
  trends: {
    activity: 'increasing' | 'decreasing' | 'stable';
    collaboration: 'high' | 'medium' | 'low';
    engagement: number; // 0-100 score
  };
}

interface EnhancedActivityStreamsProps {
  workspaceId?: string;
  teamId?: string;
  projectId?: string;
  maxItems?: number;
  showInsights?: boolean;
  showFilters?: boolean;
  showLiveIndicator?: boolean;
  enableGrouping?: boolean;
  enableSearch?: boolean;
  className?: string;
}

export function EnhancedActivityStreams({
  workspaceId,
  teamId,
  projectId,
  maxItems = 100,
  showInsights = true,
  showFilters = true,
  showLiveIndicator = true,
  enableGrouping = true,
  enableSearch = true,
  className = ''
}: EnhancedActivityStreamsProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [liveActivities, setLiveActivities] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Filter and view state
  const [filter, setFilter] = useState<ActivityFilter>({
    timeRange: 'today',
    showAggregated: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState<'stream' | 'grouped' | 'insights'>('stream');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Insights state
  const [insights, setInsights] = useState<ActivityInsights>({
    totalActivities: 0,
    activeUsers: 0,
    topContributors: [],
    activityByType: {},
    activityByHour: {},
    trends: {
      activity: 'stable',
      collaboration: 'medium',
      engagement: 75
    }
  });

  // Refs for cleanup and performance
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastActivityRef = useRef<string | null>(null);

  // WebSocket connection
  const { connectionState } = useUnifiedWebSocket({
    enabled: !!user?.email && !!workspace?.id,
    userEmail: user?.email || '',
    workspaceId: workspace?.id || '',
    onTaskUpdate: handleActivityUpdate,
    onCommentUpdate: handleActivityUpdate,
    onFileUpdate: handleActivityUpdate
  });

  // Handle real-time activity updates
  function handleActivityUpdate(data: any) {
    const activity: ActivityItem = {
      id: data.id || `${Date.now()}-${Math.random()}`,
      type: inferActivityType(data.type),
      action: data.action || 'updated',
      userEmail: data.userEmail,
      userName: data.userName || data.userEmail.split('@')[0],
      userAvatar: data.userAvatar,
      target: data.target,
      metadata: data.metadata,
      timestamp: new Date(data.timestamp || Date.now()),
      priority: data.priority || 'medium',
      isLive: true
    };

    // Prevent duplicate activities
    if (lastActivityRef.current === activity.id) return;
    lastActivityRef.current = activity.id;

    setActivities(prev => {
      const updated = [activity, ...prev].slice(0, maxItems);
      return updated;
    });

    // Mark as live
    setLiveActivities(prev => new Set(prev.add(activity.id)));

    // Remove live indicator after 5 seconds
    const timeout = setTimeout(() => {
      setLiveActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activity.id);
        return newSet;
      });
      timeoutRefs.current.delete(activity.id);
    }, 5000);

    timeoutRefs.current.set(activity.id, timeout);
    setLastUpdate(new Date());
  }

  // Infer activity type from data
  const inferActivityType = (dataType: string): ActivityItem['type'] => {
    if (dataType?.includes('task')) return 'task';
    if (dataType?.includes('project')) return 'project';
    if (dataType?.includes('comment')) return 'comment';
    if (dataType?.includes('file')) return 'file';
    if (dataType?.includes('meeting')) return 'meeting';
    if (dataType?.includes('milestone')) return 'milestone';
    if (dataType?.includes('team')) return 'team';
    return 'system';
  };

  // Apply filters to activities
  const applyFilters = useCallback((activities: ActivityItem[], filter: ActivityFilter, search: string) => {
    let filtered = [...activities];

    // Type filter
    if (filter.type && filter.type.length > 0) {
      filtered = filtered.filter(activity => filter.type!.includes(activity.type));
    }

    // User filter
    if (filter.user && filter.user.length > 0) {
      filtered = filtered.filter(activity => filter.user!.includes(activity.userEmail));
    }

    // Priority filter
    if (filter.priority && filter.priority.length > 0) {
      filtered = filtered.filter(activity => filter.priority!.includes(activity.priority));
    }

    // Time range filter
    if (filter.timeRange && filter.timeRange !== 'all') {
      const now = new Date();
      const filterDate = (activity: ActivityItem) => {
        switch (filter.timeRange) {
          case 'today':
            return isToday(activity.timestamp);
          case 'yesterday':
            return isYesterday(activity.timestamp);
          case 'week':
            return isThisWeek(activity.timestamp);
          case 'month':
            return activity.timestamp >= new Date(now.getFullYear(), now.getMonth(), 1);
          default:
            return true;
        }
      };
      filtered = filtered.filter(filterDate);
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.action.toLowerCase().includes(searchLower) ||
        activity.userName.toLowerCase().includes(searchLower) ||
        activity.target?.name.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, []);

  // Group activities by time and type
  const groupActivities = useMemo(() => {
    if (!enableGrouping) return {};

    const groups: Record<string, ActivityItem[]> = {};

    filteredActivities.forEach(activity => {
      let groupKey: string;

      if (isToday(activity.timestamp)) {
        groupKey = 'Today';
      } else if (isYesterday(activity.timestamp)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(activity.timestamp)) {
        groupKey = 'This Week';
      } else {
        groupKey = format(activity.timestamp, 'MMM dd, yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return groups;
  }, [filteredActivities, enableGrouping]);

  // Calculate insights
  useEffect(() => {
    if (filteredActivities.length === 0) return;

    const userCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};

    filteredActivities.forEach(activity => {
      // User activity count
      userCounts[activity.userEmail] = (userCounts[activity.userEmail] || 0) + 1;

      // Type count
      typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1;

      // Hour count
      const hour = activity.timestamp.getHours().toString();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const topContributors = Object.entries(userCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([userEmail, count]) => ({ userEmail, count }));

    setInsights({
      totalActivities: filteredActivities.length,
      activeUsers: Object.keys(userCounts).length,
      topContributors,
      activityByType: typeCounts,
      activityByHour: hourCounts,
      trends: {
        activity: filteredActivities.length > 20 ? 'increasing' : 'stable',
        collaboration: Object.keys(userCounts).length > 5 ? 'high' : 'medium',
        engagement: Math.min(100, Math.max(0, filteredActivities.length * 2))
      }
    });
  }, [filteredActivities]);

  // Apply filters when they change
  useEffect(() => {
    const filtered = applyFilters(activities, filter, searchQuery);
    setFilteredActivities(filtered);
  }, [activities, filter, searchQuery, applyFilters]);

  // Get activity icon
  const getActivityIcon = (type: string, action: string) => {
    switch (type) {
      case 'task':
        if (action.includes('completed')) return <CheckCircle className="w-4 h-4 text-green-600" />;
        if (action.includes('created')) return <Target className="w-4 h-4 text-blue-600" />;
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'project':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      case 'file':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'meeting':
        return <Calendar className="w-4 h-4 text-red-600" />;
      case 'milestone':
        return <Star className="w-4 h-4 text-yellow-600" />;
      case 'team':
        return <Users className="w-4 h-4 text-indigo-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Render activity item
  const renderActivityItem = (activity: ActivityItem, showTime: boolean = true) => {
    const isLive = liveActivities.has(activity.id);

    return (
      <div
        key={activity.id}
        className={cn(
          "flex items-start space-x-3 p-3 rounded-lg transition-all duration-300",
          isLive ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-gray-50"
        )}
      >
        <div className="relative">
          <Avatar className="w-8 h-8">
            <AvatarImage src={activity.userAvatar} />
            <AvatarFallback className="text-xs">
              {activity.userName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isLive && showLiveIndicator && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {getActivityIcon(activity.type, activity.action)}
            <span className="font-medium text-sm">{activity.userName}</span>
            <span className="text-sm text-gray-600">{activity.action}</span>
            {activity.priority !== 'medium' && (
              <Badge variant="outline" className={cn("text-xs", getPriorityColor(activity.priority))}>
                {activity.priority}
              </Badge>
            )}
            {isLive && showLiveIndicator && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                Live
              </Badge>
            )}
          </div>

          {activity.target && (
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {activity.target.type}: {activity.target.name}
              </Badge>
            </div>
          )}

          {showTime && (
            <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render insights view
  const renderInsightsView = () => (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Activities</p>
                <p className="text-2xl font-bold">{insights.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active Contributors</p>
                <p className="text-2xl font-bold">{insights.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Engagement Score</p>
                <p className="text-2xl font-bold">{insights.trends.engagement}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity by type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-4 h-4" />
              <span>Activity by Type</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(insights.activityByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getActivityIcon(type, '')}
                    <span className="text-sm capitalize">{type}</span>
                  </div>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top contributors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Top Contributors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.topContributors.map((contributor, index) => (
                <div key={contributor.userEmail} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span className="text-sm">{contributor.userEmail.split('@')[0]}</span>
                  </div>
                  <Badge variant="outline">{contributor.count} activities</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Card className={cn("w-full", className)}>
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Team Activity</span>
              {showLiveIndicator && connectionState.isConnected && (
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  Live
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setLastUpdate(new Date())}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh activities</TooltipContent>
              </Tooltip>

              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* View tabs */}
          <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="stream">Stream</TabsTrigger>
              <TabsTrigger value="grouped">Grouped</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Filters */}
            {showFilters && selectedView !== 'insights' && (
              <div className="flex items-center space-x-4 pt-4">
                {enableSearch && (
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search activities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <Select
                  value={filter.timeRange}
                  onValueChange={(value) => setFilter(prev => ({ ...prev, timeRange: value as any }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <TabsContent value="stream" className="space-y-4 mt-6">
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map(activity => renderActivityItem(activity))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activities found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="grouped" className="space-y-4 mt-6">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Object.entries(groupActivities).map(([group, groupActivities]) => (
                    <div key={group} className="space-y-2">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          const newExpanded = new Set(expandedGroups);
                          if (newExpanded.has(group)) {
                            newExpanded.delete(group);
                          } else {
                            newExpanded.add(group);
                          }
                          setExpandedGroups(newExpanded);
                        }}
                      >
                        <h4 className="font-medium text-sm">{group}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {groupActivities.length}
                          </Badge>
                          {expandedGroups.has(group) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {expandedGroups.has(group) && (
                        <div className="space-y-1 pl-4 border-l-2 border-gray-200">
                          {groupActivities.map(activity => renderActivityItem(activity, false))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              {renderInsightsView()}
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </TooltipProvider>
  );
}