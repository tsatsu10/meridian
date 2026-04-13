import { useState, useMemo } from "react";

export interface PaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedData: T[];
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  pageInfo: string;
}

// @epic-3.4-teams: Reusable pagination hook for teams, members, and users
export function usePagination<T>(
  data: T[] = [],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const { initialPage = 1, pageSize: initialPageSize = 10 } = options;
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const pageInfo = `${startItem}-${endItem} of ${totalItems}`;

  return {
    currentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
    canGoNext,
    canGoPrev,
    pageInfo,
  };
}

