import React, { useState, useEffect } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { 
  FileText, 
  Download, 
  Clock, 
  Mail, 
  Settings, 
  Plus,
  Trash2,
  Edit,
  Eye,
  Share2,
  Calendar as CalendarIcon,
  Users,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/providers/unified-context-provider';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'productivity' | 'performance' | 'analytics' | 'custom';
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'manual';
  recipients: string[];
  format: 'pdf' | 'excel' | 'powerpoint' | 'json';
  lastGenerated?: Date;
  nextGeneration?: Date;
  isActive: boolean;
  workspaceId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportConfig {
  timeRange: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  includeCharts: boolean;
  includeInsights: boolean;
  includeRecommendations: boolean;
  sections: string[];
}

interface ReportGenerationRequest {
  templateId: string;
  config: ReportConfig;
  workspaceId: string;
}

interface ReportGenerationResponse {
  reportId: string;
  downloadUrl: string;
  generatedAt: Date;
  status: 'completed' | 'processing' | 'failed';
}

export const ReportGenerator: React.FC = () => {
  const { user, workspace } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<ReportConfig>({
    timeRange: 'last_30_days',
    includeCharts: true,
    includeInsights: true,
    includeRecommendations: true,
    sections: ['overview', 'productivity', 'performance', 'trends']
  });

  // Load templates from API
  useEffect(() => {
    loadTemplates();
  }, [workspace?.id]);

  const loadTemplates = async () => {
    if (!workspace?.id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/reports/templates?workspaceId=${workspace.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        console.error('Failed to load templates');
        toast.error('Failed to load report templates');
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load report templates');
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async (template: ReportTemplate) => {
    if (!workspace?.id || !user?.token) return;
    
    setIsGenerating(true);
    
    try {
      const request: ReportGenerationRequest = {
        templateId: template.id,
        config,
        workspaceId: workspace.id
      };

      const response = await fetch(`${API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (response.ok) {
        const result: ReportGenerationResponse = await response.json();
        
        if (result.status === 'completed') {
          // Download the report
          const downloadResponse = await fetch(result.downloadUrl, {
            headers: {
              'Authorization': `Bearer ${user.token}`
            }
          });
          
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.name}-${format(new Date(), 'yyyy-MM-dd')}.${template.format}`;
            link.click();
            window.URL.revokeObjectURL(url);
          }

          toast.success('Report generated and downloaded successfully');

          // Update template with generation timestamp
          const updatedTemplates = templates.map(t => 
            t.id === template.id 
              ? { ...t, lastGenerated: new Date() }
              : t
          );
          setTemplates(updatedTemplates);
        } else {
          toast('Report is being generated. You will be notified when ready.');
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const createTemplate = async () => {
    if (!workspace?.id || !user?.token) return;

    const newTemplate: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'New Report Template',
      description: 'Custom report template',
      type: 'custom',
      schedule: 'manual',
      recipients: [],
      format: 'pdf',
      isActive: false,
      workspaceId: workspace.id,
      createdBy: user.id
    };

    try {
      const response = await fetch(`${API_BASE_URL}/reports/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTemplate)
      });

      if (response.ok) {
        const createdTemplate = await response.json();
        setTemplates([...templates, createdTemplate]);
        setSelectedTemplate(createdTemplate);
        toast.success('Template created successfully');
      } else {
        throw new Error('Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const updateTemplate = async (templateId: string, updates: Partial<ReportTemplate>) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/reports/templates/${templateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedTemplate = await response.json();
        setTemplates(templates.map(t => 
          t.id === templateId ? updatedTemplate : t
        ));
        
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(updatedTemplate);
        }
      } else {
        throw new Error('Failed to update template');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!user?.token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/reports/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
        toast.success('Template deleted successfully');
      } else {
        throw new Error('Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const getScheduleIcon = (schedule: string) => {
    switch (schedule) {
      case 'daily': return <Clock className="w-4 h-4" />;
      case 'weekly': return <CalendarIcon className="w-4 h-4" />;
      case 'monthly': return <BarChart3 className="w-4 h-4" />;
      case 'quarterly': return <TrendingUp className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getFormatBadge = (format: string) => {
    const colors = {
      pdf: 'bg-red-100 text-red-800',
      excel: 'bg-green-100 text-green-800',
      powerpoint: 'bg-orange-100 text-orange-800',
      json: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <Badge className={colors[format as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {format.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Report Generator</h2>
            <p className="text-gray-600">Create and manage automated reports</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Report Generator</h2>
          <p className="text-gray-600">Create and manage automated reports</p>
        </div>
        <Button onClick={createTemplate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getScheduleIcon(template.schedule)}
                          <span className="text-xs text-gray-500 capitalize">{template.schedule}</span>
                          {getFormatBadge(template.format)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(checked) => updateTemplate(template.id, { isActive: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(template.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Edit Template
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateReport(selectedTemplate)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Generate Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="recipients">Recipients</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Template Name</label>
                        <Input
                          value={selectedTemplate.name}
                          onChange={(e) => updateTemplate(selectedTemplate.id, { name: e.target.value })}
                          placeholder="Enter template name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Report Type</label>
                        <Select
                          value={selectedTemplate.type}
                          onValueChange={(value) => updateTemplate(selectedTemplate.id, { type: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="productivity">Productivity</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={selectedTemplate.description}
                        onChange={(e) => updateTemplate(selectedTemplate.id, { description: e.target.value })}
                        placeholder="Enter template description"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Output Format</label>
                      <Select
                        value={selectedTemplate.format}
                        onValueChange={(value) => updateTemplate(selectedTemplate.id, { format: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="powerpoint">PowerPoint</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="schedule" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Schedule Type</label>
                      <Select
                        value={selectedTemplate.schedule}
                        onValueChange={(value) => updateTemplate(selectedTemplate.id, { schedule: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedTemplate.schedule !== 'manual' && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Schedule Preview</h4>
                        <div className="text-sm text-gray-600">
                          {selectedTemplate.schedule === 'daily' && 'Report will be generated every day at 9:00 AM'}
                          {selectedTemplate.schedule === 'weekly' && 'Report will be generated every Monday at 9:00 AM'}
                          {selectedTemplate.schedule === 'monthly' && 'Report will be generated on the 1st of each month at 9:00 AM'}
                          {selectedTemplate.schedule === 'quarterly' && 'Report will be generated quarterly on the 1st of January, April, July, and October'}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Include Charts</label>
                        <Switch
                          checked={config.includeCharts}
                          onCheckedChange={(checked) => setConfig({ ...config, includeCharts: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Include AI Insights</label>
                        <Switch
                          checked={config.includeInsights}
                          onCheckedChange={(checked) => setConfig({ ...config, includeInsights: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Include Recommendations</label>
                        <Switch
                          checked={config.includeRecommendations}
                          onCheckedChange={(checked) => setConfig({ ...config, includeRecommendations: checked })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Time Range</label>
                      <Select
                        value={config.timeRange}
                        onValueChange={(value) => setConfig({ ...config, timeRange: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                          <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                          <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="recipients" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Recipients</label>
                      <div className="space-y-2">
                        {selectedTemplate.recipients.map((recipient, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={recipient}
                              onChange={(e) => {
                                const newRecipients = [...selectedTemplate.recipients];
                                newRecipients[index] = e.target.value;
                                updateTemplate(selectedTemplate.id, { recipients: newRecipients });
                              }}
                              placeholder="Enter email address"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newRecipients = selectedTemplate.recipients.filter((_, i) => i !== index);
                                updateTemplate(selectedTemplate.id, { recipients: newRecipients });
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRecipients = [...selectedTemplate.recipients, ''];
                            updateTemplate(selectedTemplate.id, { recipients: newRecipients });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Recipient
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
                  <p className="text-gray-600">Select a template from the list to edit its configuration</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}; 