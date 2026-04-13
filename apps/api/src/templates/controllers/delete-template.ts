import { eq, and } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTemplates } from "../../database/schema";

export default async function deleteTemplate(
  templateId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  // Get template to check ownership
  const template = await getDatabase().query.projectTemplates.findFirst({
    where: eq(projectTemplates.id, templateId),
  });

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Check if user is the creator (or we could add admin check here)
  if (template.createdBy !== userId) {
    return { success: false, error: "Unauthorized: You can only delete templates you created" };
  }

  // Delete template (cascade will delete tasks, subtasks, and dependencies)
  await getDatabase()
    .delete(projectTemplates)
    .where(eq(projectTemplates.id, templateId));

  return { success: true };
}


