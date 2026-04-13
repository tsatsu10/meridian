import { lazyLoaders } from '../../utils/lazy-loader';
import { eq, desc, count, sql } from 'drizzle-orm';
import { getDatabase } from "../../database/connection";
import { taskTable, 
  projectTable, 
  userTable, 
  milestoneTable,
  activityTable,
  teamTable } from "../../database/schema";
import logger from '../../utils/logger';
import * as ss from 'simple-statistics';

export interface RealProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate: string;
  endDate?: string;
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  teamSize: number;
  milestonesTotal: number;
  milestonesCompleted: number;
}

export interface RealTaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
  avgCompletionTime: number; // in hours
}

export interface RealMilestoneData {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress: number;
  tasksAssociated: number;
  daysRemaining: number;
}

export interface RealTeamPerformanceData {
  userId: string;
  name: string;
  email: string;
  tasksCompleted: number;
  totalTasks: number;
  efficiency: number;
  hoursWorked: number;
  avgTaskCompletionTime: number;
  lastActivity: string;
}

export interface RealChartData {
  taskDistribution: { name: string; value: number; color: string }[];
  weeklyProgress: { week: string; completed: number; created: number; efficiency: number }[];
  teamProductivity: { name: string; completed: number; total: number; efficiency: number; hoursWorked: number }[];
  priorityBreakdown: { priority: string; count: number; percentage: number }[];
  statusTimeline: { date: string; completed: number; created: number; velocity: number }[];
}

export class RealPDFService {
  
  // Collect real project data from database
  static async collectProjectData(projectId?: string, workspaceId?: string): Promise<RealProjectData> {
    const db = getDatabase();
    if (!projectId) {
      // Return workspace-level summary
      const projects = await db.select({
        id: projectTable.id,
        name: projectTable.name,
        status: projectTable.status,
        createdAt: projectTable.createdAt
      })
      .from(projectTable)
      .where(workspaceId ? eq(projectTable.workspaceId, workspaceId) : sql`1=1`)
      .limit(100);

      const totalTasks = await db.select({ count: count() })
        .from(taskTable)
        .where(workspaceId ? sql`project_id IN (SELECT id FROM project WHERE workspace_id = ${workspaceId})` : sql`1=1`)
        .then(result => result[0]?.count || 0);

      const completedTasks = await db.select({ count: count() })
        .from(taskTable)
        .where(workspaceId 
          ? sql`project_id IN (SELECT id FROM project WHERE workspace_id = ${workspaceId}) AND status = 'done'`
          : eq(taskTable.status, 'done'))
        .then(result => result[0]?.count || 0);

      return {
        id: workspaceId || 'workspace',
        name: `Workspace Summary (${projects.length} projects)`,
        description: `Aggregate data from ${projects.length} active projects`,
        status: 'active',
        startDate: new Date().toISOString(),
        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        tasksTotal: totalTasks,
        tasksCompleted: completedTasks,
        teamSize: 0, // Will be calculated separately
        milestonesTotal: 0,
        milestonesCompleted: 0
      };
    }

    // Get specific project data
    const project = await db.select()
      .from(projectTable)
      .where(eq(projectTable.id, projectId))
      .limit(1)
      .then(result => result[0]);

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get task statistics
    const taskStats = await this.collectTaskStats(projectId);
    
    // Get milestone statistics
    const milestones = await db.select()
      .from(milestoneTable)
      .where(eq(milestoneTable.projectId, projectId));

    const milestonesCompleted = milestones.filter(m => m.status === 'completed').length;

    // Get team size
    const teamMembers = await db.select({ userId: taskTable.assigneeId })
      .from(taskTable)
      .where(eq(taskTable.projectId, projectId))
      .then(results => new Set(results.map(r => r.userId).filter(Boolean)).size);

    return {
      id: project.id,
      name: project.name,
      description: project.description || undefined,
      status: project.status || 'active',
      startDate: project.createdAt,
      endDate: project.endDate || undefined,
      progress: Math.round(project.progress || 0),
      tasksTotal: taskStats.total,
      tasksCompleted: taskStats.completed,
      teamSize: teamMembers,
      milestonesTotal: milestones.length,
      milestonesCompleted
    };
  }

