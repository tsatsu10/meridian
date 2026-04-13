import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";
import { MagicCard } from "@/components/magicui/magic-card";
import { 
  Calendar as CalendarIcon, 
  X, 
  ListTodo, 
  UserIcon, 
  Flag, 
  GitBranch, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Tag,
  Zap,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  Users,
  Calendar as CalendarIconAlt,
  AlertCircle,
  Sparkles,
  Loader2,
  Layout,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { format, addDays, addWeeks, startOfTomorrow } from "date-fns";
import { toast } from "sonner";
import useCreateTask from "@/hooks/mutations/task/use-create-task";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetActiveWorkspaceUsers from "@/hooks/queries/workspace-users/use-active-workspace-users";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useWorkspaceStore from "@/store/workspace";
import useProjectStore from "@/store/project";
import { useTeams } from "@/hooks/use-teams";
import { produce } from "immer";
import { flattenTasks } from "@/utils/task-hierarchy";
import { priorityOptions, statusOptions } from "@/constants/task";

// @epic-1.1-subtasks: Mike (Dev) and Sarah (PM) need quick task creation with context awareness
// @epic-1.2-dependencies: Sarah (PM) needs dependency management for task scheduling
// @epic-3.2-time: Efficient task management workflows for all personas
// @persona-sarah: PM needs comprehensive task creation with dependency tracking
// @persona-mike: Dev needs fast, efficient task creation without friction

interface User {
  id: string;
  userEmail: string;
  userName: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface Team {
    id: string;
    name: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
      id: string;
      name: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  assigneeEmail: string | null;
  assigneeName: string | null;
  assignedTeamId: string | null;
  assignedTeam: Team | null;
  position: number;
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  number: number | null;
  userEmail: string | null;
}

interface ProjectColumn {
  id: string;
  tasks: Task[];
}

interface ProjectState {
  columns: {
    tasks: Task[];
  }[];
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  projectContext?: ProjectState;
  onTaskCreated?: (task: Task) => void;
  hideProjectSelection?: boolean;
  status?: string;
  parentTaskId?: string;
}

interface FormData {
  title: string;
  description: string;
  projectId: string;
  assigneeEmail: string | null;
  assignedTeamId: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  parentId: string | null;
  dependencies: string[];
  labels: string[];
}

interface TaskWithSubtasks extends Task {
  subtasks?: TaskWithSubtasks[];
}

interface ProjectWithTasks extends Project {
  tasks: Task[];
}

interface WorkspaceUser {
  id: string;
  userEmail: string | null;
  userName: string;
  role: string;
  status: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceTeam extends Team {
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectOption extends ProjectWithTasks {
  icon?: React.ComponentType<any>;
}

// Quick date presets
const datePresets = [
  { label: "Today", value: () => new Date() },
  { label: "Tomorrow", value: () => startOfTomorrow() },
  { label: "Next Week", value: () => addWeeks(new Date(), 1) },
  { label: "2 Weeks", value: () => addWeeks(new Date(), 2) },
];

// Team colors for display (fallback colors for teams without specific colors)
const teamColors = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#EC4899", // pink
];

export default function CreateTaskModal({ 
  open, 
  onOpenChange,
  onClose, 
  projectContext,
  onTaskCreated,
  hideProjectSelection = false,
  status: initialStatus = "todo",
  parentTaskId
}: CreateTaskModalProps) {
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const createTaskMutation = useCreateTask();

  // Helper function to safely check project context structure
  const isValidProjectContext = (context: ProjectState | undefined): boolean => {
    return !!(context?.columns?.[0]?.tasks?.[0]);
  };
  
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    projectId: "",
    assigneeEmail: null,
    assignedTeamId: null,
    priority: "medium",
    status: initialStatus,
    dueDate: null,
    parentId: parentTaskId || null,
    dependencies: [],
    labels: []
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDependencies, setShowDependencies] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Type-safe hook usage with proper runtime validation
  const projectsQuery = useGetProjects({ workspaceId: workspace?.id ?? "" });
  const projects = Array.isArray(projectsQuery.data) 
    ? (projectsQuery.data as ProjectOption[]) 
    : [];

  const usersQuery = useGetActiveWorkspaceUsers(workspace?.id ?? "");
  const users = Array.isArray(usersQuery.data) 
    ? (usersQuery.data as WorkspaceUser[]) 
    : [];

  const teamsQuery = useTeams(workspace?.id ?? "");
  const teams = Array.isArray(teamsQuery.data) 
    ? (teamsQuery.data as unknown as WorkspaceTeam[]) 
    : [];

  const [selectedProject, setSelectedProject] = useState<ProjectOption | null>(
    hideProjectSelection && project ? project as ProjectOption : null
  );

  const tasksQuery = useGetTasks(selectedProject?.id ?? "");
  const availableTasks = Array.isArray(tasksQuery.data) 
    ? (tasksQuery.data as TaskWithSubtasks[]) 
    : [];

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFormData({
        title: "",
        description: "",
        projectId: "",
        assigneeEmail: null,
        assignedTeamId: null,
        priority: "medium",
        status: initialStatus,
        dueDate: null,
        parentId: parentTaskId || null,
        dependencies: [],
        labels: []
      });
      setShowAdvanced(false);
      setShowDependencies(false);
      setNewLabel("");
      setIsCalendarOpen(false);
    }
  }, [open, initialStatus, parentTaskId]);

  // Update project when context changes
  useEffect(() => {
    if (isValidProjectContext(projectContext)) {
      const contextProject = projects.find(
        (p) => p.id === projectContext!.columns[0].tasks[0].projectId
      );
      if (contextProject) {
        setSelectedProject(contextProject);
        setFormData((prev) => ({
          ...prev,
          projectId: contextProject.id
        }));
      }
    }
  }, [projectContext, projects]);

  // Auto-expand advanced section if there are dependencies or parent task
  useEffect(() => {
    if (formData.dependencies.length > 0 || formData.parentId) {
      setShowAdvanced(true);
    }
  }, [formData.dependencies.length, formData.parentId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isValidProjectContext(projectContext) && !selectedProject) {
      toast.error('Please select a project');
      return;
    }

    try {
      const taskData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate || new Date().toISOString(),
        projectId: selectedProject?.id || "",
        parentId: formData.parentId || undefined,
        userEmail: formData.assigneeEmail || undefined,
        dependencies: formData.dependencies,
        labels: formData.labels
      };

      const newTask = await createTaskMutation.mutateAsync(taskData);

      if (newTask && onTaskCreated) {
        onTaskCreated(newTask as Task);
      }

      toast.success("Task created successfully");
            handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      projectId: "",
      assigneeEmail: null,
      assignedTeamId: null,
      priority: "medium",
      status: "todo",
      dueDate: null,
      parentId: null,
      dependencies: [],
      labels: []
    });
    setShowAdvanced(false);
    setShowDependencies(false);
    setNewLabel("");
    setIsCalendarOpen(false);
    
    if (onClose) {
    onClose();
    }
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const addLabel = () => {
    if (newLabel.trim()) {
      setFormData((prev) => ({
        ...prev,
        labels: [...prev.labels, newLabel.trim()]
      }));
      setNewLabel("");
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.filter(label => label !== labelToRemove)
    }));
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLabel();
    }
  };

  // Dependency management functions
  const handleDependencyToggle = (taskId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dependencies: checked
        ? [...prev.dependencies, taskId]
        : prev.dependencies.filter(id => id !== taskId)
    }));
  };

  const removeDependency = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter(id => id !== taskId)
    }));
  };

  const handleQuickDateSelect = (dateFunction: () => Date) => {
    const newDate = dateFunction();
    setFormData((prev) => ({
      ...prev,
      dueDate: newDate.toISOString()
    }));
    setIsCalendarOpen(false);
  };

  // Selected dependency tasks for display
  const selectedDependencyTasks = useMemo(() => 
    availableTasks.filter(task => formData.dependencies.includes(task.id)),
    [availableTasks, formData.dependencies]
  );

  // Form validation
  const isFormValid = useMemo(() => 
    formData.title.trim() !== "" && (isValidProjectContext(projectContext) || selectedProject),
    [formData.title, projectContext, selectedProject]
  );

  const selectedPriority = useMemo(() => 
    priorityOptions.find(p => p.value === formData.priority),
    [formData.priority]
  );

  const selectedStatus = useMemo(() => 
    statusOptions.find(s => s.value === formData.status),
    [formData.status]
  );

  const handleAssigneeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      assigneeEmail: value === 'unassigned' ? null : value,
      assignedTeamId: null // Clear team if user is assigned
    }));
  };

  const handleTeamChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTeamId: value === 'none' ? null : value,
      assigneeEmail: null // Clear assignee if team is assigned
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Create New Task
            {isValidProjectContext(projectContext) && (
              <span className="ml-2 text-sm text-muted-foreground">
                in {projectContext!.columns[0].tasks[0].projectId}
              </span>
            )}
                    </DialogTitle>
          <DialogDescription>
            {isValidProjectContext(projectContext)
              ? `Add a new task to ${projectContext!.columns[0].tasks[0].projectId}`
              : "Create a new task in your workspace"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!hideProjectSelection && (
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={selectedProject?.id || ''}
                onValueChange={(value) => {
                  const project = projects.find((p) => p.id === value);
                  setSelectedProject(project || null);
                  setFormData(prev => ({ ...prev, projectId: value }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center">
                        {project.icon && (
                          <Layout className="mr-2 h-4 w-4" />
                        )}
                        {project.name}
                    </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                  </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title"
                        />
                      </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
                          rows={3}
                        />
                      </div>

          <div className="space-y-4">
                              <div className="flex items-center space-x-2">
              <Switch
                id="show-advanced"
                checked={showAdvanced}
                onCheckedChange={setShowAdvanced}
              />
              <Label htmlFor="show-advanced">Show advanced options</Label>
                        </div>

            {showAdvanced && (
              <>
                {/* Parent Task Selection (Subtask) */}
                <div className="space-y-2">
                  <Label htmlFor="parentTask">Parent Task (Optional)</Label>
                          <Select
                    value={formData.parentId || "none"}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, parentId: value === "none" ? null : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent task" />
                            </SelectTrigger>
                            <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableTasks.map((task: TaskWithSubtasks) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                {/* Dependencies */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Dependencies</Label>
                              <Button
                                type="button"
                                variant="outline"
                                      size="sm"
                      onClick={() => setShowDependencies(!showDependencies)}
                                    >
                      {showDependencies ? "Close" : "Add Dependencies"}
                                    </Button>
                                </div>

                  {showDependencies && (
                    <div className="border rounded-md p-4 space-y-2">
                      {availableTasks.map((task: TaskWithSubtasks) => (
                        <div key={task.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dep-${task.id}`}
                            checked={formData.dependencies.includes(task.id)}
                            onCheckedChange={(checked: boolean) => 
                              handleDependencyToggle(task.id, checked)
                            }
                          />
                          <Label htmlFor={`dep-${task.id}`}>{task.title}</Label>
                        </div>
                      ))}
                      </div>
                  )}

                  {/* Selected Dependencies Display */}
                  {formData.dependencies.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">Selected Dependencies:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDependencyTasks.map((task: TaskWithSubtasks) => (
                          <Badge
                            key={task.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {task.title}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeDependency(task.id)}
                            />
                          </Badge>
                        ))}
                                </div>
                                  </div>
                  )}
                                  </div>
              </>
            )}
                                        </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))} >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        <div className={`mr-2 h-2 w-2 rounded-full ${option.icon}`} />
                        {option.label}
                                      </div>
                                    </SelectItem>
                  ))}
                            </SelectContent>
                          </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))} >
                <SelectTrigger>
                  <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center">
                        <div className={`mr-2 h-2 w-2 rounded-full ${option.icon}`} />
                        {option.label}
                                </div>
                              </SelectItem>
                  ))}
                            </SelectContent>
                          </Select>
                    </div>
                      </div>

          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
                                <Select
                value={formData.assigneeEmail || 'unassigned'}
                onValueChange={handleAssigneeChange}
                                >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                                  </SelectTrigger>
                                  <SelectContent>
                  <SelectItem value="unassigned">
                    <div className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      Unassigned
                                        </div>
                                      </SelectItem>
                  {users.map((user: WorkspaceUser) => (
                    <SelectItem key={user.id} value={user.userEmail || ''}>
                      <div className="flex items-center">
                        <UserIcon className="mr-2 h-4 w-4" />
                        {user.userName}
                                        </div>
                                      </SelectItem>
                  ))}
                                  </SelectContent>
                                </Select>
                              </div>

                                    <div className="space-y-2">
              <Label htmlFor="team">Team</Label>
              <Select
                value={formData.assignedTeamId || 'none'}
                onValueChange={handleTeamChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      No team
                                          </div>
                  </SelectItem>
                  {teams.map((team: WorkspaceTeam) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        {team.name}
                                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                                </div>
              </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
            <Button type="submit" disabled={!isFormValid}>
                          Create Task
                    </Button>
                  </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
