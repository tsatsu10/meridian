import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Target, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Calendar,
  Flag
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import useGetTasks from "@/hooks/queries/task/use-get-tasks";
import { flattenTasks } from "@/utils/task-hierarchy";

// @epic-1.3-milestones: Sarah (PM) and Jennifer (Exec) need milestone tracking
// @epic-2.1-dashboard: Milestone creation across different views
// @persona-sarah: PM needs operational milestone management

interface MilestoneTask {
  id: string;
  title: string;
  date: string;
  status: "upcoming" | "achieved" | "missed";
  description: string;
  type: "milestone";
  dependencies: string[];
  milestoneType: "phase_completion" | "deliverable" | "approval" | "deadline";
  stakeholders: string[];
  successCriteria: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface MilestoneFormData {
  title: string;
  date: string;
  status: "upcoming" | "achieved" | "missed";
  description: string;
  dependencies: string[];
  milestoneType: "phase_completion" | "deliverable" | "approval" | "deadline";
  stakeholders: string[];
  successCriteria: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface CreateMilestoneModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string;
  onMilestoneCreated?: (milestone: MilestoneTask) => void;
  editingMilestone?: MilestoneTask | null;
}

const milestoneStatusColors = {
  upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  achieved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  missed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const milestoneTypeColors = {
  phase_completion: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  deliverable: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  deadline: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const riskLevelColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function CreateMilestoneModal({
  open,
  onClose,
  projectId,
  projectName,
  onMilestoneCreated,
  editingMilestone
}: CreateMilestoneModalProps) {
  const { data: tasksData, isLoading: isTasksLoading } = useGetTasks(projectId);
  const [formData, setFormData] = useState<MilestoneFormData>({
    title: "",
    date: "",
    status: "upcoming",
    description: "",
    dependencies: [],
    milestoneType: "deliverable",
    stakeholders: [],
    successCriteria: "",
    riskLevel: "medium",
  });
  const [newStakeholder, setNewStakeholder] = useState("");
  const [taskSearchTerm, setTaskSearchTerm] = useState("");

  // Initialize form data when editing
  useEffect(() => {
    if (editingMilestone) {
      setFormData({
        title: editingMilestone.title || "",
        date: editingMilestone.date || "",
        status: editingMilestone.status || "upcoming",
        description: editingMilestone.description || "",
        dependencies: editingMilestone.dependencies || [], // ✅ FIXED: Ensure array
        milestoneType: editingMilestone.milestoneType || "deliverable",
        stakeholders: editingMilestone.stakeholders || [], // ✅ FIXED: Ensure array
        successCriteria: editingMilestone.successCriteria || "",
        riskLevel: editingMilestone.riskLevel || "medium",
      });
    } else {
      // Reset form for new milestone
      setFormData({
        title: "",
        date: "",
        status: "upcoming",
        description: "",
        dependencies: [],
        milestoneType: "deliverable",
        stakeholders: [],
        successCriteria: "",
        riskLevel: "medium",
      });
    }
  }, [editingMilestone, open]);

  // Handle both array and object-with-columns cases for tasks
  const columnArray = Array.isArray(tasksData)
    ? tasksData
    : tasksData && Array.isArray((tasksData as any).columns)
      ? (tasksData as any).columns
      : [];

  // Get all available tasks for dependencies
  const allTasks = flattenTasks(columnArray.flatMap((col: any) => col.tasks || []));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.date) {
      toast.error("Title and due date are required");
      return;
    }

    if (!formData.successCriteria.trim()) {
      toast.error("Success criteria are required for milestones");
      return;
    }

    try {
      const milestone: MilestoneTask = editingMilestone 
        ? { ...editingMilestone, ...formData }
        : {
            id: Date.now().toString(),
            type: "milestone",
            ...formData,
          };

      // Call the callback to handle milestone creation/update
      onMilestoneCreated?.(milestone);

      toast.success(editingMilestone ? "Milestone updated successfully" : "Milestone created successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to save milestone");
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      date: "",
      status: "upcoming",
      description: "",
      dependencies: [],
      milestoneType: "deliverable",
      stakeholders: [],
      successCriteria: "",
      riskLevel: "medium",
    });
    setNewStakeholder("");
    setTaskSearchTerm("");
    onClose();
  };

