import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Plus, 
  Trash2, 
  Filter, 
  Save, 
  Share, 
  Copy, 
  Lightbulb,
  X,
  Calendar as CalendarIcon,
  Users,
  Tag,
  Zap,
  Eye,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';
import type { ProjectView } from '@/store/project';
import {
  FilterOperator,
  FilterType,
  LogicalOperator,
  getFieldDefinitions,
  generateFilterSuggestions,
  getQuickFilters,
  saveFilterPreset,
  generateShareUrl,
  type FilterRule,
  type FilterSet,
  type FilterableField,
  type FilterSuggestion
} from '@/services/advanced-filtering';

interface AdvancedFilterBuilderProps {
  currentView: ProjectView;
  data: any[];
  onFilterChange: (filterSet: FilterSet) => void;
  initialFilters?: FilterSet;
  className?: string;
}

// Rule builder component
const FilterRuleBuilder: React.FC<{
  rule: FilterRule;
  fields: FilterableField[];
  onRuleChange: (rule: FilterRule) => void;
  onRemove: () => void;
  canRemove: boolean;
}> = ({ rule, fields, onRuleChange, onRemove, canRemove }) => {
  const selectedField = fields.find(f => f.key === rule.field);
  const availableOperators = selectedField?.operators || [];

  const handleFieldChange = (fieldKey: string) => {
    const field = fields.find(f => f.key === fieldKey);
    onRuleChange({
      ...rule,
      field: fieldKey,
      type: field?.type || FilterType.TEXT,
      operator: field?.operators[0] || FilterOperator.EQUALS,
      value: ''
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    onRuleChange({ ...rule, operator, value: '' });
  };

  const handleValueChange = (value: any) => {
    onRuleChange({ ...rule, value });
  };

  const renderValueInput = () => {
    const needsValue = ![
      FilterOperator.IS_EMPTY,
      FilterOperator.IS_NOT_EMPTY
    ].includes(rule.operator);

    if (!needsValue) return null;

    switch (rule.type) {
      case FilterType.DATE:
        if (rule.operator === FilterOperator.DATE_BETWEEN) {
          return (
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {rule.value?.[0] ? format(new Date(rule.value[0]), 'PPP') : 'Start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rule.value?.[0] ? new Date(rule.value[0]) : undefined}
                    onSelect={(date) => handleValueChange([date?.toISOString(), rule.value?.[1]])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {rule.value?.[1] ? format(new Date(rule.value[1]), 'PPP') : 'End date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rule.value?.[1] ? new Date(rule.value[1]) : undefined}
                    onSelect={(date) => handleValueChange([rule.value?.[0], date?.toISOString()])}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        } else {
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {rule.value ? format(new Date(rule.value), 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={rule.value ? new Date(rule.value) : undefined}
                  onSelect={(date) => handleValueChange(date?.toISOString())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          );
        }

      case FilterType.SELECT:
      case FilterType.STATUS:
      case FilterType.PRIORITY:
        if ([FilterOperator.IN, FilterOperator.NOT_IN].includes(rule.operator)) {
          return (
            <div className="flex flex-wrap gap-1">
              {selectedField?.options?.map((option) => (
                <Badge
                  key={option.value}
                  variant={Array.isArray(rule.value) && rule.value.includes(option.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    const currentValues = Array.isArray(rule.value) ? rule.value : [];
                    const newValues = currentValues.includes(option.value)
                      ? currentValues.filter(v => v !== option.value)
                      : [...currentValues, option.value];
                    handleValueChange(newValues);
                  }}
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          );
        } else {
          return (
            <Select value={rule.value} onValueChange={handleValueChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select value..." />
              </SelectTrigger>
              <SelectContent>
                {selectedField?.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

      case FilterType.NUMBER:
        return (
          <Input
            type="number"
            value={rule.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter number..."
            className="w-32"
          />
        );

      case FilterType.BOOLEAN:
        return (
          <Select value={rule.value?.toString()} onValueChange={(v) => handleValueChange(v === 'true')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            value={rule.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={selectedField?.placeholder || 'Enter value...'}
            className="w-48"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border"
    >
      {/* Field Selection */}
      <Select value={rule.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select field..." />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.key} value={field.key}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator Selection */}
      <Select value={rule.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableOperators.map((op) => (
            <SelectItem key={op} value={op}>
              {op.replace(/_/g, ' ').toLowerCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {renderValueInput()}

      {/* Remove Button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
};

// Filter suggestions component
const FilterSuggestions: React.FC<{
  suggestions: FilterSuggestion[];
  onApplySuggestion: (suggestion: FilterSuggestion) => void;
}> = ({ suggestions, onApplySuggestion }) => {
  if (suggestions.length === 0) return null;

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-4 w-4 text-yellow-600" />
          <CardTitle className="text-sm text-yellow-800">Smart Suggestions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, 3).map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-yellow-50"
            onClick={() => onApplySuggestion(suggestion)}
          >
            <div className="flex-1">
              <div className="font-medium text-sm">{suggestion.label}</div>
              <div className="text-xs text-muted-foreground">{suggestion.description}</div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {Math.round(suggestion.confidence * 100)}%
              </Badge>
              {suggestion.preview && (
                <Badge variant="secondary" className="text-xs">
                  {suggestion.preview.resultCount} results
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// Quick filters component
const QuickFilters: React.FC<{
  quickFilters: FilterSet[];
  onApplyQuickFilter: (filterSet: FilterSet) => void;
}> = ({ quickFilters, onApplyQuickFilter }) => (
  <div className="flex flex-wrap gap-2">
    {quickFilters.map((filter) => (
      <Button
        key={filter.id}
        variant="outline"
        size="sm"
        onClick={() => onApplyQuickFilter(filter)}
        className="h-8"
      >
        <Zap className="h-3 w-3 mr-2" />
        {filter.name}
      </Button>
    ))}
  </div>
);

const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  currentView,
  data,
  onFilterChange,
  initialFilters,
  className
}) => {
  const [filterSet, setFilterSet] = useState<FilterSet>(
    initialFilters || {
      id: `filter_${Date.now()}`,
      name: 'Untitled Filter',
      description: '',
      rules: [
        {
          id: `rule_${Date.now()}`,
          field: '',
          operator: FilterOperator.EQUALS,
          value: '',
          type: FilterType.TEXT
        }
      ],
      logicalOperator: LogicalOperator.AND,
      createdBy: 'current-user',
      createdAt: new Date(),
      isPublic: false,
      isDefault: false,
      usageCount: 0,
      tags: [],
      applicableViews: [currentView]
    }
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveForm, setSaveForm] = useState({ name: '', description: '', isShared: false });

  // Get field definitions and suggestions
  const fields = useMemo(() => getFieldDefinitions(currentView), [currentView]);
  const quickFilters = useMemo(() => getQuickFilters(currentView), [currentView]);
  const suggestions = useMemo(
    () => generateFilterSuggestions(data, currentView, []),
    [data, currentView]
  );

  // Add new rule
  const addRule = useCallback(() => {
    const newRule: FilterRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      field: fields[0]?.key || '',
      operator: fields[0]?.operators[0] || FilterOperator.EQUALS,
      value: '',
      type: fields[0]?.type || FilterType.TEXT
    };

    setFilterSet(prev => ({
      ...prev,
      rules: [...prev.rules, newRule]
    }));
  }, [fields]);

  // Remove rule
  const removeRule = useCallback((ruleId: string) => {
    setFilterSet(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  }, []);

  // Update rule
  const updateRule = useCallback((ruleId: string, updatedRule: FilterRule) => {
    setFilterSet(prev => ({
      ...prev,
      rules: prev.rules.map(rule => rule.id === ruleId ? updatedRule : rule)
    }));
  }, []);

  // Apply filter changes
  const applyFilters = useCallback(() => {
    const validRules = filterSet.rules.filter(rule => 
      rule.field && rule.operator && (
        [FilterOperator.IS_EMPTY, FilterOperator.IS_NOT_EMPTY].includes(rule.operator) ||
        rule.value !== ''
      )
    );

    if (validRules.length > 0) {
      const validFilterSet = { ...filterSet, rules: validRules };
      onFilterChange(validFilterSet);
      toast.success(`Applied ${validRules.length} filter${validRules.length === 1 ? '' : 's'}`);
    } else {
      onFilterChange({ ...filterSet, rules: [] });
      toast.info('Cleared all filters');
    }
  }, [filterSet, onFilterChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterSet(prev => ({
      ...prev,
      rules: [
        {
          id: `rule_${Date.now()}`,
          field: fields[0]?.key || '',
          operator: fields[0]?.operators[0] || FilterOperator.EQUALS,
          value: '',
          type: fields[0]?.type || FilterType.TEXT
        }
      ]
    }));
    onFilterChange({ ...filterSet, rules: [] });
    toast.info('Cleared all filters');
  }, [fields, filterSet, onFilterChange]);

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: FilterSet) => {
    setFilterSet(quickFilter);
    onFilterChange(quickFilter);
    toast.success(`Applied "${quickFilter.name}" filter`);
  }, [onFilterChange]);

  // Apply suggestion
  const applySuggestion = useCallback((suggestion: FilterSuggestion) => {
    const suggestionFilterSet: FilterSet = {
      ...filterSet,
      name: suggestion.label,
      description: suggestion.description,
      rules: suggestion.rules
    };
    setFilterSet(suggestionFilterSet);
    onFilterChange(suggestionFilterSet);
    toast.success(`Applied suggested filter: ${suggestion.label}`);
  }, [filterSet, onFilterChange]);

  // Save filter preset
  const handleSavePreset = useCallback(async () => {
    try {
      const preset = await saveFilterPreset(
        saveForm.name,
        saveForm.description,
        [filterSet],
        'current-user',
        saveForm.isShared
      );
      
      toast.success('Filter preset saved successfully');
      setIsSaveDialogOpen(false);
      setSaveForm({ name: '', description: '', isShared: false });

      if (saveForm.isShared) {
        const shareUrl = generateShareUrl(preset.id);
        navigator.clipboard.writeText(shareUrl);
        toast.info('Share URL copied to clipboard');
      }
    } catch (error) {
      toast.error('Failed to save filter preset');
    }
  }, [saveForm, filterSet]);

  // Calculate result count
  const resultCount = useMemo(() => {
    // This would use the actual filtering logic
    return data.length; // Simplified for demo
  }, [data]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header and Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant={isExpanded ? "default" : "outline"}
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
            {filterSet.rules.filter(r => r.field && r.value).length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {filterSet.rules.filter(r => r.field && r.value).length}
              </Badge>
            )}
          </Button>

          {quickFilters.length > 0 && (
            <QuickFilters
              quickFilters={quickFilters}
              onApplyQuickFilter={applyQuickFilter}
            />
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            {resultCount} results
          </Badge>
          
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear All
          </Button>
          
          <Button size="sm" onClick={applyFilters}>
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Smart Suggestions */}
      {suggestions.length > 0 && (
        <FilterSuggestions
          suggestions={suggestions}
          onApplySuggestion={applySuggestion}
        />
      )}

      {/* Advanced Filter Builder */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filter Builder</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select
                      value={filterSet.logicalOperator}
                      onValueChange={(value: LogicalOperator) =>
                        setFilterSet(prev => ({ ...prev, logicalOperator: value }))
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={LogicalOperator.AND}>AND</SelectItem>
                        <SelectItem value={LogicalOperator.OR}>OR</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Filter Preset</DialogTitle>
                          <DialogDescription>
                            Save this filter configuration for future use
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                              id="name"
                              value={saveForm.name}
                              onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Enter filter name..."
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={saveForm.description}
                              onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Optional description..."
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="shared"
                              checked={saveForm.isShared}
                              onChange={(e) => setSaveForm(prev => ({ ...prev, isShared: e.target.checked }))}
                            />
                            <Label htmlFor="shared">Make this filter shareable</Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleSavePreset} disabled={!saveForm.name}>
                            Save Preset
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <AnimatePresence>
                  {filterSet.rules.map((rule, index) => (
                    <div key={rule.id}>
                      {index > 0 && (
                        <div className="flex justify-center py-2">
                          <Badge variant="outline" className="text-xs">
                            {filterSet.logicalOperator}
                          </Badge>
                        </div>
                      )}
                      <FilterRuleBuilder
                        rule={rule}
                        fields={fields}
                        onRuleChange={(updatedRule) => updateRule(rule.id, updatedRule)}
                        onRemove={() => removeRule(rule.id)}
                        canRemove={filterSet.rules.length > 1}
                      />
                    </div>
                  ))}
                </AnimatePresence>
                
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={addRule}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedFilterBuilder;