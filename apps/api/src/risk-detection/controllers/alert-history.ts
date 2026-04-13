import { getDatabase } from "../../database/connection";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { riskAlerts } from "../../database/schema-features";
import logger from '../../utils/logger';

// Alert history using riskAlerts table
interface AlertHistoryEntry {
  id: string;
  alertId: string;
  alertType: 'overdue' | 'blocked' | 'resource_conflict' | 'deadline_risk' | 'dependency_chain' | 'quality_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged' | 'dismissed';
  title: string;
  description: string;
  workspaceId: string;
  affectedTasks: string[];
  affectedProjects: string[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  resolutionTimeMs?: number;
  riskScore: number;
}

interface AlertHistoryParams {
  workspaceId: string;
  limit?: number;
  offset?: number;
  status?: 'active' | 'resolved' | 'acknowledged' | 'dismissed';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  alertType?: 'overdue' | 'blocked' | 'resource_conflict' | 'deadline_risk' | 'dependency_chain' | 'quality_risk';
}

export async function getAlertHistory(params: AlertHistoryParams): Promise<{
  alerts: AlertHistoryEntry[];
  total: number;
  statistics: {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    averageResolutionTimeHours: number;
    criticalAlerts: number;
  };
}> {
  const { workspaceId, limit = 50, offset = 0, status, severity, alertType } = params;

  try {
    const db = getDatabase();

    // Build filters
    const filters = [eq(riskAlerts.workspaceId, workspaceId)];

    if (status) {
      filters.push(eq(riskAlerts.status, status));
    }

    if (severity) {
      filters.push(eq(riskAlerts.severity, severity));
    }

    if (alertType) {
      filters.push(eq(riskAlerts.alertType, alertType));
    }

    // Get total count for statistics
    const [totalCount] = await db
      .select({ count: count() })
      .from(riskAlerts)
      .where(and(...filters));

    // Get paginated alerts
    const alerts = await db
      .select()
      .from(riskAlerts)
      .where(and(...filters))
      .orderBy(desc(riskAlerts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get statistics - query each separately for accuracy
    const [activeCount] = await db
      .select({ count: count() })
      .from(riskAlerts)
      .where(
        and(
          eq(riskAlerts.workspaceId, workspaceId),
          eq(riskAlerts.status, 'active')
        )
      );

    const [resolvedCount] = await db
      .select({ count: count() })
      .from(riskAlerts)
      .where(
        and(
          eq(riskAlerts.workspaceId, workspaceId),
          eq(riskAlerts.status, 'resolved')
        )
      );

    const [criticalCount] = await db
      .select({ count: count() })
      .from(riskAlerts)
      .where(
        and(
          eq(riskAlerts.workspaceId, workspaceId),
          eq(riskAlerts.severity, 'critical')
        )
      );

    // Calculate average resolution time for resolved alerts
    const resolvedAlerts = await db
      .select({
        createdAt: riskAlerts.createdAt,
        resolvedAt: riskAlerts.resolvedAt,
      })
      .from(riskAlerts)
      .where(
        and(
          eq(riskAlerts.workspaceId, workspaceId),
          eq(riskAlerts.status, 'resolved'),
          sql`${riskAlerts.resolvedAt} IS NOT NULL`
        )
      );

    let averageResolutionTimeHours = 0;
    if (resolvedAlerts.length > 0) {
      const totalResolutionTimeMs = resolvedAlerts.reduce((sum, alert) => {
        if (alert.resolvedAt && alert.createdAt) {
          const resolutionTime = alert.resolvedAt.getTime() - alert.createdAt.getTime();
          return sum + resolutionTime;
        }
        return sum;
      }, 0);
      
      const avgMs = totalResolutionTimeMs / resolvedAlerts.length;
      averageResolutionTimeHours = Math.round((avgMs / (1000 * 60 * 60)) * 10) / 10;
    }

    // Transform alerts to match interface
    const alertHistory: AlertHistoryEntry[] = alerts.map((alert) => {
      const metadata = alert.metadata as any || {};
      const affectedTasks = metadata.affectedTasks || [];
      const affectedProjects = metadata.affectedProjects || [alert.projectId].filter(Boolean);
      
      let resolutionTimeMs: number | undefined;
      if (alert.resolvedAt && alert.createdAt) {
        resolutionTimeMs = alert.resolvedAt.getTime() - alert.createdAt.getTime();
      }

      return {
        id: alert.id.toString(),
        alertId: alert.id.toString(),
        alertType: alert.alertType as AlertHistoryEntry['alertType'],
        severity: alert.severity as AlertHistoryEntry['severity'],
        status: alert.status as AlertHistoryEntry['status'],
        title: alert.title,
        description: alert.description || '',
        workspaceId: alert.workspaceId,
        affectedTasks,
        affectedProjects,
        createdAt: alert.createdAt.toISOString(),
        resolvedAt: alert.resolvedAt?.toISOString(),
        resolvedBy: alert.resolvedBy || undefined,
        resolutionNotes: alert.resolutionNotes || undefined,
        resolutionTimeMs,
        riskScore: alert.riskScore || 0,
      };
    });

    const totalAlerts = totalCount?.count || 0;
    const activeAlerts = activeCount?.count || 0;
    const resolvedAlertsCount = resolvedCount?.count || 0;
    const criticalAlerts = criticalCount?.count || 0;

    logger.info(`📊 Alert history retrieved: ${totalAlerts} total, ${activeAlerts} active, ${resolvedAlertsCount} resolved`);

    return {
      alerts: alertHistory,
      total: totalAlerts,
      statistics: {
        totalAlerts,
        activeAlerts,
        resolvedAlerts: resolvedAlertsCount,
        averageResolutionTimeHours,
        criticalAlerts,
      },
    };

  } catch (error) {
    logger.error('❌ Error retrieving alert history:', error);

    return {
      alerts: [],
      total: 0,
      statistics: {
        totalAlerts: 0,
        activeAlerts: 0,
        resolvedAlerts: 0,
        averageResolutionTimeHours: 0,
        criticalAlerts: 0,
      },
    };
  }
}

export async function resolveAlert(params: {
  alertId: string;
  workspaceId: string;
  resolvedBy: string;
  resolutionNotes?: string;
}): Promise<{ success: boolean; message: string }> {
  const { alertId, workspaceId, resolvedBy, resolutionNotes } = params;

  try {
    const db = getDatabase();
    const now = new Date();

    // Update the alert in the database
    const updated = await db
      .update(riskAlerts)
      .set({
        status: 'resolved',
        resolvedAt: now,
        resolvedBy,
        resolutionNotes,
        updatedAt: now,
      })
      .where(
        and(
          eq(riskAlerts.id, parseInt(alertId)),
          eq(riskAlerts.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!updated || updated.length === 0) {
      logger.warn(`⚠️ Alert ${alertId} not found in workspace ${workspaceId}`);
      return {
        success: false,
        message: 'Alert not found',
      };
    }

    logger.info(`✅ Alert ${alertId} resolved by ${resolvedBy}`, {
      workspaceId,
      resolutionNotes,
      resolvedAt: now.toISOString(),
    });

    return {
      success: true,
      message: 'Alert resolved successfully',
    };
  } catch (error) {
    logger.error('❌ Error resolving alert:', error);

    return {
      success: false,
      message: 'Failed to resolve alert',
    };
  }
}

