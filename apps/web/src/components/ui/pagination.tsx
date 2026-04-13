// @epic-3.4-teams: Pagination component for teams, members, and users
import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MeridianPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  pageInfo: string;
  pageSizeOptions?: number[];
  className?: string;
}

export function MeridianPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  canGoNext,
  canGoPrev,
  pageInfo,
  pageSizeOptions = [10, 25, 50, 100],
  className,
}: MeridianPaginationProps) {
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        end = 4;
      }

      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      // Add ellipsis if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 flex-wrap", className)}>
      {/* Page info and size selector */}
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {pageInfo}
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Per page:</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-2 py-1 border border-input bg-background rounded-md text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First page */}
        <Button
          key="first-page"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          key="prev-page"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                ...
              </span>
            );
          }

          return (
            <Button
              key={`page-${page}`}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="h-8 min-w-8 px-2"
            >
              {page}
            </Button>
          );
        })}

        {/* Next page */}
        <Button
          key="next-page"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          key="last-page"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Shadcn-style Pagination wrapper component for projects.tsx and other pages
export const Pagination = forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
);
Pagination.displayName = "Pagination";

// Export shadcn-compatible pagination components for backward compatibility
export const PaginationContent = forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex flex-row items-center gap-1", className)} {...props} />
  )
);
PaginationContent.displayName = "PaginationContent";

export const PaginationItem = forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("", className)} {...props} />
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & React.ComponentProps<typeof Button>;

export const PaginationLink = ({ className, isActive, size = "icon", ...props }: PaginationLinkProps) => (
  <Button
    aria-current={isActive ? "page" : undefined}
    variant={isActive ? "default" : "outline"}
    size={size}
    className={cn("", className)}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

export const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button variant="outline" size="sm" className={cn("gap-1", className)} {...props}>
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </Button>
);
PaginationPrevious.displayName = "PaginationPrevious";

export const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button variant="outline" size="sm" className={cn("gap-1", className)} {...props}>
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </Button>
);
PaginationNext.displayName = "PaginationNext";

export const PaginationEllipsis = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span aria-hidden className={cn("flex h-9 w-9 items-center justify-center", className)} {...props}>
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";
