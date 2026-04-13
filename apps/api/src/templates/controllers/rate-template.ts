import { eq } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTemplates } from "../../database/schema";

export default async function rateTemplate(
  templateId: string,
  userId: string,
  rating: number
): Promise<{ success: boolean; error?: string; averageRating?: number }> {
  if (rating < 1 || rating > 5) {
    return { success: false, error: "Rating must be between 1 and 5" };
  }

  // Get template
  const template = await getDatabase().query.projectTemplates.findFirst({
    where: eq(projectTemplates.id, templateId),
  });

  if (!template) {
    return { success: false, error: "Template not found" };
  }

  // Calculate new average rating
  // Current average = (current rating * 10) / 10
  // New average = ((current total) + new rating) / (count + 1)
  const currentTotal = template.rating * template.ratingCount;
  const newTotal = currentTotal + (rating * 10); // Store as * 10
  const newCount = template.ratingCount + 1;
  const newAverage = Math.round(newTotal / newCount);

  // Update template
  await getDatabase()
    .update(projectTemplates)
    .set({
      rating: newAverage,
      ratingCount: newCount,
    })
    .where(eq(projectTemplates.id, templateId));

  return {
    success: true,
    averageRating: newAverage / 10,
  };
}


