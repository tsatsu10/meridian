import React from 'react';
import { Search, Filter, SortAsc } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChannelSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'name' | 'activity' | 'members';
  onSortChange: (sort: 'name' | 'activity' | 'members') => void;
  filterType: 'all' | 'public' | 'private';
  onFilterChange: (filter: 'all' | 'public' | 'private') => void;
}

export default function ChannelSearch({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterType,
  onFilterChange
}: ChannelSearchProps) {
  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center space-x-2">
        {/* Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="h-3 w-3 mr-1" />
              {filterType === 'all' ? 'All' : filterType === 'public' ? 'Public' : 'Private'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onFilterChange('all')}>
              All Channels
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('public')}>
              Public Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFilterChange('private')}>
              Private Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <SortAsc className="h-3 w-3 mr-1" />
              {sortBy === 'name' ? 'Name' : sortBy === 'activity' ? 'Activity' : 'Members'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onSortChange('activity')}>
              Recent Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange('name')}>
              Name A-Z
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange('members')}>
              Member Count
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
} 