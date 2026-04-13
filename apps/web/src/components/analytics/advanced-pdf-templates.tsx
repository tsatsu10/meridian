// Phase 6 Enhancement: Advanced PDF Report Templates
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Eye, 
  Settings, 
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  Calendar,
  Clock
} from 'lucide-react';

interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'detailed' | 'summary' | 'custom';
  preview: string;
  sections: TemplateSection[];
  styling: TemplateStyle;
}

interface TemplateSection {
  id: string;
  type: 'header' | 'chart' | 'table' | 'text' | 'metrics' | 'footer';
  title: string;
  config: Record<string, any>;
  required: boolean;
}

interface TemplateStyle {
  colorScheme: 'professional' | 'modern' | 'corporate' | 'minimal';
  layout: 'single-column' | 'two-column' | 'grid';
  branding: boolean;
  pageNumbers: boolean;
  watermark?: string;
}

interface AdvancedPDFTemplatesProps {
  onSelectTemplate: (template: PDFTemplate) => void;
  onCustomizeTemplate: (template: PDFTemplate) => void;
  className?: string;
}

const predefinedTemplates: PDFTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview for leadership and stakeholders',
    category: 'executive',
    preview: '/templates/executive-preview.jpg',
    sections: [
      {
        id: 'header',
        type: 'header',
        title: 'Executive Header',
        config: { includeDate: true, includeLogo: true },
        required: true
      },
      {
        id: 'key-metrics',
        type: 'metrics',
        title: 'Key Performance Indicators',
        config: { 
          metrics: ['projectCompletion', 'teamProductivity', 'budgetUtilization'],
          layout: 'grid-3'
        },
        required: true
      },
      {
        id: 'trends-chart',
        type: 'chart',
        title: 'Performance Trends',
        config: { 
          chartType: 'line',
          timeRange: '6months',
          showProjections: true
        },
        required: true
      },
      {
        id: 'executive-insights',
        type: 'text',
        title: 'Strategic Insights',
        config: { 
          autoGenerate: true,
          includeRecommendations: true
        },
        required: true
      }
    ],
    styling: {
      colorScheme: 'corporate',
      layout: 'single-column',
      branding: true,
      pageNumbers: true,
      watermark: 'CONFIDENTIAL'
    }
  },
  {
    id: 'detailed-analytics',
    name: 'Detailed Analytics Report',
    description: 'Comprehensive analysis with detailed charts and data tables',
    category: 'detailed',
    preview: '/templates/detailed-preview.jpg',
    sections: [
      {
        id: 'cover-page',
        type: 'header',
        title: 'Report Cover',
        config: { 
          includeDate: true, 
          includeLogo: true,
          includeAbstract: true
        },
        required: true
      },
      {
        id: 'project-overview',
        type: 'table',
        title: 'Project Overview',
        config: { 
          columns: ['project', 'status', 'completion', 'budget', 'team'],
          sortBy: 'completion',
          includeFilters: true
        },
        required: true
      },
      {
        id: 'team-performance',
        type: 'chart',
        title: 'Team Performance Analysis',
        config: { 
          chartType: 'bar',
          groupBy: 'team',
          metrics: ['tasksCompleted', 'averageTime', 'qualityScore']
        },
        required: true
      },
      {
        id: 'productivity-trends',
        type: 'chart',
        title: 'Productivity Trends',
        config: { 
          chartType: 'line',
          timeRange: '12months',
          includeSeasonality: true
        },
        required: true
      },
      {
        id: 'resource-utilization',
        type: 'chart',
        title: 'Resource Utilization',
        config: { 
          chartType: 'pie',
          showPercentages: true,
          includeBreakdown: true
        },
        required: true
      },
      {
        id: 'recommendations',
        type: 'text',
        title: 'Data-Driven Recommendations',
        config: { 
          autoGenerate: true,
          includeActionItems: true,
          prioritizeRecommendations: true
        },
        required: true
      }
    ],
    styling: {
      colorScheme: 'professional',
      layout: 'two-column',
      branding: true,
      pageNumbers: true
    }
  },
  {
    id: 'team-summary',
    name: 'Team Performance Summary',
    description: 'Team-focused report with collaboration metrics',
    category: 'summary',
    preview: '/templates/team-preview.jpg',
    sections: [
      {
        id: 'team-header',
        type: 'header',
        title: 'Team Report Header',
        config: { 
          includeTeamPhoto: true,
          includeTeamStats: true
        },
        required: true
      },
      {
        id: 'collaboration-metrics',
        type: 'metrics',
        title: 'Collaboration Metrics',
        config: { 
          metrics: ['messagesExchanged', 'meetingsHeld', 'documentsShared'],
          layout: 'horizontal'
        },
        required: true
      },
      {
        id: 'individual-performance',
        type: 'table',
        title: 'Individual Performance',
        config: { 
          columns: ['member', 'tasksCompleted', 'hoursLogged', 'contributions'],
          includePhotos: true,
          showGrowth: true
        },
        required: true
      },
      {
        id: 'team-velocity',
        type: 'chart',
        title: 'Team Velocity',
        config: { 
          chartType: 'line',
          showSprints: true,
          includeTargets: true
        },
        required: true
      }
    ],
    styling: {
      colorScheme: 'modern',
      layout: 'grid',
      branding: false,
      pageNumbers: true
    }
  },
  {
    id: 'custom-builder',
    name: 'Custom Report Builder',
    description: 'Build your own report with drag-and-drop sections',
    category: 'custom',
    preview: '/templates/custom-preview.jpg',
    sections: [],
    styling: {
      colorScheme: 'minimal',
      layout: 'single-column',
      branding: false,
      pageNumbers: false
    }
  }
];

