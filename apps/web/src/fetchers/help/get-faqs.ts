// @epic-3.5-communication: Fetch help FAQs

import { API_BASE_URL, API_URL } from '@/constants/urls';

export interface HelpFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
  tags: string[];
  relatedArticleIds: string[];
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetFAQsParams {
  category?: string;
  q?: string;
}

export async function getFAQs(params: GetFAQsParams = {}): Promise<{
  success: boolean;
  data: HelpFAQ[];
}> {
  const queryParams = new URLSearchParams();

  if (params.category) queryParams.append("category", params.category);
  if (params.q) queryParams.append("q", params.q);

  const url = `${API_BASE_URL}/help/faqs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch FAQs: ${response.statusText}`);
  }

  return response.json();
}
