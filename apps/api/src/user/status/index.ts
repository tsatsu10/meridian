import { Hono } from "hono";
import { authMiddleware } from "../../middlewares/secure-auth";
import { getUserStatus, getWorkspaceStatuses } from "./get-status";
import { setUserStatus } from "./set-status";
import { clearUserStatus } from "./clear-status";
import { z } from "zod";

const statusRouter = new Hono();

// Get current user's status
statusRouter.get("/me", authMiddleware, async (c) => {
  try {
    const userEmail = c.get("userEmail");
    const status = await getUserStatus(userEmail);
    
    return c.json({
      success: true,
      data: status,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get all workspace statuses
statusRouter.get("/:workspaceId", authMiddleware, async (c) => {
  try {
    const { workspaceId } = c.req.param();
    const statuses = await getWorkspaceStatuses(workspaceId);
    
    return c.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Set user status
statusRouter.post("/", authMiddleware, async (c) => {
  try {
    const userEmail = c.get("userEmail");
    const body = await c.req.json();
    
    const schema = z.object({
      status: z.enum(["available", "in_meeting", "focus_mode", "away"]),
      statusMessage: z.string().max(100).optional(),
      emoji: z.string().max(10).optional(),
      expiresIn: z.number().positive().optional(), // Minutes
    });
    
    const validated = schema.parse(body);
    
    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (validated.expiresIn) {
      expiresAt = new Date(Date.now() + validated.expiresIn * 60 * 1000);
    }
    
    const status = await setUserStatus(userEmail, {
      status: validated.status,
      statusMessage: validated.statusMessage,
      emoji: validated.emoji,
      expiresAt,
    });
    
    return c.json({
      success: true,
      data: status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        400
      );
    }
    
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Clear user status
statusRouter.delete("/", authMiddleware, async (c) => {
  try {
    const userEmail = c.get("userEmail");
    await clearUserStatus(userEmail);
    
    return c.json({
      success: true,
      message: "Status cleared",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default statusRouter;


