/**
 * Scheduled Reports Component
 * Automate report generation
 * Phase 3.4 - Advanced Analytics & Reporting
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Calendar, Clock, Mail, Plus, Trash2, Play, Pause } from 'lucide-react';

interface ScheduledReport {
  id: string;
  name: string;
  reportTemplateId: string;
  schedule: string;
  scheduleConfig: any;
  format: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
}

interface ScheduledReportsProps {
  workspaceId: string;
  reports: any[];
}

export function ScheduledReports({ workspaceId, reports }: ScheduledReportsProps) {
  const [scheduled, setScheduled] = useState<ScheduledReport[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    reportTemplateId: '',
    name: '',
    schedule: 'daily',
    scheduleConfig: { hour: 9, minute: 0 },
    format: 'pdf',
    recipients: [] as string[],
  });
  const [recipientEmail, setRecipientEmail] = useState('');

  useEffect(() => {
    loadScheduledReports();
  }, [workspaceId]);

  const loadScheduledReports = async () => {
    try {
      const response = await fetch(`/api/reports/scheduled?workspaceId=${workspaceId}`);
      const data = await response.json();
      setScheduled(data.scheduledReports || []);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    }
  };

  const createSchedule = async () => {
    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newSchedule,
          workspaceId,
          createdBy: 'current-user-id', // Replace with actual user ID
        }),
      });

      if (response.ok) {
        loadScheduledReports();
        setIsCreating(false);
        setNewSchedule({
          reportTemplateId: '',
          name: '',
          schedule: 'daily',
          scheduleConfig: { hour: 9, minute: 0 },
          format: 'pdf',
          recipients: [],
        });
      }
    } catch (error) {
      console.error('Failed to schedule report:', error);
    }
  };

  const toggleSchedule = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        loadScheduledReports();
      }
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
    }
  };

  const addRecipient = () => {
    if (recipientEmail && !newSchedule.recipients.includes(recipientEmail)) {
      setNewSchedule({
        ...newSchedule,
        recipients: [...newSchedule.recipients, recipientEmail],
      });
      setRecipientEmail('');
    }
  };

  const getScheduleLabel = (schedule: string, config: any) => {
    switch (schedule) {
      case 'daily':
        return `Daily at ${config.hour}:${String(config.minute).padStart(2, '0')}`;
      case 'weekly':
        return `Weekly at ${config.hour}:${String(config.minute).padStart(2, '0')}`;
      case 'monthly':
        return `Monthly on day ${config.day || 1} at ${config.hour}:${String(config.minute).padStart(2, '0')}`;
      default:
        return schedule;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Scheduled Reports</h2>
          <p className="text-sm text-muted-foreground">Automate report generation and delivery</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Schedule Report
        </Button>
      </div>

      {/* Create Schedule Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>New Scheduled Report</CardTitle>
            <CardDescription>Configure automatic report generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Report Template</Label>
              <Select
                value={newSchedule.reportTemplateId}
                onValueChange={(value) => setNewSchedule({ ...newSchedule, reportTemplateId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report template" />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report.id} value={report.id}>
                      {report.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Schedule Name</Label>
              <Input
                placeholder="e.g., Weekly Team Report"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency</Label>
                <Select
                  value={newSchedule.schedule}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, schedule: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Format</Label>
                <Select
                  value={newSchedule.format}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hour</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={newSchedule.scheduleConfig.hour}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      scheduleConfig: { ...newSchedule.scheduleConfig, hour: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div>
                <Label>Minute</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={newSchedule.scheduleConfig.minute}
                  onChange={(e) =>
                    setNewSchedule({
                      ...newSchedule,
                      scheduleConfig: { ...newSchedule.scheduleConfig, minute: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Recipients</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                />
                <Button onClick={addRecipient}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newSchedule.recipients.map((email) => (
                  <Badge key={email} variant="secondary">
                    {email}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createSchedule}>Create Schedule</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Active Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduled.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No scheduled reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduled.map((item) => {
                const report = reports.find((r) => r.id === item.reportTemplateId);
                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            <Badge variant={item.isActive ? 'default' : 'secondary'}>
                              {item.isActive ? 'Active' : 'Paused'}
                            </Badge>
                            <Badge variant="outline">{item.format.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Report: {report?.name || 'Unknown'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getScheduleLabel(item.schedule, item.scheduleConfig)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {item.recipients.length} recipient(s)
                            </span>
                            {item.nextRunAt && (
                              <span>Next: {new Date(item.nextRunAt).toLocaleString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleSchedule(item.id, item.isActive)}
                            title={item.isActive ? 'Pause' : 'Resume'}
                          >
                            {item.isActive ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

