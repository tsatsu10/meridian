/**
 * Reports API Routes
 * Phase 3.4 - Advanced Analytics & Reporting
 */

import { Hono } from 'hono';
import { ReportService } from '../services/reports/report-service';
import { getDatabase } from '../database/connection';
import { reportTemplate, scheduledReport, reportExecution, reportDashboard } from '../database/schema/reports';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../services/logging/logger';

const app = new Hono();
const reportService = new ReportService();

/**
 * GET /api/reports/templates
 * List report templates
 */
app.get('/templates', async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const templates = await db
      .select()
      .from(reportTemplate)
      .where(eq(reportTemplate.workspaceId, workspaceId))
      .orderBy(desc(reportTemplate.createdAt));

    return c.json({ templates });
  } catch (error: any) {
    logger.error('Failed to list templates', { error: error.message });
    return c.json({ error: 'Failed to list templates' }, 500);
  }
});

/**
 * POST /api/reports/templates
 * Create report template
 */
app.post('/templates', async (c) => {
  try {
    const db = getDatabase();
    const body = await c.req.json();
    const {
      workspaceId,
      name,
      description,
      type,
      category,
      dataSource,
      filters,
      groupBy,
      columns,
      aggregations,
      sortBy,
      chartType,
      chartConfig,
      isPublic,
      createdBy,
    } = body;

    if (!workspaceId || !name || !type || !dataSource || !createdBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const [template] = await db
      .insert(reportTemplate)
      .values({
        workspaceId,
        name,
        description,
        type,
        category,
        dataSource,
        filters: filters || {},
        groupBy: groupBy || [],
        columns: columns || [],
        aggregations: aggregations || [],
        sortBy: sortBy || [],
        chartType,
        chartConfig: chartConfig || {},
        isPublic: isPublic || false,
        createdBy,
      })
      .returning();

    return c.json({ template }, 201);
  } catch (error: any) {
    logger.error('Failed to create template', { error: error.message });
    return c.json({ error: 'Failed to create template' }, 500);
  }
});

/**
 * POST /api/reports/generate
 * Generate report
 */
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { templateId, workspaceId, format, filters, generatedBy } = body;

    if (!templateId || !workspaceId || !format || !generatedBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const fileUrl = await reportService.generateReport({
      templateId,
      workspaceId,
      format,
      filters,
      generatedBy,
    });

    return c.json({ fileUrl });
  } catch (error: any) {
    logger.error('Failed to generate report', { error: error.message });
    return c.json({ error: 'Failed to generate report' }, 500);
  }
});

/**
 * GET /api/reports/executions
 * List report executions
 */
app.get('/executions', async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.query('workspaceId');
    const limit = parseInt(c.req.query('limit') || '20');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const executions = await db
      .select()
      .from(reportExecution)
      .where(eq(reportExecution.workspaceId, workspaceId))
      .orderBy(desc(reportExecution.createdAt))
      .limit(limit);

    return c.json({ executions });
  } catch (error: any) {
    logger.error('Failed to list executions', { error: error.message });
    return c.json({ error: 'Failed to list executions' }, 500);
  }
});

/**
 * POST /api/reports/schedule
 * Schedule report
 */
app.post('/schedule', async (c) => {
  try {
    const body = await c.req.json();
    const {
      reportTemplateId,
      workspaceId,
      name,
      schedule,
      scheduleConfig,
      format,
      recipients,
      createdBy,
    } = body;

    if (!reportTemplateId || !workspaceId || !name || !schedule || !createdBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const scheduled = await reportService.scheduleReport({
      reportTemplateId,
      workspaceId,
      name,
      schedule,
      scheduleConfig: scheduleConfig || {},
      format: format || 'pdf',
      recipients: recipients || [],
      createdBy,
    });

    return c.json({ scheduledReport: scheduled }, 201);
  } catch (error: any) {
    logger.error('Failed to schedule report', { error: error.message });
    return c.json({ error: 'Failed to schedule report' }, 500);
  }
});

/**
 * GET /api/reports/scheduled
 * List scheduled reports
 */
app.get('/scheduled', async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const scheduled = await db
      .select()
      .from(scheduledReport)
      .where(eq(scheduledReport.workspaceId, workspaceId))
      .orderBy(desc(scheduledReport.createdAt));

    return c.json({ scheduledReports: scheduled });
  } catch (error: any) {
    logger.error('Failed to list scheduled reports', { error: error.message });
    return c.json({ error: 'Failed to list scheduled reports' }, 500);
  }
});

/**
 * PUT /api/reports/scheduled/:id
 * Update scheduled report
 */
app.put('/scheduled/:id', async (c) => {
  try {
    const db = getDatabase();
    const id = c.req.param('id');
    const body = await c.req.json();
    const { isActive } = body;

    const [updated] = await db
      .update(scheduledReport)
      .set({ isActive })
      .where(eq(scheduledReport.id, id))
      .returning();

    return c.json({ scheduledReport: updated });
  } catch (error: any) {
    logger.error('Failed to update scheduled report', { error: error.message });
    return c.json({ error: 'Failed to update scheduled report' }, 500);
  }
});

/**
 * POST /api/reports/dashboards
 * Create custom dashboard
 */
app.post('/dashboards', async (c) => {
  try {
    const db = getDatabase();
    const body = await c.req.json();
    const {
      workspaceId,
      name,
      description,
      layout,
      widgets,
      refreshInterval,
      isDefault,
      isPublic,
      createdBy,
    } = body;

    if (!workspaceId || !name || !createdBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const [dashboard] = await db
      .insert(reportDashboard)
      .values({
        workspaceId,
        name,
        description,
        layout: layout || [],
        widgets: widgets || [],
        refreshInterval,
        isDefault: isDefault || false,
        isPublic: isPublic || false,
        createdBy,
      })
      .returning();

    return c.json({ dashboard }, 201);
  } catch (error: any) {
    logger.error('Failed to create dashboard', { error: error.message });
    return c.json({ error: 'Failed to create dashboard' }, 500);
  }
});

/**
 * GET /api/reports/dashboards
 * List dashboards
 */
app.get('/dashboards', async (c) => {
  try {
    const db = getDatabase();
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const dashboards = await db
      .select()
      .from(reportDashboard)
      .where(eq(reportDashboard.workspaceId, workspaceId))
      .orderBy(desc(reportDashboard.createdAt));

    return c.json({ dashboards });
  } catch (error: any) {
    logger.error('Failed to list dashboards', { error: error.message });
    return c.json({ error: 'Failed to list dashboards' }, 500);
  }
});

export default app;



