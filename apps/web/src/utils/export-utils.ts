// @epic-3.4-teams: Export utilities for teams, members, and users data

interface ExportTeam {
  id?: string;
  name?: string;
  description?: string;
  type?: string;
  memberCount?: number;
  performance?: number;
  workload?: number;
  healthScore?: number;
  completedTasks?: number;
  currentTasks?: number;
  productivity?: number;
  createdAt?: string | Date;
  members?: unknown[];
  healthStatus?: { label?: string };
  projectId?: string;
  projectName?: string;
}

interface ExportMember {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  availability?: string;
  teamName?: string;
  projectName?: string;
  workload?: number;
  performance?: number;
  tasksCompleted?: number;
  currentTasks?: number;
  joinedAt?: string;
  lastActive?: string | null;
}

interface ExportUser {
  id?: string | null;
  name?: string | null;
  userName?: string | null;
  email?: string;
  userEmail?: string;
  role?: string;
  status?: string;
  joinedAt?: string;
}

interface ExportProjectHealth {
  name?: string;
  healthScore?: number;
  completion?: number;
  velocity?: number;
  tasksCompleted?: number;
  totalTasks?: number;
  riskFactors?: string[];
  health?: string;
}

interface ExportResource {
  userName?: string;
  role?: string;
  utilization?: number;
  workloadBalance?: number | string;
  projectCount?: number;
  taskCount?: number;
  totalHours?: number;
  completedTasks?: number;
}

interface ExportTimePoint {
  date: string | number | Date;
  productivity?: number;
  tasksCompleted?: number;
  hoursLogged?: number;
  activeUsers?: number;
}

// Analytics metric leaves are ComparativeData-shaped; the exporter only reads
// the current numeric value. `change` overlaps the real shape so responses
// stay assignable (an all-optional target would trip the weak-type check).
type MetricLeaf = { current?: number; change?: unknown };

interface AnalyticsExportData {
  summary?: unknown;
  timeRange?: string;
  projectMetrics?: {
    totalProjects?: MetricLeaf;
    projectsAtRisk?: MetricLeaf;
    avgHealthScore?: MetricLeaf;
  };
  taskMetrics?: { completedTasks?: MetricLeaf };
  teamMetrics?: {
    avgProductivity?: MetricLeaf;
    activeMembers?: MetricLeaf;
  };
  timeMetrics?: {
    totalHours?: MetricLeaf;
    timeUtilization?: MetricLeaf;
  };
  projectHealth?: ExportProjectHealth[];
  resourceUtilization?: ExportResource[];
  timeSeriesData?: ExportTimePoint[];
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(
  data: Record<string, unknown>[],
  headers: string[],
): string {
  if (!data || data.length === 0) return "";

  // Create header row
  const headerRow = headers.join(",");

  // Create data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Handle null/undefined
        if (value === null || value === undefined) return "";
        // Handle strings with commas or quotes
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Convert data to JSON format
 */
export function convertToJSON(data: unknown[]): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger download of a file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export teams data
 */
export function exportTeams(
  teams: ExportTeam[],
  format: "csv" | "json" = "csv",
) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `teams-export-${timestamp}.${format}`;

  if (format === "csv") {
    const headers = [
      "id",
      "name",
      "description",
      "type",
      "memberCount",
      "performance",
      "workload",
      "healthScore",
      "completedTasks",
      "currentTasks",
      "productivity",
      "createdAt",
    ];
    const csvData = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description || "",
      type: team.type || "",
      memberCount: team.memberCount || 0,
      performance: team.performance || 0,
      workload: team.workload || 0,
      healthScore: team.healthScore || 0,
      completedTasks: team.completedTasks || 0,
      currentTasks: team.currentTasks || 0,
      productivity: team.productivity || 0,
      createdAt: team.createdAt || "",
    }));
    const content = convertToCSV(csvData, headers);
    downloadFile(content, filename, "text/csv;charset=utf-8;");
  } else {
    const jsonData = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      type: team.type,
      members: team.members?.length || 0,
      performance: team.performance,
      workload: team.workload,
      healthScore: team.healthScore,
      healthStatus: team.healthStatus?.label,
      completedTasks: team.completedTasks,
      currentTasks: team.currentTasks,
      productivity: team.productivity,
      createdAt: team.createdAt,
      projectId: team.projectId,
      projectName: team.projectName,
    }));
    const content = convertToJSON(jsonData);
    downloadFile(content, filename, "application/json;charset=utf-8;");
  }
}

