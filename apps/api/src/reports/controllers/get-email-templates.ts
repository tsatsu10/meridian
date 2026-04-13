import { Context } from 'hono';

export async function getEmailTemplates(c: Context) {
  return c.json({ success: true, templates: [] });
} 
