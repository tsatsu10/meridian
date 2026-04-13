import { zValidator } from "@hono/zod-validator";
import { eq, and, ne } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { getDatabase } from "../database/connection";
import { taskTable, workspaceUserTable, projectTable } from "../database/schema";
import { subscribeToEvent } from "../events";
import clearNotifications from "./controllers/clear-notifications";
import createNotification from "./controllers/create-notification";
import getNotifications from "./controllers/get-notifications";
import markAllNotificationsAsRead from "./controllers/mark-all-notifications-as-read";
import markNotificationAsRead from "./controllers/mark-notification-as-read";
import pinNotification from "./controllers/pin-notification";
import unpinNotification from "./controllers/unpin-notification";
import archiveNotification from "./controllers/archive-notification";
import unarchiveNotification from "./controllers/unarchive-notification";
import deleteNotification from "./controllers/delete-notification";
import batchMarkAsRead from "./controllers/batch-mark-as-read";
import batchArchive from "./controllers/batch-archive";
import batchDelete from "./controllers/batch-delete";
// Phase 2: Digest system
import { getDigestSettings, updateDigestSettings } from "./controllers/digest-settings";
import { generateDigest } from "./services/digest-generator";
import logger from '../utils/logger';
// Phase 2: Alert rules
import {
  createAlertRule,
  getUserAlertRules,
  getAlertRule,
  updateAlertRule,
  deleteAlertRule,
  testAlertRule,
} from "./controllers/alert-rules";
// Phase 2: Notification grouping
import {
  markGroupAsRead,
  archiveGroup,
  deleteGroup,
  groupNotifications,
} from "./services/notification-grouper";

const notification = new Hono<{
  Variables: {
    userEmail: string;
  };
}>()
  .get("/", async (c) => {
    const userEmail = c.get("userEmail");
    
    // Get pagination parameters from query string
    const limit = Number(c.req.query("limit")) || 50;
    const offset = Number(c.req.query("offset")) || 0;
    const includeArchived = c.req.query("includeArchived") === "true";
    
    // Phase 2: Get filtering parameters
    const type = c.req.query("type");
    const types = c.req.query("types")?.split(",");
    const isReadParam = c.req.query("isRead");
    const isRead = isReadParam === "true" ? true : isReadParam === "false" ? false : undefined;
    const priority = c.req.query("priority");
    const search = c.req.query("search");
    
    const result = await getNotifications(userEmail, { 
      limit, 
      offset, 
      includeArchived,
      type,
      types,
      isRead,
      priority,
      search,
    });
    return c.json(result);
  })
  .post(
    "/",
    zValidator(
      "json",
      z.object({
        userEmail: z.string(),
        title: z.string(),
        content: z.string().optional(),
        type: z.string().optional(),
        resourceId: z.string().optional(),
        resourceType: z.string().optional(),
      }),
    ),
    async (c) => {
      const { userEmail, title, content, type, resourceId, resourceType } =
        c.req.valid("json");

      const notification = await createNotification({
        userEmail,
        title,
        content,
        type,
        resourceId,
        resourceType,
      });

      return c.json(notification);
    },
  )
  .patch(
    "/:id/read",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const notification = await markNotificationAsRead(id);
      return c.json(notification);
    },
  )
  .patch(
    "/:id/pin",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const notification = await pinNotification(id);
      return c.json(notification);
    },
  )
  .patch(
    "/:id/unpin",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const notification = await unpinNotification(id);
      return c.json(notification);
    },
  )
  .patch(
    "/:id/archive",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const userEmail = c.get("userEmail");
      const notification = await archiveNotification(userEmail, id);
      return c.json(notification);
    },
  )
  .patch(
    "/:id/unarchive",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const userEmail = c.get("userEmail");
      const notification = await unarchiveNotification(userEmail, id);
      return c.json(notification);
    },
  )
  .delete(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      const { id } = c.req.valid("param");
      const userEmail = c.get("userEmail");
      const notification = await deleteNotification(userEmail, id);
      return c.json(notification);
    },
  )
  .patch("/read-all", async (c) => {
    const userEmail = c.get("userEmail");
    const result = await markAllNotificationsAsRead(userEmail);
    return c.json(result);
  })
  .delete("/clear-all", async (c) => {
    const userEmail = c.get("userEmail");
    const result = await clearNotifications(userEmail);
    return c.json(result);
  })
  .post(
    "/batch/mark-read",
    zValidator("json", z.object({ ids: z.array(z.string()) })),
    async (c) => {
      const { ids } = c.req.valid("json");
      const userEmail = c.get("userEmail");
      const result = await batchMarkAsRead(userEmail, ids);
      return c.json(result);
    }
  )
  .post(
    "/batch/archive",
    zValidator("json", z.object({ ids: z.array(z.string()) })),
    async (c) => {
      const { ids } = c.req.valid("json");
      const userEmail = c.get("userEmail");
      const result = await batchArchive(userEmail, ids);
      return c.json(result);
    }
  )
  .post(
    "/batch/delete",
    zValidator("json", z.object({ ids: z.array(z.string()) })),
    async (c) => {
      const { ids } = c.req.valid("json");
      const userEmail = c.get("userEmail");
      const result = await batchDelete(userEmail, ids);
      return c.json(result);
    }
  );

