import { Hono } from "hono";
import { authMiddleware } from "../middlewares/secure-auth";
import logger from '../utils/logger';

const quickCaptureRoutes = new Hono();

// Quick capture endpoint
quickCaptureRoutes.post("/", authMiddleware, async (c) => {
  try {
    // In production, this would:
    // 1. Parse multipart form data
    // 2. Save voice notes and photos to storage
    // 3. Store geolocation data
    // 4. Create task in database
    
    logger.debug("Quick capture task received");
    
    // Simulate task creation
    const task = {
      id: Date.now().toString(),
      title: "Quick captured task",
      description: "Task created via quick capture",
      priority: "medium",
      status: "pending",
      createdAt: new Date(),
      hasVoiceNote: false,
      hasPhoto: false,
      hasLocation: false,
    };

    return c.json({
      success: true,
      data: task,
    });
  } catch (error) {
    logger.error("Error creating quick capture task:", error);
    return c.json({ error: "Failed to create task" }, 500);
  }
});

export default quickCaptureRoutes;


