import { Context } from 'hono';

export async function getReportExecutions(c: Context) {
  return c.json({ success: true, executions: [] });
} 
