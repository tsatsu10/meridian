import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get('/', (c) => c.text('Hello World!'));
app.get('/health', (c) => c.json({ status: 'ok' }));

console.log('🚀 Starting ultra-simple server...');

serve({
  fetch: app.fetch,
  port: 3008
});

console.log('✅ Ultra-simple server started on port 3008');
