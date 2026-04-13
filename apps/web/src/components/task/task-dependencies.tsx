import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useCreateDependency from "@/hooks/mutations/task/use-create-dependency";
import useDeleteDependency from "@/hooks/mutations/task/use-delete-dependency";
import useGetTaskDependencies from "@/hooks/queries/task/use-get-task-dependencies";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import useProjectStore from "@/store/project";
import type { TaskDependency } from "@/types/task";
import type Task from "@/types/task";
// Removed Lucide imports due to React 18/19 type conflicts
import { useState } from "react";
import { toast } from "sonner";

interface TaskDependenciesProps {
  task: Task;
  setIsSaving: (isSaving: boolean) => void;
}

interface DependencyCardProps {
  dependency: TaskDependency;
  type: 'blocks' | 'blocked_by';
  onDelete: (dependencyId: string) => void;
  projectSlug?: string;
}

function DependencyCard({ dependency, type, onDelete, projectSlug }: DependencyCardProps) {
  const relatedTask = type === 'blocks' ? dependency.requiredTask : dependency.dependentTask;
  
  if (!relatedTask) return null;

  const statusColors = {
    'todo': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };

  return (
    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          {type === 'blocks' ? (
            <div className="w-4 h-4 flex items-center justify-center text-blue-500">
              <div className="w-2 h-2 border border-current rounded-full"></div>
              <div className="w-2 h-2 border border-current rounded-full ml-1"></div>
              <div className="w-1 h-px bg-current absolute"></div>
            </div>
          ) : (
            <div className="w-4 h-4 flex items-center justify-center text-orange-500">
              <div className="w-3 h-3 border-2 border-current rounded-sm relative">
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 border border-current rounded-full bg-current"></div>
              </div>
            </div>
          )}
          <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
            {projectSlug}-{relatedTask.number}
          </span>
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {relatedTask.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[relatedTask.status as keyof typeof statusColors] || statusColors['todo']}`}>
              {relatedTask.status}
            </span>
            {relatedTask.userEmail && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {relatedTask.userEmail}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(dependency.id)}
        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="relative">
            <div className="w-3 h-0.5 bg-current transform rotate-45 absolute"></div>
            <div className="w-3 h-0.5 bg-current transform -rotate-45 absolute"></div>
          </div>
        </div>
      </Button>
    </div>
  );
}

interface AddDependencyProps {
  taskId: string;
  type: 'blocks' | 'blocked_by';
  onSuccess: () => void;
  existingDependencies: TaskDependency[];
}

function AddDependency({ taskId, type, onSuccess, existingDependencies }: AddDependencyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { project } = useProjectStore();
  const { data: tasksData } = useGetTasks(project?.id || "");
  const { mutateAsync: createDependency, isPending } = useCreateDependency();

  // Get all tasks and filter out current task and existing dependencies
  const allTasks = tasksData?.columns?.flatMap(col => col.tasks) || [];
  const existingTaskIds = new Set([
    taskId,
    ...existingDependencies.map(dep => 
      type === 'blocks' ? dep.requiredTaskId : dep.dependentTaskId
    )
  ]);

  const availableTasks = allTasks
    .filter(task => !existingTaskIds.has(task.id))
    .filter(task => 
      searchQuery === "" || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${project?.slug}-${task.number}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleAddDependency = async (requiredTaskId: string) => {
    try {
      await createDependency({
        taskId,
        requiredTaskId,
        type,
      });
      
      toast.success(`Dependency ${type === 'blocks' ? 'added' : 'created'} successfully`);
      setIsOpen(false);
      setSearchQuery("");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add dependency");
    }
  };

  if (!isOpen) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="relative">
            <div className="w-3 h-0.5 bg-current absolute"></div>
            <div className="w-0.5 h-3 bg-current absolute"></div>
          </div>
        </div>
        Add {type === 'blocks' ? 'Blocking' : 'Blocked By'}
      </Button>
    );
  }

  return (
    <div className="space-y-3 p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          Add {type === 'blocks' ? 'Blocking' : 'Blocked By'} Task
        </h4>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery("");
          }}
        >
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="relative">
              <div className="w-3 h-0.5 bg-current transform rotate-45 absolute"></div>
              <div className="w-3 h-0.5 bg-current transform -rotate-45 absolute"></div>
            </div>
          </div>
        </Button>
      </div>
      
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400 flex items-center justify-center">
          <div className="w-3 h-3 border border-current rounded-full relative">
            <div className="absolute -bottom-0.5 -right-0.5 w-1 h-1 border border-current transform rotate-45"></div>
          </div>
        </div>
        <Input
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-1">
        {availableTasks.length === 0 ? (
          <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
            {searchQuery ? "No tasks found" : "No available tasks"}
          </div>
        ) : (
          availableTasks.map(task => (
            <button
              key={task.id}
              onClick={() => handleAddDependency(task.id)}
              disabled={isPending}
              className="w-full text-left p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  {project?.slug}-{task.number}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {task.title}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function TaskDependencies({ task, setIsSaving }: TaskDependenciesProps) {
  const { project } = useProjectStore();
  const { data: dependencies, isLoading } = useGetTaskDependencies(task.id);
  const { mutateAsync: deleteDependency } = useDeleteDependency();

  const handleDeleteDependency = async (dependencyId: string) => {
    setIsSaving(true);
    try {
      await deleteDependency(dependencyId);
      toast.success("Dependency removed successfully");
    } catch (error) {
      toast.error("Failed to remove dependency");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDependencySuccess = () => {
    // Dependencies will be refetched automatically due to query invalidation
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Dependencies
        </h3>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  const blocks = (dependencies?.blocks || []) as TaskDependency[];
  const blockedBy = (dependencies?.blockedBy || []) as TaskDependency[];
  const allDependencies = [...blocks, ...blockedBy];

  return (
    <div className="space-y-6">
      <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Dependencies
      </h3>
      
      {/* @epic-1.2-dependencies: Tasks this task blocks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center text-blue-500">
              <div className="w-2 h-2 border border-current rounded-full"></div>
              <div className="w-2 h-2 border border-current rounded-full ml-1"></div>
              <div className="w-1 h-px bg-current absolute"></div>
            </div>
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              This task blocks ({blocks.length})
            </h4>
          </div>
        </div>
        
        <div className="space-y-2">
          {blocks.map(dependency => (
            <DependencyCard
              key={dependency.id}
              dependency={dependency}
              type="blocks"
              onDelete={handleDeleteDependency}
              projectSlug={project?.slug}
            />
          ))}
          
          <AddDependency
            taskId={task.id}
            type="blocks"
            onSuccess={handleDependencySuccess}
            existingDependencies={allDependencies}
          />
        </div>
      </div>
      
      {/* @epic-1.2-dependencies: Tasks that block this task */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center text-orange-500">
              <div className="w-3 h-3 border-2 border-current rounded-sm relative">
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 border border-current rounded-full bg-current"></div>
              </div>
            </div>
            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              This task is blocked by ({blockedBy.length})
            </h4>
          </div>
        </div>
        
        <div className="space-y-2">
          {blockedBy.map(dependency => (
            <DependencyCard
              key={dependency.id}
              dependency={dependency}
              type="blocked_by"
              onDelete={handleDeleteDependency}
              projectSlug={project?.slug}
            />
          ))}
          
          <AddDependency
            taskId={task.id}
            type="blocked_by"
            onSuccess={handleDependencySuccess}
            existingDependencies={allDependencies}
          />
        </div>
      </div>
      
      {blocks.length === 0 && blockedBy.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
              <div className="w-4 h-4 border border-current rounded-full"></div>
              <div className="w-4 h-4 border border-current rounded-full ml-2"></div>
              <div className="w-2 h-px bg-current absolute"></div>
            </div>
            <p className="text-sm">No dependencies yet</p>
            <p className="text-xs">Add dependencies to link this task with others</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskDependencies; 