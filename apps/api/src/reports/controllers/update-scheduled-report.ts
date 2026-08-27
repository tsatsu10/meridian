import { and, eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { scheduledReports } from "../../database/schema";
import { verifyWorkspaceMembership } from "../utils/verify-workspace-membership";
import { calculateNextRun } from "../services/calculate-next-run";
import { NotFoundError } from "../../utils/errors";

export interface UpdateScheduledReportInput {
  workspaceId: string;
  userEmail: string;
  reportId: string;
  name?: string;
  description?: string;
  frequency?: "daily" | "weekly" | "monthly";
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  format?: "pdf" | "excel" | "csv";
  recipients?: string[];
  sections?: string[];
  isActive?: boolean;
}

export default async function updateScheduledReport(
  input: UpdateScheduledReportInput,
) {
  await verifyWorkspaceMembership(input.workspaceId, input.userEmail);

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(scheduledReports)
    .where(
      and(
        eq(scheduledReports.id, input.reportId),
        eq(scheduledReports.workspaceId, input.workspaceId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("Scheduled report");
  }

  const frequency = input.frequency ?? existing.frequency;
  const time = input.time ?? existing.time;
  const dayOfWeek = input.dayOfWeek ?? existing.dayOfWeek;
  const dayOfMonth = input.dayOfMonth ?? existing.dayOfMonth;
  const isActive = input.isActive ?? existing.isActive;

  const [updated] = await db
    .update(scheduledReports)
    .set({
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      frequency,
      time,
      dayOfWeek,
      dayOfMonth,
      format: input.format ?? existing.format,
      recipients: input.recipients ?? existing.recipients,
      sections: input.sections ?? existing.sections,
      isActive,
      nextRunAt: isActive
        ? calculateNextRun(frequency, time, dayOfWeek, dayOfMonth)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(scheduledReports.id, input.reportId))
    .returning();

  return updated;
}
