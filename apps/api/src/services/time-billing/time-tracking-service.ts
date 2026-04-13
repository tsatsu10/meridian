/**
 * Time Tracking Service
 * Manage time entries, timesheets, and billing
 * Phase 3.5 - Advanced Time Tracking & Billing
 */

import { getDatabase } from '../../database/connection';
import { timeEntry, timesheet, billingRate, projectBudget } from '../../database/schema/time-billing';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface TimeEntryData {
  workspaceId: string;
  projectId: string;
  taskId?: string;
  userId: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  isBillable?: boolean;
  tags?: string[];
  notes?: string;
}

interface TimesheetSummary {
  userId: string;
  period: { start: Date; end: Date };
  totalHours: number;
  billableHours: number;
  totalAmount: number;
  entries: any[];
}

export class TimeTrackingService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Start a new time entry
   */
  async startTimer(data: Omit<TimeEntryData, 'endTime'>): Promise<any> {
    try {
      // Get applicable billing rate
      const rate = await this.getBillingRate(data.workspaceId, data.projectId, data.userId);

      const [entry] = await this.getDb()
        .insert(timeEntry)
        .values({
          ...data,
          hourlyRate: rate,
          status: 'active',
          tags: data.tags || [],
        })
        .returning();

      logger.info('Time entry started', { entryId: entry.id, userId: data.userId });
      return entry;
    } catch (error: any) {
      logger.error('Failed to start timer', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop a running time entry
   */
  async stopTimer(entryId: string, endTime?: Date): Promise<any> {
    try {
      const [entry] = await this.getDb()
        .select()
        .from(timeEntry)
        .where(eq(timeEntry.id, entryId));

      if (!entry) {
        throw new Error('Time entry not found');
      }

      const end = endTime || new Date();
      const duration = Math.floor((end.getTime() - entry.startTime.getTime()) / 60000); // Minutes

      const [updated] = await this.getDb()
        .update(timeEntry)
        .set({
          endTime: end,
          duration,
          status: 'stopped',
          updatedAt: new Date(),
        })
        .where(eq(timeEntry.id, entryId))
        .returning();

      logger.info('Time entry stopped', { entryId, duration });
      return updated;
    } catch (error: any) {
      logger.error('Failed to stop timer', { error: error.message });
      throw error;
    }
  }

  /**
   * Update time entry
   */
  async updateTimeEntry(entryId: string, updates: Partial<TimeEntryData>): Promise<any> {
    try {
      // Recalculate duration if times changed
      let duration;
      if (updates.startTime || updates.endTime) {
        const [existing] = await this.getDb().select().from(timeEntry).where(eq(timeEntry.id, entryId));
        const start = updates.startTime || existing.startTime;
        const end = updates.endTime || existing.endTime;
        if (start && end) {
          duration = Math.floor((end.getTime() - start.getTime()) / 60000);
        }
      }

      const [updated] = await this.getDb()
        .update(timeEntry)
        .set({
          ...updates,
          ...(duration !== undefined && { duration }),
          updatedAt: new Date(),
        })
        .where(eq(timeEntry.id, entryId))
        .returning();

      return updated;
    } catch (error: any) {
      logger.error('Failed to update time entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete time entry
   */
  async deleteTimeEntry(entryId: string): Promise<void> {
    try {
      await this.getDb().delete(timeEntry).where(eq(timeEntry.id, entryId));
      logger.info('Time entry deleted', { entryId });
    } catch (error: any) {
      logger.error('Failed to delete time entry', { error: error.message });
      throw error;
    }
  }

  /**
   * Get time entries for a user/project
   */
  async getTimeEntries(filters: {
    workspaceId: string;
    userId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }): Promise<any[]> {
    try {
      let query = this.getDb().select().from(timeEntry).where(eq(timeEntry.workspaceId, filters.workspaceId));

      if (filters.userId) {
        query = query.where(eq(timeEntry.userId, filters.userId));
      }
      if (filters.projectId) {
        query = query.where(eq(timeEntry.projectId, filters.projectId));
      }
      if (filters.startDate) {
        query = query.where(gte(timeEntry.startTime, filters.startDate));
      }
      if (filters.endDate) {
        query = query.where(lte(timeEntry.startTime, filters.endDate));
      }
      if (filters.status) {
        query = query.where(eq(timeEntry.status, filters.status));
      }

      const entries = await query.orderBy(desc(timeEntry.startTime));
      return entries;
    } catch (error: any) {
      logger.error('Failed to get time entries', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate timesheet for a period
   */
  async generateTimesheet(
    workspaceId: string,
    userId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<TimesheetSummary> {
    try {
      const entries = await this.getDb()
        .select()
        .from(timeEntry)
        .where(
          and(
            eq(timeEntry.workspaceId, workspaceId),
            eq(timeEntry.userId, userId),
            gte(timeEntry.startTime, periodStart),
            lte(timeEntry.startTime, periodEnd)
          )
        );

      let totalHours = 0;
      let billableHours = 0;
      let totalAmount = 0;

      entries.forEach((entry) => {
        const hours = (entry.duration || 0) / 60;
        totalHours += hours;

        if (entry.isBillable) {
          billableHours += hours;
          const rate = parseFloat(entry.hourlyRate?.toString() || '0');
          totalAmount += hours * rate;
        }
      });

      return {
        userId,
        period: { start: periodStart, end: periodEnd },
        totalHours: Math.round(totalHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        entries,
      };
    } catch (error: any) {
      logger.error('Failed to generate timesheet', { error: error.message });
      throw error;
    }
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(data: {
    workspaceId: string;
    userId: string;
    periodStart: Date;
    periodEnd: Date;
    notes?: string;
  }): Promise<any> {
    try {
      const summary = await this.generateTimesheet(
        data.workspaceId,
        data.userId,
        data.periodStart,
        data.periodEnd
      );

      const [sheet] = await this.getDb()
        .insert(timesheet)
        .values({
          workspaceId: data.workspaceId,
          userId: data.userId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          status: 'submitted',
          totalHours: summary.totalHours.toString(),
          billableHours: summary.billableHours.toString(),
          totalAmount: summary.totalAmount.toString(),
          submittedAt: new Date(),
          notes: data.notes,
        })
        .returning();

      logger.info('Timesheet submitted', { timesheetId: sheet.id });
      return sheet;
    } catch (error: any) {
      logger.error('Failed to submit timesheet', { error: error.message });
      throw error;
    }
  }

  /**
   * Approve/reject timesheet
   */
  async approveTimesheet(timesheetId: string, approvedBy: string, approved: boolean, reason?: string): Promise<any> {
    try {
      const [updated] = await this.getDb()
        .update(timesheet)
        .set({
          status: approved ? 'approved' : 'rejected',
          approvedBy: approved ? approvedBy : null,
          approvedAt: approved ? new Date() : null,
          rejectionReason: approved ? null : reason,
          updatedAt: new Date(),
        })
        .where(eq(timesheet.id, timesheetId))
        .returning();

      logger.info('Timesheet processed', { timesheetId, approved });
      return updated;
    } catch (error: any) {
      logger.error('Failed to process timesheet', { error: error.message });
      throw error;
    }
  }

  /**
   * Get billing rate for user/project
   */
  async getBillingRate(workspaceId: string, projectId: string, userId: string): Promise<string> {
    try {
      // Try to find specific project-user rate
      let [rate] = await this.getDb()
        .select()
        .from(billingRate)
        .where(
          and(
            eq(billingRate.workspaceId, workspaceId),
            eq(billingRate.projectId, projectId),
            eq(billingRate.userId, userId)
          )
        )
        .orderBy(desc(billingRate.effectiveFrom))
        .limit(1);

      if (!rate) {
        // Fall back to user default rate
        [rate] = await this.getDb()
          .select()
          .from(billingRate)
          .where(and(eq(billingRate.workspaceId, workspaceId), eq(billingRate.userId, userId)))
          .orderBy(desc(billingRate.effectiveFrom))
          .limit(1);
      }

      if (!rate) {
        // Fall back to workspace default
        [rate] = await this.getDb()
          .select()
          .from(billingRate)
          .where(and(eq(billingRate.workspaceId, workspaceId), eq(billingRate.isDefault, true)))
          .limit(1);
      }

      return rate?.hourlyRate?.toString() || '0';
    } catch (error: any) {
      logger.error('Failed to get billing rate', { error: error.message });
      return '0';
    }
  }

  /**
   * Get project budget status
   */
  async getProjectBudgetStatus(projectId: string): Promise<any> {
    try {
      const [budget] = await this.getDb().select().from(projectBudget).where(eq(projectBudget.projectId, projectId));

      if (!budget) {
        return null;
      }

      // Calculate spent amounts
      const entries = await this.getDb()
        .select()
        .from(timeEntry)
        .where(and(eq(timeEntry.projectId, projectId), eq(timeEntry.isBillable, true)));

      let hoursSpent = 0;
      let amountSpent = 0;

      entries.forEach((entry) => {
        const hours = (entry.duration || 0) / 60;
        hoursSpent += hours;
        const rate = parseFloat(entry.hourlyRate?.toString() || '0');
        amountSpent += hours * rate;
      });

      const totalBudget = parseFloat(budget.totalBudget?.toString() || '0');
      const hoursBudget = parseFloat(budget.hoursBudget?.toString() || '0');
      const percentSpent = totalBudget > 0 ? (amountSpent / totalBudget) * 100 : 0;
      const hoursPercentSpent = hoursBudget > 0 ? (hoursSpent / hoursBudget) * 100 : 0;

      return {
        ...budget,
        hoursSpent: Math.round(hoursSpent * 100) / 100,
        amountSpent: Math.round(amountSpent * 100) / 100,
        percentSpent: Math.round(percentSpent * 100) / 100,
        hoursPercentSpent: Math.round(hoursPercentSpent * 100) / 100,
        isOverBudget: percentSpent > 100,
        isNearThreshold: percentSpent >= (budget.alertThreshold || 80),
      };
    } catch (error: any) {
      logger.error('Failed to get budget status', { error: error.message });
      throw error;
    }
  }
}

export default TimeTrackingService;



