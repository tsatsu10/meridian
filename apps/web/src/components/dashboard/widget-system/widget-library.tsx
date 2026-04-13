import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Search, 
  BarChart3, 
  PieChart, 
  List, 
  Calendar, 
  Activity, 
  Users, 
  Bell, 
  Zap,
  Target,
  TrendingUp,
  Clock,
  CheckSquare,
  MessageSquare,
  FileText,
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { WidgetType, WidgetSize, WidgetConfig } from './widget-container';
import { createId } from '@paralleldrive/cuid2';

export interface WidgetTemplate {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: WidgetSize;
  category: 'analytics' | 'productivity' | 'collaboration' | 'monitoring' | 'custom';
  tags: string[];
  preview?: string;
  configOptions?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    options?: string[];
    default?: any;
  }>;
  permissions?: string[];
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  // Analytics Widgets
  {
    id: 'task-completion-rate',
    type: 'metric-card',
    title: 'Task Completion Rate',
    description: 'Track task completion percentage with trend analysis',
    icon: CheckSquare,
    defaultSize: 'small',
    category: 'analytics',
    tags: ['tasks', 'completion', 'productivity'],
    permissions: ['canViewAnalytics']
  },
  {
    id: 'project-health-chart',
    type: 'chart',
    title: 'Project Health Overview',
    description: 'Visual overview of all project health scores',
    icon: BarChart3,
    defaultSize: 'medium',
    category: 'analytics',
    tags: ['projects', 'health', 'overview'],
    permissions: ['canViewAnalytics']
  },
  {
    id: 'velocity-trend',
    type: 'chart',
    title: 'Team Velocity Trend',
    description: 'Track team velocity over time with forecasting',
    icon: TrendingUp,
    defaultSize: 'large',
    category: 'analytics',
    tags: ['velocity', 'team', 'performance'],
    permissions: ['canViewAnalytics']
  },
  {
    id: 'workload-distribution',
    type: 'chart',
    title: 'Workload Distribution',
    description: 'Pie chart showing task distribution across team members',
    icon: PieChart,
    defaultSize: 'medium',
    category: 'analytics',
    tags: ['workload', 'distribution', 'team'],
    permissions: ['canViewAnalytics']
  },

  // Productivity Widgets
  {
    id: 'upcoming-deadlines',
    type: 'list',
    title: 'Upcoming Deadlines',
    description: 'List of tasks and milestones with approaching deadlines',
    icon: Clock,
    defaultSize: 'medium',
    category: 'productivity',
    tags: ['deadlines', 'tasks', 'urgent'],
    permissions: ['canViewTasks']
  },
  {
    id: 'my-tasks',
    type: 'list',
    title: 'My Tasks',
    description: 'Personal task list with quick actions',
    icon: List,
    defaultSize: 'medium',
    category: 'productivity',
    tags: ['tasks', 'personal', 'todo'],
    permissions: ['canViewTasks']
  },
  {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    description: 'Frequently used actions and shortcuts',
    icon: Zap,
    defaultSize: 'small',
    category: 'productivity',
    tags: ['actions', 'shortcuts', 'quick'],
    permissions: ['canCreateTasks']
  },
  {
    id: 'time-tracking',
    type: 'progress',
    title: 'Time Tracking',
    description: 'Current time tracking status and daily progress',
    icon: Activity,
    defaultSize: 'small',
    category: 'productivity',
    tags: ['time', 'tracking', 'progress'],
    permissions: ['canTrackTime']
  },
  {
    id: 'calendar-overview',
    type: 'calendar',
    title: 'Calendar Overview',
    description: 'Mini calendar with important dates and milestones',
    icon: Calendar,
    defaultSize: 'medium',
    category: 'productivity',
    tags: ['calendar', 'schedule', 'dates'],
    permissions: ['canViewCalendar']
  },

  // Collaboration Widgets
  {
    id: 'team-activity',
    type: 'team-activity',
    title: 'Team Activity Feed',
    description: 'Real-time feed of team member activities',
    icon: Users,
    defaultSize: 'large',
    category: 'collaboration',
    tags: ['team', 'activity', 'collaboration'],
    permissions: ['canViewTeam']
  },
  {
    id: 'recent-comments',
    type: 'list',
    title: 'Recent Comments',
    description: 'Latest comments and discussions on tasks',
    icon: MessageSquare,
    defaultSize: 'medium',
    category: 'collaboration',
    tags: ['comments', 'discussions', 'communication'],
    permissions: ['canViewComments']
  },
  {
    id: 'team-presence',
    type: 'list',
    title: 'Team Presence',
    description: 'Who\'s online and their current status',
    icon: Users,
    defaultSize: 'small',
    category: 'collaboration',
    tags: ['presence', 'online', 'status'],
    permissions: ['canViewTeam']
  },

  // Monitoring Widgets
  {
    id: 'notifications',
    type: 'notifications',
    title: 'Notifications',
    description: 'Recent notifications and alerts',
    icon: Bell,
    defaultSize: 'medium',
    category: 'monitoring',
    tags: ['notifications', 'alerts', 'updates'],
    permissions: ['canViewNotifications']
  },
  {
    id: 'project-milestones',
    type: 'list',
    title: 'Project Milestones',
    description: 'Upcoming and recent project milestones',
    icon: Target,
    defaultSize: 'medium',
    category: 'monitoring',
    tags: ['milestones', 'projects', 'goals'],
    permissions: ['canViewProjects']
  },
  {
    id: 'system-status',
    type: 'metric-card',
    title: 'System Status',
    description: 'Overall system health and performance metrics',
    icon: Settings,
    defaultSize: 'small',
    category: 'monitoring',
    tags: ['system', 'status', 'health'],
    permissions: ['canViewAnalytics']
  }
];

export interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (template: WidgetTemplate) => void;
  userPermissions: string[];
  className?: string;
}

export function WidgetLibrary({
  isOpen,
  onClose,
  onAddWidget,
  userPermissions,
  className
}: WidgetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Widgets', count: WIDGET_TEMPLATES.length },
    { id: 'analytics', label: 'Analytics', count: WIDGET_TEMPLATES.filter(w => w.category === 'analytics').length },
    { id: 'productivity', label: 'Productivity', count: WIDGET_TEMPLATES.filter(w => w.category === 'productivity').length },
    { id: 'collaboration', label: 'Collaboration', count: WIDGET_TEMPLATES.filter(w => w.category === 'collaboration').length },
    { id: 'monitoring', label: 'Monitoring', count: WIDGET_TEMPLATES.filter(w => w.category === 'monitoring').length }
  ];

  const filteredWidgets = WIDGET_TEMPLATES.filter(widget => {
    // Check permissions
    if (widget.permissions && !widget.permissions.some(perm => userPermissions.includes(perm))) {
      return false;
    }

    // Check category filter
    if (selectedCategory !== 'all' && widget.category !== selectedCategory) {
      return false;
    }

    // Check search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        widget.title.toLowerCase().includes(query) ||
        widget.description.toLowerCase().includes(query) ||
        widget.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const handleAddWidget = (template: WidgetTemplate) => {
    onAddWidget(template);
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'analytics': return BarChart3;
      case 'productivity': return CheckSquare;
      case 'collaboration': return Users;
      case 'monitoring': return Bell;
      default: return FileText;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={cn(
              'bg-background border rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Widget Library</h2>
                  <p className="text-muted-foreground">
                    Add interactive widgets to customize your dashboard
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search widgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Categories Sidebar */}
              <div className="w-64 border-r p-4">
                <h3 className="font-medium mb-3">Categories</h3>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const Icon = getCategoryIcon(category.id);
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          'w-full text-left p-2 rounded-md text-sm flex items-center justify-between transition-colors',
                          selectedCategory === category.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        )}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span>{category.label}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {category.count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Widget Grid */}
              <div className="flex-1 p-4">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredWidgets.map((widget) => {
                      const Icon = widget.icon;
                      return (
                        <motion.div
                          key={widget.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <Icon className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-sm font-medium">
                                      {widget.title}
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {widget.defaultSize}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddWidget(widget)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <p className="text-sm text-muted-foreground mb-3">
                                {widget.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {widget.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  {filteredWidgets.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No widgets found</h3>
                      <p className="text-muted-foreground">
                        Try adjusting your search or category filter
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 