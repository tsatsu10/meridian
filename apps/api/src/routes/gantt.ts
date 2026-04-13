/**
 * Gantt Chart API Routes
 * Phase 3.2 - Gantt Chart & Timeline Visualization
 */

import { Hono } from 'hono';
import { GanttService } from '../services/gantt/gantt-service';
import { logger } from '../services/logging/logger';

const app = new Hono();
const ganttService = new GanttService();

/**
 * GET /api/gantt/:projectId
 * Get Gantt chart data for a project
 */
app.get('/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId');

    const ganttData = await ganttService.getGanttData(projectId);

    return c.json({ ganttData });
  } catch (error: any) {
    logger.error('Failed to get Gantt data', { error: error.message });
    return c.json({ error: 'Failed to get Gantt data' }, 500);
  }
});

/**
 * PUT /api/gantt/tasks/:taskId/dates
 * Update task dates (for drag-and-drop)
 */
app.put('/tasks/:taskId/dates', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    const body = await c.req.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return c.json({ error: 'startDate and endDate are required' }, 400);
    }

    await ganttService.updateTaskDates(
      taskId,
      new Date(startDate),
      new Date(endDate)
    );

    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to update task dates', { error: error.message });
    return c.json({ error: 'Failed to update task dates' }, 500);
  }
});

/**
 * PUT /api/gantt/tasks/:taskId/dependencies
 * Update task dependencies
 */
app.put('/tasks/:taskId/dependencies', async (c) => {
  try {
    const taskId = c.req.param('taskId');
    const body = await c.req.json();
    const { dependencies } = body;

    if (!Array.isArray(dependencies)) {
      return c.json({ error: 'dependencies must be an array' }, 400);
    }

    await ganttService.updateTaskDependencies(taskId, dependencies);

    return c.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to update task dependencies', { error: error.message });
    return c.json({ error: 'Failed to update task dependencies' }, 500);
  }
});

export default app;


