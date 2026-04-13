import { api } from '@/lib/fetch';

export interface PDFTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
}

export interface GeneratePDFRequest {
  templateId: string;
  title: string;
  projectId?: string;
  workspaceId?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  includeCharts?: boolean;
  includeDetails?: boolean;
  format?: 'pdf' | 'html';
  customSections?: {
    title: string;
    content: string;
    order: number;
  }[];
}

export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  progress: number;
}

export interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

export interface MilestoneData {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
}

export interface TeamPerformanceData {
  userId: string;
  name: string;
  tasksCompleted: number;
  totalTasks: number;
  efficiency: number;
  hoursWorked: number;
}

export interface PDFPreviewData {
  template: PDFTemplate;
  data: {
    project?: ProjectData;
    taskStats: TaskStats;
    milestones: MilestoneData[];
    teamPerformance: TeamPerformanceData[];
    metrics: {
      totalTasks: number;
      completedTasks: number;
      progressPercentage: number;
      velocity: number;
      completionRate: number;
      activeUsers: number;
    };
    charts: {
      taskDistribution: { name: string; value: number; color: string }[];
      weeklyProgress: { week: string; completed: number; created: number }[];
      teamProductivity: { name: string; completed: number; total: number; efficiency: number }[];
    };
  };
  estimatedPages: number;
  sections: string[];
}

export class PDFAPI {
  // Get available PDF templates
  static async getTemplates(): Promise<{ success: boolean; templates: PDFTemplate[] }> {
    const response = await api.get('/pdf/api/pdf/templates');
    return response.json();
  }

  // Generate PDF report
  static async generatePDF(data: GeneratePDFRequest): Promise<Blob> {
    const response = await api.post('/pdf/api/pdf/generate', data, {
      headers: {
        'Accept': 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  // Generate HTML preview
  static async generateHTML(data: GeneratePDFRequest): Promise<string> {
    const htmlData = { ...data, format: 'html' };
    const response = await api.post('/pdf/api/pdf/generate', htmlData, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`HTML generation failed: ${response.statusText}`);
    }

    return response.text();
  }

  // Get preview data for template
  static async getPreviewData(data: GeneratePDFRequest): Promise<{ success: boolean } & PDFPreviewData> {
    const response = await api.post('/pdf/api/pdf/preview', data);
    return response.json();
  }

  // Download PDF file
  static async downloadPDF(data: GeneratePDFRequest): Promise<void> {
    try {
      const blob = await this.generatePDF(data);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  // Predefined report configurations
  static getReportConfigurations() {
    return [
      {
        id: 'weekly-status',
        name: 'Weekly Status Report',
        templateId: 'executive-summary',
        title: 'Weekly Project Status Report',
        dateRange: {
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        includeCharts: true,
        includeDetails: false,
        description: 'High-level weekly progress summary for stakeholders'
      },
      {
        id: 'monthly-detailed',
        name: 'Monthly Detailed Report',
        templateId: 'detailed-analytics',
        title: 'Monthly Project Analytics Report',
        dateRange: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        includeCharts: true,
        includeDetails: true,
        description: 'Comprehensive monthly report with detailed analytics and insights'
      },
      {
        id: 'team-performance',
        name: 'Team Performance Review',
        templateId: 'team-performance',
        title: 'Team Performance Analysis',
        dateRange: {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        includeCharts: true,
        includeDetails: true,
        description: 'Detailed analysis of team productivity and individual contributions'
      },
      {
        id: 'project-status',
        name: 'Project Status Dashboard',
        templateId: 'project-status',
        title: 'Project Status Overview',
        includeCharts: true,
        includeDetails: false,
        description: 'Current project status with key milestones and timeline'
      },
      {
        id: 'quarterly-review',
        name: 'Quarterly Business Review',
        templateId: 'detailed-analytics',
        title: 'Quarterly Business Review',
        dateRange: {
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        },
        includeCharts: true,
        includeDetails: true,
        customSections: [
          {
            title: 'Executive Summary',
            content: 'Key achievements and strategic initiatives from the quarter',
            order: 1
          },
          {
            title: 'Strategic Goals',
            content: 'Progress towards quarterly objectives and KPIs',
            order: 2
          }
        ],
        description: 'Comprehensive quarterly review for executive leadership'
      }
    ];
  }

  // Get report configuration by ID
  static getReportConfiguration(configId: string) {
    return this.getReportConfigurations().find(config => config.id === configId);
  }

  // Generate report from configuration
  static async generateReportFromConfig(
    configId: string,
    overrides: Partial<GeneratePDFRequest> = {}
  ): Promise<Blob> {
    const config = this.getReportConfiguration(configId);
    if (!config) {
      throw new Error(`Report configuration ${configId} not found`);
    }

    const reportData: GeneratePDFRequest = {
      ...config,
      ...overrides
    };

    return this.generatePDF(reportData);
  }

  // Schedule automated report generation
  static async scheduleReport(config: {
    configId: string;
    schedule: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    projectId?: string;
    enabled: boolean;
  }): Promise<{ success: boolean; scheduleId: string }> {
    // This would integrate with the workflow system to create scheduled PDF generation
    const workflowData = {
      name: `Automated ${config.schedule} Report`,
      description: `Automatically generate and send ${config.schedule} reports`,
      isActive: config.enabled,
      triggers: [
        {
          type: 'schedule' as const,
          schedule: this.getScheduleCron(config.schedule),
          conditions: { projectId: config.projectId }
        }
      ],
      actions: [
        {
          type: 'webhook' as const,
          parameters: {
            url: '/pdf/api/pdf/generate',
            method: 'POST',
            payload: {
              ...this.getReportConfiguration(config.configId),
              projectId: config.projectId
            }
          }
        },
        {
          type: 'send_email' as const,
          parameters: {
            recipients: config.recipients,
            subject: `Automated ${config.schedule} Report - {{date}}`,
            body: 'Please find attached your automated project report.',
            attachments: ['{{workflow.pdfResult}}']
          }
        }
      ]
    };

    // This would use the WorkflowAPI to create the scheduled workflow
    // For now, return a mock response
    return {
      success: true,
      scheduleId: `schedule-${Date.now()}`
    };
  }

  private static getScheduleCron(schedule: string): string {
    switch (schedule) {
      case 'daily':
        return '0 9 * * *'; // 9 AM daily
      case 'weekly':
        return '0 9 * * 1'; // 9 AM every Monday
      case 'monthly':
        return '0 9 1 * *'; // 9 AM on the 1st of each month
      default:
        return '0 9 * * 1'; // Default to weekly
    }
  }
}

export default PDFAPI;