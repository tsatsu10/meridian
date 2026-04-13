import { Context } from 'hono';

export async function scheduleReport(c: Context) {
  return c.json({ success: true, message: 'Schedule report - placeholder' });
} 
