import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Users, Loader2, Check, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { applyTemplate } from "../../fetchers/templates/apply-template";
import getProjects from "../../fetchers/project/get-projects";
import getWorkspaceUsers from "../../fetchers/workspace-user/get-workspace-users";
import type { TemplateWithTasks } from "../../types/templates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Calendar as CalendarComponent } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { useParams } from "@tanstack/react-router";

interface TemplateApplicationModalProps {
  template: TemplateWithTasks;
  onClose: () => void;
  onSuccess: () => void;
}

export function TemplateApplicationModal({
  template,
  onClose,
  onSuccess,
}: TemplateApplicationModalProps) {
  const { workspaceId } = useParams({ from: '/_authenticated/dashboard/workspace/$workspaceId' });
  const queryClient = useQueryClient();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [roleMapping, setRoleMapping] = useState<Record<string, string>>({});

  // Fetch projects in workspace
  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => getProjects(workspaceId),
    enabled: !!workspaceId,
  });

  // Fetch workspace users
  const { data: users } = useQuery({
    queryKey: ['workspace-users', workspaceId],
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: !!workspaceId,
  });

  // Extract unique roles from template
  const roles = useMemo(() => {
    const roleSet = new Set<string>();
    template.tasks.forEach((task) => {
      if (task.suggestedAssigneeRole) {
        roleSet.add(task.suggestedAssigneeRole);
      }
      task.subtasks.forEach((subtask) => {
        if (subtask.suggestedAssigneeRole) {
          roleSet.add(subtask.suggestedAssigneeRole);
        }
      });
    });
    return Array.from(roleSet);
  }, [template]);

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: () => {
      if (!selectedProjectId) throw new Error("No project selected");
      
      return applyTemplate(template.id, {
        projectId: selectedProjectId,
        workspaceId,
        startDate: startDate.toISOString(),
        assigneeMapping: roleMapping,
      });
    },
    onSuccess: (result) => {
      toast.success("Template Applied Successfully!", {
        description: `Created ${result.tasksCreated} tasks and ${result.subtasksCreated} subtasks`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error("Failed to Apply Template", {
        description: error.message,
      });
    },
  });

  const handleApply = () => {
    applyMutation.mutate();
  };

  const tasksWithRole = template.tasks.filter(
    (task) => task.suggestedAssigneeRole || task.subtasks.some((st) => st.suggestedAssigneeRole)
  ).length;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apply Template to Project</DialogTitle>
          <DialogDescription>
            Configure how "{template.name}" will be applied to your project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Select Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The template's {template.tasks.length} tasks will be added to this project
            </p>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              Task dates will be calculated relative to this start date
            </p>
          </div>

          {/* Role Mapping */}
          {roles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Assign Team Members to Roles</Label>
                <Badge variant="outline">
                  {Object.keys(roleMapping).length} of {roles.length} assigned
                </Badge>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                {roles.map((role) => (
                  <div key={role} className="grid grid-cols-2 gap-3 items-center">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{role}</span>
                    </div>
                    <Select
                      value={roleMapping[role] || ""}
                      onValueChange={(value) => {
                        setRoleMapping((prev) => ({
                          ...prev,
                          [role]: value,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Optional: Assign team members to automatically set task assignees
              </p>
            </div>
          )}

          {/* Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-medium">Summary</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks to create:</span>
                <span className="font-medium">{template.tasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtasks:</span>
                <span className="font-medium">
                  {template.tasks.reduce((sum, t) => sum + t.subtasks.length, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{template.estimatedDuration || "N/A"} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Roles assigned:</span>
                <span className="font-medium">
                  {Object.keys(roleMapping).length} / {roles.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={applyMutation.isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleApply}
            disabled={!selectedProjectId || applyMutation.isPending}
            style={{ backgroundColor: template.color }}
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Apply Template
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

