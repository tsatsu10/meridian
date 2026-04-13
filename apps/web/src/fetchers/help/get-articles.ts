// @epic-3.5-communication: Fetch help articles with real data

import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: "getting-started" | "features" | "integrations" | "troubleshooting" | "best-practices";
  difficulty: "beginner" | "intermediate" | "advanced";
  contentType: "article" | "video" | "faq";
  readTime: number;
  rating: number;
  ratingCount: number;
  views: number;
  helpful: number;
  tags: string[];
  metadata: Record<string, any>;
  publishedAt: string;
  updatedAt: string;
}

export interface GetArticlesParams {
  q?: string;
  category?: string;
  difficulty?: string;
  type?: string;
  tags?: string;
  limit?: number;
  offset?: number;
}

export async function getArticles(params: GetArticlesParams = {}): Promise<{
  success: boolean;
  data: HelpArticle[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}> {
  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append("q", params.q);
  if (params.category) queryParams.append("category", params.category);
  if (params.difficulty) queryParams.append("difficulty", params.difficulty);
  if (params.type) queryParams.append("type", params.type);
  if (params.tags) queryParams.append("tags", params.tags);
  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.offset) queryParams.append("offset", params.offset.toString());

  const url = `${API_BASE_URL}/help/articles${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  return response.json();
}
