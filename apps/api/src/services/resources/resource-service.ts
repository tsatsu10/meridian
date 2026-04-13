/**
 * Resource Management Service
 * Capacity planning, workload balancing, and allocation management
 * Phase 3.3 - Resource Management System
 */

import { getDatabase } from '../../database/connection';
import { resourceCapacity, resourceAllocation, timeOff, resourceUtilization } from '../../database/schema/resources';
import { tasks } from '../../database/schema';
import { users as usersTable } from '../../database/schema';
import { eq, and, gte, lte, sql, between } from 'drizzle-orm';
import { logger } from '../logging/logger';

interface UserWorkload {
  userId: string;
  userName: string;
  email: string;
  capacity: number; // hours per week
  allocated: number; // hours allocated
  available: number; // hours available
  utilization: number; // percentage
  overallocated: boolean;
  tasks: Array<{
    taskId: string;
    taskTitle: string;
    projectId: string;
    hoursAllocated: number;
    startDate: Date;
    endDate: Date | null;
  }>;
}

interface TeamCapacity {
  totalCapacity: number;
  totalAllocated: number;
  totalAvailable: number;
  averageUtilization: number;
  overallocatedCount: number;
  underutilizedCount: number;
  users: UserWorkload[];
}

export class ResourceService {
  private getDb() {
    return getDatabase();
  }

