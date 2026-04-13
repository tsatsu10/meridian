/**
 * Timesheet Manager Component
 * View, submit, and approve timesheets
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Send, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

interface Timesheet {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalHours: number;
  billableHours: number;
  totalAmount: number;
  submittedAt: string | null;
  approvedAt: string | null;
}

interface TimesheetManagerProps {
  workspaceId: string;
  userId: string;
  userRole: string;
}

export function TimesheetManager({ workspaceId, userId, userRole }: TimesheetManagerProps) {
  const [currentPeriod, setCurrentPeriod] = useState({ start: '', end: '' });
  const [summary, setSummary] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);

  useEffect(() => {
    // Set current week
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    setCurrentPeriod({
      start: monday.toISOString(),
      end: sunday.toISOString(),
    });

    generateSummary(monday.toISOString(), sunday.toISOString());
    loadTimesheets();
  }, []);

  const generateSummary = async (start: string, end: string) => {
    try {
      const response = await fetch('/api/time/timesheets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          userId,
          periodStart: start,
          periodEnd: end,
        }),
      });

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const loadTimesheets = async () => {
    try {
      // This would need a proper endpoint
      // For now, placeholder
      setTimesheets([]);
    } catch (error) {
      console.error('Failed to load timesheets:', error);
    }
  };

  const submitTimesheet = async () => {
    try {
      const response = await fetch('/api/time/timesheets/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          userId,
          periodStart: currentPeriod.start,
          periodEnd: currentPeriod.end,
        }),
      });

      if (response.ok) {
        alert('Timesheet submitted successfully!');
        loadTimesheets();
      }
    } catch (error) {
      console.error('Failed to submit timesheet:', error);
    }
  };

  const approveTimesheet = async (timesheetId: string, approved: boolean) => {
    try {
      await fetch(`/api/time/timesheets/${timesheetId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: userId,
          approved,
        }),
      });

      loadTimesheets();
    } catch (error) {
      console.error('Failed to process timesheet:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: { variant: 'secondary', label: 'Draft' },
      submitted: { variant: 'default', label: 'Submitted' },
      approved: { variant: 'default', label: 'Approved', className: 'bg-green-600' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };

    const config = variants[status] || variants.draft;
    return <Badge {...config}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Current Period Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Current Week Timesheet
          </CardTitle>
          <CardDescription>
            {new Date(currentPeriod.start).toLocaleDateString()} -{' '}
            {new Date(currentPeriod.end).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <div className="text-sm text-muted-foreground">Total Hours</div>
                    </div>
                    <div className="text-2xl font-bold">{summary.totalHours.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <div className="text-sm text-muted-foreground">Billable Hours</div>
                    </div>
                    <div className="text-2xl font-bold">{summary.billableHours.toFixed(2)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="w-4 h-4 text-purple-600" />
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                    </div>
                    <div className="text-2xl font-bold">${summary.totalAmount.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Time Entries */}
              <div>
                <h3 className="font-semibold mb-2">Time Entries ({summary.entries.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {summary.entries.map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{entry.description || 'No description'}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(entry.startTime).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm">{(entry.duration / 60).toFixed(2)}h</div>
                        {entry.isBillable && (
                          <Badge variant="secondary" className="text-xs">
                            Billable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={submitTimesheet} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Submit Timesheet for Approval
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading timesheet data...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet History</CardTitle>
        </CardHeader>
        <CardContent>
          {timesheets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No submitted timesheets yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timesheets.map((timesheet) => (
                <Card key={timesheet.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold mb-1">
                          {new Date(timesheet.periodStart).toLocaleDateString()} -{' '}
                          {new Date(timesheet.periodEnd).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {timesheet.totalHours}h total · ${timesheet.totalAmount.toFixed(2)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(timesheet.status)}
                        {userRole === 'manager' && timesheet.status === 'submitted' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveTimesheet(timesheet.id, true)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveTimesheet(timesheet.id, false)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

