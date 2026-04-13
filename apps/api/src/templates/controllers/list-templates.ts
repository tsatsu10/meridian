import { desc, asc, and, or, like, gte, eq, sql, inArray } from "drizzle-orm";
import { getDatabase } from "../../database/connection";
import {
  projectTemplates,
  templateTasks,
  templateSubtasks,
} from "../../database/schema";
import type { TemplateFilterOptions } from "../../types/templates";

interface ListTemplatesResult {
  templates: any[];
  total: number;
  limit: number;
  offset: number;
}

export default async function listTemplates(
  filters: TemplateFilterOptions & { limit?: number; offset?: number }
): Promise<ListTemplatesResult> {

  const {
    industry,
    profession,
    category,
    difficulty,
    tags,
    searchQuery,
    isOfficial,
    minRating,
    sortBy = "popular",
    sortOrder = "desc",
    limit = 50,
    offset = 0,
  } = filters;

  // Build where conditions
  const whereConditions: any[] = [];

  if (industry) {
    whereConditions.push(eq(projectTemplates.industry, industry));
  }

  if (profession) {
    whereConditions.push(eq(projectTemplates.profession, profession));
  }

  if (category) {
    whereConditions.push(eq(projectTemplates.category, category));
  }

  if (difficulty) {
    whereConditions.push(eq(projectTemplates.difficulty, difficulty));
  }

  if (isOfficial !== undefined) {
    whereConditions.push(eq(projectTemplates.isOfficial, isOfficial));
  }

  if (minRating !== undefined) {
    whereConditions.push(gte(projectTemplates.rating, minRating * 10)); // rating stored as * 10
  }

  if (searchQuery) {
    whereConditions.push(
      or(
        like(projectTemplates.name, `%${searchQuery}%`),
        like(projectTemplates.description, `%${searchQuery}%`),
        like(projectTemplates.profession, `%${searchQuery}%`)
      )
    );
  }

  // TODO: Implement tag filtering when needed
  // Tags are stored as JSONB, would need special handling

  const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Build order by
  let orderByClause;
  const order = sortOrder === "asc" ? asc : desc;

  switch (sortBy) {
    case "popular":
      orderByClause = order(projectTemplates.usageCount);
      break;
    case "rating":
      orderByClause = order(projectTemplates.rating);
      break;
    case "recent":
      orderByClause = order(projectTemplates.createdAt);
      break;
    case "name":
      orderByClause = order(projectTemplates.name);
      break;
    default:
      orderByClause = desc(projectTemplates.usageCount);
  }

  // Get total count
  const countResult = await getDatabase()
    .select({ count: sql<number>`count(*)::int` })
    .from(projectTemplates)
    .where(whereClause);

  const total = countResult[0]?.count || 0;

  // Get templates
  const templates = await getDatabase()
    .select()
    .from(projectTemplates)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  // Get task counts for each template
  const templateIds = templates.map((t) => t.id);

  let taskCounts: Record<string, number> = {};
  if (templateIds.length > 0) {
    const counts = await getDatabase()
      .select({
        templateId: templateTasks.templateId,
        count: sql<number>`count(*)::int`,
      })
      .from(templateTasks)
      .where(inArray(templateTasks.templateId, templateIds))
      .groupBy(templateTasks.templateId);

    taskCounts = counts.reduce((acc, curr) => {
      acc[curr.templateId] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }

  // Format templates with additional info
  const formattedTemplates = templates.map((template) => ({
    ...template,
    rating: template.rating / 10, // Convert back to 0-5 scale
    taskCount: taskCounts[template.id] || 0,
  }));

  return {
    templates: formattedTemplates,
    total,
    limit,
    offset,
  };
}


