// @epic-3.4-teams: Export utilities for teams, members, and users data

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], headers: string[]): string {
  if (!data || data.length === 0) return '';
  
  // Create header row
  const headerRow = headers.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      // Handle strings with commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert data to JSON format
 */
export function convertToJSON(data: any[]): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger download of a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
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
export function exportTeams(teams: any[], format: 'csv' | 'json' = 'csv') {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `teams-export-${timestamp}.${format}`;
  
  if (format === 'csv') {
    const headers = [
      'id', 'name', 'description', 'type', 'memberCount', 
      'performance', 'workload', 'healthScore', 'completedTasks', 
      'currentTasks', 'productivity', 'createdAt'
    ];
    const csvData = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description || '',
      type: team.type || '',
      memberCount: team.memberCount || 0,
      performance: team.performance || 0,
      workload: team.workload || 0,
      healthScore: team.healthScore || 0,
      completedTasks: team.completedTasks || 0,
      currentTasks: team.currentTasks || 0,
      productivity: team.productivity || 0,
      createdAt: team.createdAt || ''
    }));
    const content = convertToCSV(csvData, headers);
    downloadFile(content, filename, 'text/csv;charset=utf-8;');
  } else {
    const jsonData = teams.map(team => ({
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
      projectName: team.projectName
    }));
    const content = convertToJSON(jsonData);
    downloadFile(content, filename, 'application/json;charset=utf-8;');
  }
}

/**
 * Export members data
 */
export function exportMembers(members: any[], format: 'csv' | 'json' = 'csv') {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `members-export-${timestamp}.${format}`;
  
  if (format === 'csv') {
    const headers = [
      'id', 'name', 'email', 'role', 'status', 'teamName', 
      'workload', 'performance', 'tasksCompleted', 'currentTasks', 
      'joinedAt'
    ];
    const csvData = members.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role || '',
      status: member.status || '',
      teamName: member.teamName || '',
      workload: member.workload || 0,
      performance: member.performance || 0,
      tasksCompleted: member.tasksCompleted || 0,
      currentTasks: member.currentTasks || 0,
      joinedAt: member.joinedAt || ''
    }));
    const content = convertToCSV(csvData, headers);
    downloadFile(content, filename, 'text/csv;charset=utf-8;');
  } else {
    const jsonData = members.map(member => ({
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
      lastActive: member.lastActive
    }));
    const content = convertToJSON(jsonData);
    downloadFile(content, filename, 'application/json;charset=utf-8;');
  }
}

/**
 * Export users data
 */
export function exportUsers(users: any[], format: 'csv' | 'json' = 'csv') {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `users-export-${timestamp}.${format}`;
  
  if (format === 'csv') {
    const headers = [
      'id', 'name', 'email', 'role', 'status', 'joinedAt'
    ];
    const csvData = users.map(user => ({
      id: user.id || user.userEmail,
      name: user.userName || user.name,
      email: user.userEmail || user.email,
      role: user.role || '',
      status: user.status || '',
      joinedAt: user.joinedAt || ''
    }));
    const content = convertToCSV(csvData, headers);
    downloadFile(content, filename, 'text/csv;charset=utf-8;');
  } else {
    const jsonData = users.map(user => ({
      id: user.id,
      name: user.userName || user.name,
      email: user.userEmail || user.email,
      role: user.role,
      status: user.status,
      joinedAt: user.joinedAt
    }));
    const content = convertToJSON(jsonData);
    downloadFile(content, filename, 'application/json;charset=utf-8;');
  }
}

/**
 * Export data to Excel format using xlsx library
 */
export async function exportToExcel(data: any, filename: string = 'export') {
  // Dynamic import for better code splitting
  const XLSX = await import('xlsx');
  
  const timestamp = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();
  
  // Create Overview sheet
  if (data.summary) {
    const summaryData = [
      ['Analytics Overview', ''],
      ['Generated', new Date().toLocaleString()],
      ['Time Range', data.timeRange || 'Last 30 days'],
      [''],
      ['Metric', 'Value'],
      ['Total Projects', data.projectMetrics?.totalProjects?.value || 0],
      ['Completed Tasks', data.taskMetrics?.completedTasks?.value || 0],
      ['Team Productivity', `${data.teamMetrics?.avgProductivity?.value || 0}%`],
      ['Active Members', data.teamMetrics?.activeMembers?.value || 0],
      ['Total Hours', data.timeMetrics?.totalHours?.value || 0],
      ['Time Utilization', `${data.timeMetrics?.timeUtilization?.value || 0}%`],
      ['Projects At Risk', data.projectMetrics?.projectsAtRisk?.value || 0],
      ['Avg Health Score', `${data.projectMetrics?.avgHealthScore?.value || 0}%`],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Overview');
  }
  
  // Create Project Health sheet
  if (data.projectHealth && data.projectHealth.length > 0) {
    const projectData = data.projectHealth.map((project: any) => ({
      'Project Name': project.name,
      'Health Score': project.healthScore,
      'Completion': `${project.completionRate}%`,
      'Velocity': project.velocity,
      'Tasks Completed': project.completedTasks,
      'Tasks Total': project.totalTasks,
      'Risk Level': project.riskLevel,
      'Status': project.status,
    }));
    const projectSheet = XLSX.utils.json_to_sheet(projectData);
    XLSX.utils.book_append_sheet(workbook, projectSheet, 'Projects');
  }
  
  // Create Resource Utilization sheet
  if (data.resourceUtilization && data.resourceUtilization.length > 0) {
    const resourceData = data.resourceUtilization.map((resource: any) => ({
      'Name': resource.userName,
      'Role': resource.role,
      'Utilization': `${resource.utilization}%`,
      'Workload Balance': resource.workloadBalance,
      'Projects': resource.projectCount,
      'Tasks': resource.taskCount,
      'Hours': resource.totalHours,
      'Tasks Completed': resource.completedTasks,
    }));
    const resourceSheet = XLSX.utils.json_to_sheet(resourceData);
    XLSX.utils.book_append_sheet(workbook, resourceSheet, 'Team Resources');
  }
  
  // Create Time Series sheet
  if (data.timeSeriesData && data.timeSeriesData.length > 0) {
    const timeSeriesData = data.timeSeriesData.map((point: any) => ({
      'Date': new Date(point.date).toLocaleDateString(),
      'Productivity': point.productivity,
      'Tasks Completed': point.tasksCompleted,
      'Hours Logged': point.hoursLogged,
      'Active Members': point.activeMembers,
    }));
    const timeSeriesSheet = XLSX.utils.json_to_sheet(timeSeriesData);
    XLSX.utils.book_append_sheet(workbook, timeSeriesSheet, 'Trends');
  }
  
  // Write the file
  XLSX.writeFile(workbook, `${filename}-${timestamp}.xlsx`);
}

