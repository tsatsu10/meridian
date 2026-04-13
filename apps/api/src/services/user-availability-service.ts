/**
 * 🟢 User Availability Service
 * 
 * Manages user availability status, working hours, and timezone
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import { userAvailability, users } from "../database/schema";
import { eq } from "drizzle-orm";
import logger from "../utils/logger";

export interface AvailabilityUpdate {
  status?: 'available' | 'away' | 'busy' | 'do_not_disturb' | 'offline';
  statusMessage?: string;
  statusEmoji?: string;
  autoStatus?: boolean;
  manualStatusUntil?: Date;
  timezone?: string;
  workingHoursStart?: string; // HH:MM format
  workingHoursEnd?: string; // HH:MM format
  workingDays?: string[]; // ['monday', 'tuesday', ...]
}

/**
 * Get user availability
 */
export async function getUserAvailability(userId: string): Promise<any> {
  const db = getDatabase();

  try {
    const [availability] = await db
      .select()
      .from(userAvailability)
      .where(eq(userAvailability.userId, userId));

    // Get user's timezone from profile if not in availability
    if (!availability) {
      // Create default availability
      const defaultAvailability = await db
        .insert(userAvailability)
        .values({
          id: createId(),
          userId,
          status: "available",
          autoStatus: true,
          timezone: "UTC",
          workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        })
        .returning();

      return defaultAvailability[0];
    }

    // Check if manual status has expired
    if (
      availability.manualStatusUntil &&
      new Date(availability.manualStatusUntil) < new Date()
    ) {
      // Reset to auto status
      await db
        .update(userAvailability)
        .set({
          autoStatus: true,
          manualStatusUntil: null,
          status: "available",
        })
        .where(eq(userAvailability.userId, userId));

      return { ...availability, autoStatus: true, status: "available" };
    }

    return availability;
  } catch (error) {
    logger.error("Error getting user availability:", error);
    throw error;
  }
}

/**
 * Update user availability
 */
export async function updateUserAvailability(
  userId: string,
  data: AvailabilityUpdate
): Promise<any> {
  const db = getDatabase();

  try {
    // Check if availability exists
    const existing = await db
      .select()
      .from(userAvailability)
      .where(eq(userAvailability.userId, userId));

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    if (existing.length === 0) {
      // Create new
      const created = await db
        .insert(userAvailability)
        .values({
          id: createId(),
          userId,
          ...updateData,
        })
        .returning();

      return created[0];
    } else {
      // Update existing
      const updated = await db
        .update(userAvailability)
        .set(updateData)
        .where(eq(userAvailability.userId, userId))
        .returning();

      return updated[0];
    }
  } catch (error) {
    logger.error("Error updating user availability:", error);
    throw error;
  }
}

/**
 * Get current local time for user based on timezone
 */
export function getCurrentLocalTime(timezone: string): string {
  try {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    logger.error("Error getting local time:", error);
    return "Unknown";
  }
}

/**
 * Check if user is currently in working hours
 */
export function isInWorkingHours(availability: any): boolean {
  if (!availability) return false;

  try {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "lowercase" });

    // Check if today is a working day
    const workingDays = availability.workingDays || [];
    if (!workingDays.includes(dayOfWeek)) {
      return false;
    }

    // Check if current time is within working hours
    const workingHoursStart = availability.workingHoursStart; // "09:00"
    const workingHoursEnd = availability.workingHoursEnd; // "17:00"

    if (!workingHoursStart || !workingHoursEnd) {
      return true; // Default to always available if not set
    }

    const currentTime = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    return currentTime >= workingHoursStart && currentTime <= workingHoursEnd;
  } catch (error) {
    logger.error("Error checking working hours:", error);
    return false;
  }
}

/**
 * Auto-update status based on activity
 */
export async function updateAutoStatus(userId: string): Promise<void> {
  const db = getDatabase();

  try {
    const availability = await getUserAvailability(userId);

    if (!availability.autoStatus) {
      return; // Manual status is set
    }

    // Get user's last activity
    const [user] = await db
      .select({ lastSeen: users.lastSeen })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.lastSeen) {
      return;
    }

    const lastSeenTime = new Date(user.lastSeen).getTime();
    const now = Date.now();
    const minutesSinceLastSeen = (now - lastSeenTime) / (1000 * 60);

    let newStatus = "available";

    if (minutesSinceLastSeen > 30) {
      newStatus = "away";
    }

    if (minutesSinceLastSeen > 120) {
      newStatus = "offline";
    }

    // Check working hours
    const inWorkingHours = isInWorkingHours(availability);
    if (!inWorkingHours && newStatus === "available") {
      newStatus = "away";
    }

    // Update status if changed
    if (newStatus !== availability.status) {
      await db
        .update(userAvailability)
        .set({ status: newStatus })
        .where(eq(userAvailability.userId, userId));
    }
  } catch (error) {
    logger.error("Error updating auto status:", error);
  }
}