  const handleDependencyToggle = (taskId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dependencies: checked
        ? [...prev.dependencies, taskId]
        : prev.dependencies.filter(id => id !== taskId)
    }));
  };

  const addStakeholder = () => {
    if (newStakeholder.trim() && !formData.stakeholders.includes(newStakeholder.trim())) {
      setFormData(prev => ({
        ...prev,
        stakeholders: [...prev.stakeholders, newStakeholder.trim()]
      }));
      setNewStakeholder("");
    }
  };

  const removeStakeholder = (email: string) => {
    setFormData(prev => ({
      ...prev,
      stakeholders: prev.stakeholders.filter(s => s !== email)
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-hidden gap-0 flex items-center justify-center p-0">
        <div className="w-full max-w-[700px] mx-auto">
          <div className="p-8 space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <DialogTitle className="text-3xl font-bold gradient-text flex items-center space-x-3">
                <Target className="h-6 w-6 text-emerald-600" />
                <span>{editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}</span>
              </DialogTitle>
              <DialogDescription className="text-lg">
                {editingMilestone 
                  ? 'Update the milestone details and dependencies below.'
                  : `Create a new milestone for ${projectName || 'this project'} to track important deliverables and deadlines.`
                }
              </DialogDescription>
            </div>

            <div className="max-h-[70vh] overflow-y-auto space-y-8 pr-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-none">
                {/* Basic Information */}
                <div className="space-y-6">
                  <div className="flex items-center justify-start space-x-3">
                    <Target className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-xl font-semibold">Basic Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="title" className="text-sm font-medium flex items-center">
                        Title *
                      </Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter milestone title"
                        className="glass-card h-11 w-full font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="date" className="text-sm font-medium flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Due Date *</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="glass-card h-11 w-full"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="milestoneType">Type</Label>
                      <Select value={formData.milestoneType} onValueChange={(value: any) => 
                        setFormData(prev => ({ ...prev, milestoneType: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select milestone type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phase_completion">Phase Completion</SelectItem>
                          <SelectItem value="deliverable">Deliverable</SelectItem>
                          <SelectItem value="approval">Approval</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value: any) => 
                        setFormData(prev => ({ ...prev, status: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="achieved">Achieved</SelectItem>
                          <SelectItem value="missed">Missed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter milestone description"
                      rows={3}
                    />
                  </div>
                </div>

                {/* Success Criteria & Risk */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Success Criteria & Risk
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="successCriteria">Success Criteria *</Label>
                    <Textarea
                      id="successCriteria"
                      value={formData.successCriteria}
                      onChange={(e) => setFormData(prev => ({ ...prev, successCriteria: e.target.value }))}
                      placeholder="Define what constitutes successful completion of this milestone"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Risk Level</Label>
                    <Select value={formData.riskLevel} onValueChange={(value: any) => 
                      setFormData(prev => ({ ...prev, riskLevel: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select risk level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                        <SelectItem value="critical">Critical Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dependencies */}
                {!isTasksLoading && allTasks.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Dependencies
                    </h4>
                    
                    <div className="space-y-2">
                      <Label>Task Dependencies</Label>
                      <Input
                        placeholder="Search tasks..."
                        value={taskSearchTerm}
                        onChange={(e) => setTaskSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                        {allTasks
                          .filter((task: any) => 
                            task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                            task.status.toLowerCase().includes(taskSearchTerm.toLowerCase())
                          )
                          .slice(0, 50)
                          .map((task: any) => (
                          <div key={task.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`task-${task.id}`}
                              checked={formData.dependencies.includes(task.id)}
                              onChange={(e) => handleDependencyToggle(task.id, e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor={`task-${task.id}`} className="text-sm cursor-pointer flex-1">
                              {task.title}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              {task.status}
                            </Badge>
                          </div>
                        ))}
                        {allTasks.filter((task: any) => 
                          task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                          task.status.toLowerCase().includes(taskSearchTerm.toLowerCase())
                        ).length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-4">
                            No tasks found matching "{taskSearchTerm}"
                          </div>
                        )}
                        {allTasks.filter((task: any) => 
                          task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
                          task.status.toLowerCase().includes(taskSearchTerm.toLowerCase())
                        ).length > 50 && (
                          <div className="text-xs text-muted-foreground text-center">
                            Showing first 50 matching tasks. Use search to narrow down results.
                          </div>
                        )}
                      </div>
                      {formData.dependencies.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {formData.dependencies.length} task{formData.dependencies.length > 1 ? 's' : ''} selected
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stakeholders */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Stakeholders
                  </h4>
                  
                  <div className="space-y-2">
                    <Label>Notify Stakeholders</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={newStakeholder}
                        onChange={(e) => setNewStakeholder(e.target.value)}
                        placeholder="Enter email address"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addStakeholder();
                          }
                        }}
                      />
                      <Button 
                        type="button" 
                        onClick={addStakeholder}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {formData.stakeholders.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.stakeholders.map((email) => (
                          <Badge key={email} variant="secondary" className="flex items-center gap-1">
                            {email}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => removeStakeholder(email)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex justify-between pt-6">
                  <div className="flex space-x-3 w-full justify-end">
                    <Button type="button" variant="outline" onClick={handleClose} className="glass-card">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium px-6">
                      {editingMilestone ? 'Update' : 'Create'} Milestone
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </div>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    );
  } 