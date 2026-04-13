// Simplified server test to isolate the issue
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

console.log("🚀 Starting simplified server test...");

const app = new Hono();

// Basic middleware
app.use("*", cors({
  credentials: true,
  origin: (origin) => origin || "*",
}));

// Test endpoints
app.get("/", (c) => c.json({ message: "Simplified server works" }));
app.get("/test", (c) => c.json({ message: "Test endpoint works" }));
app.get("/users", (c) => c.json({ users: [], message: "Users endpoint works" }));

console.log("✅ Routes registered, starting server...");

serve(
  {
    fetch: app.fetch,
    port: 1337,
  },
  (info) => {
    console.log(`🏃 Simplified server running at http://localhost:${info.port}`);
  }
);