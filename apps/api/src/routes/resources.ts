/**
 * Resource Management API Routes
 * Phase 3.3 - Resource Management System
 */

import { Hono } from 'hono';
import { ResourceService } from '../services/resources/resource-service';
import { logger } from '../services/logging/logger';

const app = new Hono();
const resourceService = new ResourceService();

/**
 * GET /api/resources/capacity
 * Get team capacity overview
 */
app.get('/capacity', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!workspaceId || !startDate || !endDate) {
      return c.json({ error: 'workspaceId, startDate, and endDate are required' }, 400);
    }

    const capacity = await resourceService.getTeamCapacity(
      workspaceId,
      new Date(startDate),
      new Date(endDate)
    );

    return c.json({ capacity });
  } catch (error: any) {
    logger.error('Failed to get team capacity', { error: error.message });
    return c.json({ error: 'Failed to get team capacity' }, 500);
  }
});

/**
 * GET /api/resources/workload/:userId
 * Get workload for specific user
 */
app.get('/workload/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!startDate || !endDate) {
      return c.json({ error: 'startDate and endDate are required' }, 400);
    }

    const workload = await resourceService.getUserWorkload(
      userId,
      new Date(startDate),
      new Date(endDate)
    );

    return c.json({ workload });
  } catch (error: any) {
    logger.error('Failed to get user workload', { error: error.message });
    return c.json({ error: 'Failed to get user workload' }, 500);
  }
});

/**
 * POST /api/resources/allocations
 * Create resource allocation
 */
app.post('/allocations', async (c) => {
  try {
    const body = await c.req.json();
    const {
      userId,
      projectId,
      taskId,
      allocationPercentage,
      hoursAllocated,
      startDate,
      endDate,
      createdBy,
    } = body;

    if (!userId || !projectId || !hoursAllocated || !startDate || !createdBy) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const allocation = await resourceService.createAllocation({
      userId,
      projectId,
      taskId,
      allocationPercentage,
      hoursAllocated: parseFloat(hoursAllocated),
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy,
    });

    return c.json({ allocation }, 201);
  } catch (error: any) {
    logger.error('Failed to create allocation', { error: error.message });
    return c.json({ error: 'Failed to create allocation' }, 500);
  }
});

/**
 * PUT /api/resources/capacity
 * Update user capacity
 */
app.put('/capacity', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, workspaceId, hoursPerDay, hoursPerWeek, startDate, endDate } = body;

    if (!userId || !workspaceId || !startDate) {
      return c.json({ error: 'userId, workspaceId, and startDate are required' }, 400);
    }

    const capacity = await resourceService.updateCapacity({
      userId,
      workspaceId,
      hoursPerDay: hoursPerDay ? parseFloat(hoursPerDay) : undefined,
      hoursPerWeek: hoursPerWeek ? parseFloat(hoursPerWeek) : undefined,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return c.json({ capacity });
  } catch (error: any) {
    logger.error('Failed to update capacity', { error: error.message });
    return c.json({ error: 'Failed to update capacity' }, 500);
  }
});

/**
 * POST /api/resources/time-off
 * Request time off
 */
app.post('/time-off', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, type, startDate, endDate, reason } = body;

    if (!userId || !type || !startDate || !endDate) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const timeOff = await resourceService.requestTimeOff({
      userId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
    });

    return c.json({ timeOff }, 201);
  } catch (error: any) {
    logger.error('Failed to request time off', { error: error.message });
    return c.json({ error: 'Failed to request time off' }, 500);
  }
});

/**
 * PUT /api/resources/time-off/:id
 * Approve/deny time off
 */
app.put('/time-off/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, approvedBy } = body;

    if (!status || !approvedBy) {
      return c.json({ error: 'status and approvedBy are required' }, 400);
    }

    const timeOff = await resourceService.updateTimeOffStatus(id, status, approvedBy);

    return c.json({ timeOff });
  } catch (error: any) {
    logger.error('Failed to update time off', { error: error.message });
    return c.json({ error: 'Failed to update time off' }, 500);
  }
});

/**
 * POST /api/resources/utilization/calculate
 * Calculate utilization for a week
 */
app.post('/utilization/calculate', async (c) => {
  try {
    const body = await c.req.json();
    const { workspaceId, weekStartDate } = body;

    if (!workspaceId || !weekStartDate) {
      return c.json({ error: 'workspaceId and weekStartDate are required' }, 400);
    }

    await resourceService.calculateUtilization(workspaceId, new Date(weekStartDate));

    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to calculate utilization', { error: error.message });
    return c.json({ error: 'Failed to calculate utilization' }, 500);
  }
});

/**
 * GET /api/resources/suggestions
 * Get allocation suggestions
 */
app.get('/suggestions', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const projectId = c.req.query('projectId');
    const requiredHours = c.req.query('requiredHours');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    if (!workspaceId || !projectId || !requiredHours || !startDate || !endDate) {
      return c.json({ error: 'All query parameters are required' }, 400);
    }

    const suggestions = await resourceService.getAllocationSuggestions(
      workspaceId,
      projectId,
      parseFloat(requiredHours),
      new Date(startDate),
      new Date(endDate)
    );

    return c.json({ suggestions });
  } catch (error: any) {
    logger.error('Failed to get suggestions', { error: error.message });
    return c.json({ error: 'Failed to get suggestions' }, 500);
  }
});

export default app;


