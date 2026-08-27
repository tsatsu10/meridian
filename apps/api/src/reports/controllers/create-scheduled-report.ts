import { getDatabase } from "../../database/connection";
import { scheduledReports } from "../../database/schema";
import { verifyWorkspaceMembership } from "../utils/verify-workspace-membership";
import { calculateNextRun } from "../services/calculate-next-run";

export interface CreateScheduledReportInput {
  workspaceId: string;
  createdBy: string;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  format: "pdf" | "excel" | "csv";
  recipients: string[];
  sections: string[];
  isActive: boolean;
}

export default async function createScheduledReport(
  input: CreateScheduledReportInput,
) {
  await verifyWorkspaceMembership(input.workspaceId, input.createdBy);

  const db = getDatabase();
  const [created] = await db
    .insert(scheduledReports)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      frequency: input.frequency,
      time: input.time,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      format: input.format,
      recipients: input.recipients,
      sections: input.sections,
      isActive: input.isActive,
      nextRunAt: input.isActive
        ? calculateNextRun(
            input.frequency,
            input.time,
            input.dayOfWeek,
            input.dayOfMonth,
          )
        : null,
      createdBy: input.createdBy,
    })
    .returning();

  return created;
}
