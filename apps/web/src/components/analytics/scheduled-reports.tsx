// @epic-4.1-analytics: Scheduled Reports Component
// @persona-jennifer: Executive needs automated report delivery
// @persona-david: Team lead needs regular performance reports

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  X,
  Save,
  AlertCircle,
  Check,
  FileText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import useWorkspaceStore from "@/store/workspace";
import {
  useScheduledReports,
  useCreateScheduledReport,
  useUpdateScheduledReport,
  useDeleteScheduledReport,
  useRunScheduledReportNow,
  type ScheduledReport,
} from "@/hooks/queries/reports/use-scheduled-reports";

interface ScheduledReportsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduledReports({ isOpen, onClose }: ScheduledReportsProps) {
  const { workspace } = useWorkspaceStore();
  const workspaceId = workspace?.id;

  const { data: reports = [], isLoading } = useScheduledReports(workspaceId);
  const createReport = useCreateScheduledReport(workspaceId);
  const updateReport = useUpdateScheduledReport(workspaceId);
  const deleteReport = useDeleteScheduledReport(workspaceId);
  const runReportNow = useRunScheduledReportNow(workspaceId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(
    null,
  );

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFrequency, setFormFrequency] = useState<
    "daily" | "weekly" | "monthly"
  >("weekly");
  const [formTime, setFormTime] = useState("09:00");
  const [formDayOfWeek, setFormDayOfWeek] = useState(1); // Monday
  const [formDayOfMonth, setFormDayOfMonth] = useState(1);
  const [formRecipients, setFormRecipients] = useState("");
  const [formFormat, setFormFormat] = useState<"pdf" | "excel" | "csv">(
    "excel",
  );
  const [formSections, setFormSections] = useState({
    overview: true,
    projects: true,
    team: true,
    time: true,
    insights: false,
  });
  const [formIsActive, setFormIsActive] = useState(true);

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormFrequency("weekly");
    setFormTime("09:00");
    setFormDayOfWeek(1);
    setFormDayOfMonth(1);
    setFormRecipients("");
    setFormFormat("excel");
    setFormSections({
      overview: true,
      projects: true,
      team: true,
      time: true,
      insights: false,
    });
    setFormIsActive(true);
    setEditingReport(null);
  };

  // Load report for editing
  const loadReportForEditing = (report: ScheduledReport) => {
    setFormName(report.name);
    setFormDescription(report.description || "");
    setFormFrequency(report.frequency);
    setFormTime(report.time);
    setFormDayOfWeek(report.dayOfWeek ?? 1);
    setFormDayOfMonth(report.dayOfMonth ?? 1);
    setFormRecipients(report.recipients.join(", "));
    setFormFormat(report.format);
    setFormSections({
      overview: report.sections.includes("overview"),
      projects: report.sections.includes("projects"),
      team: report.sections.includes("team"),
      time: report.sections.includes("time"),
      insights: report.sections.includes("insights"),
    });
    setFormIsActive(report.isActive);
    setEditingReport(report);
    setShowCreateModal(true);
  };

  // Create or update report
  const handleSaveReport = async () => {
    if (!formName.trim()) {
      toast.error("Report name is required");
      return;
    }

    const recipientEmails = formRecipients
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

    if (recipientEmails.length === 0) {
      toast.error("At least one valid email recipient is required");
      return;
    }

    const selectedSections = Object.entries(formSections)
      .filter(([_, selected]) => selected)
      .map(([section]) => section);

    if (selectedSections.length === 0) {
      toast.error("At least one report section must be selected");
      return;
    }

    const input = {
      name: formName.trim(),
      description: formDescription.trim(),
      frequency: formFrequency,
      time: formTime,
      ...(formFrequency === "weekly" && { dayOfWeek: formDayOfWeek }),
      ...(formFrequency === "monthly" && { dayOfMonth: formDayOfMonth }),
      recipients: recipientEmails,
      format: formFormat,
      sections: selectedSections,
      isActive: formIsActive,
    };

    try {
      if (editingReport) {
        await updateReport.mutateAsync({
          reportId: editingReport.id,
          ...input,
        });
        toast.success("Report configuration updated");
      } else {
        await createReport.mutateAsync(input);
        toast.success("Report configuration saved");
      }
      resetForm();
      setShowCreateModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save report",
      );
    }
  };

  // Toggle report active status
  const toggleReportStatus = async (report: ScheduledReport) => {
    try {
      await updateReport.mutateAsync({
        reportId: report.id,
        isActive: !report.isActive,
      });
      toast.success(!report.isActive ? "Report activated" : "Report paused");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update report",
      );
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteReport.mutateAsync(reportId);
      toast.success("Report deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete report",
      );
    }
  };

  // Run report now - genuinely generates the report from live analytics data
  // and emails it; reflects whether delivery actually succeeded.
  const handleRunNow = async (report: ScheduledReport) => {
    toast.info("Generating report...", {
      description: "This will be sent to all recipients shortly",
    });
    try {
      const result = await runReportNow.mutateAsync(report.id);
      if (result.sent) {
        toast.success(`Report sent to ${result.recipientCount} recipient(s)`);
      } else {
        toast.error(
          result.error || "Email delivery isn't configured on the server",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to run report",
      );
    }
  };

  // Get frequency display text
  const getFrequencyDisplay = (report: ScheduledReport): string => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    if (report.frequency === "daily") {
      return `Daily at ${report.time}`;
    }
    if (
      report.frequency === "weekly" &&
      report.dayOfWeek !== undefined &&
      report.dayOfWeek !== null
    ) {
      return `Every ${days[report.dayOfWeek]} at ${report.time}`;
    }
    if (
      report.frequency === "monthly" &&
      report.dayOfMonth !== undefined &&
      report.dayOfMonth !== null
    ) {
      return `Monthly on day ${report.dayOfMonth} at ${report.time}`;
    }
    return report.frequency;
  };

  return (
    <>
      <Dialog open={isOpen && !showCreateModal} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Scheduled Reports
            </DialogTitle>
            <DialogDescription>
              Automate analytics report delivery to your team by email.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading..."
                  : `${reports.length} scheduled ${reports.length === 1 ? "report" : "reports"}`}
              </div>
              <Button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Report
              </Button>
            </div>

            {/* Reports List */}
            <ScrollArea className="flex-1">
              {!isLoading && reports.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">
                    No scheduled reports yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first automated report to receive regular
                    analytics updates
                  </p>
                  <Button
                    onClick={() => {
                      resetForm();
                      setShowCreateModal(true);
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Report Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 pr-4">
                  {reports.map((report) => (
                    <Card
                      key={report.id}
                      className={cn(
                        "transition-all",
                        !report.isActive && "opacity-60",
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">
                                {report.name}
                              </CardTitle>
                              <Badge
                                variant={
                                  report.isActive ? "default" : "secondary"
                                }
                              >
                                {report.isActive ? "Active" : "Paused"}
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <FileText className="w-3 h-3" />
                                {report.format.toUpperCase()}
                              </Badge>
                            </div>
                            {report.description && (
                              <p className="text-sm text-muted-foreground">
                                {report.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunNow(report)}
                              title="Run now"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReportStatus(report)}
                              title={report.isActive ? "Pause" : "Resume"}
                            >
                              {report.isActive ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => loadReportForEditing(report)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReport(report.id)}
                              title="Delete"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {getFrequencyDisplay(report)}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {report.recipients.length}{" "}
                            {report.recipients.length === 1
                              ? "recipient"
                              : "recipients"}
                          </div>
                          {report.nextRunAt && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              Next:{" "}
                              {new Date(report.nextRunAt).toLocaleString()}
                            </div>
                          )}
                          {report.lastRunAt && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Check className="w-4 h-4" />
                              Last:{" "}
                              {new Date(report.lastRunAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {report.sections.map((section) => (
                            <Badge
                              key={section}
                              variant="secondary"
                              className="text-xs"
                            >
                              {section}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              Reports are sent via email to all recipients
            </div>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Report Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
          setShowCreateModal(open);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingReport
                ? "Edit Report Schedule"
                : "Create Report Schedule"}
            </DialogTitle>
            <DialogDescription>
              Configure automated analytics report delivery
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="report-name">Report Name *</Label>
                  <Input
                    id="report-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Weekly Team Performance Report"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-description">Description</Label>
                  <Textarea
                    id="report-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Optional description for this report"
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div className="space-y-4">
                <h4 className="font-medium">Schedule</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency *</Label>
                    <Select
                      value={formFrequency}
                      onValueChange={(value) =>
                        setFormFrequency(value as typeof formFrequency)
                      }
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                    />
                  </div>
                </div>

                {formFrequency === "weekly" && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-week">Day of Week *</Label>
                    <Select
                      value={formDayOfWeek.toString()}
                      onValueChange={(value) =>
                        setFormDayOfWeek(Number.parseInt(value))
                      }
                    >
                      <SelectTrigger id="day-of-week">
                        <SelectValue />
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

                {formFrequency === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-month">Day of Month *</Label>
                    <Select
                      value={formDayOfMonth.toString()}
                      onValueChange={(value) =>
                        setFormDayOfMonth(Number.parseInt(value))
                      }
                    >
                      <SelectTrigger id="day-of-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          (day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Separator />

              {/* Recipients */}
              <div className="space-y-2">
                <Label htmlFor="recipients">Email Recipients *</Label>
                <Textarea
                  id="recipients"
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                  placeholder="email@example.com, another@example.com"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of email addresses
                </p>
              </div>

              <Separator />

              {/* Format */}
              <div className="space-y-2">
                <Label htmlFor="format">Export Format *</Label>
                <Select
                  value={formFormat}
                  onValueChange={(value) =>
                    setFormFormat(value as typeof formFormat)
                  }
                >
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Sections */}
              <div className="space-y-4">
                <Label>Report Sections *</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="section-overview"
                        className="font-normal cursor-pointer"
                      >
                        Overview & Key Metrics
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Summary dashboard and KPI metrics
                      </p>
                    </div>
                    <Switch
                      id="section-overview"
                      checked={formSections.overview}
                      onCheckedChange={(checked) =>
                        setFormSections({ ...formSections, overview: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="section-projects"
                        className="font-normal cursor-pointer"
                      >
                        Project Health
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Project status, progress, and health scores
                      </p>
                    </div>
                    <Switch
                      id="section-projects"
                      checked={formSections.projects}
                      onCheckedChange={(checked) =>
                        setFormSections({ ...formSections, projects: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="section-team"
                        className="font-normal cursor-pointer"
                      >
                        Team Performance
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Team productivity and resource utilization
                      </p>
                    </div>
                    <Switch
                      id="section-team"
                      checked={formSections.team}
                      onCheckedChange={(checked) =>
                        setFormSections({ ...formSections, team: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="section-time"
                        className="font-normal cursor-pointer"
                      >
                        Time Tracking
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Hours logged and time utilization
                      </p>
                    </div>
                    <Switch
                      id="section-time"
                      checked={formSections.time}
                      onCheckedChange={(checked) =>
                        setFormSections({ ...formSections, time: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="section-insights"
                        className="font-normal cursor-pointer"
                      >
                        AI Insights & Predictions
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Anomalies, trends, and predictive analytics
                      </p>
                    </div>
                    <Switch
                      id="section-insights"
                      checked={formSections.insights}
                      onCheckedChange={(checked) =>
                        setFormSections({ ...formSections, insights: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Active Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-active">Activate Report</Label>
                  <p className="text-xs text-muted-foreground">
                    Start sending reports immediately
                  </p>
                </div>
                <Switch
                  id="is-active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setShowCreateModal(false);
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveReport}
              disabled={createReport.isPending || updateReport.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingReport ? "Update Report" : "Create Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
