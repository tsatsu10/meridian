import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

console.log('🚀 Starting simple test server...');

serve({
  fetch: app.fetch,
  port: 3006
});

console.log('✅ Simple server started on port 3006');
