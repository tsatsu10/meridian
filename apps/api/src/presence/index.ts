// @epic-4.2-presence: Enhanced presence system API routes
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { updateUserPresence,
  getUserPresence,
  getOnlineUsers,
  setCustomStatus,
  clearCustomStatus,
  setDoNotDisturb,
  updateWorkingHours,
  getPresenceHistory,
  getWorkspacePresenceAnalytics,
  cleanupExpiredStatuses } from "../realtime/controllers/user-presence";
import logger from '../utils/logger';

const presence = new Hono<{ Variables: { userEmail: string } }>()
  // Get all user presence in workspace
  .get(
    "/workspace/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      try {
        const { workspaceId } = c.req.valid("param");
        const userPresence = await getUserPresence(workspaceId);
        return c.json({ success: true, data: userPresence });
      } catch (error) {
        logger.error('❌ Get workspace presence error:', error);
        return c.json({ error: "Failed to get workspace presence" }, 500);
      }
    }
  )
  
  // Get online users in workspace
  .get(
    "/workspace/:workspaceId/online",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      try {
        const { workspaceId } = c.req.valid("param");
        const onlineUsers = await getOnlineUsers(workspaceId);
        return c.json({ success: true, data: onlineUsers });
      } catch (error) {
        logger.error('❌ Get online users error:', error);
        return c.json({ error: "Failed to get online users" }, 500);
      }
    }
  )

  // Update user presence
  .put(
    "/workspace/:workspaceId/user/:userEmail",
    zValidator("param", z.object({ 
      workspaceId: z.string(),
      userEmail: z.string().email(),
    })),
    zValidator("json", z.object({
      status: z.enum(["online", "offline", "away", "busy", "do_not_disturb", "custom"]),
      socketId: z.string().nullable().optional(),
      currentPage: z.string().optional(),
      customStatusMessage: z.string().optional(),
      customStatusEmoji: z.string().optional(),
      statusExpiresAt: z.string().datetime().optional(),
      isStatusVisible: z.boolean().optional(),
      lastActivityType: z.string().optional(),
      lastActivityDetails: z.string().optional(),
      timezone: z.string().optional(),
      workingHours: z.string().optional(),
      doNotDisturbUntil: z.string().datetime().optional(),
      changeReason: z.string().optional(),
    })),
    async (c) => {
      try {
        const { workspaceId, userEmail } = c.req.valid("param");
        const updateData = c.req.valid("json");
        
        const updatedPresence = await updateUserPresence({
          userEmail,
          workspaceId,
          status: updateData.status,
          socketId: updateData.socketId || null,
          currentPage: updateData.currentPage,
          customStatusMessage: updateData.customStatusMessage,
          customStatusEmoji: updateData.customStatusEmoji,
          statusExpiresAt: updateData.statusExpiresAt ? new Date(updateData.statusExpiresAt) : undefined,
          isStatusVisible: updateData.isStatusVisible,
          lastActivityType: updateData.lastActivityType,
          lastActivityDetails: updateData.lastActivityDetails,
          timezone: updateData.timezone,
          workingHours: updateData.workingHours,
          doNotDisturbUntil: updateData.doNotDisturbUntil ? new Date(updateData.doNotDisturbUntil) : undefined,
          changeReason: updateData.changeReason,
        });

        return c.json({ success: true, data: updatedPresence });
      } catch (error) {
        logger.error('❌ Update user presence error:', error);
        return c.json({ error: "Failed to update user presence" }, 500);
      }
    }
  )

  // Set custom status
  .post(
    "/workspace/:workspaceId/user/:userEmail/status",
    zValidator("param", z.object({ 
      workspaceId: z.string(),
      userEmail: z.string().email(),
    })),
    zValidator("json", z.object({
      statusMessage: z.string().optional(),
      statusEmoji: z.string().optional(),
      expiresAt: z.string().datetime().optional(),
      isVisible: z.boolean().optional(),
    })),
    async (c) => {
      try {
        const { workspaceId, userEmail } = c.req.valid("param");
        const statusData = c.req.valid("json");
        
        const updatedPresence = await setCustomStatus({
          userEmail,
          workspaceId,
          statusMessage: statusData.statusMessage,
          statusEmoji: statusData.statusEmoji,
          expiresAt: statusData.expiresAt ? new Date(statusData.expiresAt) : undefined,
          isVisible: statusData.isVisible,
        });

        return c.json({ success: true, data: updatedPresence });
      } catch (error) {
        logger.error('❌ Set custom status error:', error);
        return c.json({ error: "Failed to set custom status" }, 500);
      }
    }
  )

  // Clear custom status
  .delete(
    "/workspace/:workspaceId/user/:userEmail/status",
    zValidator("param", z.object({ 
      workspaceId: z.string(),
      userEmail: z.string().email(),
    })),
    async (c) => {
      try {
        const { workspaceId, userEmail } = c.req.valid("param");
        
        const updatedPresence = await clearCustomStatus(userEmail, workspaceId);
        return c.json({ success: true, data: updatedPresence });
      } catch (error) {
        logger.error('❌ Clear custom status error:', error);
        return c.json({ error: "Failed to clear custom status" }, 500);
      }
    }
  )

  // Set do not disturb
  .post(
    "/workspace/:workspaceId/user/:userEmail/dnd",
    zValidator("param", z.object({ 
      workspaceId: z.string(),
      userEmail: z.string().email(),
    })),
    zValidator("json", z.object({
      until: z.string().datetime().optional(),
    })),
    async (c) => {
      try {
        const { workspaceId, userEmail } = c.req.valid("param");
        const { until } = c.req.valid("json");
        
        const updatedPresence = await setDoNotDisturb(
          userEmail, 
          workspaceId, 
          until ? new Date(until) : undefined
        );

        return c.json({ success: true, data: updatedPresence });
      } catch (error) {
        logger.error('❌ Set do not disturb error:', error);
        return c.json({ error: "Failed to set do not disturb" }, 500);
      }
    }
  )

  // Update working hours
  .put(
    "/workspace/:workspaceId/user/:userEmail/working-hours",
    zValidator("param", z.object({ 
      workspaceId: z.string(),
      userEmail: z.string().email(),
    })),
    zValidator("json", z.object({
      workingHours: z.string(),
      timezone: z.string().optional(),
    })),
    async (c) => {
      try {
        const { workspaceId, userEmail } = c.req.valid("param");
        const { workingHours, timezone } = c.req.valid("json");
        
        const updatedPresence = await updateWorkingHours(
          userEmail, 
          workspaceId, 
          workingHours,
          timezone
        );

        return c.json({ success: true, data: updatedPresence });
      } catch (error) {
        logger.error('❌ Update working hours error:', error);
        return c.json({ error: "Failed to update working hours" }, 500);
      }
    }
  )

  // Get user presence history
  .get(
    "/workspace/:workspaceId/user/:userEmail/history",
    zValidator("param", z.object({ 
      workspaceId: z.string(),
      userEmail: z.string().email(),
    })),
    zValidator("query", z.object({
      limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
    })),
    async (c) => {
      try {
        const { workspaceId, userEmail } = c.req.valid("param");
        const { limit } = c.req.valid("query");
        
        const history = await getPresenceHistory(userEmail, workspaceId, limit);
        return c.json({ success: true, data: history });
      } catch (error) {
        logger.error('❌ Get presence history error:', error);
        return c.json({ error: "Failed to get presence history" }, 500);
      }
    }
  )

  // Get workspace presence analytics
  .get(
    "/workspace/:workspaceId/analytics",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator("query", z.object({
      fromDate: z.string().datetime().optional(),
      toDate: z.string().datetime().optional(),
    })),
    async (c) => {
      try {
        const { workspaceId } = c.req.valid("param");
        const { fromDate, toDate } = c.req.valid("query");
        
        const analytics = await getWorkspacePresenceAnalytics(
          workspaceId,
          fromDate ? new Date(fromDate) : undefined,
          toDate ? new Date(toDate) : undefined
        );

        return c.json({ success: true, data: analytics });
      } catch (error) {
        logger.error('❌ Get presence analytics error:', error);
        return c.json({ error: "Failed to get presence analytics" }, 500);
      }
    }
  )

  // Admin endpoint to cleanup expired statuses
  .post(
    "/admin/cleanup-expired",
    async (c) => {
      try {
        const expiredStatuses = await cleanupExpiredStatuses();
        return c.json({ 
          success: true, 
          message: `Cleaned up ${expiredStatuses.length} expired statuses`,
          data: expiredStatuses 
        });
      } catch (error) {
        logger.error('❌ Cleanup expired statuses error:', error);
        return c.json({ error: "Failed to cleanup expired statuses" }, 500);
      }
    }
  );

export default presence;