  // Collect real task statistics
  static async collectTaskStats(projectId?: string): Promise<RealTaskStats> {
    const db = getDatabase();
    const tasks = await db.select({
      id: taskTable.id,
      status: taskTable.status,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt,
      dueDate: taskTable.dueDate
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .limit(1000);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const pending = tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;
    
    // Calculate overdue tasks
    const now = new Date();
    const overdue = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'done'
    ).length;

    // Calculate average completion time for completed tasks
    const completedTasks = tasks.filter(t => t.status === 'done');
    const completionTimes = completedTasks.map(t => {
      const created = new Date(t.createdAt);
      const updated = new Date(t.updatedAt);
      return (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
    });

    const avgCompletionTime = completionTimes.length > 0 
      ? ss.mean(completionTimes) 
      : 0;

    return {
      total,
      completed,
      inProgress,
      pending,
      overdue,
      completionRate: total > 0 ? completed / total : 0,
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10
    };
  }

  // Collect real milestone data
  static async collectMilestoneData(projectId?: string): Promise<RealMilestoneData[]> {
    const db = getDatabase();
    const milestones = await db.select()
      .from(milestoneTable)
      .where(projectId ? eq(milestoneTable.projectId, projectId) : sql`1=1`)
      .orderBy(desc(milestoneTable.dueDate))
      .limit(20);

    const now = new Date();

    return Promise.all(milestones.map(async (milestone) => {
      // Get associated tasks count
      const tasksAssociated = await db.select({ count: count() })
        .from(taskTable)
        .where(eq(taskTable.milestoneId, milestone.id))
        .then(result => result[0]?.count || 0);

      const dueDate = new Date(milestone.dueDate);
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine status based on due date and progress
      let status: 'pending' | 'in_progress' | 'completed' | 'overdue' = 'pending';
      if (milestone.status === 'completed') {
        status = 'completed';
      } else if (daysRemaining < 0) {
        status = 'overdue';
      } else if (milestone.progress > 0) {
        status = 'in_progress';
      }

      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description || undefined,
        dueDate: milestone.dueDate,
        status,
        progress: Math.round(milestone.progress || 0),
        tasksAssociated,
        daysRemaining
      };
    }));
  }

  // Collect real team performance data
  static async collectTeamPerformanceData(projectId?: string): Promise<RealTeamPerformanceData[]> {
    const db = getDatabase();
    // Get all users who have tasks in the project
    const userTasks = await db.select({
      userId: taskTable.assigneeId,
      taskId: taskTable.id,
      status: taskTable.status,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .limit(1000);

    // Group by user
    const userMap = new Map<string, typeof userTasks>();
    userTasks.forEach(task => {
      if (task.userId) {
        if (!userMap.has(task.userId)) {
          userMap.set(task.userId, []);
        }
        userMap.get(task.userId)!.push(task);
      }
    });

    // Get user details
    const userIds = Array.from(userMap.keys());
    const users = await db.select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email
    })
    .from(userTable)
    .where(sql`id IN (${userIds.map(id => `'${id}'`).join(',')})`)
    .limit(50);

    // Calculate performance metrics for each user
    return users.map(user => {
      const tasks = userMap.get(user.id) || [];
      const completedTasks = tasks.filter(t => t.status === 'done');
      const totalTasks = tasks.length;

      // Calculate completion times
      const completionTimes = completedTasks.map(t => {
        const created = new Date(t.createdAt);
        const updated = new Date(t.updatedAt);
        return (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // hours
      });

      const avgTaskCompletionTime = completionTimes.length > 0 
        ? ss.mean(completionTimes) 
        : 0;

      const hoursWorked = completionTimes.reduce((sum, time) => sum + time, 0);
      const efficiency = totalTasks > 0 ? completedTasks.length / totalTasks : 0;

      // Get last activity
      const lastActivity = tasks.length > 0 
        ? ss.max(tasks.map(t => new Date(t.updatedAt).getTime()))
        : new Date().getTime();

      return {
        userId: user.id,
        name: user.name || 'Unknown User',
        email: user.email,
        tasksCompleted: completedTasks.length,
        totalTasks,
        efficiency: Math.round(efficiency * 1000) / 10, // Percentage with 1 decimal
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        avgTaskCompletionTime: Math.round(avgTaskCompletionTime * 10) / 10,
        lastActivity: new Date(lastActivity).toISOString()
      };
    }).sort((a, b) => b.tasksCompleted - a.tasksCompleted); // Sort by tasks completed
  }

  // Generate real chart data
  static async generateChartData(projectId?: string): Promise<RealChartData> {
    const db = getDatabase();
    const taskStats = await this.collectTaskStats(projectId);
    
    // Task distribution chart
    const taskDistribution = [
      { name: 'Completed', value: taskStats.completed, color: '#22c55e' },
      { name: 'In Progress', value: taskStats.inProgress, color: '#3b82f6' },
      { name: 'Pending', value: taskStats.pending, color: '#f59e0b' },
      { name: 'Overdue', value: taskStats.overdue, color: '#ef4444' }
    ].filter(item => item.value > 0);

    // Weekly progress data
    const tasks = await db.select({
      status: taskTable.status,
      createdAt: taskTable.createdAt,
      updatedAt: taskTable.updatedAt
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .orderBy(desc(taskTable.createdAt))
    .limit(500);

    const weeklyProgress = this.calculateWeeklyProgress(tasks);

    // Team productivity data
    const teamPerformance = await this.collectTeamPerformanceData(projectId);
    const teamProductivity = teamPerformance.slice(0, 10).map(member => ({
      name: member.name,
      completed: member.tasksCompleted,
      total: member.totalTasks,
      efficiency: member.efficiency,
      hoursWorked: member.hoursWorked
    }));

    // Priority breakdown
    const tasksWithPriority = await db.select({
      priority: taskTable.priority
    })
    .from(taskTable)
    .where(projectId ? eq(taskTable.projectId, projectId) : sql`1=1`)
    .limit(1000);

    const priorityCount = {
      high: tasksWithPriority.filter(t => t.priority === 'high').length,
      medium: tasksWithPriority.filter(t => t.priority === 'medium').length,
      low: tasksWithPriority.filter(t => t.priority === 'low').length
    };

    const totalPriorityTasks = priorityCount.high + priorityCount.medium + priorityCount.low;
    const priorityBreakdown = [
      { 
        priority: 'High', 
        count: priorityCount.high, 
        percentage: totalPriorityTasks > 0 ? Math.round((priorityCount.high / totalPriorityTasks) * 100) : 0 
      },
      { 
        priority: 'Medium', 
        count: priorityCount.medium, 
        percentage: totalPriorityTasks > 0 ? Math.round((priorityCount.medium / totalPriorityTasks) * 100) : 0 
      },
      { 
        priority: 'Low', 
        count: priorityCount.low, 
        percentage: totalPriorityTasks > 0 ? Math.round((priorityCount.low / totalPriorityTasks) * 100) : 0 
      }
    ];

    // Status timeline (daily activity over last 30 days)
    const statusTimeline = this.calculateStatusTimeline(tasks);

    return {
      taskDistribution,
      weeklyProgress,
      teamProductivity,
      priorityBreakdown,
      statusTimeline
    };
  }

  // Generate actual PDF using Puppeteer
  static async generateRealPDF(templateId: string, data: any): Promise<Buffer> {
    let browser;
    
    try {
      // Launch Puppeteer browser
      const puppeteer = await lazyLoaders.puppeteer();
      browser = await puppeteer.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ]
      });

      const page = await browser.newPage();
      
      // Set page format
      await page.setViewport({ width: 1200, height: 800 });
      
      // Generate HTML content based on template
      const htmlContent = await this.generateHTMLTemplate(templateId, data);
      
      // Set HTML content
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '0.5in',
          bottom: '1in',
          left: '0.5in'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; padding: 5px; color: #666; width: 100%; text-align: center;">
            ${data.title || 'Project Report'} - Generated on ${new Date().toLocaleDateString()}
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; padding: 5px; color: #666; width: 100%; text-align: center;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      });

      return pdfBuffer;

    } catch (error) {
      logger.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  // Generate HTML template with real data
  private static async generateHTMLTemplate(templateId: string, data: any): Promise<string> {
    const styles = `
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.6; 
          color: #333; 
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #3b82f6; 
          padding-bottom: 20px; 
        }
        .title { 
          font-size: 28px; 
          font-weight: bold; 
          color: #1e40af; 
          margin-bottom: 10px; 
        }
        .subtitle { 
          font-size: 16px; 
          color: #666; 
        }
        .section { 
          margin: 30px 0; 
          page-break-inside: avoid; 
        }
        .section-title { 
          font-size: 20px; 
          font-weight: bold; 
          color: #1e40af; 
          margin-bottom: 15px; 
          border-left: 4px solid #3b82f6; 
          padding-left: 15px; 
        }
        .metrics-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 20px; 
          margin: 20px 0; 
        }
        .metric-card { 
          background: #f8fafc; 
          border: 1px solid #e5e7eb; 
          border-radius: 8px; 
          padding: 20px; 
          text-align: center; 
        }
        .metric-value { 
          font-size: 32px; 
          font-weight: bold; 
          color: #1e40af; 
          margin-bottom: 5px; 
        }
        .metric-label { 
          font-size: 14px; 
          color: #666; 
          font-weight: 500; 
        }
        .chart-placeholder { 
          background: #f1f5f9; 
          border: 2px dashed #cbd5e1; 
          border-radius: 8px; 
          height: 200px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: #64748b; 
          margin: 20px 0; 
        }
        .data-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0; 
        }
        .data-table th, .data-table td { 
          border: 1px solid #e5e7eb; 
          padding: 12px; 
          text-align: left; 
        }
        .data-table th { 
          background-color: #f8fafc; 
          font-weight: 600; 
          color: #374151; 
        }
        .data-table tr:nth-child(even) { 
          background-color: #f9fafb; 
        }
        .progress-bar { 
          background: #e5e7eb; 
          border-radius: 10px; 
          height: 8px; 
          overflow: hidden; 
          margin: 5px 0; 
        }
        .progress-fill { 
          background: #22c55e; 
          height: 100%; 
          transition: width 0.3s ease; 
        }
        .status-badge { 
          padding: 4px 8px; 
          border-radius: 4px; 
          font-size: 12px; 
          font-weight: 500; 
        }
        .status-completed { background: #dcfce7; color: #166534; }
        .status-in-progress { background: #dbeafe; color: #1e40af; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-overdue { background: #fee2e2; color: #dc2626; }
        .footer { 
          margin-top: 50px; 
          padding-top: 20px; 
          border-top: 1px solid #e5e7eb; 
          font-size: 12px; 
          color: #666; 
          text-align: center; 
        }
      </style>
    `;

    switch (templateId) {
      case 'executive-summary':
        return this.generateExecutiveSummaryHTML(data, styles);
      case 'detailed-analytics':
        return this.generateDetailedAnalyticsHTML(data, styles);
      case 'team-performance':
        return this.generateTeamPerformanceHTML(data, styles);
      case 'project-status':
        return this.generateProjectStatusHTML(data, styles);
      default:
        return this.generateDefaultHTML(data, styles);
    }
  }

  private static generateExecutiveSummaryHTML(data: any, styles: string): string {
    const project = data.project || {};
    const taskStats = data.taskStats || {};
    const milestones = data.milestones || [];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'Executive Summary'}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <div class="title">${data.title || 'Executive Summary'}</div>
          <div class="subtitle">Project: ${project.name || 'Unknown Project'}</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">Project Overview</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${project.progress || 0}%</div>
              <div class="metric-label">Overall Progress</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${taskStats.completed || 0}</div>
              <div class="metric-label">Tasks Completed</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${project.teamSize || 0}</div>
              <div class="metric-label">Team Members</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${milestones.length || 0}</div>
              <div class="metric-label">Milestones</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Key Metrics</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Task Completion Rate</td>
                <td>${Math.round((taskStats.completionRate || 0) * 100)}%</td>
                <td><span class="status-badge ${(taskStats.completionRate || 0) > 0.8 ? 'status-completed' : 'status-in-progress'}">${(taskStats.completionRate || 0) > 0.8 ? 'On Track' : 'Needs Attention'}</span></td>
              </tr>
              <tr>
                <td>Average Completion Time</td>
                <td>${taskStats.avgCompletionTime || 0} hours</td>
                <td><span class="status-badge status-completed">Normal</span></td>
              </tr>
              <tr>
                <td>Overdue Tasks</td>
                <td>${taskStats.overdue || 0}</td>
                <td><span class="status-badge ${(taskStats.overdue || 0) === 0 ? 'status-completed' : 'status-overdue'}">${(taskStats.overdue || 0) === 0 ? 'Good' : 'Action Needed'}</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Milestone Progress</div>
          ${milestones.slice(0, 5).map((milestone: any) => `
            <div style="margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong>${milestone.title}</strong>
                <span class="status-badge status-${milestone.status}">${milestone.status}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${milestone.progress}%"></div>
              </div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">
                Due: ${new Date(milestone.dueDate).toLocaleDateString()} | ${milestone.daysRemaining} days remaining
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          Generated by Meridian Project Management System
        </div>
      </body>
      </html>
    `;
  }

  private static generateDetailedAnalyticsHTML(data: any, styles: string): string {
    const chartData = data.charts || {};
    const teamPerformance = data.teamPerformance || [];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'Detailed Analytics Report'}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <div class="title">${data.title || 'Detailed Analytics Report'}</div>
          <div class="subtitle">Comprehensive Project Analysis</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">Task Distribution Analysis</div>
          <div class="chart-placeholder">
            Task Distribution Chart
            ${chartData.taskDistribution ? chartData.taskDistribution.map((item: any) => 
              `<div>${item.name}: ${item.value}</div>`
            ).join(' | ') : 'No data available'}
          </div>
        </div>

        <div class="section">
          <div class="section-title">Team Performance Analysis</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Tasks Completed</th>
                <th>Efficiency</th>
                <th>Hours Worked</th>
                <th>Avg. Completion Time</th>
              </tr>
            </thead>
            <tbody>
              ${teamPerformance.slice(0, 10).map((member: any) => `
                <tr>
                  <td>${member.name}</td>
                  <td>${member.tasksCompleted}</td>
                  <td>${member.efficiency}%</td>
                  <td>${member.hoursWorked}h</td>
                  <td>${member.avgTaskCompletionTime}h</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Priority Analysis</div>
          ${chartData.priorityBreakdown ? chartData.priorityBreakdown.map((item: any) => `
            <div style="margin: 10px 0;">
              <div style="display: flex; justify-content: space-between;">
                <span>${item.priority} Priority</span>
                <span>${item.count} tasks (${item.percentage}%)</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${item.percentage}%"></div>
              </div>
            </div>
          `).join('') : 'No priority data available'}
        </div>

        <div class="footer">
          Generated by Meridian Project Management System - Advanced Analytics
        </div>
      </body>
      </html>
    `;
  }

  private static generateTeamPerformanceHTML(data: any, styles: string): string {
    const teamPerformance = data.teamPerformance || [];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'Team Performance Report'}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <div class="title">${data.title || 'Team Performance Report'}</div>
          <div class="subtitle">Individual and Team Analytics</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">Team Performance Overview</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${teamPerformance.length}</div>
              <div class="metric-label">Active Team Members</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${teamPerformance.reduce((sum: number, m: any) => sum + m.tasksCompleted, 0)}</div>
              <div class="metric-label">Total Tasks Completed</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.round(teamPerformance.reduce((sum: number, m: any) => sum + m.efficiency, 0) / teamPerformance.length) || 0}%</div>
              <div class="metric-label">Average Team Efficiency</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.round(teamPerformance.reduce((sum: number, m: any) => sum + m.hoursWorked, 0))}</div>
              <div class="metric-label">Total Hours Worked</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Individual Performance Details</div>
          ${teamPerformance.map((member: any, index: number) => `
            <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; page-break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                  <h3 style="margin: 0; color: #1e40af;">${member.name}</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 14px;">${member.email}</p>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 24px; font-weight: bold; color: #22c55e;">${member.efficiency}%</div>
                  <div style="font-size: 12px; color: #666;">Efficiency</div>
                </div>
              </div>
              
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div>
                  <strong>Tasks Completed:</strong> ${member.tasksCompleted}
                </div>
                <div>
                  <strong>Total Tasks:</strong> ${member.totalTasks}
                </div>
                <div>
                  <strong>Hours Worked:</strong> ${member.hoursWorked}h
                </div>
                <div>
                  <strong>Avg. Completion:</strong> ${member.avgTaskCompletionTime}h
                </div>
              </div>
              
              <div style="margin-top: 10px;">
                <div style="font-size: 12px; color: #666;">Task Completion Progress</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${member.efficiency}%"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          Generated by Meridian Project Management System - Team Analytics
        </div>
      </body>
      </html>
    `;
  }

  private static generateProjectStatusHTML(data: any, styles: string): string {
    const project = data.project || {};
    const taskStats = data.taskStats || {};
    const milestones = data.milestones || [];
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'Project Status Report'}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <div class="title">${data.title || 'Project Status Report'}</div>
          <div class="subtitle">Current Project Health and Progress</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">Project Status Dashboard</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
              <h4>Project Information</h4>
              <table class="data-table">
                <tr><td><strong>Project Name</strong></td><td>${project.name || 'N/A'}</td></tr>
                <tr><td><strong>Status</strong></td><td><span class="status-badge status-${project.status || 'pending'}">${project.status || 'Unknown'}</span></td></tr>
                <tr><td><strong>Progress</strong></td><td>${project.progress || 0}%</td></tr>
                <tr><td><strong>Team Size</strong></td><td>${project.teamSize || 0} members</td></tr>
                <tr><td><strong>Start Date</strong></td><td>${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}</td></tr>
              </table>
            </div>
            
            <div>
              <h4>Task Summary</h4>
              <table class="data-table">
                <tr><td><strong>Total Tasks</strong></td><td>${taskStats.total || 0}</td></tr>
                <tr><td><strong>Completed</strong></td><td style="color: #22c55e;">${taskStats.completed || 0}</td></tr>
                <tr><td><strong>In Progress</strong></td><td style="color: #3b82f6;">${taskStats.inProgress || 0}</td></tr>
                <tr><td><strong>Pending</strong></td><td style="color: #f59e0b;">${taskStats.pending || 0}</td></tr>
                <tr><td><strong>Overdue</strong></td><td style="color: #ef4444;">${taskStats.overdue || 0}</td></tr>
              </table>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Milestone Timeline</div>
          ${milestones.length > 0 ? milestones.map((milestone: any) => `
            <div style="margin: 15px 0; padding: 15px; border-left: 4px solid ${
              milestone.status === 'completed' ? '#22c55e' :
              milestone.status === 'overdue' ? '#ef4444' :
              milestone.status === 'in_progress' ? '#3b82f6' : '#f59e0b'
            }; background: #f8fafc;">
              <div style="display: flex; justify-content: between; align-items: start;">
                <div style="flex: 1;">
                  <h4 style="margin: 0 0 5px 0;">${milestone.title}</h4>
                  <p style="margin: 0; font-size: 14px; color: #666;">${milestone.description || 'No description'}</p>
                  <div style="margin-top: 10px; font-size: 12px; color: #888;">
                    Due: ${new Date(milestone.dueDate).toLocaleDateString()} 
                    ${milestone.daysRemaining >= 0 ? `(${milestone.daysRemaining} days remaining)` : `(${Math.abs(milestone.daysRemaining)} days overdue)`}
                  </div>
                </div>
                <div style="text-align: right;">
                  <span class="status-badge status-${milestone.status}">${milestone.status}</span>
                  <div style="margin-top: 5px; font-weight: bold;">${milestone.progress}%</div>
                </div>
              </div>
              <div class="progress-bar" style="margin-top: 10px;">
                <div class="progress-fill" style="width: ${milestone.progress}%"></div>
              </div>
            </div>
          `).join('') : '<p>No milestones defined for this project.</p>'}
        </div>

        <div class="footer">
          Generated by Meridian Project Management System - Project Status
        </div>
      </body>
      </html>
    `;
  }

  private static generateDefaultHTML(data: any, styles: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${data.title || 'Project Report'}</title>
        ${styles}
      </head>
      <body>
        <div class="header">
          <div class="title">${data.title || 'Project Report'}</div>
          <div class="subtitle">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">Report Data</div>
          <pre style="background: #f8fafc; padding: 20px; border-radius: 8px; overflow: auto;">
            ${JSON.stringify(data, null, 2)}
          </pre>
        </div>

        <div class="footer">
          Generated by Meridian Project Management System
        </div>
      </body>
      </html>
    `;
  }

  // Helper methods for data processing
  private static calculateWeeklyProgress(tasks: any[]) {
    const weekMap = new Map<string, { completed: number; created: number }>();
    
    tasks.forEach(task => {
      const createdWeek = this.getWeekKey(new Date(task.createdAt));
      const updatedWeek = this.getWeekKey(new Date(task.updatedAt));
      
      // Track task creation
      if (!weekMap.has(createdWeek)) {
        weekMap.set(createdWeek, { completed: 0, created: 0 });
      }
      weekMap.get(createdWeek)!.created++;
      
      // Track task completion
      if (task.status === 'done') {
        if (!weekMap.has(updatedWeek)) {
          weekMap.set(updatedWeek, { completed: 0, created: 0 });
        }
        weekMap.get(updatedWeek)!.completed++;
      }
    });

    return Array.from(weekMap.entries())
      .map(([week, data]) => ({
        week,
        completed: data.completed,
        created: data.created,
        efficiency: data.created > 0 ? Math.round((data.completed / data.created) * 100) : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12); // Last 12 weeks
  }

  private static calculateStatusTimeline(tasks: any[]) {
    const dayMap = new Map<string, { completed: number; created: number }>();
    
    tasks.forEach(task => {
      const createdDay = task.createdAt.split('T')[0];
      const updatedDay = task.updatedAt.split('T')[0];
      
      // Track task creation
      if (!dayMap.has(createdDay)) {
        dayMap.set(createdDay, { completed: 0, created: 0 });
      }
      dayMap.get(createdDay)!.created++;
      
      // Track task completion
      if (task.status === 'done') {
        if (!dayMap.has(updatedDay)) {
          dayMap.set(updatedDay, { completed: 0, created: 0 });
        }
        dayMap.get(updatedDay)!.completed++;
      }
    });

    return Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        completed: data.completed,
        created: data.created,
        velocity: data.completed - data.created // Net task completion
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }

  private static getWeekKey(date: Date): string {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    return weekStart.toISOString().split('T')[0];
  }
}

