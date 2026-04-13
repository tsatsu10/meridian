import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  Calendar,
  Mail,
  Clock,
  Download,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportType: "tasks" | "projects" | "time" | "analytics" | "custom";
  schedule: {
    frequency: "daily" | "weekly" | "monthly" | "custom";
    time: string;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    cron?: string; // For custom schedules
  };
  recipients: string[]; // Email addresses
  format: "pdf" | "csv" | "excel" | "html";
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  runCount: number;
  createdAt: Date;
  createdBy: string;
}

const REPORT_TYPES = [
  { value: "tasks", label: "Task Summary", icon: "📋" },
  { value: "projects", label: "Project Status", icon: "📊" },
  { value: "time", label: "Time Tracking", icon: "⏱️" },
  { value: "analytics", label: "Analytics Dashboard", icon: "📈" },
  { value: "custom", label: "Custom Report", icon: "🔧" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (Cron)" },
];

const FORMATS = [
  { value: "pdf", label: "PDF", icon: "📄" },
  { value: "csv", label: "CSV", icon: "📊" },
  { value: "excel", label: "Excel", icon: "📗" },
  { value: "html", label: "HTML", icon: "🌐" },
];

export function ScheduledReportsWidget() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newReport, setNewReport] = useState({
    name: "",
    description: "",
    reportType: "tasks",
    frequency: "weekly",
    time: "09:00",
    dayOfWeek: 1,
    recipients: "",
    format: "pdf",
  });
  const queryClient = useQueryClient();

  // Fetch scheduled reports
  const { data: reports, isLoading: reportsLoading } = useQuery<ScheduledReport[]>({
    queryKey: ["scheduled-reports"],
    queryFn: async () => {
      const response = await fetch("/api/reports/scheduled");
      if (!response.ok) throw new Error("Failed to fetch scheduled reports");
      const result = await response.json();
      return result.data;
    },
  });

  // Toggle report mutation
  const toggleReportMutation = useMutation({
    mutationFn: async ({ reportId, enabled }: { reportId: string; enabled: boolean }) => {
      const response = await fetch(`/api/reports/scheduled/${reportId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error("Failed to toggle report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
    },
  });

  // Delete report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/reports/scheduled/${reportId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete report");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });
    },
  });

  // Run report now mutation
  const runReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(`/api/reports/scheduled/${reportId}/run`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to run report");
      return response.json();
    },
  });

  const getReportTypeIcon = (type: string) => {
    return REPORT_TYPES.find((t) => t.value === type)?.icon || "📄";
  };

  const getFrequencyLabel = (schedule: ScheduledReport["schedule"]) => {
    if (schedule.frequency === "daily") return "Daily";
    if (schedule.frequency === "weekly") {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Weekly on ${days[schedule.dayOfWeek || 1]}`;
    }
    if (schedule.frequency === "monthly") {
      return `Monthly on day ${schedule.dayOfMonth || 1}`;
    }
    return `Custom: ${schedule.cron}`;
  };

  const handleCreateReport = () => {
    // In production, this would make an API call
    console.log("Creating report:", newReport);
    setIsCreateDialogOpen(false);
    // Reset form
    setNewReport({
      name: "",
      description: "",
      reportType: "tasks",
      frequency: "weekly",
      time: "09:00",
      dayOfWeek: 1,
      recipients: "",
      format: "pdf",
    });
  };

  if (reportsLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading scheduled reports...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" aria-hidden="true" />
            Scheduled Reports
          </CardTitle>
          <div className="flex items-center gap-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule a New Report</DialogTitle>
                  <DialogDescription>
                    Configure automatic report generation and email delivery
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Report Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Report Name *</Label>
                        <Input
                          id="name"
                          value={newReport.name}
                          onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                          placeholder="Weekly Team Report"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reportType">Report Type *</Label>
                        <Select
                          value={newReport.reportType}
                          onValueChange={(value) => setNewReport({ ...newReport, reportType: value })}
                        >
                          <SelectTrigger id="reportType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {REPORT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.icon} {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newReport.description}
                        onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                        placeholder="Brief description of this report"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Schedule</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency *</Label>
                        <Select
                          value={newReport.frequency}
                          onValueChange={(value) => setNewReport({ ...newReport, frequency: value })}
                        >
                          <SelectTrigger id="frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            {FREQUENCIES.map((freq) => (
                              <SelectItem key={freq.value} value={freq.value}>
                                {freq.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time *</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newReport.time}
                          onChange={(e) => setNewReport({ ...newReport, time: e.target.value })}
                        />
                      </div>
                    </div>
                    {newReport.frequency === "weekly" && (
                      <div className="space-y-2">
                        <Label htmlFor="dayOfWeek">Day of Week</Label>
                        <Select
                          value={newReport.dayOfWeek.toString()}
                          onValueChange={(value) => setNewReport({ ...newReport, dayOfWeek: parseInt(value) })}
                        >
                          <SelectTrigger id="dayOfWeek">
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Sunday</SelectItem>
                            <SelectItem value="1">Monday</SelectItem>
                            <SelectItem value="2">Tuesday</SelectItem>
                            <SelectItem value="3">Wednesday</SelectItem>
                            <SelectItem value="4">Thursday</SelectItem>
                            <SelectItem value="5">Friday</SelectItem>
                            <SelectItem value="6">Saturday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Recipients */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Email Recipients</h4>
                    <div className="space-y-2">
                      <Label htmlFor="recipients">Email Addresses * (comma-separated)</Label>
                      <Textarea
                        id="recipients"
                        value={newReport.recipients}
                        onChange={(e) => setNewReport({ ...newReport, recipients: e.target.value })}
                        placeholder="john@example.com, jane@example.com"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Separate multiple email addresses with commas
                      </p>
                    </div>
                  </div>

                  {/* Format */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold">Report Format</h4>
                    <div className="grid grid-cols-4 gap-3">
                      {FORMATS.map((format) => (
                        <div
                          key={format.value}
                          onClick={() => setNewReport({ ...newReport, format: format.value })}
                          className={cn(
                            "p-3 border rounded-lg cursor-pointer transition-colors text-center",
                            newReport.format === format.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-muted/30"
                          )}
                        >
                          <div className="text-2xl mb-1">{format.icon}</div>
                          <div className="text-xs font-medium">{format.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateReport}>Create Schedule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Automate report generation and email delivery on a schedule
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          {reports && reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Scheduled Reports</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first scheduled report to automate deliverables
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports?.map((report) => (
                <div
                  key={report.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{getReportTypeIcon(report.reportType)}</span>
                        <span className="font-medium text-sm">{report.name}</span>
                        {!report.enabled && (
                          <Badge variant="outline" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{report.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getFrequencyLabel(report.schedule)} at {report.schedule.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {report.recipients.length} recipient(s)
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {report.format.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => runReportMutation.mutate(report.id)}
                        disabled={runReportMutation.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleReportMutation.mutate({ reportId: report.id, enabled: !report.enabled })
                        }
                      >
                        {report.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReportMutation.mutate(report.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground">Last Run:</span>
                      <span className="font-medium ml-1">
                        {report.lastRun ? new Date(report.lastRun).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next Run:</span>
                      <span className="font-medium ml-1">
                        {new Date(report.nextRun).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Runs:</span>
                      <span className="font-medium ml-1">{report.runCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

