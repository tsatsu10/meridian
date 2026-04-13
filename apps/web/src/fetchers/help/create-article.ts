import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface CreateArticleInput {
  title: string;
  slug?: string;
  description: string;
  content: string;
  category: 'getting-started' | 'features' | 'integrations' | 'troubleshooting' | 'best-practices';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  contentType?: 'article' | 'video' | 'faq';
  readTime?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  isPublished?: boolean;
}

export async function createArticle(data: CreateArticleInput) {
  const response = await fetch(`${API_BASE_URL}/help/admin/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create article");
  }

  return response.json();
}
