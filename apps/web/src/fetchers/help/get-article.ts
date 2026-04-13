// @epic-3.5-communication: Fetch single help article with content

import { API_BASE_URL, API_URL } from '@/constants/urls';
import { HelpArticle } from "./get-articles";

export interface HelpArticleDetailed extends HelpArticle {
  content: string;
}

export async function getArticle(slug: string): Promise<{
  success: boolean;
  data: HelpArticleDetailed;
}> {
  const url = `${API_BASE_URL}/help/articles/${slug}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.statusText}`);
  }

  return response.json();
}
