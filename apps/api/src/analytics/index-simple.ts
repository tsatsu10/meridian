import { Hono } from "hono";

// Simplified analytics module for testing
const analytics = new Hono()
  .get("/", async (c) => {
    return c.json({
      message: "Analytics module API - Simple",
      version: "1.0.0",
      status: "working"
    });
  })
  .get("/test", async (c) => {
    return c.json({
      test: "Analytics test endpoint working",
      timestamp: new Date().toISOString()
    });
  });

export default analytics;

