/**
 * Time Tracking & Billing API Routes
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import { Hono } from 'hono';
import { TimeTrackingService } from '../services/time-billing/time-tracking-service';
import { BillingService } from '../services/time-billing/billing-service';
import { logger } from '../services/logging/logger';

const app = new Hono();
const timeService = new TimeTrackingService();
const billingService = new BillingService();

// ======================
// TIME TRACKING ROUTES
// ======================

/**
 * POST /api/time/start
 * Start a new time entry
 */
app.post('/start', async (c) => {
  try {
    const body = await c.req.json();
    const { workspaceId, projectId, taskId, userId, description, isBillable, tags, notes } = body;

    if (!workspaceId || !projectId || !userId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const entry = await timeService.startTimer({
      workspaceId,
      projectId,
      taskId,
      userId,
      description,
      startTime: new Date(),
      isBillable,
      tags,
      notes,
    });

    return c.json({ entry }, 201);
  } catch (error: any) {
    logger.error('Failed to start timer', { error: error.message });
    return c.json({ error: 'Failed to start timer' }, 500);
  }
});

/**
 * PUT /api/time/:id/stop
 * Stop a running time entry
 */
app.put('/:id/stop', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { endTime } = body;

    const entry = await timeService.stopTimer(id, endTime ? new Date(endTime) : undefined);
    return c.json({ entry });
  } catch (error: any) {
    logger.error('Failed to stop timer', { error: error.message });
    return c.json({ error: 'Failed to stop timer' }, 500);
  }
});

/**
 * PUT /api/time/:id
 * Update time entry
 */
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updates = await c.req.json();

    const entry = await timeService.updateTimeEntry(id, updates);
    return c.json({ entry });
  } catch (error: any) {
    logger.error('Failed to update time entry', { error: error.message });
    return c.json({ error: 'Failed to update time entry' }, 500);
  }
});

/**
 * DELETE /api/time/:id
 * Delete time entry
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await timeService.deleteTimeEntry(id);
    return c.json({ message: 'Time entry deleted' });
  } catch (error: any) {
    logger.error('Failed to delete time entry', { error: error.message });
    return c.json({ error: 'Failed to delete time entry' }, 500);
  }
});

/**
 * GET /api/time/entries
 * Get time entries
 */
app.get('/entries', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const userId = c.req.query('userId');
    const projectId = c.req.query('projectId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const status = c.req.query('status');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const entries = await timeService.getTimeEntries({
      workspaceId,
      userId,
      projectId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status,
    });

    return c.json({ entries });
  } catch (error: any) {
    logger.error('Failed to get time entries', { error: error.message });
    return c.json({ error: 'Failed to get time entries' }, 500);
  }
});

// ======================
// TIMESHEET ROUTES
// ======================

/**
 * POST /api/time/timesheets/generate
 * Generate timesheet summary
 */
app.post('/timesheets/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { workspaceId, userId, periodStart, periodEnd } = body;

    if (!workspaceId || !userId || !periodStart || !periodEnd) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const summary = await timeService.generateTimesheet(
      workspaceId,
      userId,
      new Date(periodStart),
      new Date(periodEnd)
    );

    return c.json({ summary });
  } catch (error: any) {
    logger.error('Failed to generate timesheet', { error: error.message });
    return c.json({ error: 'Failed to generate timesheet' }, 500);
  }
});

/**
 * POST /api/time/timesheets/submit
 * Submit timesheet for approval
 */
app.post('/timesheets/submit', async (c) => {
  try {
    const body = await c.req.json();
    const { workspaceId, userId, periodStart, periodEnd, notes } = body;

    const timesheet = await timeService.submitTimesheet({
      workspaceId,
      userId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      notes,
    });

    return c.json({ timesheet }, 201);
  } catch (error: any) {
    logger.error('Failed to submit timesheet', { error: error.message });
    return c.json({ error: 'Failed to submit timesheet' }, 500);
  }
});

/**
 * PUT /api/time/timesheets/:id/approve
 * Approve/reject timesheet
 */
app.put('/timesheets/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { approvedBy, approved, reason } = body;

    if (!approvedBy) {
      return c.json({ error: 'approvedBy is required' }, 400);
    }

    const timesheet = await timeService.approveTimesheet(id, approvedBy, approved, reason);
    return c.json({ timesheet });
  } catch (error: any) {
    logger.error('Failed to process timesheet', { error: error.message });
    return c.json({ error: 'Failed to process timesheet' }, 500);
  }
});

// ======================
// BILLING ROUTES
// ======================

