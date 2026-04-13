import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MagicCard } from "@/components/magicui/magic-card";
import { ShineBorder } from "@/components/magicui/shine-border";
import { CalendarIcon, Flag, User, Tag, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskWithSubtasks } from "@/types/task";
import useUpdateTask from "@/hooks/mutations/task/use-update-task";
import useGetActiveWorkspaceUsers from "@/hooks/queries/workspace-users/use-active-workspace-users";
import { toast } from "sonner";

interface EditTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: TaskWithSubtasks;
  workspaceId: string;
}

export default function EditTaskModal({
  open,
  onClose,
  task,
  workspaceId,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority || "medium");
  const [status, setStatus] = useState(task.status);
  const [userEmail, setUserEmail] = useState(task.userEmail || "unassigned");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: updateTask } = useUpdateTask();
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers({
    workspaceId,
  });

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "medium");
    setStatus(task.status);
    setUserEmail(task.userEmail || "unassigned");
    setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateTask({
        ...task,
        title: title.trim(),
        description: description.trim(),
        priority: priority as "low" | "medium" | "high" | "urgent",
        status,
        userEmail: userEmail === "unassigned" ? null : userEmail || null,
        dueDate: dueDate ? dueDate.toISOString() : null,
      });
      
      toast.success("Task updated successfully");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update task"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions = [
    { value: "low", label: "Low", color: "text-green-600" },
    { value: "medium", label: "Medium", color: "text-yellow-600" },
    { value: "high", label: "High", color: "text-orange-600" },
    { value: "urgent", label: "Urgent", color: "text-red-600" },
  ];

  const statusOptions = [
    { value: "todo", label: "To Do" },
    { value: "in_progress", label: "In Progress" },
    { value: "done", label: "In Review" },
    { value: "done", label: "Done" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <ShineBorder
          className="relative overflow-hidden rounded-lg border-0 bg-transparent"
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
        >
          <MagicCard className="cursor-pointer border-0 bg-transparent shadow-none">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                Edit Task
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task description..."
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Two Column Layout for Selects */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Flag className={cn("w-4 h-4", option.color)} />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={userEmail || "unassigned"} onValueChange={setUserEmail}>
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <SelectValue placeholder="Select assignee..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        Unassigned
                      </div>
                    </SelectItem>
                    {workspaceUsers?.map((user) => (
                      <SelectItem key={user.userEmail} value={user.userEmail}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-600" />
                          {user.userName || user.userEmail}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                    {dueDate && (
                      <div className="p-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDueDate(undefined)}
                          className="w-full"
                        >
                          Clear Date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Task Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Task ID: {task.id}</div>
                  <div>Created: {format(new Date(task.createdAt), "PPP")}</div>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div>Subtasks: {task.subtasks.length}</div>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Updating..." : "Update Task"}
                </Button>
              </DialogFooter>
            </form>
          </MagicCard>
        </ShineBorder>
      </DialogContent>
    </Dialog>
  );
} 