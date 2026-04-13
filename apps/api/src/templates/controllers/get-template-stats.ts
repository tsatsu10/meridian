import { sql, desc } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import { projectTemplates } from "../../database/schema";
import type { TemplateStats } from "../../types/templates";

export default async function getTemplateStats(): Promise<TemplateStats> {

  // Get total templates
  const totalResult = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(projectTemplates);

  const totalTemplates = totalResult[0]?.count || 0;

  // Get distinct industries
  const industriesResult = await getDatabase()
    .selectDistinct({ industry: projectTemplates.industry })
    .from(projectTemplates);

  const totalIndustries = industriesResult.length;

  // Get distinct professions
  const professionsResult = await getDatabase()
    .selectDistinct({ profession: projectTemplates.profession })
    .from(projectTemplates);

  const totalProfessions = professionsResult.length;

  // Get most popular template
  const popularTemplates = await getDatabase()
    .select()
    .from(projectTemplates)
    .orderBy(desc(projectTemplates.usageCount))
    .limit(1);

  const mostPopularTemplate = popularTemplates[0] || null;

  // Get highest rated template
  const ratedTemplates = await getDatabase()
    .select()
    .from(projectTemplates)
    .orderBy(desc(projectTemplates.rating))
    .limit(1);

  const highestRatedTemplate = ratedTemplates[0] || null;

  // Get recently added templates
  const recentTemplates = await getDatabase()
    .select()
    .from(projectTemplates)
    .orderBy(desc(projectTemplates.createdAt))
    .limit(5);

  return {
    totalTemplates,
    totalIndustries,
    totalProfessions,
    mostPopularTemplate: mostPopularTemplate ? {
      ...mostPopularTemplate,
      rating: mostPopularTemplate.rating / 10,
    } : null,
    highestRatedTemplate: highestRatedTemplate ? {
      ...highestRatedTemplate,
      rating: highestRatedTemplate.rating / 10,
    } : null,
    recentlyAdded: recentTemplates.map(t => ({
      ...t,
      rating: t.rating / 10,
    })),
  };
}


