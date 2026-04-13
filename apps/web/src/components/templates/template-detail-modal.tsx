import { useQuery } from "@tanstack/react-query";
import { X, Star, Clock, Users, TrendingUp, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { getTemplate } from "../../fetchers/templates/get-template";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";
import { TemplateApplicationModal } from "./template-application-modal";

interface TemplateDetailModalProps {
  templateId: string;
  onClose: () => void;
}

export function TemplateDetailModal({ templateId, onClose }: TemplateDetailModalProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [showApplyModal, setShowApplyModal] = useState(false);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplate(templateId),
  });

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const totalEstimatedHours = template?.tasks.reduce(
    (sum, task) => sum + (task.estimatedHours || 0),
    0
  ) || 0;

  const totalSubtasks = template?.tasks.reduce(
    (sum, task) => sum + task.subtasks.length,
    0
  ) || 0;

  const difficultyColor = {
    beginner: "bg-green-500/10 text-green-700 dark:text-green-400",
    intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    advanced: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const priorityColor = {
    low: "text-gray-600",
    medium: "text-blue-600",
    high: "text-orange-600",
    urgent: "text-red-600",
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : template ? (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl">{template.name}</DialogTitle>
                    <DialogDescription className="mt-2 text-base">
                      {template.profession} • {template.industry}
                    </DialogDescription>
                  </div>
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${template.color}15` }}
                  >
                    <div
                      className="h-8 w-8 rounded"
                      style={{ backgroundColor: template.color }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 pt-4">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", difficultyColor[template.difficulty])}
                  >
                    {template.difficulty}
                  </Badge>
                  
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {template.rating.toFixed(1)} ({template.ratingCount} ratings)
                  </Badge>

                  {template.estimatedDuration && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {template.estimatedDuration} days
                    </Badge>
                  )}

                  <Badge variant="outline" className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {template.usageCount} uses
                  </Badge>

                  {template.isOfficial && (
                    <Badge variant="secondary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Official
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{template.description}</p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{template.tasks.length}</div>
                    <div className="text-sm text-muted-foreground">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalSubtasks}</div>
                    <div className="text-sm text-muted-foreground">Subtasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{totalEstimatedHours}h</div>
                    <div className="text-sm text-muted-foreground">Estimated</div>
                  </div>
                </div>

                {/* Tags */}
                {template.tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks Tree */}
                <div>
                  <h3 className="font-semibold mb-3">Tasks ({template.tasks.length})</h3>
                  <div className="space-y-2">
                    {template.tasks.map((task, index) => {
                      const isExpanded = expandedTasks.has(task.id);
                      const hasSubtasks = task.subtasks.length > 0;

                      return (
                        <div
                          key={task.id}
                          className="border rounded-lg overflow-hidden"
                        >
                          {/* Task Header */}
                          <div
                            className={cn(
                              "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                              hasSubtasks && "cursor-pointer"
                            )}
                            onClick={() => hasSubtasks && toggleTask(task.id)}
                          >
                            <div className="flex items-start gap-3">
                              {hasSubtasks && (
                                <button className="mt-0.5">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                              {!hasSubtasks && <div className="w-4" />}
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    Task {index + 1}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs capitalize", priorityColor[task.priority])}
                                  >
                                    {task.priority}
                                  </Badge>
                                  {task.estimatedHours && (
                                    <Badge variant="outline" className="text-xs">
                                      {task.estimatedHours}h
                                    </Badge>
                                  )}
                                  {task.suggestedAssigneeRole && (
                                    <Badge variant="secondary" className="text-xs">
                                      {task.suggestedAssigneeRole}
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-medium">{task.title}</div>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {task.description}
                                  </p>
                                )}
                                {task.relativeStartDay !== undefined && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Day {task.relativeStartDay}
                                    {task.relativeDueDay !== undefined && ` - ${task.relativeDueDay}`}
                                  </div>
                                )}
                              </div>

                              {hasSubtasks && (
                                <Badge variant="outline" className="text-xs">
                                  {task.subtasks.length} subtasks
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Subtasks */}
                          {isExpanded && task.subtasks.length > 0 && (
                            <div className="border-t bg-muted/30">
                              {task.subtasks.map((subtask, subIndex) => (
                                <div
                                  key={subtask.id}
                                  className="p-3 pl-12 border-b last:border-b-0"
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground mt-0.5">
                                      {index + 1}.{subIndex + 1}
                                    </span>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{subtask.title}</div>
                                      {subtask.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {subtask.description}
                                        </p>
                                      )}
                                      <div className="flex gap-2 mt-1">
                                        {subtask.estimatedHours && (
                                          <Badge variant="outline" className="text-xs">
                                            {subtask.estimatedHours}h
                                          </Badge>
                                        )}
                                        {subtask.suggestedAssigneeRole && (
                                          <Badge variant="secondary" className="text-xs">
                                            {subtask.suggestedAssigneeRole}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button
                  className="flex-1"
                  style={{ backgroundColor: template.color }}
                  onClick={() => setShowApplyModal(true)}
                >
                  Use This Template
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Application Modal */}
      {showApplyModal && template && (
        <TemplateApplicationModal
          template={template}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

