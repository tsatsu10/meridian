import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  ArrowUpDown,
  X,
  Download,
  List,
  Grid as GridIcon,
  Layers,
  CheckSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MilestoneToolbarProps {
  // View mode
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  // Filters
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  riskFilter: string;
  onRiskFilterChange: (risk: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  
  // Sort
  sortBy: string;
  onSortChange: (sort: string) => void;
  
  // Group
  groupBy: string;
  onGroupChange: (group: string) => void;
  
  // Actions
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onExport: (format: 'csv' | 'json') => void;
  
  // Bulk selection
  selectMode: boolean;
  onSelectModeChange: (mode: boolean) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  
  // Stats
  totalCount: number;
  filteredCount: number;
}

export default function MilestoneToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  riskFilter,
  onRiskFilterChange,
  typeFilter,
  onTypeFilterChange,
  sortBy,
  onSortChange,
  groupBy,
  onGroupChange,
  hasActiveFilters,
  onClearFilters,
  onExport,
  selectMode,
  onSelectModeChange,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  totalCount,
  filteredCount,
}: MilestoneToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Top Row: View modes, Search, Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="h-8"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="h-8"
          >
            <GridIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search milestones..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Select Mode Toggle */}
        <Button
          variant={selectMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelectModeChange(!selectMode)}
          className="h-9"
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Select
        </Button>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onExport('csv')}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Results Count */}
        {totalCount > 0 && (
          <div className="text-sm text-muted-foreground ml-auto">
            {filteredCount !== totalCount && `${filteredCount} / `}
            {totalCount} milestone{totalCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Second Row: Filters, Sort, Group */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="achieved">Achieved</SelectItem>
            <SelectItem value="missed">Missed</SelectItem>
          </SelectContent>
        </Select>

        {/* Risk Filter */}
        <Select value={riskFilter} onValueChange={onRiskFilterChange}>
          <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="manual">Manual Only</SelectItem>
            <SelectItem value="auto">Auto-detected</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-[180px] h-9">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Due Date (Earliest)</SelectItem>
            <SelectItem value="date-desc">Due Date (Latest)</SelectItem>
            <SelectItem value="risk-high">Risk (High to Low)</SelectItem>
            <SelectItem value="risk-low">Risk (Low to High)</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
            <SelectItem value="created">Recently Created</SelectItem>
            <SelectItem value="updated">Recently Updated</SelectItem>
          </SelectContent>
        </Select>

        {/* Group */}
        <Select value={groupBy} onValueChange={onGroupChange}>
          <SelectTrigger className="w-[160px] h-9">
            <Layers className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Grouping</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
            <SelectItem value="risk">By Risk</SelectItem>
            <SelectItem value="type">By Type</SelectItem>
            <SelectItem value="month">By Month</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters} className="h-9">
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Selection Bar */}
      {selectMode && selectedCount > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <span className="text-sm font-medium">
            {selectedCount} selected
          </span>
          <Button size="sm" variant="outline" onClick={onSelectAll}>
            Select All
          </Button>
          <Button size="sm" variant="outline" onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>
      )}
    </div>
  );
}