subscribeToEvent(
  "task.created",
  async ({
    taskId,
    userEmail,
    title,
  }: {
    taskId: string;
    userEmail: string;
    title?: string;
    type: string;
    content: string;
  }) => {
    if (!userEmail || !taskId) {
      return;
    }

    await createNotification({
      userEmail,
      title: "New Task Created",
      content: title ? `Task "${title}" was created` : "A new task was created",
      type: "task",
      resourceId: taskId,
      resourceType: "task",
    });
  },
);

subscribeToEvent(
  "workspace.created",
  async ({
    workspaceId,
    ownerEmail,
  }: { workspaceId: string; ownerEmail: string }) => {
    if (!workspaceId || !ownerEmail) {
      return;
    }

    await createNotification({
      userEmail: ownerEmail,
      title: "Workspace Created",
      content: "Your new workspace is ready",
      type: "workspace",
      resourceId: workspaceId,
      resourceType: "workspace",
    });
  },
);

subscribeToEvent(
  "task.status_changed",
  async ({
    taskId,
    userEmail,
    oldStatus,
    newStatus,
    title,
  }: {
    taskId: string;
    userEmail: string | null;
    oldStatus: string;
    newStatus: string;
    title: string;
  }) => {
    if (!taskId || !userEmail) {
      return;
    }

    await createNotification({
      userEmail,
      title: "Task Status Updated",
      content: `Task "${title}" moved from ${oldStatus.replace(/-/g, " ")} to ${newStatus.replace(/-/g, " ")}`,
      type: "task",
      resourceId: taskId,
      resourceType: "task",
    });
  },
);

subscribeToEvent(
  "task.assignee_changed",
  async ({
    taskId,
    newAssignee,
    title,
  }: {
    taskId: string;
    newAssignee: string | null;
    title: string;
  }) => {
    if (!taskId || !newAssignee) {
      return;
    }

    await createNotification({
      userEmail: newAssignee,
      title: "Task Assigned to You",
      content: `You have been assigned to task "${title}"`,
      type: "task",
      resourceId: taskId,
      resourceType: "task",
    });
  },
);

subscribeToEvent(
  "time-entry.created",
  async ({
    timeEntryId,
    taskId,
    userEmail,
  }: {
    timeEntryId: string;
    taskId: string;
    userEmail: string;
    type: string;
    content: string;
  }) => {
    const db = getDatabase(); // FIX: Initialize database connection
    if (!timeEntryId || !taskId || !userEmail) {
      return;
    }

    const task = await db.query.taskTable.findFirst({
      where: eq(taskTable.id, taskId),
    });

    if (task) {
      await createNotification({
        userEmail,
        title: "Time Tracking Started",
        content: `You started tracking time for task "${task.title}"`,
        type: "time-entry",
        resourceId: taskId,
        resourceType: "task",
      });
    }
  },
);

