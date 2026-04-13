/**
 * Report Builder Component
 * Visual interface for creating custom reports
 * Phase 3.4 - Advanced Analytics & Reporting
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { FileText, Download, Calendar, Plus, X, Filter, ChartBar } from 'lucide-react';

interface ReportBuilderProps {
  workspaceId: string;
  onSave: (report: any) => void;
}

const DATA_SOURCES = [
  { value: 'tasks', label: 'Tasks' },
  { value: 'projects', label: 'Projects' },
  { value: 'users', label: 'Users' },
  { value: 'time_entries', label: 'Time Entries' },
];

const CHART_TYPES = [
  { value: 'table', label: 'Table', icon: '📊' },
  { value: 'bar', label: 'Bar Chart', icon: '📊' },
  { value: 'line', label: 'Line Chart', icon: '📈' },
  { value: 'pie', label: 'Pie Chart', icon: '🥧' },
  { value: 'area', label: 'Area Chart', icon: '📉' },
];

const AGGREGATIONS = ['count', 'sum', 'avg', 'min', 'max'];

export function ReportBuilder({ workspaceId, onSave }: ReportBuilderProps) {
  const [step, setStep] = useState(1);
  const [report, setReport] = useState({
    name: '',
    description: '',
    type: 'custom',
    category: '',
    dataSource: '',
    filters: {} as Record<string, any>,
    columns: [] as string[],
    groupBy: [] as string[],
    aggregations: [] as any[],
    chartType: 'table',
    chartConfig: {},
  });

  const [newColumn, setNewColumn] = useState('');
  const [newFilter, setNewFilter] = useState({ field: '', operator: 'equals', value: '' });
  const [newAggregation, setNewAggregation] = useState({ field: '', operation: 'count' });

  const addColumn = () => {
    if (newColumn && !report.columns.includes(newColumn)) {
      setReport({
        ...report,
        columns: [...report.columns, newColumn],
      });
      setNewColumn('');
    }
  };

  const removeColumn = (column: string) => {
    setReport({
      ...report,
      columns: report.columns.filter((c) => c !== column),
    });
  };

  const addFilter = () => {
    if (newFilter.field && newFilter.value) {
      setReport({
        ...report,
        filters: {
          ...report.filters,
          [newFilter.field]: { operator: newFilter.operator, value: newFilter.value },
        },
      });
      setNewFilter({ field: '', operator: 'equals', value: '' });
    }
  };

  const addAggregation = () => {
    if (newAggregation.field && newAggregation.operation) {
      setReport({
        ...report,
        aggregations: [...report.aggregations, newAggregation],
      });
      setNewAggregation({ field: '', operation: 'count' });
    }
  };

  const handleSave = () => {
    onSave(report);
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                s === step
                  ? 'bg-blue-600 text-white'
                  : s < step
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {s}
            </div>
            {s < 4 && <div className="w-12 h-1 bg-gray-200 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Basic Information
            </CardTitle>
            <CardDescription>Define your report name and data source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Report Name</Label>
              <Input
                id="name"
                placeholder="e.g., Weekly Task Summary"
                value={report.name}
                onChange={(e) => setReport({ ...report, name: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the report"
                value={report.description}
                onChange={(e) => setReport({ ...report, description: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., Productivity, Performance"
                value={report.category}
                onChange={(e) => setReport({ ...report, category: e.target.value })}
              />
            </div>

            <div>
              <Label>Data Source</Label>
              <Select value={report.dataSource} onValueChange={(value) => setReport({ ...report, dataSource: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((source) => (
                    <SelectItem key={source.value} value={source.value}>
                      {source.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setStep(2)} disabled={!report.name || !report.dataSource}>
              Next: Configure Columns
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Columns */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Columns</CardTitle>
            <CardDescription>Choose which data fields to include</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Column name (e.g., title, status, assignee)"
                value={newColumn}
                onChange={(e) => setNewColumn(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addColumn()}
              />
              <Button onClick={addColumn}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {report.columns.map((column) => (
                <Badge key={column} variant="secondary" className="flex items-center gap-1">
                  {column}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeColumn(column)} />
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={report.columns.length === 0}>
                Next: Add Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Filters & Aggregations */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Aggregations
            </CardTitle>
            <CardDescription>Optional: Filter data and add calculations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Filters */}
            <div>
              <Label>Filters</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Field"
                  value={newFilter.field}
                  onChange={(e) => setNewFilter({ ...newFilter, field: e.target.value })}
                  className="flex-1"
                />
                <Select value={newFilter.operator} onValueChange={(value) => setNewFilter({ ...newFilter, operator: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="gt">Greater Than</SelectItem>
                    <SelectItem value="lt">Less Than</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={newFilter.value}
                  onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
                  className="flex-1"
                />
                <Button onClick={addFilter}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-2 space-y-1">
                {Object.entries(report.filters).map(([field, config]: [string, any]) => (
                  <Badge key={field} variant="outline">
                    {field} {config.operator} {config.value}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Aggregations */}
            <div>
              <Label>Aggregations</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Field"
                  value={newAggregation.field}
                  onChange={(e) => setNewAggregation({ ...newAggregation, field: e.target.value })}
                  className="flex-1"
                />
                <Select value={newAggregation.operation} onValueChange={(value) => setNewAggregation({ ...newAggregation, operation: value })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((agg) => (
                      <SelectItem key={agg} value={agg}>
                        {agg.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addAggregation}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-2 space-y-1">
                {report.aggregations.map((agg, i) => (
                  <Badge key={i} variant="secondary">
                    {agg.operation.toUpperCase()}({agg.field})
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Next: Visualization</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Visualization */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBar className="w-5 h-5" />
              Visualization
            </CardTitle>
            <CardDescription>Choose how to display your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {CHART_TYPES.map((chart) => (
                <Card
                  key={chart.value}
                  className={`cursor-pointer transition-all ${
                    report.chartType === chart.value ? 'ring-2 ring-blue-600' : 'hover:ring-1 hover:ring-gray-300'
                  }`}
                  onClick={() => setReport({ ...report, chartType: chart.value })}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{chart.icon}</div>
                    <div className="font-medium">{chart.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button onClick={handleSave} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Save Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

