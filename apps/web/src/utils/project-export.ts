export function exportToCSV(projects: any[], filename = "projects.csv") {
  // Create CSV headers
  const headers = ["Name", "Status", "Priority", "Progress", "Due Date", "Team Size", "Tasks"];

  // Create CSV rows
  const rows = projects.map((project) => {
    const completedTasks = project.tasks?.filter((t: any) => {
      const status = t.status?.toLowerCase();
      return status === "completed" || status === "done";
    }).length || 0;
    const totalTasks = project.tasks?.length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return [
      project.name || "",
      project.status || "",
      project.priority || "",
      `${progress}%`,
      project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "",
      project.members?.length || 0,
      `${completedTasks}/${totalTasks}`,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  // Download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(projects: any[], filename = "projects.json") {
  // Sanitize project data
  const exportData = projects.map((project) => ({
    name: project.name,
    description: project.description,
    status: project.status,
    priority: project.priority,
    dueDate: project.dueDate,
    startDate: project.startDate,
    teamSize: project.members?.length || 0,
    tasksCount: project.tasks?.length || 0,
    completedTasks:
      project.tasks?.filter((t: any) => {
        const status = t.status?.toLowerCase();
        return status === "completed" || status === "done";
      }).length || 0,
  }));

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printProjects(projects: any[]) {
  // Create print-friendly HTML
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print projects");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Projects Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f4f4f4; font-weight: bold; }
          tr:hover { background-color: #f9f9f9; }
          .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status-active { background-color: #e3f2fd; color: #1976d2; }
          .status-completed { background-color: #e8f5e9; color: #388e3c; }
          .priority-high { background-color: #ffebee; color: #c62828; }
        </style>
      </head>
      <body>
        <h1>Projects Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Total Projects: ${projects.length}</p>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Progress</th>
              <th>Due Date</th>
              <th>Tasks</th>
            </tr>
          </thead>
          <tbody>
            ${projects
              .map((project) => {
                const completedTasks =
                  project.tasks?.filter((t: any) => {
                    const status = t.status?.toLowerCase();
                    return status === "completed" || status === "done";
                  }).length || 0;
                const totalTasks = project.tasks?.length || 0;
                const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return `
                  <tr>
                    <td><strong>${project.name}</strong></td>
                    <td><span class="badge status-${project.status}">${project.status || "N/A"}</span></td>
                    <td><span class="badge priority-${project.priority}">${project.priority || "N/A"}</span></td>
                    <td>${progress}%</td>
                    <td>${project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "N/A"}</td>
                    <td>${completedTasks}/${totalTasks}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

