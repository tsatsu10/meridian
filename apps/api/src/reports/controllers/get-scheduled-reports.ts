import { Context } from 'hono';

export async function getScheduledReports(c: Context) {
  return c.json({ success: true, reports: [] });
} 
