import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { RealPDFService } from '../services/real-pdf-service';
import { getDatabase } from "../../database/connection";
import { taskTableTable, projectTableTable, milestoneTableTable, userTableTable } from '../../database/schema';
import { eq, and, desc, count, avg, sum, sql } from 'drizzle-orm';
import logger from '../../utils/logger';

const app = new Hono();

// PDF Generation schemas
const GeneratePDFSchema = z.object({
  templateId: z.string(),
  title: z.string().min(1).max(255),
  projectTableId: z.string().optional(),
  workspaceId: z.string().optional(),
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).optional(),
  includeCharts: z.boolean().default(true),
  includeDetails: z.boolean().default(true),
  format: z.enum(['pdf', 'html']).default('pdf'),
  customSections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    order: z.number()
  })).optional()
});

// Template definitions
const templates = {
  'executive-summary': {
    name: 'Executive Summary Report',
    description: 'High-level overview with key metrics and insights',
    sections: ['overview', 'metrics', 'progress', 'risks', 'recommendations']
  },
  'detailed-analytics': {
    name: 'Detailed Analytics Report',
    description: 'Comprehensive analysis with charts and detailed breakdowns',
    sections: ['overview', 'metrics', 'charts', 'timeline', 'team-performance', 'detailed-taskTables']
  },
  'team-performance': {
    name: 'Team Performance Report',
    description: 'Focus on team productivity and individual contributions',
    sections: ['team-overview', 'individual-performance', 'productivity-metrics', 'collaboration']
  },
  'projectTable-status': {
    name: 'Project Status Report',
    description: 'Current projectTable status with timeline and milestoneTables',
    sections: ['projectTable-info', 'timeline', 'milestoneTables', 'taskTables', 'issues']
  }
};