export function AdvancedPDFTemplates({ 
  onSelectTemplate, 
  onCustomizeTemplate,
  className 
}: AdvancedPDFTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = React.useState<PDFTemplate | null>(null);

  const filteredTemplates = predefinedTemplates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const getCategoryIcon = (category: PDFTemplate['category']) => {
    switch (category) {
      case 'executive': return <TrendingUp className="w-4 h-4" />;
      case 'detailed': return <BarChart3 className="w-4 h-4" />;
      case 'summary': return <PieChart className="w-4 h-4" />;
      case 'custom': return <Settings className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: PDFTemplate['category']) => {
    switch (category) {
      case 'executive': return 'bg-purple-500';
      case 'detailed': return 'bg-blue-500';
      case 'summary': return 'bg-green-500';
      case 'custom': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Advanced PDF Templates</h2>
            <p className="text-muted-foreground">
              Professional report templates with customizable layouts and styling
            </p>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="executive">Executive Reports</SelectItem>
              <SelectItem value="detailed">Detailed Analytics</SelectItem>
              <SelectItem value="summary">Summary Reports</SelectItem>
              <SelectItem value="custom">Custom Builder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getCategoryColor(template.category)}`}>
                      {getCategoryIcon(template.category)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Preview */}
                <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={template.preview} 
                    alt={`${template.name} preview`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder
                      (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,${btoa(`
                        <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
                          <rect width="100%" height="100%" fill="#f3f4f6"/>
                          <text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#6b7280">
                            ${template.name} Preview
                          </text>
                        </svg>
                      `)}`;
                    }}
                  />
                </div>

                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>

                {/* Template Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {template.sections.length} sections
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {template.styling.layout}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCustomizeTemplate(template)}
                  >
                    <Settings className="w-4 h-4 mr-1" />
                    Customize
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onSelectTemplate(template)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Use
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Template Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Dynamic Charts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Interactive charts that automatically update with your latest data, 
                including trend analysis and predictive insights.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Smart Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI-powered insights and recommendations based on your data patterns, 
                helping you make informed decisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                Scheduled Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatically generate and deliver reports on your preferred schedule, 
                keeping stakeholders informed without manual effort.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}