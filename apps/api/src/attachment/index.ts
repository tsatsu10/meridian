import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import createAttachment from "./controllers/create-attachment";
import deleteAttachment from "./controllers/delete-attachment";
import getAttachments from "./controllers/get-attachments";
import getAttachmentById from "./controllers/get-attachment-by-id";
import updateAttachment from "./controllers/update-attachment";
import uploadFile from "./controllers/upload-file";
import { getDatabase } from "../database/connection";
import { attachmentTable } from "../database/schema";
import { eq, desc } from "drizzle-orm";
import logger from '../utils/logger';

const attachmentCore = new Hono<{ Variables: { userEmail: string } }>()
  .get(
    "/",
    zValidator("query", z.object({
      workspaceId: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      limit: z.string().optional(),
    })),
    async (c) => {
      const { workspaceId, projectId, taskId, limit } = c.req.valid("query");
      const limitNum = limit ? parseInt(limit) : 50;

      try {
        const db = getDatabase();
        // Fetch attachments by taskId
        if (taskId) {
          const attachments = await db
            .select()
            .from(attachmentTable)
            .where(eq(attachmentTable.taskId, taskId))
            .orderBy(desc(attachmentTable.createdAt))
            .limit(limitNum);
          return c.json(attachments);
        }

        // Fetch attachments by projectId
        if (projectId) {
          const attachments = await db
            .select()
            .from(attachmentTable)
            .where(eq(attachmentTable.projectId, projectId))
            .orderBy(desc(attachmentTable.createdAt))
            .limit(limitNum);
          return c.json(attachments);
        }

        // Fetch attachments by workspaceId
        if (workspaceId) {
          const attachments = await db
            .select()
            .from(attachmentTable)
            .where(eq(attachmentTable.workspaceId, workspaceId))
            .orderBy(desc(attachmentTable.createdAt))
            .limit(limitNum);
          return c.json(attachments);
        }

        // Otherwise return empty array
        return c.json([]);
      } catch (error) {
        logger.error('❌ Get attachments error:', error);
        return c.json({ error: "Failed to get attachments" }, 500);
      }
    }
  )
  // @epic-2.1-files: Get all attachments for a task
  .get(
    "/task/:taskId",
    zValidator("param", z.object({ taskId: z.string() })),
    async (c) => {
      try {
      const { taskId } = c.req.valid("param");
      const attachments = await getAttachments(taskId);
      return c.json(attachments);
      } catch (error) {
        logger.error('❌ Get task attachments error:', error);
        return c.json({ error: "Failed to get attachments" }, 500);
      }
    },
  )
  // @epic-2.1-files: Get all attachments for a comment
  .get(
    "/comment/:commentId",
    zValidator("param", z.object({ commentId: z.string() })),
    async (c) => {
      try {
      const { commentId } = c.req.valid("param");
      const attachments = await getAttachments(null, commentId);
      return c.json(attachments);
      } catch (error) {
        logger.error('❌ Get comment attachments error:', error);
        return c.json({ error: "Failed to get attachments" }, 500);
      }
    },
  )
  // @epic-2.1-files: Get specific attachment by ID
  .get(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    async (c) => {
      try {
      const { id } = c.req.valid("param");
      const attachment = await getAttachmentById(id);
      return c.json(attachment);
      } catch (error) {
        logger.error('❌ Get attachment by ID error:', error);
        return c.json({ error: "Failed to get attachment" }, 500);
      }
    },
  )
  // @epic-2.1-files: Upload file and create attachment
  .post(
    "/upload",
    async (c) => {
      logger.debug('📎 ATTACHMENT UPLOAD ROUTE HIT!');
      logger.debug('📎 Request method:', c.req.method);
      logger.debug('📎 Request URL:', c.req.url);
      logger.debug('📎 Request headers:', JSON.stringify(Object.fromEntries(Object.entries(c.req.header()))));
      
      try {
        logger.debug('📎 Parsing request body...');
      const body = await c.req.parseBody();
        logger.debug('📎 Body parsed successfully');
        logger.debug('📎 Body keys:', Object.keys(body));
        logger.debug('📎 Body content:', body);
        
      const file = body.file as File;
      const taskId = body.taskId as string;
      const commentId = body.commentId as string;
      const userEmail = body.userEmail as string;
      const description = body.description as string;
      const version = body.version as string;

        logger.debug('📎 Extracted form data:', {
          hasFile: !!file,
          fileName: file?.name,
          fileSize: file?.size,
          fileType: typeof file,
          fileConstructor: file?.constructor?.name,
          taskId,
          commentId,
          userEmail,
          description,
          version
        });

      if (!file) {
          logger.debug('📎 ERROR: No file provided');
          logger.debug('📎 File value:', file);
          logger.debug('📎 File type:', typeof file);
        return c.json({ error: "No file provided" }, 400);
      }

      if (!userEmail) {
          logger.debug('📎 ERROR: No user email provided');
        return c.json({ error: "User email required" }, 400);
      }

      if (!taskId && !commentId) {
          logger.debug('📎 ERROR: No taskId or commentId provided');
        return c.json({ error: "Either taskId or commentId required" }, 400);
      }

        logger.debug('📎 Starting file upload...');
      const uploadResult = await uploadFile(file, userEmail);
        logger.debug('📎 File upload completed:', uploadResult);
      
        logger.debug('📎 Creating attachment record...');
      const attachment = await createAttachment({
        name: file.name,
        url: uploadResult.url,
        type: file.type,
        size: file.size,
        taskId: taskId || null,
        commentId: commentId || null,
        userEmail,
        description: description || null,
        version: version || "1.0",
      });
        logger.debug('📎 Attachment record created:', attachment);

      return c.json(attachment);
      } catch (error) {
        logger.error('❌ Upload attachment error:', error);
        if (error instanceof Error) {
          return c.json({ error: `Failed to upload attachment: ${error.message}` }, 500);
        }
        return c.json({ error: "Failed to upload attachment" }, 500);
      }
    },
  )
  // @epic-2.1-files: Update attachment metadata
  .put(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        userEmail: z.string(),
      }),
    ),
    async (c) => {
      try {
      const { id } = c.req.valid("param");
      const { name, description, userEmail } = c.req.valid("json");

      const attachment = await updateAttachment(id, {
        name,
        description,
        userEmail,
      });

      return c.json(attachment);
      } catch (error) {
        logger.error('❌ Update attachment error:', error);
        return c.json({ error: "Failed to update attachment" }, 500);
      }
    },
  )
  // @epic-2.1-files: Delete attachment
  .delete(
    "/:id",
    zValidator("param", z.object({ id: z.string() })),
    zValidator(
      "json",
      z.object({
        userEmail: z.string(),
      }),
    ),
    async (c) => {
      try {
      const { id } = c.req.valid("param");
      const { userEmail } = c.req.valid("json");

      await deleteAttachment(id, userEmail);

      return c.json({ message: "Attachment deleted successfully" });
      } catch (error) {
        logger.error('❌ Delete attachment error:', error);
        return c.json({ error: "Failed to delete attachment" }, 500);
      }
    },
  );

const attachment = new Hono<{ Variables: { userEmail: string } }>();
attachment.all("/annotations", (c) =>
  c.json(
    {
      error: "Attachment annotations are not available.",
      code: "NOT_IMPLEMENTED",
    },
    501,
  ),
);
attachment.all("/annotations/*", (c) =>
  c.json(
    {
      error: "Attachment annotations are not available.",
      code: "NOT_IMPLEMENTED",
    },
    501,
  ),
);
attachment.route("/", attachmentCore);

export default attachment; 
