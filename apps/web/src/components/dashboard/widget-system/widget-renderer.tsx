import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2, 
  Clock,
  ExternalLink,
  Calendar,
  Activity,
  Bell,
  AlertTriangle,
  Users,
  Target,
  BarChart3,
  PieChart,
  ArrowRight
} from 'lucide-react';

// Mock data for demonstration
const mockProductivityData = [
  { name: 'Tasks Completed', value: 45, trend: 'up', change: '+12%' },
  { name: 'Time Focused', value: 85, trend: 'up', change: '+8%' },
  { name: 'Projects Active', value: 12, trend: 'down', change: '-2%' },
  { name: 'Team Efficiency', value: 78, trend: 'up', change: '+15%' }
];

const mockTasks = [
  { id: '1', title: 'Complete project proposal', priority: 'high', due: '2024-01-15', status: 'in_progress' },
  { id: '2', title: 'Review design mockups', priority: 'medium', due: '2024-01-16', status: 'pending' },
  { id: '3', title: 'Team sync meeting', priority: 'low', due: '2024-01-17', status: 'pending' },
  { id: '4', title: 'Update documentation', priority: 'medium', due: '2024-01-18', status: 'completed' }
];

const mockActivities = [
  { id: '1', user: 'Sarah Johnson', action: 'completed task', target: 'Design Review', time: '2 hours ago', avatar: 'SJ' },
  { id: '2', user: 'Mike Chen', action: 'created project', target: 'Mobile App V2', time: '4 hours ago', avatar: 'MC' },
  { id: '3', user: 'Emily Davis', action: 'assigned task', target: 'Bug fixes', time: '6 hours ago', avatar: 'ED' }
];

const mockNotifications = [
  { id: '1', title: 'New project assigned', message: 'You have been assigned to Project Alpha', type: 'info', time: '1 hour ago' },
  { id: '2', title: 'Deadline approaching', message: 'Task due in 2 hours', type: 'warning', time: '2 hours ago' },
  { id: '3', title: 'Meeting reminder', message: 'Team sync in 30 minutes', type: 'reminder', time: '30 minutes ago' }
];

const mockTeamData = [
  { name: 'Sarah Johnson', role: 'Project Manager', tasks: 12, completed: 8, avatar: 'SJ' },
  { name: 'Mike Chen', role: 'Developer', tasks: 15, completed: 13, avatar: 'MC' },
  { name: 'Emily Davis', role: 'Designer', tasks: 8, completed: 6, avatar: 'ED' }
];

const mockCalendarEvents = [
  { id: '1', title: 'Team Standup', time: '9:00 AM', type: 'meeting' },
  { id: '2', title: 'Client Review', time: '2:00 PM', type: 'review' },
  { id: '3', title: 'Sprint Planning', time: '4:00 PM', type: 'planning' }
];

// Widget Components
const ProductivityOverviewWidget = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {mockProductivityData.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-background to-muted/50 p-4 rounded-lg border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
              {item.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{item.value}%</span>
              <span className={`text-sm ${item.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                {item.change}
              </span>
            </div>
            <Progress value={item.value} className="mt-2" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const TasksWidget = () => {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {mockTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className={`p-1 rounded-full ${
              task.status === 'completed' ? 'bg-green-100 dark:bg-green-900' : 
              task.priority === 'high' ? 'bg-red-100 dark:bg-red-900' : 
              'bg-blue-100 dark:bg-blue-900'
            }`}>
              {task.status === 'completed' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{task.due}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
};

const ActivityFeedWidget = () => {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {mockActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{activity.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.user}</span>
                <span className="text-muted-foreground"> {activity.action} </span>
                <span className="font-medium">{activity.target}</span>
              </p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
};

const NotificationsWidget = () => {
  return (
    <ScrollArea className="h-[300px]">
      <div className="space-y-3">
        {mockNotifications.map((notification, index) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className={`p-1 rounded-full mt-1 ${
              notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' : 
              notification.type === 'info' ? 'bg-blue-100 dark:bg-blue-900' : 
              'bg-green-100 dark:bg-green-900'
            }`}>
              {notification.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              ) : notification.type === 'info' ? (
                <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{notification.title}</p>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </ScrollArea>
  );
};

const TeamOverviewWidget = () => {
  return (
    <div className="space-y-4">
      {mockTeamData.map((member, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback>{member.avatar}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{member.name}</p>
            <p className="text-sm text-muted-foreground">{member.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                value={(member.completed / member.tasks) * 100} 
                className="flex-1 h-2" 
              />
              <span className="text-xs text-muted-foreground">
                {member.completed}/{member.tasks}
              </span>
            </div>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      ))}
    </div>
  );
};

const CalendarWidget = () => {
  return (
    <div className="space-y-3">
      <div className="text-center p-4 border rounded-lg bg-muted/50">
        <h3 className="font-semibold text-lg">Today</h3>
        <p className="text-sm text-muted-foreground">January 15, 2024</p>
      </div>
      <div className="space-y-2">
        {mockCalendarEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className={`p-2 rounded-full ${
              event.type === 'meeting' ? 'bg-blue-100 dark:bg-blue-900' :
              event.type === 'review' ? 'bg-green-100 dark:bg-green-900' :
              'bg-purple-100 dark:bg-purple-900'
            }`}>
              <Calendar className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{event.title}</p>
              <p className="text-xs text-muted-foreground">{event.time}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Main Widget Renderer Component
interface WidgetRendererProps {
  widgetType: string;
  data?: any;
  config?: any;
}

export const WidgetRenderer = ({ widgetType, data, config }: WidgetRendererProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const renderWidget = () => {
    switch (widgetType) {
      case 'productivity-overview':
        return <ProductivityOverviewWidget />;
      case 'tasks':
        return <TasksWidget />;
      case 'activity-feed':
        return <ActivityFeedWidget />;
      case 'notifications':
        return <NotificationsWidget />;
      case 'team-overview':
        return <TeamOverviewWidget />;
      case 'calendar':
        return <CalendarWidget />;
      default:
        return (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2" />
              <p>Widget type "{widgetType}" not found</p>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        {renderWidget()}
      </CardContent>
    </Card>
  );
};

export default WidgetRenderer; 