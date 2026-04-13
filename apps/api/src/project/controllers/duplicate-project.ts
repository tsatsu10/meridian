import getProject from "./get-project";
import createProject from "./create-project";

/**
 * Creates a new project by copying metadata from an existing project (no task copy).
 */
export default async function duplicateProject(
  projectId: string,
  workspaceId: string,
  userId: string,
) {
  const source = await getProject(projectId, workspaceId);
  const settings =
    source.settings && typeof source.settings === "object" && source.settings !== null
      ? (source.settings as Record<string, unknown>)
      : {};

  const suffix = Date.now().toString(36).slice(-5);
  const name = `${source.name.slice(0, 80)} (Copy)`.slice(0, 100);
  const slugRaw = (source.slug || "p").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "p";
  const slug = `${slugRaw}${suffix}`.slice(0, 10);

  return createProject(
    {
      workspaceId,
      name,
      description: source.description ?? undefined,
      icon: source.icon ?? "Layout",
      slug,
      status: (source.status as string | undefined) ?? "planning",
      category: (settings.category as string | undefined) ?? "development",
      priority: (source.priority as string | undefined) ?? "medium",
      visibility: (settings.visibility as string | undefined) ?? "team",
      allowGuestAccess: Boolean(settings.allowGuestAccess),
      requireApprovalForJoining: settings.requireApprovalForJoining !== false,
      timeTrackingEnabled: settings.timeTrackingEnabled !== false,
      requireTimeEntry: Boolean(settings.requireTimeEntry),
      enableSubtasks: settings.enableSubtasks !== false,
      enableDependencies: settings.enableDependencies !== false,
      enableBudgetTracking: Boolean(settings.enableBudgetTracking),
      startDate: source.startDate?.toISOString?.(),
      endDate: source.dueDate?.toISOString?.(),
      budget: typeof settings.budget === "number" ? settings.budget : 0,
      estimatedHours:
        typeof settings.estimatedHours === "number" ? settings.estimatedHours : 0,
      emailNotifications: settings.emailNotifications !== false,
      slackNotifications: Boolean(settings.slackNotifications),
    },
    userId,
  );
}
