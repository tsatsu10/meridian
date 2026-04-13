import { Context } from 'hono';

export async function getReportTemplates(c: Context) {
  return c.json({ success: true, templates: [] });
} 
