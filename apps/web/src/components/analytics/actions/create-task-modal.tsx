"use client";

// @epic-2.1-workflow: Task creation modal triggered from analytics insights
// @persona-sarah: PM needs to quickly create tasks from analytics discoveries
// @persona-david: Team lead needs to create follow-up tasks from insights

import * as React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import useWorkspaceStore from "@/store/workspace";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Calendar,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logger } from "../../../lib/logger";

const taskFormSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  projectId: z.string().min(1, "Project is required"),
  assigneeEmail: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface AnalyticsInsight {
  id: string;
  type: "productivity_drop" | "overdue_tasks" | "team_bottleneck" | "resource_conflict" | "quality_issue";
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  data: {
    projectId?: string;
    projectName?: string;
    userEmail?: string;
    userName?: string;
    metricValue?: number;
    recommendations?: string[];
  };
  createdAt: string;
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insight?: AnalyticsInsight;
  onTaskCreated?: (task: TaskFormData) => void;
}

const INSIGHT_TASK_TEMPLATES = {
  productivity_drop: {
    titleTemplate: "Investigate productivity decline in {projectName}",
    descriptionTemplate: "Analytics shows a productivity drop of {metricValue}% in {projectName}. Investigate causes and implement improvements.",
    priority: "high" as const,
    tags: ["analytics", "productivity", "investigation"],
  },
  overdue_tasks: {
    titleTemplate: "Address overdue tasks in {projectName}",
    descriptionTemplate: "There are {metricValue} overdue tasks in {projectName}. Review and reschedule or reassign as needed.",
    priority: "high" as const,
    tags: ["analytics", "overdue", "project-management"],
  },
  team_bottleneck: {
    titleTemplate: "Resolve team bottleneck: {userName}",
    descriptionTemplate: "Analytics indicates {userName} may be overloaded (utilization: {metricValue}%). Consider redistributing tasks or providing support.",
    priority: "medium" as const,
    tags: ["analytics", "team", "workload"],
  },
  resource_conflict: {
    titleTemplate: "Resolve resource conflict in {projectName}",
    descriptionTemplate: "Resource allocation conflict detected in {projectName}. Review and adjust team assignments.",
    priority: "high" as const,
    tags: ["analytics", "resources", "conflict"],
  },
  quality_issue: {
    titleTemplate: "Address quality concerns in {projectName}",
    descriptionTemplate: "Quality metrics show decline in {projectName}. Review recent deliverables and implement quality improvements.",
    priority: "medium" as const,
    tags: ["analytics", "quality", "review"],
  },
};


function getInsightIcon(type: AnalyticsInsight["type"]) {
  switch (type) {
    case "productivity_drop":
      return TrendingUp;
    case "overdue_tasks":
      return Clock;
    case "team_bottleneck":
      return Users;
    case "resource_conflict":
      return AlertTriangle;
    case "quality_issue":
      return Target;
    default:
      return Lightbulb;
  }
}

function getSeverityColor(severity: AnalyticsInsight["severity"]) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "low":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function fillTemplate(template: string, data: AnalyticsInsight["data"]): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return String(data[key as keyof typeof data] || match);
  });
}

export function CreateTaskModal({ 
  open, 
  onOpenChange, 
  insight,
  onTaskCreated 
}: CreateTaskModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { workspace } = useWorkspaceStore();

  // Fetch real projects and team members data
  const { data: projects = [], isLoading: projectsLoading } = useGetProjects({
    workspaceId: workspace?.id || ''
  });
  const { data: workspaceUsers = [], isLoading: usersLoading } = useGetWorkspaceUsers({
    workspaceId: workspace?.id || ''
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      projectId: "",
      assigneeEmail: "",
      dueDate: "",
      tags: [],
    },
  });

  // Auto-fill form when insight changes
  React.useEffect(() => {
    if (insight) {
      const template = INSIGHT_TASK_TEMPLATES[insight.type];
      const title = fillTemplate(template.titleTemplate, insight.data);
      const description = fillTemplate(template.descriptionTemplate, insight.data);

      form.setValue("title", title);
      form.setValue("description", description);
      form.setValue("priority", template.priority);
      form.setValue("tags", template.tags);
      
      if (insight.data.projectId) {
        form.setValue("projectId", insight.data.projectId);
      }
    }
  }, [insight, form]);

  const onSubmit = async (data: TaskFormData) => {
    setIsCreating(true);
    
    try {
      // TODO: Implement actual task creation API call
      logger.info("Creating task from analytics insight:");

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onTaskCreated?.(data);
      onOpenChange(false);
      form.reset();
      
      // TODO: Show success toast
      logger.info("Task created successfully");
      
    } catch (error) {
      console.error("Failed to create task:", error);
      // TODO: Show error toast
    } finally {
      setIsCreating(false);
    }
  };

  const Icon = insight ? getInsightIcon(insight.type) : Plus;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Task from Analytics
          </DialogTitle>
          <DialogDescription>
            Create a new task based on analytics insights to address identified issues or opportunities.
          </DialogDescription>
        </DialogHeader>

        {insight && (
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  getSeverityColor(insight.severity)
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <Badge variant="outline" className={getSeverityColor(insight.severity)}>
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                  
                  {insight.data.recommendations && insight.data.recommendations.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-700">Recommendations:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {insight.data.recommendations.slice(0, 2).map((rec, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 text-green-600 flex-shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter task title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the task and any relevant context from the analytics insight"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {workspaceUsers.map((member, index) => (
                          <SelectItem key={member.email || member.id || `user-${index}`} value={member.email}>
                            {member.name} ({member.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export type { AnalyticsInsight, CreateTaskModalProps };