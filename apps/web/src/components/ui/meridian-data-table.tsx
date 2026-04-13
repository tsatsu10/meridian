// @epic-3.1-dashboards: Professional data table component with light mode design system
// @persona-sarah: PM needs task tables with filtering and sorting capabilities
// @persona-jennifer: Exec needs executive dashboards with data visualization
// @persona-david: Team lead needs team analytics and performance tables
// @persona-mike: Dev needs efficient data display for development metrics
// @persona-lisa: Designer needs file management tables and project portfolios

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown, 
  Filter, 
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  ArrowLeft,
  ArrowRight
} from "lucide-react";
import { MeridianButton } from "./meridian-button";
import { MeridianBadge } from "./meridian-badge";
import { MeridianFormInput } from "./meridian-form";

// Data Table Root Container
const meridianDataTableVariants = cva(
  [
    "w-full border-separate border-spacing-0",
    "bg-card rounded-xl border border-meridian-neutral-200",
    "shadow-meridian-sm overflow-hidden"
  ],
  {
    variants: {
      variant: {
        default: "bg-card border-meridian-neutral-200",
        elevated: "shadow-meridian-lg border-meridian-neutral-300",
        glass: "glass-light border-glass-border-light backdrop-blur-lg"
      },
      size: {
        sm: "text-xs",
        md: "text-sm", 
        lg: "text-base"
      },
      density: {
        compact: "[&_td]:py-2 [&_th]:py-2",
        comfortable: "[&_td]:py-3 [&_th]:py-3",
        spacious: "[&_td]:py-4 [&_th]:py-4"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      density: "comfortable"
    }
  }
);

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  minWidth?: string;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: string;
}

export interface MeridianDataTableProps<T = any>
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof meridianDataTableVariants> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  filterConfig?: FilterConfig;
  onFilter?: (filters: FilterConfig) => void;
  onRowClick?: (row: T, index: number) => void;
  selectedRows?: Set<number>;
  onSelectionChange?: (selectedRows: Set<number>) => void;
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T, index: number) => void;
    variant?: 'default' | 'destructive';
  }[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  emptyState?: React.ReactNode;
  persona?: 'pm' | 'tl' | 'exec' | 'dev' | 'design';
}