// Generate PDF report
app.post('/generate', zValidator('json', GeneratePDFSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const userTableId = c.get('userTable')?.id;

    if (!userTableId) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }

    // Get template configuration
    const template = templates[data.templateId];
    if (!template) {
      throw new HTTPException(400, { message: 'Invalid template ID' });
    }

    // Collect real data from database
    const [projectTableData, taskTableStats, milestoneTables, teamPerformance, chartData] = await Promise.all([
      RealPDFService.collectProjectData(data.projectTableId, data.workspaceId),
      RealPDFService.collectTaskStats(data.projectTableId),
      RealPDFService.collectMilestoneData(data.projectTableId),
      RealPDFService.collectTeamPerformanceData(data.projectTableId),
      RealPDFService.generateChartData(data.projectTableId)
    ]);

    const reportData = {
      title: data.title,
      projectTable: projectTableData,
      taskTableStats,
      milestoneTables,
      teamPerformance,
      charts: chartData,
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: userTableId,
        templateId: data.templateId
      }
    };

    if (data.format === 'html') {
      // Generate HTML preview (will implement this)
      return c.html('<h1>HTML Preview not yet implemented</h1>');
    }

    // Generate actual PDF using Puppeteer
    const pdfBuffer = await RealPDFService.generateRealPDF(data.templateId, reportData);

    // Set headers for PDF download
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`);

    return c.body(pdfBuffer);

  } catch (error) {
    logger.error('Error generating PDF:', error);
    throw new HTTPException(500, { message: 'Failed to generate PDF' });
  }
});

// Get available templates
app.get('/templates', async (c) => {
  const templateList = Object.entries(templates).map(([id, template]) => ({
    id,
    ...template
  }));

  return c.json({
    success: true,
    templates: templateList
  });
});

// Preview template data
app.post('/preview', zValidator('json', GeneratePDFSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const userTableId = c.get('userTable')?.id;

    if (!userTableId) {
      throw new HTTPException(401, { message: 'Unauthorized' });
    }

    // Get template configuration
    const template = templates[data.templateId];
    if (!template) {
      throw new HTTPException(400, { message: 'Invalid template ID' });
    }

    // Collect preview data
    const reportData = await collectReportData(data, userTableId);

    return c.json({
      success: true,
      template,
      data: reportData,
      estimatedPages: estimatePageCount(template, reportData),
      sections: template.sections
    });

  } catch (error) {
    logger.error('Error generating preview:', error);
    throw new HTTPException(500, { message: 'Failed to generate preview' });
  }
});

// Data collection function
async function collectReportData(params: any, userTableId: string) {
  const db = getDatabase();
  const { projectTableId, workspaceId, dateRange } = params;
  
  // Base filters
  const filters = [];
  if (projectTableId) filters.push(eq(taskTable.projectTableId, projectTableId));
  if (dateRange) {
    filters.push(
      and(
        new Date(taskTable.createdAt) >= new Date(dateRange.startDate),
        new Date(taskTable.createdAt) <= new Date(dateRange.endDate)
      )
    );
  }

  // Collect projectTable data
  let projectTableData = null;
  if (projectTableId) {
    projectTableData = await db.query.projectTable.findFirst({
      where: eq(projectTable.id, projectTableId),
      with: {
        taskTables: true,
        milestoneTables: true
      }
    });
  }

  // Collect taskTable statistics
  const taskTableStats = await db
    .select({
      total: count(),
      completed: count(taskTable.status === 'completed' ? 1 : null),
      inProgress: count(taskTable.status === 'in_progress' ? 1 : null),
      todo: count(taskTable.status === 'todo' ? 1 : null)
    })
    .from(taskTable)
    .where(filters.length > 0 ? and(...filters) : undefined);

  // Collect milestoneTable data
  const milestoneTableData = await db.query.milestoneTable.findMany({
    where: projectTableId ? eq(milestoneTable.projectTableId, projectTableId) : undefined,
    orderBy: [desc(milestoneTable.dueDate)]
  });

  // Collect team performance data
  const teamPerformance = await db
    .select({
      assigneeId: taskTable.assigneeId,
      totalTasks: count(),
      completedTasks: count(taskTable.status === 'completed' ? 1 : null),
      avgProgress: avg(taskTable.progress)
    })
    .from(taskTable)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .groupBy(taskTable.assigneeId);

  // Get userTable details for team performance
  const userTableIds = teamPerformance.map(tp => tp.assigneeId).filter(Boolean);
  const userTables = userTableIds.length > 0 ? await db.query.userTable.findMany({
    where: userTableIds.length === 1 ? eq(userTable.id, userTableIds[0]) : undefined // Simplified for single userTable
  }) : [];

  // Calculate progress metrics
  const totalTasks = taskTableStats[0]?.total || 0;
  const completedTasks = taskTableStats[0]?.completed || 0;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Calculate velocity (taskTables completed per week)
  const weeksInRange = dateRange ? 
    Math.ceil((new Date(dateRange.endDate).getTime() - new Date(dateRange.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000)) : 
    4; // Default 4 weeks
  const velocity = completedTasks / weeksInRange;

  return {
    projectTable: projectTableData,
    taskTableStats: taskTableStats[0],
    milestoneTables: milestoneTableData,
    teamPerformance: teamPerformance.map(tp => ({
      ...tp,
      userTable: userTables.find(u => u.id === tp.assigneeId)
    })),
    metrics: {
      totalTasks,
      completedTasks,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      velocity: Math.round(velocity * 100) / 100,
      completionRate: progressPercentage,
      activeUsers: teamPerformance.length
    },
    charts: {
      taskTableDistribution: [
        { name: 'Completed', value: taskTableStats[0]?.completed || 0, color: '#10B981' },
        { name: 'In Progress', value: taskTableStats[0]?.inProgress || 0, color: '#F59E0B' },
        { name: 'Todo', value: taskTableStats[0]?.todo || 0, color: '#6B7280' }
      ],
      weeklyProgress: await generateWeeklyProgressData(dateRange, projectTableId),
      teamProductivity: teamPerformance.map(tp => ({
        name: tp.userTable?.name || 'User',
        completed: tp.completedTasks,
        total: tp.totalTasks,
        efficiency: tp.totalTasks > 0 ? Math.round((tp.completedTasks / tp.totalTasks) * 100) : 0
      }))
    }
  };
}

// Generate HTML content
async function generateHTMLContent(template: any, params: any, data: any) {
  const { title, includeCharts, includeDetails } = params;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #333; }
        .header { text-align: center; border-bottom: 2px solid #7C3AED; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #7C3AED; margin: 0; font-size: 28px; }
        .header .subtitle { color: #6B7280; margin-top: 5px; }
        .section { margin-bottom: 30px; page-break-inside: avoid; }
        .section h2 { color: #1F2937; border-left: 4px solid #7C3AED; padding-left: 15px; margin-bottom: 15px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric-card { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #7C3AED; margin-bottom: 5px; }
        .metric-label { font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .chart-placeholder { background: #F3F4F6; border: 1px dashed #D1D5DB; border-radius: 8px; padding: 40px; text-align: center; color: #6B7280; margin: 15px 0; }
        .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .table th, .table td { border: 1px solid #E5E7EB; padding: 10px; text-align: left; }
        .table th { background: #F9FAFB; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
        .status-completed { background: #D1FAE5; color: #065F46; }
        .status-in-progress { background: #FEF3C7; color: #92400E; }
        .status-todo { background: #F3F4F6; color: #374151; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 12px; }
        @media print { body { margin: 0; } .section { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString()} • ${template.name}</div>
      </div>
  `;

  // Add sections based on template
  for (const sectionId of template.sections) {
    html += generateSection(sectionId, data, includeCharts, includeDetails);
  }

  html += `
      <div class="footer">
        <p>Generated by Meridian Project Management Platform</p>
        <p>This report contains confidential information and is intended for authorized personnel only.</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

// Generate individual sections
function generateSection(sectionId: string, data: any, includeCharts: boolean, includeDetails: boolean) {
  switch (sectionId) {
    case 'overview':
      return `
        <div class="section">
          <h2>Project Overview</h2>
          ${data.projectTable ? `
            <p><strong>Project:</strong> ${data.projectTable.name}</p>
            <p><strong>Description:</strong> ${data.projectTable.description || 'No description provided'}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${data.projectTable.status}">${data.projectTable.status}</span></p>
          ` : '<p>Workspace-wide report covering all projectTables</p>'}
        </div>
      `;
    
    case 'metrics':
      return `
        <div class="section">
          <h2>Key Metrics</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${data.metrics.totalTasks}</div>
              <div class="metric-label">Total Tasks</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.metrics.completedTasks}</div>
              <div class="metric-label">Completed</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.metrics.progressPercentage}%</div>
              <div class="metric-label">Progress</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.metrics.velocity}</div>
              <div class="metric-label">Tasks/Week</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.metrics.activeUsers}</div>
              <div class="metric-label">Active Users</div>
            </div>
          </div>
        </div>
      `;
    
    case 'charts':
      if (!includeCharts) return '';
      return `
        <div class="section">
          <h2>Visual Analytics</h2>
          <div class="chart-placeholder">
            <p>📊 Task Distribution Chart</p>
            <p>Completed: ${data.charts.taskTableDistribution.find(d => d.name === 'Completed')?.value || 0} | 
               In Progress: ${data.charts.taskTableDistribution.find(d => d.name === 'In Progress')?.value || 0} | 
               Todo: ${data.charts.taskTableDistribution.find(d => d.name === 'Todo')?.value || 0}</p>
          </div>
          <div class="chart-placeholder">
            <p>📈 Weekly Progress Trend</p>
            <p>Velocity: ${data.metrics.velocity} taskTables per week</p>
          </div>
        </div>
      `;
    
    case 'team-performance':
      return `
        <div class="section">
          <h2>Team Performance</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Tasks Assigned</th>
                <th>Tasks Completed</th>
                <th>Completion Rate</th>
              </tr>
            </thead>
            <tbody>
              ${data.teamPerformance.map(member => `
                <tr>
                  <td>${member.userTable?.name || 'Unknown User'}</td>
                  <td>${member.totalTasks}</td>
                  <td>${member.completedTasks}</td>
                  <td>${member.totalTasks > 0 ? Math.round((member.completedTasks / member.totalTasks) * 100) : 0}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    
    case 'milestoneTables':
      return `
        <div class="section">
          <h2>Milestones</h2>
          ${data.milestoneTables.length > 0 ? `
            <table class="table">
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${data.milestoneTables.map(milestoneTable => `
                  <tr>
                    <td>${milestoneTable.title}</td>
                    <td>${milestoneTable.dueDate ? new Date(milestoneTable.dueDate).toLocaleDateString() : 'No due date'}</td>
                    <td><span class="status-badge status-${milestoneTable.status}">${milestoneTable.status}</span></td>
                    <td>${milestoneTable.progress || 0}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : '<p>No milestoneTables found for the selected criteria.</p>'}
        </div>
      `;
    
    default:
      return `<div class="section"><h2>${sectionId.replace('-', ' ').toUpperCase()}</h2><p>Section content for ${sectionId}</p></div>`;
  }
}

// Generate weekly progress data (mock)
async function generateWeeklyProgressData(dateRange: any, projectId?: string) {
  const db = getDatabase();
  const weeks = [];
  const endDate = dateRange ? new Date(dateRange.endDate) : new Date();
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(endDate);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    // Query tasks created in this week
    const createdQuery = db
      .select({ count: count() })
      .from(taskTableTable)
      .where(
        and(
          projectId ? eq(taskTableTable.projectTableId, projectId) : undefined,
          and(
            sql`${taskTableTable.createdAt} >= ${weekStart}`,
            sql`${taskTableTable.createdAt} < ${weekEnd}`
          )
        )
      );
    
    // Query tasks completed in this week
    const completedQuery = db
      .select({ count: count() })
      .from(taskTableTable)
      .where(
        and(
          projectId ? eq(taskTableTable.projectTableId, projectId) : undefined,
          eq(taskTableTable.status, 'done'),
          and(
            sql`${taskTableTable.completedAt} >= ${weekStart}`,
            sql`${taskTableTable.completedAt} < ${weekEnd}`
          )
        )
      );
    
    const [createdResult, completedResult] = await Promise.all([createdQuery, completedQuery]);
    
    weeks.push({
      week: `Week ${4 - i}`,
      completed: completedResult[0]?.count || 0,
      created: createdResult[0]?.count || 0
    });
  }
  
  return weeks;
}

// Estimate page count
function estimatePageCount(template: any, data: any) {
  let pages = 1; // Header page
  
  // Estimate based on sections and data volume
  if (template.sections.includes('charts')) pages += 1;
  if (template.sections.includes('team-performance') && data.teamPerformance.length > 10) pages += 1;
  if (template.sections.includes('detailed-taskTables') && data.taskTableStats.total > 50) pages += 2;
  if (data.milestoneTables && data.milestoneTables.length > 20) pages += 1;
  
  return Math.max(pages, 2); // Minimum 2 pages
}

// Mock PDF generation (in production, use puppeteer or similar)
async function generatePDFFromHTML(html: string): Promise<ArrayBuffer> {
  // This is a mock implementation
  // In production, you would use:
  // - Puppeteer: const pdf = await page.pdf({ format: 'A4' });
  // - jsPDF: const doc = new jsPDF(); doc.html(html);
  // - Headless Chrome API
  
  const mockPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
72 720 Td
(Mock PDF - ${new Date().toISOString()}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000207 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
301
%%EOF`;

  return new TextEncoder().encode(mockPdfContent);
}

export default app;

