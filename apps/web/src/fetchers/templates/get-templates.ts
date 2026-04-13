import { API_BASE_URL } from "../../constants/urls";
import type { TemplateFilterOptions, TemplateListResponse } from "../../types/templates";

export async function getTemplates(
  filters?: TemplateFilterOptions
): Promise<TemplateListResponse> {
  const params = new URLSearchParams();

  if (filters) {
    if (filters.industry) params.append('industry', filters.industry);
    if (filters.profession) params.append('profession', filters.profession);
    if (filters.category) params.append('category', filters.category);
    if (filters.difficulty) params.append('difficulty', filters.difficulty);
    if (filters.tags && filters.tags.length > 0) {
      params.append('tags', filters.tags.join(','));
    }
    if (filters.searchQuery) params.append('searchQuery', filters.searchQuery);
    if (filters.isOfficial !== undefined) {
      params.append('isOfficial', String(filters.isOfficial));
    }
    if (filters.minRating !== undefined) {
      params.append('minRating', String(filters.minRating));
    }
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.offset) params.append('offset', String(filters.offset));
  }

  const url = `${API_BASE_URL}/templates${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }

  return response.json();
}

