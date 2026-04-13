// @epic-2.4-risk-detection: Risk alert management and status updates
// @persona-sarah: PM needs to manage and resolve risk alerts
// @persona-david: Team Lead needs to acknowledge and track risk resolution

import { getDatabase } from "../../database/connection";
import { riskAlerts } from "../../database/schema-features";
import { eq } from "drizzle-orm";
import logger from '../../utils/logger';

interface UpdateRiskAlertParams {
  alertId: string;
  status: "active" | "acknowledged" | "resolved" | "dismissed";
  notes?: string;
  updatedBy: string;
}

export async function updateRiskAlert(params: UpdateRiskAlertParams) {
  const { alertId, status, notes, updatedBy } = params;
  const db = getDatabase();
  const now = new Date();

  try {
    // Update the alert in the database
    const updated = await db
      .update(riskAlerts)
      .set({
        status,
        acknowledgedAt: status === 'acknowledged' ? now : undefined,
        acknowledgedBy: status === 'acknowledged' ? updatedBy : undefined,
        resolvedAt: status === 'resolved' ? now : undefined,
        resolvedBy: status === 'resolved' ? updatedBy : undefined,
        resolutionNotes: notes,
        updatedAt: now,
      })
      .where(eq(riskAlerts.id, parseInt(alertId)))
      .returning();

    if (!updated || updated.length === 0) {
      logger.warn(`⚠️ Risk alert ${alertId} not found`);
      throw new Error(`Risk alert ${alertId} not found`);
    }

    logger.info(`✅ Risk alert ${alertId} updated to ${status} by ${updatedBy}`);

    return {
      id: updated[0].id.toString(),
      status: updated[0].status,
      notes: updated[0].resolutionNotes || "",
      updatedBy,
      updatedAt: now.toISOString(),
      message: `Risk alert ${alertId} ${status} by ${updatedBy}`,
    };
  } catch (error) {
    logger.error(`❌ Error updating risk alert ${alertId}:`, error);
    throw error;
  }
} 

