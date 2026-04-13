// @epic-4.3-enhanced-dashboards: Advanced filtering and global search system
// @role-workspace-manager: Global search across all workspace data
// @role-department-head: Department-scoped filtering and search
// @role-project-manager: Project-specific advanced filtering

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Filter,
  X,
  Save,
  BookmarkPlus,
  Calendar,
  Users,
  Tag,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Star,
  History,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/cn";

export interface FilterCriteria {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'range';
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  criteria: FilterCriteria[];
  isGlobal: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  isFavorite: boolean;
}

export interface SearchResult {
  id: string;
  type: 'task' | 'project' | 'user' | 'team' | 'milestone' | 'file' | 'comment';
  title: string;
  description: string;
  metadata: Record<string, any>;
  relevanceScore: number;
  breadcrumb: string[];
  lastModified: Date;
}

interface AdvancedFilterSystemProps {
  data: any[];
  onFilterChange: (filteredData: any[]) => void;
  onSearchResults: (results: SearchResult[]) => void;
  availableFields: {
    field: string;
    label: string;
    type: FilterCriteria['type'];
    options?: { value: string; label: string; }[];
  }[];
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'>) => void;
  onDeleteFilter?: (filterId: string) => void;
  globalSearch?: boolean;
  className?: string;
}

export function AdvancedFilterSystem({
  data,
  onFilterChange,
  onSearchResults,
  availableFields,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  globalSearch = true,
  className = ""
}: AdvancedFilterSystemProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCriteria, setActiveCriteria] = useState<FilterCriteria[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedSavedFilter, setSelectedSavedFilter] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDescription, setFilterDescription] = useState("");

  // Debounced search
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when query changes
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]);

  // Apply filters when criteria changes
  useEffect(() => {
    applyFilters();
  }, [activeCriteria, data]);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);
    
    try {
      // Simulate API call for global search
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock search results - in real implementation, this would call your search API
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'task',
          title: `Task containing "${query}"`,
          description: 'A sample task that matches your search query',
          metadata: { status: 'in_progress', priority: 'high' },
          relevanceScore: 0.95,
          breadcrumb: ['Project Alpha', 'Development'],
          lastModified: new Date()
        },
        {
          id: '2',
          type: 'project',
          title: `Project with "${query}"`,
          description: 'A project that matches your search criteria',
          metadata: { status: 'active', team: 'Frontend' },
          relevanceScore: 0.87,
          breadcrumb: ['Workspace', 'Projects'],
          lastModified: new Date(Date.now() - 86400000)
        },
        {
          id: '3',
          type: 'user',
          title: `User profile: ${query}`,
          description: 'User profile matching your search',
          metadata: { role: 'developer', department: 'Engineering' },
          relevanceScore: 0.72,
          breadcrumb: ['Team', 'Members'],
          lastModified: new Date(Date.now() - 172800000)
        }
      ].filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(mockResults);
      onSearchResults(mockResults);
      
      // Add to search history
      if (!searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchHistory, onSearchResults]);

  const applyFilters = useCallback(() => {
    if (activeCriteria.length === 0) {
      onFilterChange(data);
      return;
    }

    const filteredData = data.filter(item => {
      return activeCriteria.every(criteria => {
        const fieldValue = item[criteria.field];
        
        switch (criteria.operator) {
          case 'equals':
            return fieldValue === criteria.value;
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(criteria.value).toLowerCase());
          case 'starts_with':
            return String(fieldValue).toLowerCase().startsWith(String(criteria.value).toLowerCase());
          case 'ends_with':
            return String(fieldValue).toLowerCase().endsWith(String(criteria.value).toLowerCase());
          case 'greater_than':
            return Number(fieldValue) > Number(criteria.value);
          case 'less_than':
            return Number(fieldValue) < Number(criteria.value);
          case 'between':
            return Number(fieldValue) >= criteria.value[0] && Number(fieldValue) <= criteria.value[1];
          case 'in':
            return Array.isArray(criteria.value) && criteria.value.includes(fieldValue);
          case 'not_in':
            return Array.isArray(criteria.value) && !criteria.value.includes(fieldValue);
          default:
            return true;
        }
      });
    });

    onFilterChange(filteredData);
  }, [activeCriteria, data, onFilterChange]);

  const addCriteria = (field: string) => {
    const fieldConfig = availableFields.find(f => f.field === field);
    if (!fieldConfig) return;

    const newCriteria: FilterCriteria = {
      id: `${field}_${Date.now()}`,
      field,
      operator: fieldConfig.type === 'text' ? 'contains' : 'equals',
      value: fieldConfig.type === 'boolean' ? false : '',
      label: fieldConfig.label,
      type: fieldConfig.type
    };

    setActiveCriteria(prev => [...prev, newCriteria]);
  };

  const updateCriteria = (id: string, updates: Partial<FilterCriteria>) => {
    setActiveCriteria(prev => 
      prev.map(criteria => 
        criteria.id === id ? { ...criteria, ...updates } : criteria
      )
    );
  };

  const removeCriteria = (id: string) => {
    setActiveCriteria(prev => prev.filter(criteria => criteria.id !== id));
  };

  const clearAllFilters = () => {
    setActiveCriteria([]);
    setSearchQuery("");
    setSelectedSavedFilter("");
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim() || !onSaveFilter) return;

    const newFilter: Omit<SavedFilter, 'id' | 'createdAt' | 'usageCount'> = {
      name: filterName,
      description: filterDescription,
      criteria: activeCriteria,
      isGlobal: false,
      createdBy: 'current-user', // Replace with actual user ID
      isFavorite: false
    };

    onSaveFilter(newFilter);
    setFilterName("");
    setFilterDescription("");
  };

  const loadSavedFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId);
    if (filter) {
      setActiveCriteria(filter.criteria);
      setSelectedSavedFilter(filterId);
    }
  };

  const getOperatorOptions = (type: FilterCriteria['type']) => {
    switch (type) {
      case 'text':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' }
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'between', label: 'Between' }
        ];
      case 'select':
      case 'multiselect':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' },
          { value: 'not_in', label: 'Not in' }
        ];
      default:
        return [{ value: 'equals', label: 'Equals' }];
    }
  };

  const renderValueInput = (criteria: FilterCriteria) => {
    const fieldConfig = availableFields.find(f => f.field === criteria.field);
    
    switch (criteria.type) {
      case 'text':
        return (
          <Input
            value={criteria.value}
            onChange={(e) => updateCriteria(criteria.id, { value: e.target.value })}
            placeholder="Enter value..."
            className="w-full"
          />
        );
      
      case 'number':
        if (criteria.operator === 'between') {
          return (
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={criteria.value?.[0] || ''}
                onChange={(e) => updateCriteria(criteria.id, { 
                  value: [Number(e.target.value), criteria.value?.[1] || 0] 
                })}
                placeholder="Min"
                className="w-20"
              />
              <span>-</span>
              <Input
                type="number"
                value={criteria.value?.[1] || ''}
                onChange={(e) => updateCriteria(criteria.id, { 
                  value: [criteria.value?.[0] || 0, Number(e.target.value)] 
                })}
                placeholder="Max"
                className="w-20"
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            value={criteria.value}
            onChange={(e) => updateCriteria(criteria.id, { value: Number(e.target.value) })}
            placeholder="Enter number..."
            className="w-full"
          />
        );
      
      case 'select':
        return (
          <Select
            value={criteria.value}
            onValueChange={(value) => updateCriteria(criteria.id, { value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select option..." />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig?.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {fieldConfig?.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${criteria.id}_${option.value}`}
                  checked={Array.isArray(criteria.value) && criteria.value.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentValues = Array.isArray(criteria.value) ? criteria.value : [];
                    const newValues = checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    updateCriteria(criteria.id, { value: newValues });
                  }}
                />
                <Label htmlFor={`${criteria.id}_${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        );
      
      case 'boolean':
        return (
          <Switch
            checked={criteria.value}
            onCheckedChange={(checked) => updateCriteria(criteria.id, { value: checked })}
          />
        );
      
      case 'date':
        return (
          <DatePicker
            date={criteria.value ? new Date(criteria.value) : undefined}
            onSelect={(date) => updateCriteria(criteria.id, { value: date?.toISOString() })}
          />
        );
      
      default:
        return null;
    }
  };

  const getSearchResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'task': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'project': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'user': return <Users className="h-4 w-4 text-purple-500" />;
      case 'team': return <Users className="h-4 w-4 text-orange-500" />;
      case 'milestone': return <Calendar className="h-4 w-4 text-red-500" />;
      case 'file': return <Tag className="h-4 w-4 text-gray-500" />;
      case 'comment': return <Tag className="h-4 w-4 text-yellow-500" />;
      default: return <Search className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Bar */}
      {globalSearch && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all data..."
                className="pl-10 pr-4"
              />
              {isSearching && (
                <RefreshCw className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>
            
            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Search Results ({searchResults.length})</h4>
                  <Button variant="outline" size="sm" onClick={() => setSearchResults([])}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border"
                      >
                        {getSearchResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{result.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {result.breadcrumb.join(' > ')}
                            </span>
                            <span className="text-xs text-gray-400">
                              {result.lastModified.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {Math.round(result.relevanceScore * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* Search History */}
            {searchHistory.length > 0 && !searchQuery && (
              <div className="mt-4">
                <div className="flex items-center space-x-2 mb-2">
                  <History className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Recent searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.slice(0, 5).map((query, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100"
                      onClick={() => setSearchQuery(query)}
                    >
                      {query}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Advanced Filters</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                {showAdvancedFilters ? 'Hide' : 'Show'} Filters
              </Button>
              {activeCriteria.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {showAdvancedFilters && (
          <CardContent className="space-y-4">
            {/* Saved Filters */}
            {savedFilters.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Saved Filters</Label>
                <div className="flex flex-wrap gap-2">
                  {savedFilters.map((filter) => (
                    <Badge
                      key={filter.id}
                      variant={selectedSavedFilter === filter.id ? "default" : "outline"}
                      className="cursor-pointer hover:bg-gray-100 flex items-center space-x-1"
                      onClick={() => loadSavedFilter(filter.id)}
                    >
                      {filter.isFavorite && <Star className="h-3 w-3" />}
                      <span>{filter.name}</span>
                      <span className="text-xs">({filter.usageCount})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Active Criteria */}
            {activeCriteria.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Active Filters</Label>
                {activeCriteria.map((criteria) => (
                  <div key={criteria.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <div className="flex-1 grid grid-cols-4 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Field</Label>
                        <p className="text-sm font-medium">{criteria.label}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Operator</Label>
                        <Select
                          value={criteria.operator}
                          onValueChange={(value) => updateCriteria(criteria.id, { 
                            operator: value as FilterCriteria['operator'] 
                          })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getOperatorOptions(criteria.type).map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-500">Value</Label>
                        {renderValueInput(criteria)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCriteria(criteria.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Criteria */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Add Filter</Label>
              <div className="flex flex-wrap gap-2">
                {availableFields.map((field) => (
                  <Button
                    key={field.field}
                    variant="outline"
                    size="sm"
                    onClick={() => addCriteria(field.field)}
                    disabled={activeCriteria.some(c => c.field === field.field)}
                  >
                    {field.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Save Filter */}
            {activeCriteria.length > 0 && onSaveFilter && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-medium">Save Current Filter</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={filterName}
                    onChange={(e) => setFilterName(e.target.value)}
                    placeholder="Filter name..."
                  />
                  <Input
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    placeholder="Description (optional)..."
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={saveCurrentFilter}
                  disabled={!filterName.trim()}
                >
                  <BookmarkPlus className="h-4 w-4 mr-1" />
                  Save Filter
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filter Summary */}
      {(activeCriteria.length > 0 || searchQuery) && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                <div className="flex flex-wrap gap-1">
                  {searchQuery && (
                    <Badge variant="secondary">
                      Search: "{searchQuery}"
                    </Badge>
                  )}
                  {activeCriteria.map((criteria) => (
                    <Badge key={criteria.id} variant="secondary">
                      {criteria.label} {criteria.operator} {String(criteria.value)}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 