/**
 * POST /api/time/billing/rates
 * Set billing rate
 */
app.post('/billing/rates', async (c) => {
  try {
    const body = await c.req.json();
    const rate = await billingService.setBillingRate(body);
    return c.json({ rate }, 201);
  } catch (error: any) {
    logger.error('Failed to set billing rate', { error: error.message });
    return c.json({ error: 'Failed to set billing rate' }, 500);
  }
});

/**
 * POST /api/time/billing/invoices
 * Create invoice
 */
app.post('/billing/invoices', async (c) => {
  try {
    const body = await c.req.json();
    const { invoiceData, lineItems, timesheetId, taxRate } = body;

    let invoice;
    if (timesheetId) {
      invoice = await billingService.createInvoiceFromTimesheet(invoiceData, timesheetId, taxRate);
    } else {
      invoice = await billingService.createInvoice(invoiceData, lineItems, taxRate);
    }

    return c.json({ invoice }, 201);
  } catch (error: any) {
    logger.error('Failed to create invoice', { error: error.message });
    return c.json({ error: 'Failed to create invoice' }, 500);
  }
});

/**
 * GET /api/time/billing/invoices/:id
 * Get invoice with line items
 */
app.get('/billing/invoices/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const invoice = await billingService.getInvoice(id);
    return c.json({ invoice });
  } catch (error: any) {
    logger.error('Failed to get invoice', { error: error.message });
    return c.json({ error: 'Failed to get invoice' }, 500);
  }
});

/**
 * GET /api/time/billing/invoices
 * List invoices
 */
app.get('/billing/invoices', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const projectId = c.req.query('projectId');
    const status = c.req.query('status');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const invoices = await billingService.listInvoices({ workspaceId, projectId, status });
    return c.json({ invoices });
  } catch (error: any) {
    logger.error('Failed to list invoices', { error: error.message });
    return c.json({ error: 'Failed to list invoices' }, 500);
  }
});

/**
 * PUT /api/time/billing/invoices/:id/status
 * Update invoice status
 */
app.put('/billing/invoices/:id/status', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status } = body;

    const invoice = await billingService.updateInvoiceStatus(id, status);
    return c.json({ invoice });
  } catch (error: any) {
    logger.error('Failed to update invoice status', { error: error.message });
    return c.json({ error: 'Failed to update invoice status' }, 500);
  }
});

/**
 * GET /api/time/billing/summary/:projectId
 * Get billing summary for project
 */
app.get('/billing/summary/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const summary = await billingService.getProjectBillingSummary(projectId);
    return c.json({ summary });
  } catch (error: any) {
    logger.error('Failed to get billing summary', { error: error.message });
    return c.json({ error: 'Failed to get billing summary' }, 500);
  }
});

// ======================
// EXPENSE ROUTES
// ======================

/**
 * POST /api/time/expenses
 * Create expense entry
 */
app.post('/expenses', async (c) => {
  try {
    const body = await c.req.json();
    const expense = await billingService.createExpense(body);
    return c.json({ expense }, 201);
  } catch (error: any) {
    logger.error('Failed to create expense', { error: error.message });
    return c.json({ error: 'Failed to create expense' }, 500);
  }
});

/**
 * GET /api/time/expenses
 * List expenses
 */
app.get('/expenses', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const projectId = c.req.query('projectId');
    const userId = c.req.query('userId');
    const status = c.req.query('status');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const expenses = await billingService.listExpenses({ workspaceId, projectId, userId, status });
    return c.json({ expenses });
  } catch (error: any) {
    logger.error('Failed to list expenses', { error: error.message });
    return c.json({ error: 'Failed to list expenses' }, 500);
  }
});

/**
 * PUT /api/time/expenses/:id/approve
 * Approve/reject expense
 */
app.put('/expenses/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { approvedBy, approved, reason } = body;

    const expense = await billingService.processExpense(id, approvedBy, approved, reason);
    return c.json({ expense });
  } catch (error: any) {
    logger.error('Failed to process expense', { error: error.message });
    return c.json({ error: 'Failed to process expense' }, 500);
  }
});

// ======================
// BUDGET ROUTES
// ======================

/**
 * GET /api/time/budget/:projectId
 * Get project budget status
 */
app.get('/budget/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');
    const budget = await timeService.getProjectBudgetStatus(projectId);
    return c.json({ budget });
  } catch (error: any) {
    logger.error('Failed to get budget status', { error: error.message });
    return c.json({ error: 'Failed to get budget status' }, 500);
  }
});

export default app;