const MeridianDataTable = <T,>({
  className,
  variant,
  size,
  density,
  data,
  columns,
  loading = false,
  sortConfig,
  onSort,
  filterConfig,
  onFilter,
  onRowClick,
  selectedRows,
  onSelectionChange,
  actions,
  pagination,
  searchable = false,
  searchPlaceholder = "Search...",
  onSearch,
  emptyState,
  persona,
  ...props
}: MeridianDataTableProps<T>) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showFilters, setShowFilters] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<FilterConfig>(filterConfig || {});

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    onSort(key);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setLocalFilters(newFilters);
    onFilter?.(newFilters);
  };

  const handleRowSelect = (index: number, selected: boolean) => {
    if (!onSelectionChange || !selectedRows) return;
    
    const newSelection = new Set(selectedRows);
    if (selected) {
      newSelection.add(index);
    } else {
      newSelection.delete(index);
    }
    onSelectionChange(newSelection);
  };

  const handleSelectAll = (selected: boolean) => {
    if (!onSelectionChange) return;
    
    if (selected) {
      const allIndexes = new Set(data.map((_, index) => index));
      onSelectionChange(allIndexes);
    } else {
      onSelectionChange(new Set());
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-meridian-neutral-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-meridian-primary" />
      : <ChevronDown className="h-4 w-4 text-meridian-primary" />;
  };

  const isAllSelected = selectedRows && selectedRows.size === data.length;
  const isIndeterminate = selectedRows && selectedRows.size > 0 && selectedRows.size < data.length;

  return (
    <div 
      className={cn("space-y-4", className)} 
      data-persona={persona}
      {...props}
    >
      {/* Table Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-meridian-neutral-500" />
              <MeridianFormInput
                variant="glass"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 min-w-[300px]"
              />
            </div>
          )}
          
          {columns.some(col => col.filterable) && (
            <MeridianButton
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              Filter
            </MeridianButton>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedRows && selectedRows.size > 0 && (
            <MeridianBadge variant="primary" size="sm">
              {selectedRows.size} selected
            </MeridianBadge>
          )}
          
          <MeridianButton
            variant="ghost"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export
          </MeridianButton>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-meridian-neutral-50 rounded-lg border border-meridian-neutral-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {columns
              .filter(col => col.filterable)
              .map(column => (
                <div key={column.key} className="space-y-1">
                  <label className="text-sm font-medium text-meridian-neutral-700">
                    {column.label}
                  </label>
                  <MeridianFormInput
                    size="sm"
                    placeholder={`Filter by ${column.label.toLowerCase()}`}
                    value={localFilters[column.key] || ''}
                    onChange={(e) => handleFilterChange(column.key, e.target.value)}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className={cn(meridianDataTableVariants({ variant, size, density }))}>
          {/* Table Header */}
          <thead>
            <tr className="bg-meridian-neutral-50 border-b border-meridian-neutral-200">
              {onSelectionChange && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate || false;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-meridian-neutral-300 text-meridian-primary focus:ring-meridian-primary/20"
                  />
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 font-semibold text-meridian-neutral-700",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    column.sortable && "cursor-pointer hover:bg-meridian-neutral-100 transition-colors",
                    column.sticky === 'left' && "sticky left-0 bg-meridian-neutral-50 z-10",
                    column.sticky === 'right' && "sticky right-0 bg-meridian-neutral-50 z-10"
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              
              {actions && actions.length > 0 && (
                <th className="px-4 py-3 text-right">Actions</th>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (onSelectionChange ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-meridian-neutral-500"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-meridian-primary"></div>
                    Loading...
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (onSelectionChange ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center"
                >
                  {emptyState || (
                    <div className="text-meridian-neutral-500">
                      <div className="text-lg font-medium mb-1">No data found</div>
                      <div className="text-sm">Try adjusting your search or filters</div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-b border-meridian-neutral-100 transition-colors",
                    "hover:bg-meridian-neutral-50/50",
                    onRowClick && "cursor-pointer",
                    selectedRows?.has(index) && "bg-meridian-primary-50"
                  )}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {onSelectionChange && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows?.has(index) || false}
                        onChange={(e) => handleRowSelect(index, e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-meridian-neutral-300 text-meridian-primary focus:ring-meridian-primary/20"
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-meridian-neutral-700",
                        column.align === 'center' && "text-center",
                        column.align === 'right' && "text-right",
                        column.sticky === 'left' && "sticky left-0 bg-inherit z-10",
                        column.sticky === 'right' && "sticky right-0 bg-inherit z-10"
                      )}
                    >
                      {column.render 
                        ? column.render(row[column.key], row, index)
                        : row[column.key]
                      }
                    </td>
                  ))}
                  
                  {actions && actions.length > 0 && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actions.map((action, actionIndex) => (
                          <MeridianButton
                            key={actionIndex}
                            variant={action.variant === 'destructive' ? 'error' : 'ghost'}
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(row, index);
                            }}
                            title={action.label}
                          >
                            {action.icon}
                          </MeridianButton>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-meridian-neutral-600">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex items-center gap-2">
            <MeridianButton
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Previous
            </MeridianButton>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }, (_, i) => {
                const page = pagination.page + i - 2;
                if (page < 1 || page > Math.ceil(pagination.total / pagination.pageSize)) return null;
                
                return (
                  <MeridianButton
                    key={page}
                    variant={page === pagination.page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => pagination.onPageChange(page)}
                  >
                    {page}
                  </MeridianButton>
                );
              })}
            </div>
            
            <MeridianButton
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Next
            </MeridianButton>
          </div>
        </div>
      )}
    </div>
  );
};

export { MeridianDataTable, meridianDataTableVariants }; 