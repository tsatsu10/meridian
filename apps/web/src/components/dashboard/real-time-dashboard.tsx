// @epic-4.3-enhanced-dashboards: Real-time dashboard with WebSocket integration
// @role-workspace-manager: Real-time workspace-wide monitoring
// @role-department-head: Department-level real-time insights
// @role-project-manager: Project-specific live updates

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Pause,
  Play,
  RefreshCw,
  Wifi,
  WifiOff,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUnifiedWebSocket } from '@/hooks/useUnifiedWebSocket';

// Real-time data interfaces
interface TaskUpdate {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  updatedAt: string;
  updatedBy: string;
}

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: string;
  timestamp: string;
  entityType: 'task' | 'project' | 'comment' | 'file';
  entityId: string;
  entityName: string;
}

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  timestamp: string;
}

interface RealTimeDashboardProps {
  workspaceId: string;
  projectId?: string;
  userId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export function RealTimeDashboard({
  workspaceId,
  projectId,
  userId,
  autoRefresh = true,
  refreshInterval = 5000,
  className = ""
}: RealTimeDashboardProps) {
  // Component state
  const [taskUpdates, setTaskUpdates] = useState<TaskUpdate[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  // Initialize unified WebSocket connection
  const unifiedWS = useUnifiedWebSocket({
    userEmail: userId || 'elidegbotse@gmail.com',
    workspaceId: workspaceId || 'demo-workspace-123',
    enabled: true,
    onMessage: (message) => {
        if (isPaused) return;
      handleRealtimeMessage(message);
    },
    onConnect: () => {},
    onDisconnect: () => {},
    onError: (error) => {
      console.error('📊 Real-time dashboard WebSocket error:', error);
    }
  });

  // Handle real-time message updates
  const handleRealtimeMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'task_updated':
        setTaskUpdates(prev => {
            const updated = [...prev];
          const index = updated.findIndex(task => task.id === message.data.id);
          if (index >= 0) {
            updated[index] = { ...updated[index], ...message.data };
          } else {
            updated.unshift(message.data);
          }
          return updated.slice(0, 20); // Keep only latest 20
        });
        break;

      case 'user_activity':
        setUserActivities(prev => {
          const updated = [message.data, ...prev];
          return updated.slice(0, 50); // Keep only latest 50
        });
        break;

      case 'system_metric':
        setSystemMetrics(prev => {
          const updated = [...prev];
          const index = updated.findIndex(metric => metric.id === message.data.id);
          if (index >= 0) {
            updated[index] = message.data;
          } else {
            updated.push(message.data);
          }
          return updated;
        });
        break;

      case 'presence':
        // Handle user presence updates for activity tracking
        if (message.data.status === 'online') {
          setUserActivities(prev => [{
            id: `presence-${Date.now()}`,
            userId: message.data.userEmail,
            userName: message.data.userEmail.split('@')[0],
            action: 'came online',
            timestamp: new Date().toISOString(),
            entityType: 'user' as const,
            entityId: message.data.userEmail,
            entityName: 'workspace'
          }, ...prev].slice(0, 50));
        }
        break;

      default:}
  }, [isPaused]);

  // Join dashboard channel when connected
  useEffect(() => {
    if (unifiedWS.connectionState.isConnected) {
      const dashboardChannel = `dashboard-${workspaceId}${projectId ? `-${projectId}` : ''}`;
      unifiedWS.joinChannel(dashboardChannel);return () => {
        unifiedWS.leaveChannel(dashboardChannel);
      };
      }
  }, [unifiedWS.connectionState.isConnected, workspaceId, projectId, unifiedWS]);

  // Mock data initialization
  useEffect(() => {
    // Initialize with some mock data for demo
    setTaskUpdates([
      {
        id: '1',
        title: 'Implement WebSocket real-time updates',
        status: 'in_progress',
        assignedTo: 'mike@example.com',
        priority: 'high',
        updatedAt: new Date(Date.now() - 300000).toISOString(),
        updatedBy: 'sarah@example.com'
      },
      {
        id: '2', 
        title: 'Design system documentation',
        status: 'completed',
        assignedTo: 'lisa@example.com',
        priority: 'medium',
        updatedAt: new Date(Date.now() - 600000).toISOString(),
        updatedBy: 'david@example.com'
      }
    ]);

    setUserActivities([
      {
        id: '1',
        userId: 'sarah@example.com',
        userName: 'Sarah Johnson',
        action: 'updated task status',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        entityType: 'task',
        entityId: '1',
        entityName: 'WebSocket implementation'
      },
      {
        id: '2',
        userId: 'mike@example.com', 
        userName: 'Mike Chen',
        action: 'added comment',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        entityType: 'task',
        entityId: '1',
        entityName: 'WebSocket implementation'
      }
    ]);

    setSystemMetrics([
      {
        id: 'active_users',
        name: 'Active Users',
        value: 12,
        unit: 'users',
        trend: 'up',
        change: 2,
        timestamp: new Date().toISOString()
      },
      {
        id: 'tasks_completed',
        name: 'Tasks Completed Today',
        value: 8,
        unit: 'tasks',
        trend: 'stable',
        change: 0,
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Connection status indicator
  const ConnectionIndicator = () => (
    <div className="flex items-center gap-2">
      {unifiedWS.connectionState.isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-600">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">Offline</span>
        </>
      )}
    </div>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
          <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Real-time Dashboard</h2>
          <p className="text-muted-foreground">Live workspace activity and metrics</p>
              </div>
        <div className="flex items-center gap-4">
          <ConnectionIndicator />
          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
              onClick={() => setIsPaused(!isPaused)}
              >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
              </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
                </Button>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              <TrendingUp className={cn(
                "w-4 h-4",
                metric.trend === 'up' ? 'text-green-600' : 
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              )} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                {metric.value} {metric.unit}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.change > 0 ? '+' : ''}{metric.change} from last hour
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Task Updates */}
            <Card>
              <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Task Updates
            </CardTitle>
            <CardDescription>
              Real-time task status changes and assignments
            </CardDescription>
              </CardHeader>
              <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {taskUpdates.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No recent task updates
                  </div>
                ) : (
                  taskUpdates.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn("text-xs", getStatusColor(task.status))}>
                            {task.status}
                          </Badge>
                          <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                            {task.priority}
                          </Badge>
                            </div>
                        {showDetails && (
                          <div className="text-xs text-muted-foreground mt-2">
                            <div>Assigned: {task.assignedTo}</div>
                            <div>Updated by: {task.updatedBy}</div>
                            <div>Updated: {formatRelativeTime(task.updatedAt)}</div>
                          </div>
                        )}
                        </div>
                    </div>
                  ))
                )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

        {/* User Activity Feed */}
              <Card>
                <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Live user actions across the workspace
            </CardDescription>
                </CardHeader>
                <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {userActivities.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No recent activity
                  </div>
                ) : (
                  userActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={activity.userAvatar} />
                        <AvatarFallback>{activity.userName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                            <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.userName}</span>{' '}
                          {activity.action}{' '}
                          <span className="font-medium">{activity.entityName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.timestamp)}
                        </p>
                        {showDetails && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {activity.entityType}
                          </Badge>
                        )}
                        </div>
                    </div>
                  ))
                )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
    </div>
  );
} 