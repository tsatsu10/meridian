/**
 * 🔔 Notification Delivery Service
 *
 * Delivers notifications based on user preferences:
 * - In-app notifications
 * - Email notifications (via SMTP email service)
 *
 * Integrates with time-based controls (quiet hours, work schedule)
 * and user notification preferences.
 */

import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  userPreferencesExtendedTable,
  userSettingsTable,
} from "../../database/schema";
import logger from "../../utils/logger";
import { DEFAULT_API_PORT } from "../../config/default-api-port";
import emailService from "../../services/email-service";
import createNotification from "../controllers/create-notification";

export interface NotificationPayload {
  userEmail: string;
  title: string;
  content: string;
  type: string;
  priority?: "low" | "medium" | "high" | "urgent";
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  channel: string;
  success: boolean;
  message?: string;
  error?: string;
}

export class NotificationDeliveryService {
  /**
   * Main delivery method that checks preferences and delivers notifications
   */
  static async deliverNotification(
    payload: NotificationPayload,
    workspaceId?: string,
  ): Promise<{
    success: boolean;
    results: DeliveryResult[];
    skippedReason?: string;
  }> {
    try {
      const results: DeliveryResult[] = [];

      // Check if notification should be delivered based on time-based controls
      const timingValidation =
        await NotificationDeliveryService.validateNotificationTiming(
          payload.userEmail,
          payload.priority || "medium",
        );

      if (!timingValidation.canSend) {
        return {
          success: false,
          results: [],
          skippedReason: timingValidation.reasons.join(", "),
        };
      }

      // Get user notification preferences
      const preferences =
        await NotificationDeliveryService.getUserNotificationPreferences(
          payload.userEmail,
        );

      // Get user notification settings (the enhanced settings)
      const settings =
        await NotificationDeliveryService.getUserNotificationSettings(
          payload.userEmail,
        );

      // Always create in-app notification if enabled
      if (preferences.channels?.inApp !== false && settings.inApp) {
        try {
          await createNotification({
            userEmail: payload.userEmail,
            title: payload.title,
            content: payload.content,
            type: payload.type,
            priority: payload.priority,
            resourceId: payload.resourceId,
            resourceType: payload.resourceType,
          });

          results.push({
            channel: "inApp",
            success: true,
            message: "In-app notification created",
          });
        } catch (error) {
          results.push({
            channel: "inApp",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Check if this notification type should be sent
      const shouldSendForType =
        NotificationDeliveryService.shouldSendNotificationType(
          payload.type,
          preferences,
          settings,
        );

      if (!shouldSendForType) {
        return {
          success: true,
          results,
          skippedReason: `Notification type '${payload.type}' is disabled in user preferences`,
        };
      }

      // Send email notification if enabled
      if (preferences.channels?.email !== false && settings.email) {
        const emailResult =
          await NotificationDeliveryService.sendEmailNotification(
            payload,
            workspaceId,
          );
        results.push(emailResult);
      }

      // Record analytics event
      await NotificationDeliveryService.recordAnalyticsEvent(
        payload.userEmail,
        {
          eventType: "sent",
          notificationType: payload.type,
          channel: "multi",
          action: "deliver",
          metadata: {
            channelsAttempted: results.length,
            channelsSuccessful: results.filter((r) => r.success).length,
            priority: payload.priority,
          },
        },
      );

      return {
        success: results.some((r) => r.success),
        results,
      };
    } catch (error) {
      logger.error("Failed to deliver notification:", error);
      return {
        success: false,
        results: [
          {
            channel: "system",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        ],
      };
    }
  }

  /**
   * Validate notification timing against user's schedule
   */
  private static async validateNotificationTiming(
    userEmail: string,
    priority: string,
  ): Promise<{ canSend: boolean; reasons: string[] }> {
    try {
      const now = new Date();
      const reasons: string[] = [];
      const db = await getDatabase();

      // Get quiet hours and work schedule
      const [quietHoursData, workScheduleData] = await Promise.all([
        db
          .select()
          .from(userPreferencesExtendedTable)
          .where(
            and(
              eq(userPreferencesExtendedTable.userId, userEmail),
              eq(userPreferencesExtendedTable.preferenceType, "quiet-hours"),
            ),
          )
          .limit(1),
        db
          .select()
          .from(userPreferencesExtendedTable)
          .where(
            and(
              eq(userPreferencesExtendedTable.userId, userEmail),
              eq(userPreferencesExtendedTable.preferenceType, "work-schedule"),
            ),
          )
          .limit(1),
      ]);

      const quietHours = quietHoursData[0]
        ? JSON.parse(quietHoursData[0].preferenceData)
        : null;
      const workSchedule = workScheduleData[0]
        ? JSON.parse(workScheduleData[0].preferenceData)
        : null;

      // Check quiet hours
      if (quietHours?.enabled) {
        const currentDay = now
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        const inQuietHoursDay = quietHours.weekdays.includes(currentDay);
        const inQuietHoursTime = NotificationDeliveryService.isTimeInRange(
          currentTime,
          quietHours.startTime,
          quietHours.endTime,
        );

        if (inQuietHoursDay && inQuietHoursTime) {
          if (priority === "urgent" && quietHours.allowUrgent) {
            reasons.push(
              "Sent during quiet hours (urgent notification allowed)",
            );
          } else {
            return { canSend: false, reasons: ["Currently in quiet hours"] };
          }
        }
      }

      // Check work schedule
      if (workSchedule?.enabled && !workSchedule.allowOutsideHours) {
        const currentDay = now
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

        const isWorkingDay = workSchedule.workingDays.includes(currentDay);
        const isWorkingHours = NotificationDeliveryService.isTimeInRange(
          currentTime,
          workSchedule.startTime,
          workSchedule.endTime,
        );

        // Check lunch break
        let isLunchBreak = false;
        if (workSchedule.lunchBreak?.enabled && isWorkingDay) {
          isLunchBreak = NotificationDeliveryService.isTimeInRange(
            currentTime,
            workSchedule.lunchBreak.startTime,
            workSchedule.lunchBreak.endTime,
          );
        }

        if (!isWorkingDay || !isWorkingHours || isLunchBreak) {
          return { canSend: false, reasons: ["Outside of work hours"] };
        }
      }

      return { canSend: true, reasons };
    } catch (error) {
      logger.error("Error validating notification timing:", error);
      return {
        canSend: true,
        reasons: ["Failed to validate timing - allowing delivery"],
      };
    }
  }

  /**
   * Get user notification preferences
   */
  private static async getUserNotificationPreferences(userEmail: string) {
    try {
      const db = await getDatabase();
      const prefs = await db
        .select()
        .from(userPreferencesExtendedTable)
        .where(
          and(
            eq(userPreferencesExtendedTable.userId, userEmail),
            eq(userPreferencesExtendedTable.preferenceType, "notifications"),
          ),
        )
        .limit(1);

      const [prefsRow] = prefs;
      if (!prefsRow) {
        return {
          channels: { inApp: true, email: true, push: false, slack: false },
          types: {
            task: true,
            mention: true,
            comment: true,
            "project-update": true,
          },
          digestFrequency: "immediate",
        };
      }

      return JSON.parse(prefsRow.preferenceData);
    } catch (error) {
      logger.error("Error getting notification preferences:", error);
      return {
        channels: { inApp: true, email: true, push: false, slack: false },
        types: {
          task: true,
          mention: true,
          comment: true,
          "project-update": true,
        },
        digestFrequency: "immediate",
      };
    }
  }

  /**
   * Get user notification settings (enhanced settings)
   */
  private static async getUserNotificationSettings(userEmail: string) {
    try {
      const db = await getDatabase();
      const settings = await db
        .select()
        .from(userSettingsTable)
        .where(
          and(
            eq(userSettingsTable.userEmail, userEmail),
            eq(userSettingsTable.section, "notifications"),
          ),
        )
        .limit(1);

      const [settingsRow] = settings;
      if (!settingsRow) {
        return {
          email: { taskAssigned: true, taskCompleted: true, mentions: true },
          push: { taskAssigned: true, mentions: true },
          inApp: { taskAssigned: true, taskCompleted: true, mentions: true },
          soundEnabled: true,
        };
      }

      return JSON.parse(settingsRow.settings);
    } catch (error) {
      logger.error("Error getting notification settings:", error);
      return {
        email: { taskAssigned: true, taskCompleted: true, mentions: true },
        push: { taskAssigned: true, mentions: true },
        inApp: { taskAssigned: true, taskCompleted: true, mentions: true },
        soundEnabled: true,
      };
    }
  }

  /**
   * Check if notification type should be sent based on preferences
   */
  private static shouldSendNotificationType(
    notificationType: string,
    preferences: { types?: Record<string, unknown> },
    settings: Record<string, unknown> | null,
  ): boolean {
    // Map notification types to settings keys
    const typeMapping: Record<string, string> = {
      task: "taskAssigned",
      "task.created": "taskAssigned",
      "task.assigned": "taskAssigned",
      "task.completed": "taskCompleted",
      "task.status_changed": "taskCompleted",
      mention: "mentions",
      comment: "comments",
      project: "projectUpdates",
      workspace: "projectUpdates",
    };

    const settingKey = typeMapping[notificationType] || "taskAssigned";

    // Check both preferences and settings
    const typeEnabled = preferences.types?.[notificationType] !== false;
    const settingEnabled = Object.values(settings || {}).some(
      (channelSettings) =>
        (channelSettings as Record<string, unknown>)[settingKey] === true,
    );

    return typeEnabled && settingEnabled;
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(
    payload: NotificationPayload,
    _workspaceId?: string,
  ): Promise<DeliveryResult> {
    try {
      const sent = await emailService.sendNotificationEmail(
        payload.userEmail,
        payload.title,
        payload.content,
      );

      return {
        channel: "email",
        success: sent,
        message: sent
          ? "Email notification sent"
          : "Email service not configured",
      };
    } catch (error) {
      return {
        channel: "email",
        success: false,
        error: error instanceof Error ? error.message : "Email delivery failed",
      };
    }
  }

  /**
   * Record analytics event
   */
  private static async recordAnalyticsEvent(
    userEmail: string,
    event: {
      eventType: string;
      notificationType: string;
      channel: string;
      action: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    try {
      // This would call the analytics recording endpoint we created
      const baseUrl =
        process.env.API_BASE_URL || `http://localhost:${DEFAULT_API_PORT}`;
      await fetch(`${baseUrl}/api/settings/${userEmail}/analytics/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch (error) {
      logger.error("Failed to record analytics event:", error);
      // Don't throw error - analytics recording shouldn't fail notification delivery
    }
  }

  // Helper methods
  private static isTimeInRange(
    timeStr: string,
    startTime: string,
    endTime: string,
  ): boolean {
    const [timeHour = 0, timeMin = 0] = timeStr.split(":").map(Number);
    const [startHour = 0, startMin = 0] = startTime.split(":").map(Number);
    const [endHour = 0, endMin = 0] = endTime.split(":").map(Number);

    const timeMinutes = timeHour * 60 + timeMin;
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight ranges (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
    }
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }
}
