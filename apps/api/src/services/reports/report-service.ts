/**
 * Report Generation Service
 * Custom reports, Excel export, PDF generation
 * Phase 3.4 - Advanced Analytics & Reporting
 */

import { getDatabase } from '../../database/connection';
import { reportTemplate, reportExecution, scheduledReport } from '../../database/schema/reports';
import { tasks, projects, users } from '../../database/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../logging/logger';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs';
import * as path from 'path';

interface ReportData {
  columns: string[];
  rows: any[];
  summary?: Record<string, any>;
}

interface ReportConfig {
  templateId: string;
  workspaceId: string;
  format: 'excel' | 'pdf' | 'csv';
  filters?: Record<string, any>;
  generatedBy: string;
}

export class ReportService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Generate report from template
   */
  async generateReport(config: ReportConfig): Promise<string> {
    const startTime = Date.now();
    
    try {
      // Get report template
      const [template] = await this.getDb()
        .select()
        .from(reportTemplate)
        .where(eq(reportTemplate.id, config.templateId));

      if (!template) {
        throw new Error('Report template not found');
      }

      // Extract data based on template configuration
      const data = await this.extractData(template, config.filters);

      // Generate file based on format
      let fileUrl: string;
      let fileSize: number;

      switch (config.format) {
        case 'excel':
          fileUrl = await this.generateExcel(template.name, data);
          break;
        case 'pdf':
          fileUrl = await this.generatePDF(template.name, data);
          break;
        case 'csv':
          fileUrl = await this.generateCSV(template.name, data);
          break;
        default:
          throw new Error('Unsupported format');
      }

      // Get file size
      const stats = fs.statSync(fileUrl);
      fileSize = stats.size;

      // Create execution record
      await this.getDb().insert(reportExecution).values({
        reportTemplateId: config.templateId,
        workspaceId: config.workspaceId,
        status: 'success',
        format: config.format,
        fileUrl,
        fileSize,
        rowCount: data.rows.length,
        executionTimeMs: Date.now() - startTime,
        generatedBy: config.generatedBy,
      });

      logger.info('Report generated successfully', {
        templateId: config.templateId,
        format: config.format,
        rows: data.rows.length,
      });

      return fileUrl;
    } catch (error: any) {
      logger.error('Failed to generate report', { error: error.message });

      // Create failed execution record
      await this.getDb().insert(reportExecution).values({
        reportTemplateId: config.templateId,
        workspaceId: config.workspaceId,
        status: 'failed',
        format: config.format,
        error: error.message,
        executionTimeMs: Date.now() - startTime,
        generatedBy: config.generatedBy,
      });

      throw error;
    }
  }

  /**
   * Extract data based on template configuration
   */
  private async extractData(
    template: any,
    additionalFilters?: Record<string, any>
  ): Promise<ReportData> {
    try {
      const dataSource = template.dataSource;
      const columns = template.columns || [];
      const filters = { ...template.filters, ...additionalFilters };

      let data: any[] = [];

      // Query data based on source
      switch (dataSource) {
        case 'tasks':
          data = await this.queryTasks(filters);
          break;
        case 'projects':
          data = await this.queryProjects(filters);
          break;
        case 'users':
          data = await this.queryUsers(filters);
          break;
        default:
          throw new Error(`Unsupported data source: ${dataSource}`);
      }

      // Apply grouping if specified
      if (template.groupBy && template.groupBy.length > 0) {
        data = this.groupData(data, template.groupBy);
      }

      // Apply aggregations if specified
      if (template.aggregations && template.aggregations.length > 0) {
        const summary = this.calculateAggregations(data, template.aggregations);
        return {
          columns,
          rows: data,
          summary,
        };
      }

      return {
        columns,
        rows: data,
      };
    } catch (error: any) {
      logger.error('Failed to extract data', { error: error.message });
      throw error;
    }
  }

  /**
   * Query tasks data
   */
  private async queryTasks(filters: Record<string, any>): Promise<any[]> {
    let query = this.getDb().select().from(tasks);

    // Apply filters
    if (filters.projectId) {
      query = query.where(eq(task.projectId, filters.projectId));
    }
    if (filters.status) {
      query = query.where(eq(task.status, filters.status));
    }
    if (filters.startDate) {
      query = query.where(gte(task.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      query = query.where(lte(task.createdAt, new Date(filters.endDate)));
    }

    return await query;
  }

  /**
   * Query projects data
   */
  private async queryProjects(filters: Record<string, any>): Promise<any[]> {
    let query = this.getDb().select().from(projects);

    if (filters.workspaceId) {
      query = query.where(eq(project.workspaceId, filters.workspaceId));
    }

    return await query;
  }

  /**
   * Query users data
   */
  private async queryUsers(filters: Record<string, any>): Promise<any[]> {
    let query = this.getDb().select().from(users);

    if (filters.workspaceId) {
      query = query.where(eq(user.workspaceId, filters.workspaceId));
    }

    return await query;
  }

  /**
   * Group data by specified fields
   */
  private groupData(data: any[], groupBy: string[]): any[] {
    const grouped = new Map<string, any[]>();

    data.forEach((row) => {
      const key = groupBy.map((field) => row[field]).join('|');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(row);
    });

    // Flatten grouped data
    return Array.from(grouped.values()).flat();
  }

  /**
   * Calculate aggregations
   */
  private calculateAggregations(
    data: any[],
    aggregations: any[]
  ): Record<string, any> {
    const summary: Record<string, any> = {};

    aggregations.forEach((agg) => {
      const { field, operation } = agg;

      switch (operation) {
        case 'count':
          summary[`${field}_count`] = data.length;
          break;
        case 'sum':
          summary[`${field}_sum`] = data.reduce((sum, row) => sum + (row[field] || 0), 0);
          break;
        case 'avg':
          const total = data.reduce((sum, row) => sum + (row[field] || 0), 0);
          summary[`${field}_avg`] = data.length > 0 ? total / data.length : 0;
          break;
        case 'min':
          summary[`${field}_min`] = Math.min(...data.map((row) => row[field] || 0));
          break;
        case 'max':
          summary[`${field}_max`] = Math.max(...data.map((row) => row[field] || 0));
          break;
      }
    });

    return summary;
  }

  /**
   * Generate Excel file
   */
  private async generateExcel(name: string, data: ReportData): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.addRow(data.columns);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.rows.forEach((row) => {
      const values = data.columns.map((col) => row[col]);
      worksheet.addRow(values);
    });

    // Add summary if present
    if (data.summary) {
      worksheet.addRow([]);
      worksheet.addRow(['Summary']);
      Object.entries(data.summary).forEach(([key, value]) => {
        worksheet.addRow([key, value]);
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Save file
    const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Generate PDF file
   */
  private async generatePDF(name: string, data: ReportData): Promise<string> {
    const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Title
    doc.fontSize(20).text(name, { align: 'center' });
    doc.moveDown();

    // Date
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table
    const columnWidth = 100;
    const startX = 50;
    let currentY = doc.y;

    // Headers
    doc.fontSize(10).fillColor('#4472C4');
    data.columns.forEach((col, i) => {
      doc.text(col, startX + i * columnWidth, currentY, {
        width: columnWidth,
        align: 'left',
      });
    });

    currentY += 20;
    doc.moveTo(startX, currentY).lineTo(startX + data.columns.length * columnWidth, currentY).stroke();
    currentY += 10;

    // Data rows
    doc.fillColor('#000000');
    data.rows.slice(0, 30).forEach((row) => {
      data.columns.forEach((col, i) => {
        const value = row[col] || '';
        doc.text(String(value).substring(0, 20), startX + i * columnWidth, currentY, {
          width: columnWidth,
          align: 'left',
        });
      });
      currentY += 20;

      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    });

    // Summary
    if (data.summary) {
      doc.addPage();
      doc.fontSize(16).text('Summary', { align: 'center' });
      doc.moveDown();

      Object.entries(data.summary).forEach(([key, value]) => {
        doc.fontSize(12).text(`${key}: ${value}`);
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  /**
   * Generate CSV file
   */
  private async generateCSV(name: string, data: ReportData): Promise<string> {
    const fileName = `${name.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), 'exports', fileName);

    // Ensure exports directory exists
    const exportsDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Prepare data
    const records = data.rows.map((row) => data.columns.map((col) => row[col]));

    // Generate CSV
    const csv = stringify([data.columns, ...records]);

    // Write file
    fs.writeFileSync(filePath, csv);

    return filePath;
  }

  /**
   * Schedule report
   */
  async scheduleReport(data: {
    reportTemplateId: string;
    workspaceId: string;
    name: string;
    schedule: string;
    scheduleConfig: any;
    format: string;
    recipients: string[];
    createdBy: string;
  }): Promise<any> {
    try {
      const nextRunAt = this.calculateNextRun(data.schedule, data.scheduleConfig);

      const [scheduled] = await this.getDb()
        .insert(scheduledReport)
        .values({
          ...data,
          nextRunAt,
          isActive: true,
        })
        .returning();

      logger.info('Report scheduled', { scheduledReportId: scheduled.id });
      return scheduled;
    } catch (error: any) {
      logger.error('Failed to schedule report', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: string, config: any): Date {
    const now = new Date();

    switch (schedule) {
      case 'daily':
        const daily = new Date(now);
        daily.setDate(daily.getDate() + 1);
        daily.setHours(config.hour || 9, config.minute || 0, 0, 0);
        return daily;

      case 'weekly':
        const weekly = new Date(now);
        weekly.setDate(weekly.getDate() + 7);
        weekly.setHours(config.hour || 9, config.minute || 0, 0, 0);
        return weekly;

      case 'monthly':
        const monthly = new Date(now);
        monthly.setMonth(monthly.getMonth() + 1);
        monthly.setDate(config.day || 1);
        monthly.setHours(config.hour || 9, config.minute || 0, 0, 0);
        return monthly;

      default:
        // Default to next day
        const defaultDate = new Date(now);
        defaultDate.setDate(defaultDate.getDate() + 1);
        return defaultDate;
    }
  }
}

export default ReportService;



