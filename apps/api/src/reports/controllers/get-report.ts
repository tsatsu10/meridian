import { Context } from 'hono';

export async function getReport(c: Context) {
  return c.json({ success: true, report: null });
} 
