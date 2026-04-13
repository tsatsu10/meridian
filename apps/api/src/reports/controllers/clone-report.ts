import { Context } from 'hono';

export async function cloneReport(c: Context) {
  return c.json({ success: true, message: 'Clone report - placeholder' });
} 
