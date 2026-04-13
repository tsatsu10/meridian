import { Context } from 'hono';

export async function cancelReportExecution(c: Context) {
  return c.json({ success: true, message: 'Cancel execution - placeholder' });
} 