/**
 * Export members data
 */
export function exportMembers(
  members: ExportMember[],
  format: "csv" | "json" = "csv",
) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `members-export-${timestamp}.${format}`;

  if (format === "csv") {
    const headers = [
      "id",
      "name",
      "email",
      "role",
      "status",
      "teamName",
      "workload",
      "performance",
      "tasksCompleted",
      "currentTasks",
      "joinedAt",
    ];
    const csvData = members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role || "",
      status: member.status || "",
      teamName: member.teamName || "",
      workload: member.workload || 0,
      performance: member.performance || 0,
      tasksCompleted: member.tasksCompleted || 0,
      currentTasks: member.currentTasks || 0,
      joinedAt: member.joinedAt || "",
    }));
    const content = convertToCSV(csvData, headers);
    downloadFile(content, filename, "text/csv;charset=utf-8;");
  } else {
    const jsonData = members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status,
      availability: member.availability,
      teamName: member.teamName,
      projectName: member.projectName,
      workload: member.workload,
      performance: member.performance,
      tasksCompleted: member.tasksCompleted,
      currentTasks: member.currentTasks,
      joinedAt: member.joinedAt,
      lastActive: member.lastActive,
    }));
    const content = convertToJSON(jsonData);
    downloadFile(content, filename, "application/json;charset=utf-8;");
  }
}

/**
 * Export users data
 */
export function exportUsers(
  users: ExportUser[],
  format: "csv" | "json" = "csv",
) {
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `users-export-${timestamp}.${format}`;

  if (format === "csv") {
    const headers = ["id", "name", "email", "role", "status", "joinedAt"];
    const csvData = users.map((user) => ({
      id: user.id || user.userEmail,
      name: user.userName || user.name,
      email: user.userEmail || user.email,
      role: user.role || "",
      status: user.status || "",
      joinedAt: user.joinedAt || "",
    }));
    const content = convertToCSV(csvData, headers);
    downloadFile(content, filename, "text/csv;charset=utf-8;");
  } else {
    const jsonData = users.map((user) => ({
      id: user.id,
      name: user.userName || user.name,
      email: user.userEmail || user.email,
      role: user.role,
      status: user.status,
      joinedAt: user.joinedAt,
    }));
    const content = convertToJSON(jsonData);
    downloadFile(content, filename, "application/json;charset=utf-8;");
  }
}

/**
 * Export data to Excel format using xlsx library
 */
