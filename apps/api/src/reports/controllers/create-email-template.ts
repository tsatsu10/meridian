import { Context } from 'hono';

export async function createEmailTemplate(c: Context) {
  return c.json({ success: true, message: 'Create email template - placeholder' });
} 
