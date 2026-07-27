import getEnhancedAnalytics from "../../dashboard/controllers/get-analytics-enhanced";

export interface ReportEmailContent {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function row(label: string, value: unknown): string {
  return `<tr><td style="padding:6px 12px;color:#6b7280;">${escapeHtml(label)}</td><td style="padding:6px 12px;font-weight:600;">${escapeHtml(String(value))}</td></tr>`;
}

function table(rows: string[]): string {
  return `<table style="border-collapse:collapse;width:100%;margin-bottom:20px;">${rows.join("")}</table>`;
}

/**
 * Builds an email body for a scheduled report from the same analytics data
 * the Analytics dashboard itself renders - no separate/fabricated numbers.
 */
export async function generateReportEmail(
  workspaceId: string,
  reportName: string,
  sections: string[],
): Promise<ReportEmailContent> {
  const analytics = await getEnhancedAnalytics({
    workspaceId,
    timeRange: "30d",
    compareWith: "previous_period",
  });

  const htmlParts: string[] = [];
  const textParts: string[] = [];

  if (sections.includes("overview")) {
    htmlParts.push(
      "<h3>Overview</h3>",
      table([
        row("Total Projects", analytics.projectMetrics.totalProjects.current),
        row("Completed Tasks", analytics.taskMetrics.completedTasks.current),
        row(
          "Team Productivity",
          `${analytics.teamMetrics.avgProductivity.current}%`,
        ),
        row("Active Members", analytics.teamMetrics.activeMembers.current),
        row("Total Hours", analytics.timeMetrics.totalHours.current),
        row(
          "Projects At Risk",
          analytics.projectMetrics.projectsAtRisk.current,
        ),
        row(
          "Avg Health Score",
          `${analytics.projectMetrics.avgHealthScore.current}%`,
        ),
      ]),
    );
    textParts.push(
      `Overview: ${analytics.projectMetrics.totalProjects.current} projects, ${analytics.taskMetrics.completedTasks.current} completed tasks, ${analytics.teamMetrics.avgProductivity.current}% team productivity`,
    );
  }

  if (sections.includes("projects") && analytics.projectHealth.length > 0) {
    htmlParts.push(
      "<h3>Project Health</h3>",
      table(
        analytics.projectHealth
          .slice(0, 10)
          .map((p) =>
            row(p.name, `${p.healthScore}/100 (${p.completion}% complete)`),
          ),
      ),
    );
    textParts.push(
      `Projects: ${analytics.projectHealth.map((p) => `${p.name} (${p.healthScore}/100)`).join(", ")}`,
    );
  }

  if (sections.includes("team") && analytics.resourceUtilization.length > 0) {
    htmlParts.push(
      "<h3>Team Performance</h3>",
      table(
        analytics.resourceUtilization
          .slice(0, 10)
          .map((r) =>
            row(r.userName, `${r.utilization}% utilized, ${r.workloadBalance}`),
          ),
      ),
    );
    textParts.push(
      `Team: ${analytics.resourceUtilization.map((r) => `${r.userName} (${r.utilization}%)`).join(", ")}`,
    );
  }

  if (sections.includes("time")) {
    htmlParts.push(
      "<h3>Time Tracking</h3>",
      table([
        row("Total Hours", analytics.timeMetrics.totalHours.current),
        row(
          "Time Utilization",
          `${analytics.timeMetrics.timeUtilization.current}%`,
        ),
      ]),
    );
  }

  if (
    sections.includes("insights") &&
    analytics.summary.recommendations.length > 0
  ) {
    htmlParts.push(
      "<h3>Recommendations</h3>",
      `<ul>${analytics.summary.recommendations.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`,
    );
    textParts.push(
      `Recommendations: ${analytics.summary.recommendations.join("; ")}`,
    );
  }

  if (htmlParts.length === 0) {
    htmlParts.push("<p>No sections were selected for this report.</p>");
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
        <div style="max-width:640px;margin:0 auto;padding:24px;">
          <h2>${escapeHtml(reportName)}</h2>
          <p style="color:#6b7280;">Generated ${new Date().toLocaleString()} - last 30 days</p>
          ${htmlParts.join("\n")}
        </div>
      </body>
    </html>
  `;

  const text = `${reportName}\nGenerated ${new Date().toLocaleString()} - last 30 days\n\n${textParts.join("\n\n")}`;

  return {
    subject: `${reportName} - Meridian Analytics Report`,
    html,
    text,
  };
}
