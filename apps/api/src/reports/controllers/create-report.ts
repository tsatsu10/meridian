import { Context } from 'hono';

export async function createReport(c: Context) {
  return c.json({ success: true, message: 'Create report - placeholder' });
} 
