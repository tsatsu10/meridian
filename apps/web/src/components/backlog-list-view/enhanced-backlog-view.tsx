import { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  List, 
  Grid, 
  BarChart3, 
  Calendar, 
  Target,
  Filter,
  Plus,
  Settings,
  MoreHorizontal,
  Eye,
  EyeOff,
  ChevronDown,
  Search,
  X,
  Palette,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInDays } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Import our new components
import { ThemeCard } from '../backlog/theme-card';
import PriorityMatrix from '../backlog/priority-matrix';
import BacklogAnalytics from '../backlog/backlog-analytics';
import TimelineView from '../backlog/timeline-view';

// Import existing components
import BacklogListView from '../backlog-list-view';
import CreateTaskModal from '../shared/modals/create-task-modal';

// Import types
import type { 
  TaskTheme, 
  EnhancedTask, 
  TaskWithPriority, 
  BacklogViewOptions, 
  BacklogFilters,
  ThemeWithProgress
} from '@/types/backlog';
import type Task from '@/types/task';
import type { ProjectWithTasks } from '@/types/project';

interface EnhancedBacklogViewProps {
  project?: ProjectWithTasks & {
    id: string;
    name: string;
    slug: string;
    plannedTasks: Task[];
    archivedTasks: Task[];
  };
  onTaskClick?: (task: EnhancedTask) => void;
  onThemeCreate?: (theme: Omit<TaskTheme, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TaskTheme>;
  onThemeEdit?: (theme: TaskTheme) => void;
  onThemeDelete?: (themeId: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<EnhancedTask>) => void;
}

// @epic-1.1-subtasks @persona-sarah - PM needs comprehensive backlog management
export default function EnhancedBacklogView({
  project,
  onTaskClick,
  onThemeCreate,
  onThemeEdit,
  onThemeDelete,
  onTaskUpdate
}: EnhancedBacklogViewProps) {
  // Update the refinement status type to include 'all'
  type RefinementStatus = 'draft' | 'refined' | 'ready' | 'all';

  // Update type guard to handle null/undefined
  const hasProjectData = (proj: unknown): proj is ProjectWithTasks & { 
    id: string; 
    name: string; 
    slug: string; 
    plannedTasks: Task[]; 
    archivedTasks: Task[]; 
  } => {
    if (!proj || typeof proj !== 'object') return false;
    const p = proj as any;
    return typeof p.id === 'string' && 
      typeof p.name === 'string' && 
      typeof p.slug === 'string' && 
      Array.isArray(p.plannedTasks) && 
      Array.isArray(p.archivedTasks);
  };

  // Update theme type guard
  const hasThemeData = (theme: unknown): theme is ThemeWithProgress => {
    if (!theme || typeof theme !== 'object') return false;
    const t = theme as any;
    return typeof t.id === 'string';
  };

  // Theme state management - replace mock data with real state
  const [themes, setThemes] = useState<ThemeWithProgress[]>([]);

  // View state management
  const [viewOptions, setViewOptions] = useState<BacklogViewOptions>({
    viewMode: 'themes',
    groupBy: 'theme',
    sortBy: 'priority',
    sortOrder: 'desc'
  });

  // Update the filters state with proper types
  const [filters, setFilters] = useState<BacklogFilters>({
    search: '',
    themeId: undefined,
    priority: undefined,
    assignee: undefined,
    refinementStatus: undefined,
    moscowCategory: undefined
  });

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isCreateThemeOpen, setIsCreateThemeOpen] = useState(false);
  const [themeForm, setThemeForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    targetRelease: 'v1.0',
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low'
  });

  // Ref for search input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Add new state for theme panel
  const [showThemePanel, setShowThemePanel] = useState(false);

  // Initialize with mock themes on mount (remove when backend is ready)
  useEffect(() => {
    // Only initialize if themes are empty and project exists
    if (themes.length === 0 && hasProjectData(project)) {
      // Initialize with empty themes array - removed demo content
      setThemes([]);
    }
  }, [project, themes.length]);

  // Handle theme creation with proper state update
  const handleCreateTheme = () => {
    setIsCreateThemeOpen(true);
  };

  const handleSubmitTheme = async () => {
    if (!themeForm.name.trim()) return;

    const newThemeData = {
      name: themeForm.name,
      description: themeForm.description,
      color: themeForm.color,
      projectId: hasProjectData(project) ? project.id : '',
      targetRelease: themeForm.targetRelease,
      priority: themeForm.priority,
      tasks: []
    };

    try {
      if (onThemeCreate) {
        const createdTheme = await onThemeCreate(newThemeData);
        
        // Create theme with progress for local state
        const themeWithProgress: ThemeWithProgress = {
          ...createdTheme,
          progress: {
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            plannedTasks: 0,
            progressPercentage: 0,
            storyPointsTotal: 0,
            storyPointsCompleted: 0,
            estimatedCompletion: undefined
          },
          health: 'excellent',
          risks: []
        };
        
        // Add to local state immediately for UI update
        setThemes(prev => [...prev, themeWithProgress]);
        
        setIsCreateThemeOpen(false);
        setThemeForm({
          name: '',
          description: '',
          color: '#3B82F6',
          targetRelease: 'v1.0',
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Failed to create theme:', error);
    }
  };

  const handleCloseThemeModal = () => {
    setIsCreateThemeOpen(false);
    setThemeForm({
      name: '',
      description: '',
      color: '#3B82F6',
      targetRelease: 'v1.0',
      priority: 'medium'
    });
  };

  // Handle theme deletion with state update
  const handleDeleteTheme = async (themeId: string) => {
    try {
      if (onThemeDelete) {
        await onThemeDelete(themeId);
        // Remove from local state immediately for UI update
        setThemes(prev => prev.filter(theme => theme.id !== themeId));
      }
    } catch (error) {
      console.error('Failed to delete theme:', error);
    }
  };

  // Transform tasks to enhanced tasks with additional metadata
  const enhancedTasks: EnhancedTask[] = useMemo(() => {
    if (!hasProjectData(project)) return [];
    
    const allTasks = [
      ...(project.plannedTasks || []),
      ...(project.archivedTasks || [])
    ];

    return allTasks.map(task => {
      const now = new Date();
      const ageInDays = differenceInDays(now, new Date(task.createdAt));
      
      return {
        ...task,
        themeId: task.id.includes('auth') ? '1' : task.id.includes('payment') ? '2' : undefined,
        storyPoints: Math.floor(Math.random() * 8) + 1,
        businessValue: Math.floor(Math.random() * 10) + 1,
        effort: Math.floor(Math.random() * 10) + 1,
        refinementStatus: ['draft', 'refined', 'ready'][Math.floor(Math.random() * 3)] as RefinementStatus,
        labels: ['frontend', 'backend', 'api'].slice(0, Math.floor(Math.random() * 3) + 1),
        acceptanceCriteria: ['User can login', 'Error handling works', 'UI is responsive'],
        ageInDays
      };
    });
  }, [project]);

  // Convert to tasks with priority for matrix view
  const tasksWithPriority: TaskWithPriority[] = useMemo(() => {
    return enhancedTasks.map(task => ({
      ...task,
      priorityScore: {
        reach: Math.floor(Math.random() * 10) + 1,
        impact: Math.floor(Math.random() * 10) + 1,
        confidence: Math.floor(Math.random() * 10) + 1,
        effort: task.effort || 5,
        riceScore: 0 // Will be calculated
      },
      moscowCategory: ['must', 'should', 'could', 'wont'][Math.floor(Math.random() * 4)] as 'must' | 'should' | 'could' | 'wont'
    }));
  }, [enhancedTasks]);

  // Apply filters - Fixed search functionality
  const filteredTasks = useMemo(() => {
    let filtered = enhancedTasks;

    // Improved search functionality
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(searchTerm);
        const descriptionMatch = task.description?.toLowerCase().includes(searchTerm);
        const labelMatch = task.labels?.some(label => label.toLowerCase().includes(searchTerm));
        const criteriaMatch = task.acceptanceCriteria?.some(criteria => 
          criteria.toLowerCase().includes(searchTerm)
        );
        
        return titleMatch || descriptionMatch || labelMatch || criteriaMatch;
      });
    }

    if (filters.themeId && filters.themeId !== 'all') {
      filtered = filtered.filter(task => task.themeId === filters.themeId);
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    if (filters.assignee && filters.assignee !== 'all') {
      filtered = filtered.filter(task => task.userEmail === filters.assignee);
    }

    if (filters.refinementStatus && filters.refinementStatus !== 'all') {
      filtered = filtered.filter(task => task.refinementStatus === filters.refinementStatus);
    }

    return filtered;
  }, [enhancedTasks, filters]);

  // Clear search filter
  const clearSearch = () => {
    setFilters(prev => ({ ...prev, search: '' }));
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Render view mode selector
  const ViewModeSelector = () => (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border p-1">
        <Button
          variant={viewOptions.viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewOptions(prev => ({ ...prev, viewMode: 'list' }))}
          className="h-8 px-2"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewOptions.viewMode === 'themes' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewOptions(prev => ({ ...prev, viewMode: 'themes' }))}
          className="h-8 px-2"
        >
          <Grid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewOptions.viewMode === 'priority-matrix' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewOptions(prev => ({ ...prev, viewMode: 'priority-matrix' }))}
          className="h-8 px-2"
        >
          <BarChart3 className="h-4 w-4" />
        </Button>
        <Button
          variant={viewOptions.viewMode === 'timeline' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewOptions(prev => ({ ...prev, viewMode: 'timeline' }))}
          className="h-8 px-2"
        >
          <Calendar className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Render filters panel
  const FiltersPanel = () => (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="flex items-center gap-2 min-w-[200px] relative">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="flex-1 h-8 text-sm pr-8"
          ref={searchInputRef}
        />
        {filters.search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Theme Filter */}
      <Select value={filters.themeId || 'all'} onValueChange={(value) => 
        setFilters(prev => ({ ...prev, themeId: value === 'all' ? undefined : value }))
      }>
        <SelectTrigger className="w-[180px] h-8">
          <SelectValue placeholder="All themes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All themes</SelectItem>
          {themes.map(theme => (
            <SelectItem key={theme.id} value={theme.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: theme.color }}
                />
                {theme.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select value={filters.priority || 'all'} onValueChange={(value) => 
        setFilters(prev => ({ ...prev, priority: value === 'all' ? undefined : value }))
      }>
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="All priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      {/* Refinement Status Filter */}
      <Select 
        value={filters.refinementStatus || 'all'} 
        onValueChange={(value: RefinementStatus) => 
          setFilters(prev => ({ 
            ...prev, 
            refinementStatus: value === 'all' ? undefined : value 
          }))
        }
      >
        <SelectTrigger className="w-[140px] h-8">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="refined">Refined</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
        </SelectContent>
      </Select>

      {/* Filter count indicator */}
      {(filters.search || filters.themeId || filters.priority || filters.refinementStatus) && (
        <Badge variant="secondary" className="text-xs">
          {filteredTasks.length} of {enhancedTasks.length} tasks
        </Badge>
      )}
    </div>
  );

  // Render different view modes
  const renderViewContent = () => {
    switch (viewOptions.viewMode) {
      case 'themes':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {themes.map(theme => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  tasks={filteredTasks.filter(task => task.themeId === theme.id)}
                  isSelected={selectedThemeId === theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                  onEdit={onThemeEdit}
                  onDelete={handleDeleteTheme}
                  onAddTask={(themeId) => {
                    setSelectedThemeId(themeId);
                    setIsCreateTaskOpen(true);
                  }}
                />
              ))}
              
              {/* Add Theme Button */}
              <Card 
                className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => handleCreateTheme()}
              >
                <CardContent className="flex items-center justify-center h-full min-h-[200px]">
                  <div className="text-center">
                    <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Create Theme</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks not in themes */}
            {filteredTasks.filter(task => !task.themeId).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Unthemed Tasks</h3>
                <div className="grid gap-2">
                  {filteredTasks
                    .filter(task => !task.themeId)
                    .map(task => (
                      <Card key={task.id} className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {task.refinementStatus}
                              </Badge>
                            </div>
                          </div>
                          {task.storyPoints && (
                            <Badge variant="secondary">
                              {task.storyPoints}sp
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'priority-matrix':
        return (
          <PriorityMatrix
            tasks={tasksWithPriority.filter(task => 
              !filters.themeId || task.themeId === filters.themeId
            )}
            onTaskClick={onTaskClick}
            showLegend={true}
          />
        );

      case 'timeline':
        return (
          <TimelineView 
            tasks={filteredTasks} 
            onTaskClick={onTaskClick}
          />
        );

      default:
        return <BacklogListView project={project} />;
    }
  };

  // Update theme selection handler with type guard
  const handleThemeSelect = (themeId: string) => {
    const theme = themes.find(t => hasThemeData(t) && t.id === themeId);
    if (!theme) return;
    
    setSelectedThemeId(selectedThemeId === themeId ? null : themeId);
    setShowThemePanel(selectedThemeId !== themeId);
  };

  // Add theme panel render function
  const renderThemePanel = () => {
    if (!selectedThemeId || !showThemePanel) return null;
    
    const selectedTheme = themes.find(t => t.id === selectedThemeId);
    if (!selectedTheme) return null;

    const themeTasks = filteredTasks.filter(task => task.themeId === selectedThemeId);
    
    // Calculate task status distribution
    const taskStatusDistribution = themeTasks.reduce((acc, task) => {
      const status = task.status || 'planned';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate team workload
    const teamWorkload = themeTasks.reduce((acc, task) => {
      if (task.userEmail) {
        acc[task.userEmail] = (acc[task.userEmail] || 0) + (task.storyPoints || 0);
      }
      return acc;
    }, {} as Record<string, number>);
    
    return (
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 h-full w-[600px] bg-white dark:bg-zinc-900 shadow-2xl z-50 border-l border-zinc-200 dark:border-zinc-800"
      >
        <div className="flex flex-col h-full">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: selectedTheme.color }}
              />
              <div>
                <h2 className="text-xl font-semibold">{selectedTheme.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {selectedTheme.targetRelease}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", 
                      selectedTheme.priority === 'critical' ? 'text-red-500' :
                      selectedTheme.priority === 'high' ? 'text-orange-500' :
                      selectedTheme.priority === 'medium' ? 'text-yellow-500' :
                      'text-green-500'
                    )}
                  >
                    {selectedTheme.priority}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowThemePanel(false);
                setSelectedThemeId(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6 space-y-8">
              {/* Overview Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Progress</div>
                      <Progress value={selectedTheme.progress.progressPercentage} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span>{Math.round(selectedTheme.progress.progressPercentage)}% complete</span>
                        <span>{selectedTheme.progress.completedTasks}/{selectedTheme.progress.totalTasks} tasks</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Story Points</div>
                      <div className="text-2xl font-semibold">
                        {selectedTheme.progress.storyPointsCompleted}/{selectedTheme.progress.storyPointsTotal}
                      </div>
                      <div className="text-sm text-muted-foreground">points completed</div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Description Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <Card className="p-4">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedTheme.description || 'No description provided.'}
                  </p>
                </Card>
              </div>

              {/* Task Status Distribution */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Task Distribution</h3>
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(taskStatusDistribution).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize">
                          {status}
                        </Badge>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Team Workload */}
              {Object.keys(teamWorkload).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Team Workload</h3>
                  <Card className="p-4">
                    <div className="space-y-3">
                      {Object.entries(teamWorkload).map(([email, points]) => (
                        <div key={email} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{email}</span>
                          </div>
                          <Badge variant="secondary">{points} pts</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Tasks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Tasks</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreateTaskOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Task
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {themeTasks.map(task => (
                    <Card 
                      key={task.id} 
                      className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          {task.storyPoints && (
                            <Badge variant="secondary">
                              {task.storyPoints}sp
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {task.refinementStatus}
                          </Badge>
                          {task.userEmail && (
                            <div className="flex items-center gap-1 ml-auto">
                              <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-xs">
                                  {task.userEmail.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {themeTasks.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No tasks in this theme yet</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setIsCreateTaskOpen(true)}
                      >
                        Add your first task
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Risks Section */}
              {selectedTheme.risks.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Risks</h3>
                  <Card className="p-4">
                    <div className="space-y-2">
                      {selectedTheme.risks.map((risk, index) => (
                        <div 
                          key={index} 
                          className="text-sm bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-3 rounded-md flex items-start gap-2"
                        >
                          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{risk}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onThemeEdit?.(selectedTheme);
                  setShowThemePanel(false);
                  setSelectedThemeId(null);
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit Theme
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this theme? This action cannot be undone.')) {
                    handleDeleteTheme(selectedTheme.id);
                    setShowThemePanel(false);
                    setSelectedThemeId(null);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Theme
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Project Backlog</h1>
            <Badge variant="secondary">
              {filteredTasks.length} tasks
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              {showAnalytics ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Analytics
            </Button>
            
            <Button
              onClick={() => setIsCreateTaskOpen(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export Backlog</DropdownMenuItem>
                <DropdownMenuItem>Import Tasks</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Backlog Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <ViewModeSelector />
          <FiltersPanel />
        </div>
      </div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowAnalytics(false)}
            />
            
            {/* Slide-in Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-zinc-900 shadow-2xl z-50 border-l border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Backlog Analytics</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAnalytics(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-auto p-4">
                  <BacklogAnalytics 
                    tasks={filteredTasks} 
                    variant="detailed"
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {renderViewContent()}
        </div>
      </div>

      {/* Theme Panel */}
      <AnimatePresence>
        {showThemePanel && renderThemePanel()}
      </AnimatePresence>

      {/* Create Task Modal */}
      <CreateTaskModal
        open={isCreateTaskOpen}
        onOpenChange={setIsCreateTaskOpen}
        projectContext={project && hasProjectData(project) ? {
          id: project.id,
          name: project.name,
          slug: project.slug
        } : undefined}
        hideProjectSelection={true}
        status="planned"
      />

      {/* Theme Creation Modal */}
      <Dialog open={isCreateThemeOpen} onOpenChange={handleCloseThemeModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Theme</DialogTitle>
            <DialogDescription>
              Enter the details for the new theme
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={themeForm.name}
                onChange={(e) => setThemeForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={themeForm.description}
                onChange={(e) => setThemeForm(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="color" className="text-right">
                Color
              </Label>
              <div className="col-span-3">
                <Input
                  id="color"
                  type="color"
                  value={themeForm.color}
                  onChange={(e) => setThemeForm(prev => ({ ...prev, color: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetRelease" className="text-right">
                Target Release
              </Label>
              <Input
                id="targetRelease"
                value={themeForm.targetRelease}
                onChange={(e) => setThemeForm(prev => ({ ...prev, targetRelease: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select
                value={themeForm.priority}
                onValueChange={(value) => setThemeForm(prev => ({ ...prev, priority: value as 'critical' | 'high' | 'medium' | 'low' }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleSubmitTheme}>
              Create Theme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 