/**
 * Pagination utilities for handling list data
 */

export interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Paginates an array of items
 * @param items - Array of items to paginate
 * @param page - Current page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Paginated result with metadata
 */
export function paginate<T>(
  items: T[],
  page: number = 1,
  limit: number = 10
): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const startIndex = (currentPage - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: items.slice(startIndex, endIndex),
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  };
}

/**
 * Calculates pagination metadata without slicing data
 * Useful when pagination is done server-side
 */
export function getPaginationMetadata(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  
  return {
    currentPage,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

/**
 * Generates page numbers for pagination UI
 * @param currentPage - Current active page
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum number of page buttons to show
 * @returns Array of page numbers to display
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 7
): (number | string)[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(1);

  let start = Math.max(2, currentPage - halfVisible);
  let end = Math.min(totalPages - 1, currentPage + halfVisible);

  // Adjust if we're near the beginning
  if (currentPage <= halfVisible) {
    end = maxVisible - 1;
  }

  // Adjust if we're near the end
  if (currentPage >= totalPages - halfVisible) {
    start = totalPages - maxVisible + 2;
  }

  // Add ellipsis after first page if needed
  if (start > 2) {
    pages.push('...');
  }

  // Add middle pages
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (end < totalPages - 1) {
    pages.push('...');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

/**
 * Custom hook for managing pagination state
 */
export function usePagination(initialPage: number = 1, initialLimit: number = 10) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);

  const setPageLimit = useCallback((newLimit: number) => {
    setLimit(Math.max(1, newLimit));
    setPage(1); // Reset to first page when changing limit
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setLimit(initialLimit);
  }, [initialPage, initialLimit]);

  return {
    page,
    limit,
    goToPage,
    nextPage,
    prevPage,
    setPageLimit,
    reset,
  };
}

import { useState, useCallback } from 'react';

export default paginate;

