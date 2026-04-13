import { Context } from 'hono';

export async function exportReport(c: Context) {
  return c.json({ success: true, message: 'Export report - placeholder' });
} 
