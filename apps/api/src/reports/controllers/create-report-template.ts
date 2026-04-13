import { Context } from 'hono';

export async function createReportTemplate(c: Context) {
  return c.json({ success: true, message: 'Create template - placeholder' });
} 
