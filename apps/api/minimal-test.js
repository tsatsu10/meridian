import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

console.log('🚀 Starting minimal test server...');

serve({
  fetch: app.fetch,
  port: 3007
});

console.log('✅ Minimal server started on port 3007');