// @epic-2.1-files: File upload notifications
subscribeToEvent(
  "file.uploaded",
  async ({
    attachmentId,
    fileName,
    fileType,
    uploaderEmail,
    taskId,
    commentId,
    isNewVersion,
    version,
  }: {
    attachmentId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploaderEmail: string;
    taskId?: string | null;
    commentId?: string | null;
    isNewVersion: boolean;
    version: string;
  }) => {
    if (!attachmentId || !uploaderEmail) {
      return;
    }

    const db = getDatabase(); // FIX: Initialize database connection
    try {
      // Get task details if file is attached to a task
      if (taskId) {
        const task = await db.query.taskTable.findFirst({
          where: eq(taskTable.id, taskId),
        });

        if (task) {
          // For now, just create a simple notification
          // TODO: Implement proper workspace member filtering
          const title = isNewVersion 
            ? `New File Version Uploaded`
            : `New File Attached`;
          
          const content = isNewVersion
            ? `${uploaderEmail.split('@')[0]} uploaded version ${version} of "${fileName}" to task "${task.title}"`
            : `${uploaderEmail.split('@')[0]} attached "${fileName}" to task "${task.title}"`;

          logger.debug(`📎 File upload notification: ${title} - ${content}`);
          
          // Note: In a real implementation, we would notify all workspace members
          // For now, we'll just log the notification
        }
      }
    } catch (error) {
      logger.error('❌ File upload notification error:', error);
    }
  },
);

// Phase 2: Digest Settings Routes
notification.get("/digest/settings", async (c) => {
  const userEmail = c.get("userEmail");
  
  try {
    const settings = await getDigestSettings(userEmail);
    return c.json({ success: true, data: settings });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.patch("/digest/settings", async (c) => {
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  
  try {
    const settings = await updateDigestSettings(userEmail, body);
    return c.json({ success: true, data: settings });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Phase 2: Manual digest generation (for testing)
notification.post("/digest/generate", async (c) => {
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  const type = body.type || 'daily';
  
  try {
    const digest = await generateDigest(userEmail, type);
    return c.json({ success: true, data: digest });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Phase 2: Alert Rules Routes
notification.get("/alert-rules", async (c) => {
  const userEmail = c.get("userEmail");
  
  try {
    const rules = await getUserAlertRules(userEmail);
    return c.json({ success: true, data: rules });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.get("/alert-rules/:id", async (c) => {
  const userEmail = c.get("userEmail");
  const ruleId = c.req.param("id");
  
  try {
    const rule = await getAlertRule(ruleId, userEmail);
    return c.json({ success: true, data: rule });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      404
    );
  }
});

notification.post("/alert-rules", async (c) => {
  const userEmail = c.get("userEmail");
  const body = await c.req.json();
  
  try {
    const rule = await createAlertRule(userEmail, body);
    return c.json({ success: true, data: rule });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.patch("/alert-rules/:id", async (c) => {
  const userEmail = c.get("userEmail");
  const ruleId = c.req.param("id");
  const body = await c.req.json();
  
  try {
    const rule = await updateAlertRule(ruleId, userEmail, body);
    return c.json({ success: true, data: rule });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.delete("/alert-rules/:id", async (c) => {
  const userEmail = c.get("userEmail");
  const ruleId = c.req.param("id");
  
  try {
    const rule = await deleteAlertRule(ruleId, userEmail);
    return c.json({ success: true, data: rule });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.post("/alert-rules/:id/test", async (c) => {
  const userEmail = c.get("userEmail");
  const ruleId = c.req.param("id");
  const body = await c.req.json();
  const { workspaceId } = body;
  
  if (!workspaceId) {
    return c.json({ success: false, error: "Workspace ID required" }, 400);
  }
  
  try {
    const result = await testAlertRule(ruleId, userEmail, workspaceId);
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

// Phase 2: Notification Group Actions
notification.post("/groups/:groupId/mark-read", async (c) => {
  const userEmail = c.get("userEmail");
  const groupId = c.req.param("groupId");
  
  try {
    await markGroupAsRead(userEmail, groupId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.post("/groups/:groupId/archive", async (c) => {
  const userEmail = c.get("userEmail");
  const groupId = c.req.param("groupId");
  
  try {
    await archiveGroup(userEmail, groupId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

notification.delete("/groups/:groupId", async (c) => {
  const userEmail = c.get("userEmail");
  const groupId = c.req.param("groupId");
  
  try {
    await deleteGroup(userEmail, groupId);
    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  }
});

export default notification;

