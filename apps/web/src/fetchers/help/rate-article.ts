// @epic-3.5-communication: Rate help articles

import { API_BASE_URL, API_URL } from '@/constants/urls';

export async function rateArticle(articleId: string, rating: number): Promise<{
  success: boolean;
  data: {
    rating: number;
    ratingCount: number;
  };
}> {
  const url = `${API_BASE_URL}/help/articles/${articleId}/rate`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ rating }),
  });

  if (!response.ok) {
    throw new Error(`Failed to rate article: ${response.statusText}`);
  }

  return response.json();
}

export async function submitArticleFeedback(articleId: string, helpful: boolean): Promise<{
  success: boolean;
  message: string;
}> {
  const url = `${API_BASE_URL}/help/articles/${articleId}/feedback`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ helpful }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit feedback: ${response.statusText}`);
  }

  return response.json();
}

export async function submitFAQFeedback(faqId: string, helpful: boolean): Promise<{
  success: boolean;
  message: string;
}> {
  const url = `${API_BASE_URL}/help/faqs/${faqId}/feedback`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ helpful }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit FAQ feedback: ${response.statusText}`);
  }

  return response.json();
}
