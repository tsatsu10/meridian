import { Context } from 'hono';

export async function getReportAnalytics(c: Context) {
  return c.json({ success: true, analytics: null });
} 
