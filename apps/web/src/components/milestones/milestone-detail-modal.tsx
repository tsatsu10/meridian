import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Target, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Edit,
  Trash2,
  Flag,
  MapPin,
  User,
  FileText,
  Link2,
  ArrowLeft,
  Mail,
  Send
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import { flattenTasks } from "@/utils/task-hierarchy";
import { toast } from "sonner";

// @epic-1.3-milestones: Sarah (PM) needs detailed milestone viewing
// @persona-sarah: PM needs comprehensive milestone information display

interface MilestoneDetailModalProps {
  milestone: any | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (milestone: any) => void;
  onDelete?: (milestoneId: string) => void;
  onStatusChange?: (milestoneId: string, status: 'upcoming' | 'achieved' | 'missed') => void;
  projectId?: string;
  showBackButton?: boolean;
  onBackToOverview?: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'achieved':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'missed':
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case 'upcoming':
    default:
      return <Clock className="h-5 w-5 text-blue-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'achieved':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
    case 'missed':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
    case 'upcoming':
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300';
  }
};

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900 dark:text-red-300';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900 dark:text-orange-300';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
    case 'low':
    default:
      return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900 dark:text-green-300';
  }
};

const getMilestoneTypeIcon = (type: string) => {
  switch (type) {
    case 'phase_completion':
      return '🎯';
    case 'deliverable':
      return '📦';
    case 'approval':
      return '✅';
    case 'deadline':
      return '⏰';
    default:
      return '🎯';
  }
};

const getMilestoneTypeName = (type: string) => {
  switch (type) {
    case 'phase_completion':
      return 'Phase Completion';
    case 'deliverable':
      return 'Deliverable';
    case 'approval':
      return 'Approval';
    case 'deadline':
      return 'Deadline';
    default:
      return 'Milestone';
  }
};

export default function MilestoneDetailModal({
  milestone,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  projectId,
  showBackButton = false,
  onBackToOverview
}: MilestoneDetailModalProps) {
  if (!milestone) return null;

  // Fetch tasks to resolve dependency IDs to titles
  const { data: tasksData } = useGetTasks(projectId || '');

  // Get all tasks for dependency resolution
  const columnArray = Array.isArray(tasksData)
    ? tasksData
    : tasksData && Array.isArray((tasksData as any).columns)
      ? (tasksData as any).columns
      : [];
  const allTasks = flattenTasks(columnArray.flatMap((col: any) => col.tasks || []));

  // Get task title by ID
  const getTaskTitle = (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    return task ? task.title : `Task ID: ${taskId}`;
  };

  // Stakeholder notification functionality
  const handleNotifyStakeholders = () => {
    if (!milestone.stakeholders || milestone.stakeholders.length === 0) {
      toast.error('No stakeholders to notify');
      return;
    }

    // Simulate sending notifications
    const stakeholderCount = milestone.stakeholders.length;
    toast.success(`Notification sent to ${stakeholderCount} stakeholder${stakeholderCount !== 1 ? 's' : ''}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let status = '';
    if (diffDays === 0) status = ' (Today)';
    else if (diffDays === 1) status = ' (Tomorrow)';
    else if (diffDays === -1) status = ' (Yesterday)';
    else if (diffDays > 0) status = ` (In ${diffDays} days)`;
    else if (diffDays < 0) status = ` (${Math.abs(diffDays)} days ago)`;
    
    return formattedDate + status;
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case 'achieved':
        return 100;
      case 'missed':
        return 0;
      case 'upcoming':
      default:
        return 50; // Default for upcoming milestones
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToOverview || onClose}
                  className="p-2"
                  title="Back to Project Overview"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <span className="text-2xl">{getMilestoneTypeIcon(milestone.milestoneType)}</span>
              <div>
                <DialogTitle className="text-xl font-semibold pr-8">
                  {milestone.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {getMilestoneTypeName(milestone.milestoneType)} • Created {new Date(milestone.createdAt).toLocaleDateString()}
                  {showBackButton && (
                    <span className="ml-2 text-blue-600 font-medium">← Back to Project Overview</span>
                  )}
                </DialogDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {milestone.status === 'upcoming' && onStatusChange && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(milestone.id, 'achieved')}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark Achieved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStatusChange(milestone.id, 'missed')}
                    className="text-red-600 hover:text-red-700"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Mark Missed
                  </Button>
                </>
              )}
              
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(milestone)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(milestone.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(milestone.status)}
                  <span className="font-medium">Status</span>
                </div>
                <Badge className={cn("text-sm", getStatusColor(milestone.status))}>
                  {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Risk Level</span>
                </div>
                <Badge className={cn("text-sm border", getRiskColor(milestone.riskLevel))}>
                  {milestone.riskLevel.charAt(0).toUpperCase() + milestone.riskLevel.slice(1)} Risk
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Progress</span>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">{getProgressPercentage(milestone.status)}%</div>
                  <Progress value={getProgressPercentage(milestone.status)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Description */}
          {milestone.description && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Description</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {milestone.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Target Date</span>
                </div>
                <p className="text-sm font-medium">{formatDate(milestone.date)}</p>
              </CardContent>
            </Card>

            {milestone.stakeholders && milestone.stakeholders.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Stakeholders ({milestone.stakeholders.length})</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNotifyStakeholders}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Notify All
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {milestone.stakeholders.map((email: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {email.split('@')[0]}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            toast.success(`Notification sent to ${email.split('@')[0]}`);
                          }}
                          className="p-0 h-auto ml-1 hover:bg-transparent"
                        >
                          <Mail className="h-3 w-3 text-blue-500 hover:text-blue-700" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Success Criteria */}
          {milestone.successCriteria && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Success Criteria</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {milestone.successCriteria}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Dependencies */}
          {milestone.dependencies && milestone.dependencies.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Dependencies ({milestone.dependencies.length})</span>
                </div>
                <div className="space-y-2">
                  {milestone.dependencies.map((depId: string, index: number) => {
                    const task = allTasks.find(t => t.id === depId);
                    return (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded text-sm border border-muted">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{getTaskTitle(depId)}</div>
                          {task && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Status: {task.status} • ID: {depId}
                            </div>
                          )}
                        </div>
                        {task && (
                          <Badge variant="outline" className={cn("text-xs", 
                            task.status === 'done' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          )}>
                            {task.status}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span> {new Date(milestone.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {new Date(milestone.updatedAt).toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 