  /**
   * Get team capacity overview for a workspace
   */
  async getTeamCapacity(
    workspaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TeamCapacity> {
    try {
      // Get all users in workspace with their capacity
      const workspaceUsers = await this.getDb()
        .select()
        .from(usersTable)
        .where(eq(usersTable.workspaceId, workspaceId));

      const userWorkloads: UserWorkload[] = [];
      let totalCapacity = 0;
      let totalAllocated = 0;
      let overallocatedCount = 0;
      let underutilizedCount = 0;

      for (const u of workspaceUsers) {
        const workload = await this.getUserWorkload(u.id, startDate, endDate);
        userWorkloads.push(workload);

        totalCapacity += workload.capacity;
        totalAllocated += workload.allocated;

        if (workload.overallocated) overallocatedCount++;
        if (workload.utilization < 70) underutilizedCount++;
      }

      const totalAvailable = totalCapacity - totalAllocated;
      const averageUtilization = totalCapacity > 0 ? (totalAllocated / totalCapacity) * 100 : 0;

      return {
        totalCapacity,
        totalAllocated,
        totalAvailable,
        averageUtilization,
        overallocatedCount,
        underutilizedCount,
        users: userWorkloads,
      };
    } catch (error: any) {
      logger.error('Failed to get team capacity', { error: error.message, workspaceId });
      throw error;
    }
  }

  /**
   * Get workload for a specific user
   */
  async getUserWorkload(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UserWorkload> {
    try {
      // Get user info
      const [userInfo] = await this.getDb().select().from(usersTable).where(eq(usersTable.id, userId));

      // Get user capacity
      const [capacity] = await this.getDb()
        .select()
        .from(resourceCapacity)
        .where(
          and(
            eq(resourceCapacity.userId, userId),
            eq(resourceCapacity.isActive, true)
          )
        );

      const weeklyCapacity = capacity ? parseFloat(capacity.hoursPerWeek || '40') : 40;

      // Calculate weeks in date range
      const weeks = this.calculateWeeks(startDate, endDate);
      const totalCapacityHours = weeklyCapacity * weeks;

      // Get time off
      const timeOffRecords = await this.getDb()
        .select()
        .from(timeOff)
        .where(
          and(
            eq(timeOff.userId, userId),
            eq(timeOff.status, 'approved'),
            gte(timeOff.endDate, startDate),
            lte(timeOff.startDate, endDate)
          )
        );

      const totalTimeOff = timeOffRecords.reduce(
        (sum, record) => sum + parseFloat(record.hoursOff || '0'),
        0
      );

      const adjustedCapacity = totalCapacityHours - totalTimeOff;

      // Get allocations
      const allocations = await this.getDb()
        .select({
          allocation: resourceAllocation,
          task: task,
        })
        .from(resourceAllocation)
        .leftJoin(task, eq(resourceAllocation.taskId, task.id))
        .where(
          and(
            eq(resourceAllocation.userId, userId),
            eq(resourceAllocation.status, 'active'),
            gte(resourceAllocation.endDate, startDate),
            lte(resourceAllocation.startDate, endDate)
          )
        );

      const totalAllocated = allocations.reduce(
        (sum, alloc) => sum + parseFloat(alloc.allocation.hoursAllocated || '0'),
        0
      );

      const available = adjustedCapacity - totalAllocated;
      const utilization = adjustedCapacity > 0 ? (totalAllocated / adjustedCapacity) * 100 : 0;
      const overallocated = totalAllocated > adjustedCapacity;

      const tasks = allocations.map((alloc) => ({
        taskId: alloc.allocation.taskId || '',
        taskTitle: alloc.task?.title || 'Unassigned',
        projectId: alloc.allocation.projectId,
        hoursAllocated: parseFloat(alloc.allocation.hoursAllocated || '0'),
        startDate: new Date(alloc.allocation.startDate),
        endDate: alloc.allocation.endDate ? new Date(alloc.allocation.endDate) : null,
      }));

      return {
        userId: userInfo.id,
        userName: userInfo.name || 'Unknown',
        email: userInfo.email,
        capacity: adjustedCapacity,
        allocated: totalAllocated,
        available,
        utilization,
        overallocated,
        tasks,
      };
    } catch (error: any) {
      logger.error('Failed to get user workload', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Create resource allocation
   */
  async createAllocation(data: {
    userId: string;
    projectId: string;
    taskId?: string;
    allocationPercentage?: number;
    hoursAllocated: number;
    startDate: Date;
    endDate?: Date;
    createdBy: string;
  }): Promise<any> {
    try {
      const [allocation] = await this.getDb()
        .insert(resourceAllocation)
        .values({
          userId: data.userId,
          projectId: data.projectId,
          taskId: data.taskId,
          allocationPercentage: data.allocationPercentage || 100,
          hoursAllocated: data.hoursAllocated.toString(),
          startDate: data.startDate,
          endDate: data.endDate,
          createdBy: data.createdBy,
          status: 'active',
        })
        .returning();

      logger.info('Resource allocation created', { allocationId: allocation.id });
      return allocation;
    } catch (error: any) {
      logger.error('Failed to create allocation', { error: error.message });
      throw error;
    }
  }

  /**
   * Update resource capacity
   */
  async updateCapacity(data: {
    userId: string;
    workspaceId: string;
    hoursPerDay?: number;
    hoursPerWeek?: number;
    startDate: Date;
    endDate?: Date;
  }): Promise<any> {
    try {
      // Deactivate existing capacity records
      await this.getDb()
        .update(resourceCapacity)
        .set({ isActive: false })
        .where(
          and(
            eq(resourceCapacity.userId, data.userId),
            eq(resourceCapacity.isActive, true)
          )
        );

      // Create new capacity record
      const [capacity] = await this.getDb()
        .insert(resourceCapacity)
        .values({
          userId: data.userId,
          workspaceId: data.workspaceId,
          hoursPerDay: data.hoursPerDay?.toString() || '8.00',
          hoursPerWeek: data.hoursPerWeek?.toString() || '40.00',
          startDate: data.startDate,
          endDate: data.endDate,
          isActive: true,
        })
        .returning();

      logger.info('Resource capacity updated', { userId: data.userId });
      return capacity;
    } catch (error: any) {
      logger.error('Failed to update capacity', { error: error.message });
      throw error;
    }
  }

  /**
   * Request time off
   */
  async requestTimeOff(data: {
    userId: string;
    type: string;
    startDate: Date;
    endDate: Date;
    reason?: string;
  }): Promise<any> {
    try {
      const hoursOff = this.calculateBusinessHours(data.startDate, data.endDate);

      const [timeOffRecord] = await this.getDb()
        .insert(timeOff)
        .values({
          userId: data.userId,
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          hoursOff: hoursOff.toString(),
          reason: data.reason,
          status: 'pending',
        })
        .returning();

      logger.info('Time off requested', { timeOffId: timeOffRecord.id });
      return timeOffRecord;
    } catch (error: any) {
      logger.error('Failed to request time off', { error: error.message });
      throw error;
    }
  }

  /**
   * Approve/deny time off
   */
  async updateTimeOffStatus(
    timeOffId: string,
    status: string,
    approvedBy: string
  ): Promise<any> {
    try {
      const [updated] = await this.getDb()
        .update(timeOff)
        .set({ status, approvedBy })
        .where(eq(timeOff.id, timeOffId))
        .returning();

      logger.info('Time off status updated', { timeOffId, status });
      return updated;
    } catch (error: any) {
      logger.error('Failed to update time off status', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate resource utilization for reporting
   */
  async calculateUtilization(
    workspaceId: string,
    weekStartDate: Date
  ): Promise<void> {
    try {
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      const utilizationUsers = await this.getDb()
        .select()
        .from(usersTable)
        .where(eq(usersTable.workspaceId, workspaceId));

      for (const u of utilizationUsers) {
        const workload = await this.getUserWorkload(u.id, weekStartDate, weekEndDate);

        await this.getDb().insert(resourceUtilization).values({
          userId: u.id,
          workspaceId,
          weekStartDate,
          weekEndDate,
          hoursAvailable: workload.capacity.toString(),
          hoursAllocated: workload.allocated.toString(),
          hoursWorked: '0.00', // TODO: integrate with time tracking
          utilizationRate: workload.utilization.toString(),
        });
      }

      logger.info('Utilization calculated', { workspaceId, weekStartDate });
    } catch (error: any) {
      logger.error('Failed to calculate utilization', { error: error.message });
    }
  }

  /**
   * Helper: Calculate weeks between dates
   */
  private calculateWeeks(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays / 7;
  }

  /**
   * Helper: Calculate business hours between dates
   */
  private calculateBusinessHours(startDate: Date, endDate: Date, hoursPerDay = 8): number {
    let hours = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      // Skip weekends
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        hours += hoursPerDay;
      }
      current.setDate(current.getDate() + 1);
    }

    return hours;
  }

  /**
   * Get allocation suggestions based on availability
   */
  async getAllocationSuggestions(
    workspaceId: string,
    projectId: string,
    requiredHours: number,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ userId: string; userName: string; availableHours: number }>> {
    try {
      const capacity = await this.getTeamCapacity(workspaceId, startDate, endDate);

      // Filter available users and sort by availability
      const suggestions = capacity.users
        .filter((u) => u.available >= requiredHours * 0.5) // At least 50% of required hours
        .sort((a, b) => b.available - a.available)
        .map((u) => ({
          userId: u.userId,
          userName: u.userName,
          availableHours: u.available,
        }));

      return suggestions.slice(0, 5); // Top 5 suggestions
    } catch (error: any) {
      logger.error('Failed to get allocation suggestions', { error: error.message });
      return [];
    }
  }
}

export default ResourceService;



