/**
 * Smart Filters Component
 * Advanced filtering with saved presets for dashboard views
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Filter,
  X,
  Check,
  ChevronDown,
  Save,
  Star,
  Trash2,
  Plus,
  AlertCircle,
  Users,
  Flame,
  Clock,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type {DashboardFilters,
  FilterPreset,
  FilterPriority,
  FilterStatus,
  FilterTimeRange
} from '@/types/filters';
import { useSavedFilters } from '@/hooks/use-saved-filters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SmartFiltersProps {
  onFiltersChange: (filters: DashboardFilters) => void;
  className?: string;
}

const PRESET_ICONS = {
  'alert-circle': AlertCircle,
  'users': Users,
  'flame': Flame,
  'clock': Clock,
  'check-circle': CheckCircle
};

const PRESET_COLORS = {
  red: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
  blue: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  orange: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
  green: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  purple: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'
};

export function SmartFilters({ onFiltersChange, className }: SmartFiltersProps) {
  const {
    presets,
    activePresetId,
    activeFilters,
    createPreset,
    deletePreset,
    setActivePreset
  } = useSavedFilters();

  const [isCreatingPreset, setIsCreatingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [localFilters, setLocalFilters] = useState<DashboardFilters>(activeFilters);
  const [showFilters, setShowFilters] = useState(false);

  const handlePresetSelect = useCallback((presetId: string) => {
    setActivePreset(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setLocalFilters(preset.filters);
      onFiltersChange(preset.filters);
    }
  }, [presets, setActivePreset, onFiltersChange]);

  const handleFilterChange = useCallback((key: keyof DashboardFilters, value: any) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onFiltersChange(updated);
  }, [localFilters, onFiltersChange]);

  const handleSavePreset = useCallback(() => {
    if (newPresetName.trim()) {
      createPreset(newPresetName.trim(), localFilters);
      setNewPresetName('');
      setIsCreatingPreset(false);
    }
  }, [newPresetName, localFilters, createPreset]);

  const clearFilter = useCallback((key: keyof DashboardFilters) => {
    const clearedValue = Array.isArray(localFilters[key]) ? [] : undefined;
    handleFilterChange(key, clearedValue);
  }, [localFilters, handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    const emptyFilters: DashboardFilters = {
      timeRange: 'all',
      projectIds: [],
      userIds: [],
      priorities: [],
      status: [],
      tags: []
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setActivePreset(null);
  }, [onFiltersChange, setActivePreset]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (localFilters.timeRange !== 'all') count++;
    if (localFilters.projectIds.length > 0) count++;
    if (localFilters.userIds.length > 0) count++;
    if (localFilters.priorities.length > 0) count++;
    if (localFilters.status.length > 0) count++;
    if (localFilters.tags.length > 0) count++;
    if (localFilters.isOverdue) count++;
    if (localFilters.assignedToMe) count++;
    return count;
  }, [localFilters]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={cn("glass-card", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-7"
            >
              <ChevronDown className={cn(
                "h-3 w-3 transition-transform",
                showFilters && "rotate-180"
              )} />
            </Button>
            
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Preset Selection */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const IconComponent = preset.icon ? PRESET_ICONS[preset.icon as keyof typeof PRESET_ICONS] : Filter;
            const colorClass = preset.color ? PRESET_COLORS[preset.color as keyof typeof PRESET_COLORS] : '';
            const isActive = activePresetId === preset.id;
            
            return (
              <div key={preset.id} className="relative group">
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={cn(
                    "h-8 text-xs gap-2 transition-all",
                    !isActive && colorClass,
                    isActive && "ring-2 ring-primary"
                  )}
                >
                  {IconComponent && <IconComponent className="h-3 w-3" />}
                  {preset.name}
                  {isActive && <Check className="h-3 w-3" />}
                </Button>
                
                {!preset.isSystem && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    <X className="h-3 w-3 text-red-600 dark:text-red-300" />
                  </Button>
                )}
              </div>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingPreset(!isCreatingPreset)}
            className="h-8 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Save Current
          </Button>
        </div>

        {/* Save New Preset Form */}
        {isCreatingPreset && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Input
              placeholder="Preset name..."
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleSavePreset} className="h-8 gap-1">
              <Save className="h-3 w-3" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsCreatingPreset(false);
                setNewPresetName('');
              }}
              className="h-8"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
            {/* Time Range */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Time Range</Label>
              <Select
                value={localFilters.timeRange}
                onValueChange={(value) => handleFilterChange('timeRange', value as FilterTimeRange)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Status</Label>
                {localFilters.status.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('status')}
                    className="h-5 text-xs px-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {(['pending', 'in-progress', 'done', 'blocked'] as FilterStatus[]).map((status) => (
                  <Badge
                    key={status}
                    variant={localFilters.status.includes(status) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      const updated = localFilters.status.includes(status)
                        ? localFilters.status.filter(s => s !== status)
                        : [...localFilters.status, status];
                      handleFilterChange('status', updated);
                    }}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Priority</Label>
                {localFilters.priorities.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearFilter('priorities')}
                    className="h-5 text-xs px-1"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {(['low', 'medium', 'high', 'urgent'] as FilterPriority[]).map((priority) => (
                  <Badge
                    key={priority}
                    variant={localFilters.priorities.includes(priority) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-xs",
                      localFilters.priorities.includes(priority) && priority === 'urgent' && "bg-red-600",
                      localFilters.priorities.includes(priority) && priority === 'high' && "bg-orange-600",
                      localFilters.priorities.includes(priority) && priority === 'medium' && "bg-yellow-600"
                    )}
                    onClick={() => {
                      const updated = localFilters.priorities.includes(priority)
                        ? localFilters.priorities.filter(p => p !== priority)
                        : [...localFilters.priorities, priority];
                      handleFilterChange('priorities', updated);
                    }}
                  >
                    {priority}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="space-y-2 md:col-span-2 lg:col-span-3">
              <Label className="text-xs font-medium">Quick Filters</Label>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={localFilters.isOverdue ? "default" : "outline"}
                  className="cursor-pointer text-xs bg-red-600 hover:bg-red-700"
                  onClick={() => handleFilterChange('isOverdue', !localFilters.isOverdue)}
                >
                  Overdue
                </Badge>
                <Badge
                  variant={localFilters.assignedToMe ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => handleFilterChange('assignedToMe', !localFilters.assignedToMe)}
                >
                  Assigned to Me
                </Badge>
                <Badge
                  variant={localFilters.createdByMe ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => handleFilterChange('createdByMe', !localFilters.createdByMe)}
                >
                  Created by Me
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {localFilters.timeRange !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1">
                {localFilters.timeRange}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => handleFilterChange('timeRange', 'all')}
                />
              </Badge>
            )}
            {localFilters.status.map((status) => (
              <Badge key={status} variant="secondary" className="text-xs gap-1">
                {status}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => {
                    const updated = localFilters.status.filter(s => s !== status);
                    handleFilterChange('status', updated);
                  }}
                />
              </Badge>
            ))}
            {localFilters.priorities.map((priority) => (
              <Badge key={priority} variant="secondary" className="text-xs gap-1">
                {priority}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => {
                    const updated = localFilters.priorities.filter(p => p !== priority);
                    handleFilterChange('priorities', updated);
                  }}
                />
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