export async function exportToExcel(
  data: AnalyticsExportData,
  filename = "export",
) {
  // Dynamic import for better code splitting
  const XLSX = await import("xlsx");

  const timestamp = new Date().toISOString().split("T")[0];
  const workbook = XLSX.utils.book_new();

  // Create Overview sheet
  if (data.summary) {
    const summaryData = [
      ["Analytics Overview", ""],
      ["Generated", new Date().toLocaleString()],
      ["Time Range", data.timeRange || "Last 30 days"],
      [""],
      ["Metric", "Value"],
      ["Total Projects", data.projectMetrics?.totalProjects?.current || 0],
      ["Completed Tasks", data.taskMetrics?.completedTasks?.current || 0],
      [
        "Team Productivity",
        `${data.teamMetrics?.avgProductivity?.current || 0}%`,
      ],
      ["Active Members", data.teamMetrics?.activeMembers?.current || 0],
      ["Total Hours", data.timeMetrics?.totalHours?.current || 0],
      [
        "Time Utilization",
        `${data.timeMetrics?.timeUtilization?.current || 0}%`,
      ],
      ["Projects At Risk", data.projectMetrics?.projectsAtRisk?.current || 0],
      [
        "Avg Health Score",
        `${data.projectMetrics?.avgHealthScore?.current || 0}%`,
      ],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Overview");
  }

  // Create Project Health sheet
  if (data.projectHealth && data.projectHealth.length > 0) {
    const projectData = data.projectHealth.map((project) => ({
      "Project Name": project.name,
      "Health Score": project.healthScore,
      Completion: `${project.completion}%`,
      Velocity: project.velocity,
      "Tasks Completed": project.tasksCompleted,
      "Tasks Total": project.totalTasks,
      "Risk Factors": project.riskFactors?.join("; ") || "None",
      Status: project.health,
    }));
    const projectSheet = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(workbook, projectSheet, "Projects");
  }

  // Create Resource Utilization sheet
  if (data.resourceUtilization && data.resourceUtilization.length > 0) {
    const resourceData = data.resourceUtilization.map((resource) => ({
      Name: resource.userName,
      Role: resource.role,
      Utilization: `${resource.utilization}%`,
      "Workload Balance": resource.workloadBalance,
      Projects: resource.projectCount,
      Tasks: resource.taskCount,
      Hours: resource.totalHours,
      "Tasks Completed": resource.completedTasks,
    }));
    const resourceSheet = XLSX.utils.json_to_sheet(resourceData);
    XLSX.utils.book_append_sheet(workbook, resourceSheet, "Team Resources");
  }

  // Create Time Series sheet
  if (data.timeSeriesData && data.timeSeriesData.length > 0) {
    const timeSeriesData = data.timeSeriesData.map((point) => ({
      Date: new Date(point.date).toLocaleDateString(),
      Productivity: point.productivity,
      "Tasks Completed": point.tasksCompleted,
      "Hours Logged": point.hoursLogged,
      "Active Members": point.activeUsers,
    }));
    const timeSeriesSheet = XLSX.utils.json_to_sheet(timeSeriesData);
    XLSX.utils.book_append_sheet(workbook, timeSeriesSheet, "Trends");
  }

  // Write the file
  XLSX.writeFile(workbook, `${filename}-${timestamp}.xlsx`);
}

/**
 * Export analytics data to a PDF report using jsPDF + jspdf-autotable
 */
export async function exportToPDF(
  data: AnalyticsExportData,
  filename = "export",
) {
  // Dynamic import for better code splitting
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const timestamp = new Date().toISOString().split("T")[0];
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Analytics Report", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 27);
  doc.text(`Time range: ${data.timeRange || "Last 30 days"}`, 14, 32);

  let cursorY = 40;

  autoTable(doc, {
    startY: cursorY,
    head: [["Metric", "Value"]],
    body: [
      [
        "Total Projects",
        String(data.projectMetrics?.totalProjects?.current ?? 0),
      ],
      [
        "Completed Tasks",
        String(data.taskMetrics?.completedTasks?.current ?? 0),
      ],
      [
        "Team Productivity",
        `${data.teamMetrics?.avgProductivity?.current ?? 0}%`,
      ],
      ["Active Members", String(data.teamMetrics?.activeMembers?.current ?? 0)],
      ["Total Hours", String(data.timeMetrics?.totalHours?.current ?? 0)],
      [
        "Time Utilization",
        `${data.timeMetrics?.timeUtilization?.current ?? 0}%`,
      ],
      [
        "Projects At Risk",
        String(data.projectMetrics?.projectsAtRisk?.current ?? 0),
      ],
      [
        "Avg Health Score",
        `${data.projectMetrics?.avgHealthScore?.current ?? 0}%`,
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [45, 212, 191] },
  });
  // biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable augments jsPDF's prototype at runtime with lastAutoTable, which isn't reflected in its own type defs
  cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 12;

  if (data.projectHealth && data.projectHealth.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text("Project Health", 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Project", "Health Score", "Completion", "Tasks", "Risk"]],
      body: data.projectHealth.map((p) => [
        p.name ?? "",
        String(p.healthScore ?? 0),
        `${p.completion ?? 0}%`,
        `${p.tasksCompleted ?? 0}/${p.totalTasks ?? 0}`,
        p.riskFactors?.join(", ") || p.health || "",
      ]),
      theme: "striped",
      headStyles: { fillColor: [45, 212, 191] },
    });
    // biome-ignore lint/suspicious/noExplicitAny: see note above on lastAutoTable
    cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY) + 12;
  }

  if (data.resourceUtilization && data.resourceUtilization.length > 0) {
    if (cursorY > 250) {
      doc.addPage();
      cursorY = 20;
    }
    doc.setFontSize(13);
    doc.text("Team Resources", 14, cursorY);
    autoTable(doc, {
      startY: cursorY + 4,
      head: [["Name", "Role", "Utilization", "Workload", "Hours"]],
      body: data.resourceUtilization.map((r) => [
        r.userName ?? "",
        r.role ?? "",
        `${r.utilization ?? 0}%`,
        String(r.workloadBalance ?? ""),
        String(r.totalHours ?? 0),
      ]),
      theme: "striped",
      headStyles: { fillColor: [45, 212, 191] },
    });
  }

  doc.save(`${filename}-${timestamp}.pdf`);
}
