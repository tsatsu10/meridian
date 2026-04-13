/**
 * Report Dashboard Component
 * Manage and view reports
 * Phase 3.4 - Advanced Analytics & Reporting
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  Trash2,
  Plus,
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  dataSource: string;
  chartType: string;
  createdAt: string;
}

interface Execution {
  id: string;
  reportTemplateId: string;
  status: string;
  format: string;
  fileUrl: string;
  rowCount: number;
  executionTimeMs: number;
  createdAt: string;
}

interface ReportDashboardProps {
  workspaceId: string;
  onCreateNew: () => void;
}

export function ReportDashboard({ workspaceId, onCreateNew }: ReportDashboardProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadReports();
    loadExecutions();
  }, [workspaceId]);

  const loadReports = async () => {
    try {
      const response = await fetch(`/api/reports/templates?workspaceId=${workspaceId}`);
      const data = await response.json();
      setReports(data.templates || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const loadExecutions = async () => {
    try {
      const response = await fetch(`/api/reports/executions?workspaceId=${workspaceId}`);
      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  };

  const generateReport = async (templateId: string, format: 'excel' | 'pdf' | 'csv') => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          workspaceId,
          format,
          generatedBy: 'current-user-id', // Replace with actual user ID
        }),
      });

      const data = await response.json();

      if (data.fileUrl) {
        // Download the file
        window.open(data.fileUrl, '_blank');
        loadExecutions();
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports & Analytics</h2>
          <p className="text-muted-foreground">Create and manage custom reports</p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Report
        </Button>
      </div>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Report Templates
          </CardTitle>
          <CardDescription>Saved report configurations</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No reports created yet</p>
              <Button onClick={onCreateNew} variant="outline">
                Create Your First Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{report.name}</h3>
                          <Badge variant="outline">{report.type}</Badge>
                          {report.category && <Badge variant="secondary">{report.category}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Source: {report.dataSource}</span>
                          <span>Chart: {report.chartType}</span>
                          <span>Created: {new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReport(report.id, 'excel')}
                          disabled={isGenerating}
                          title="Export to Excel"
                        >
                          📊 Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReport(report.id, 'pdf')}
                          disabled={isGenerating}
                          title="Export to PDF"
                        >
                          📄 PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateReport(report.id, 'csv')}
                          disabled={isGenerating}
                          title="Export to CSV"
                        >
                          📋 CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Generations
          </CardTitle>
          <CardDescription>History of generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No reports generated yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => {
                const report = reports.find((r) => r.id === execution.reportTemplateId);
                return (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="font-medium">{report?.name || 'Unknown Report'}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(execution.createdAt).toLocaleString()} · {execution.rowCount} rows ·{' '}
                          {execution.executionTimeMs}ms
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={execution.status === 'success' ? 'default' : 'destructive'}>
                        {execution.format.toUpperCase()}
                      </Badge>
                      {execution.status === 'success' && execution.fileUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(execution.fileUrl, '_blank')}
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{reports.length}</div>
            <div className="text-sm text-muted-foreground">Report Templates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{executions.length}</div>
            <div className="text-sm text-muted-foreground">Reports Generated</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">
              {executions.filter((e) => e.status === 'success').length}
            </div>
            <div className="text-sm text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

