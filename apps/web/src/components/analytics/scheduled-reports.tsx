// @epic-4.1-analytics: Scheduled Reports Component
// @persona-jennifer: Executive needs automated report delivery
// @persona-david: Team lead needs regular performance reports

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  Mail,
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
  Users
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { toast } from 'sonner'

interface ScheduledReport {
  id: string
  name: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:MM format
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  recipients: string[] // Email addresses
  format: 'pdf' | 'excel' | 'csv'
  sections: string[] // Which analytics sections to include
  isActive: boolean
  lastRun?: string
  nextRun?: string
  createdAt: string
  createdBy: string
}

interface ScheduledReportsProps {
  isOpen: boolean
  onClose: () => void
}

export function ScheduledReports({ isOpen, onClose }: ScheduledReportsProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null)
  
  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [formTime, setFormTime] = useState('09:00')
  const [formDayOfWeek, setFormDayOfWeek] = useState(1) // Monday
  const [formDayOfMonth, setFormDayOfMonth] = useState(1)
  const [formRecipients, setFormRecipients] = useState('')
  const [formFormat, setFormFormat] = useState<'pdf' | 'excel' | 'csv'>('excel')
  const [formSections, setFormSections] = useState({
    overview: true,
    projects: true,
    team: true,
    time: true,
    insights: false,
  })
  const [formIsActive, setFormIsActive] = useState(true)

  // Load reports from localStorage
  useEffect(() => {
    const savedReports = localStorage.getItem('scheduledReports')
    if (savedReports) {
      setReports(JSON.parse(savedReports))
    }
  }, [])

  // Save reports to localStorage
  const saveReports = (updatedReports: ScheduledReport[]) => {
    setReports(updatedReports)
    localStorage.setItem('scheduledReports', JSON.stringify(updatedReports))
  }

  // Reset form
  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormFrequency('weekly')
    setFormTime('09:00')
    setFormDayOfWeek(1)
    setFormDayOfMonth(1)
    setFormRecipients('')
    setFormFormat('excel')
    setFormSections({
      overview: true,
      projects: true,
      team: true,
      time: true,
      insights: false,
    })
    setFormIsActive(true)
    setEditingReport(null)
  }

  // Load report for editing
  const loadReportForEditing = (report: ScheduledReport) => {
    setFormName(report.name)
    setFormDescription(report.description || '')
    setFormFrequency(report.frequency)
    setFormTime(report.time)
    setFormDayOfWeek(report.dayOfWeek || 1)
    setFormDayOfMonth(report.dayOfMonth || 1)
    setFormRecipients(report.recipients.join(', '))
    setFormFormat(report.format)
    // Map sections array to form state
    setFormSections({
      overview: report.sections.includes('overview'),
      projects: report.sections.includes('projects'),
      team: report.sections.includes('team'),
      time: report.sections.includes('time'),
      insights: report.sections.includes('insights'),
    })
    setFormIsActive(report.isActive)
    setEditingReport(report)
    setShowCreateModal(true)
  }

  // Calculate next run time
  const calculateNextRun = (
    frequency: string,
    time: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): string => {
    const now = new Date()
    const [hours, minutes] = time.split(':').map(Number)
    const next = new Date()
    next.setHours(hours, minutes, 0, 0)

    if (frequency === 'daily') {
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
    } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
      const currentDay = now.getDay()
      const daysUntilNext = (dayOfWeek - currentDay + 7) % 7
      next.setDate(now.getDate() + (daysUntilNext || 7))
      if (daysUntilNext === 0 && next <= now) {
        next.setDate(next.getDate() + 7)
      }
    } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
      next.setDate(dayOfMonth)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }
    }

    return next.toISOString()
  }

  // Create or update report
  const handleSaveReport = () => {
    // Validation
    if (!formName.trim()) {
      toast.error('Report name is required')
      return
    }
    
    const recipientEmails = formRecipients
      .split(',')
      .map(email => email.trim())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    
    if (recipientEmails.length === 0) {
      toast.error('At least one valid email recipient is required')
      return
    }

    const selectedSections = Object.entries(formSections)
      .filter(([_, selected]) => selected)
      .map(([section]) => section)

    if (selectedSections.length === 0) {
      toast.error('At least one report section must be selected')
      return
    }

    const reportData = {
      name: formName.trim(),
      description: formDescription.trim(),
      frequency: formFrequency,
      time: formTime,
      ...(formFrequency === 'weekly' && { dayOfWeek: formDayOfWeek }),
      ...(formFrequency === 'monthly' && { dayOfMonth: formDayOfMonth }),
      recipients: recipientEmails,
      format: formFormat,
      sections: selectedSections,
      isActive: formIsActive,
      nextRun: calculateNextRun(
        formFrequency,
        formTime,
        formDayOfWeek,
        formDayOfMonth
      ),
    }

    if (editingReport) {
      // Update existing report
      const updatedReports = reports.map(r =>
        r.id === editingReport.id
          ? { ...r, ...reportData }
          : r
      )
      saveReports(updatedReports)
      toast.success('Report updated successfully')
    } else {
      // Create new report
      const newReport: ScheduledReport = {
        id: `report-${Date.now()}`,
        ...reportData,
        createdAt: new Date().toISOString(),
        createdBy: 'current-user', // TODO: Get from auth context
      }
      saveReports([...reports, newReport])
      toast.success('Report scheduled successfully')
    }

    resetForm()
    setShowCreateModal(false)
  }

  // Toggle report active status
  const toggleReportStatus = (reportId: string) => {
    const updatedReports = reports.map(r =>
      r.id === reportId ? { ...r, isActive: !r.isActive } : r
    )
    saveReports(updatedReports)
    toast.success(
      updatedReports.find(r => r.id === reportId)?.isActive
        ? 'Report activated'
        : 'Report paused'
    )
  }

  // Delete report
  const handleDeleteReport = (reportId: string) => {
    const updatedReports = reports.filter(r => r.id !== reportId)
    saveReports(updatedReports)
    toast.success('Report deleted')
  }

  // Run report now
  const handleRunNow = (report: ScheduledReport) => {
    toast.info('Generating report...', {
      description: 'This will be sent to all recipients shortly',
    })
    // TODO: Implement actual report generation and sending
    const updatedReports = reports.map(r =>
      r.id === report.id
        ? { ...r, lastRun: new Date().toISOString() }
        : r
    )
    saveReports(updatedReports)
    setTimeout(() => {
      toast.success('Report sent successfully')
    }, 2000)
  }

  // Get frequency display text
  const getFrequencyDisplay = (report: ScheduledReport): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (report.frequency === 'daily') {
      return `Daily at ${report.time}`
    } else if (report.frequency === 'weekly' && report.dayOfWeek !== undefined) {
      return `Every ${days[report.dayOfWeek]} at ${report.time}`
    } else if (report.frequency === 'monthly' && report.dayOfMonth !== undefined) {
      return `Monthly on day ${report.dayOfMonth} at ${report.time}`
    }
    return report.frequency
  }

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
              Automate analytics report delivery to your team
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {reports.length} scheduled {reports.length === 1 ? 'report' : 'reports'}
              </div>
              <Button
                onClick={() => {
                  resetForm()
                  setShowCreateModal(true)
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Report
              </Button>
            </div>

            {/* Reports List */}
            <ScrollArea className="flex-1">
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No scheduled reports yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first automated report to receive regular analytics updates
                  </p>
                  <Button
                    onClick={() => {
                      resetForm()
                      setShowCreateModal(true)
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
                    <Card key={report.id} className={cn(
                      "transition-all",
                      !report.isActive && "opacity-60"
                    )}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{report.name}</CardTitle>
                              <Badge variant={report.isActive ? "default" : "secondary"}>
                                {report.isActive ? 'Active' : 'Paused'}
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
                              onClick={() => toggleReportStatus(report.id)}
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
                            {report.recipients.length} {report.recipients.length === 1 ? 'recipient' : 'recipients'}
                          </div>
                          {report.nextRun && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              Next: {new Date(report.nextRun).toLocaleString()}
                            </div>
                          )}
                          {report.lastRun && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Check className="w-4 h-4" />
                              Last: {new Date(report.lastRun).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-3">
                          {report.sections.map((section) => (
                            <Badge key={section} variant="secondary" className="text-xs">
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
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) {
          resetForm()
        }
        setShowCreateModal(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingReport ? 'Edit Report Schedule' : 'Create Report Schedule'}
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
                    <Select value={formFrequency} onValueChange={(value: any) => setFormFrequency(value)}>
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

                {formFrequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-week">Day of Week *</Label>
                    <Select value={formDayOfWeek.toString()} onValueChange={(value) => setFormDayOfWeek(parseInt(value))}>
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

                {formFrequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label htmlFor="day-of-month">Day of Month *</Label>
                    <Select value={formDayOfMonth.toString()} onValueChange={(value) => setFormDayOfMonth(parseInt(value))}>
                      <SelectTrigger id="day-of-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
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
                <Select value={formFormat} onValueChange={(value: any) => setFormFormat(value)}>
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
                      <Label htmlFor="section-overview" className="font-normal cursor-pointer">
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
                      <Label htmlFor="section-projects" className="font-normal cursor-pointer">
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
                      <Label htmlFor="section-team" className="font-normal cursor-pointer">
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
                      <Label htmlFor="section-time" className="font-normal cursor-pointer">
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
                      <Label htmlFor="section-insights" className="font-normal cursor-pointer">
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
                resetForm()
                setShowCreateModal(false)
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveReport}>
              <Save className="w-4 h-4 mr-2" />
              {editingReport ? 'Update Report' : 'Create Report'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

