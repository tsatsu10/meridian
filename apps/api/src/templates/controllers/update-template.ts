import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTemplates } from "../../database/schema";
import type { CreateTemplateInput } from "../../types/templates";

export default async function updateTemplate(
  templateId: string,
  input: Partial<CreateTemplateInput>,
  userId: string
) {

  // Get template to check ownership
  const template = await getDatabase().query.projectTemplates.findFirst({
    where: eq(projectTemplates.id, templateId),
  });

  if (!template) {
    return null;
  }

  // Check if user is the creator (or we could add admin check here)
  if (template.createdBy !== userId) {
    return null;
  }

  // Update template (note: we're not updating tasks here, just metadata)
  // To update tasks, we'd need a more complex implementation
  const [updatedTemplate] = await getDatabase()
    .update(projectTemplates)
    .set({
      name: input.name,
      description: input.description,
      profession: input.profession,
      industry: input.industry,
      category: input.category,
      icon: input.icon,
      color: input.color,
      estimatedDuration: input.estimatedDuration,
      difficulty: input.difficulty,
      tags: input.tags,
      settings: input.settings,
      isPublic: input.isPublic,
      updatedAt: new Date(),
    })
    .where(eq(projectTemplates.id, templateId))
    .returning();

  return updatedTemplate;
}


