import { Context } from 'hono';

export async function deleteReport(c: Context) {
  return c.json({ success: true, message: 'Delete report - placeholder' });
} 
