import type { ProjectView, ViewState } from '@/store/project';

// Advanced filter types
interface FilterRule {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
  label?: string;
}

enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
  DATE_BEFORE = 'date_before',
  DATE_AFTER = 'date_after',
  DATE_BETWEEN = 'date_between',
  REGEX = 'regex'
}

enum FilterType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  USER = 'user',
  PRIORITY = 'priority',
  STATUS = 'status'
}

enum LogicalOperator {
  AND = 'and',
  OR = 'or'
}

// Filter set for complex queries
interface FilterSet {
  id: string;
  name: string;
  description?: string;
  rules: FilterRule[];
  logicalOperator: LogicalOperator;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  isDefault: boolean;
  usageCount: number;
  tags: string[];
  applicableViews: ProjectView[];
}

// Saved filter presets
interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterSet[];
  createdBy: string;
  createdAt: Date;
  lastUsed: Date;
  isShared: boolean;
  shareUrl?: string;
  permissions: {
    canEdit: string[];
    canView: string[];
  };
}

// Smart filter suggestions
interface FilterSuggestion {
  id: string;
  label: string;
  description: string;
  rules: FilterRule[];
  confidence: number; // 0-1
  reason: string;
  context: string; // why this filter is suggested
  preview?: {
    resultCount: number;
    sampleResults: any[];
  };
}

// Field definitions for different data types
interface FilterableField {
  key: string;
  label: string;
  type: FilterType;
  operators: FilterOperator[];
  options?: { value: any; label: string }[];
  placeholder?: string;
  validation?: (value: any) => boolean;
  format?: (value: any) => string;
}

class AdvancedFilteringEngine {
  private presets: FilterPreset[] = [];
  private recentFilters: FilterSet[] = [];
  private fieldDefinitions: Record<string, FilterableField[]> = {};

  constructor() {
    this.initFieldDefinitions();
    this.loadPresetsFromStorage();
  }

  private initFieldDefinitions(): void {
    // Common fields across all views
    const commonFields: FilterableField[] = [
      {
        key: 'title',
        label: 'Title',
        type: FilterType.TEXT,
        operators: [
          FilterOperator.CONTAINS,
          FilterOperator.NOT_CONTAINS,
          FilterOperator.STARTS_WITH,
          FilterOperator.ENDS_WITH,
          FilterOperator.EQUALS,
          FilterOperator.REGEX
        ],
        placeholder: 'Enter title text...'
      },
      {
        key: 'description',
        label: 'Description',
        type: FilterType.TEXT,
        operators: [
          FilterOperator.CONTAINS,
          FilterOperator.NOT_CONTAINS,
          FilterOperator.IS_EMPTY,
          FilterOperator.IS_NOT_EMPTY
        ],
        placeholder: 'Enter description text...'
      },
      {
        key: 'assignee',
        label: 'Assignee',
        type: FilterType.USER,
        operators: [
          FilterOperator.EQUALS,
          FilterOperator.NOT_EQUALS,
          FilterOperator.IN,
          FilterOperator.NOT_IN,
          FilterOperator.IS_EMPTY
        ]
      },
      {
        key: 'status',
        label: 'Status',
        type: FilterType.STATUS,
        operators: [
          FilterOperator.EQUALS,
          FilterOperator.NOT_EQUALS,
          FilterOperator.IN,
          FilterOperator.NOT_IN
        ],
        options: [
          { value: 'todo', label: 'To Do' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'done', label: 'In Review' },
          { value: 'done', label: 'Done' },
          { value: 'cancelled', label: 'Cancelled' }
        ]
      },
      {
        key: 'priority',
        label: 'Priority',
        type: FilterType.PRIORITY,
        operators: [
          FilterOperator.EQUALS,
          FilterOperator.NOT_EQUALS,
          FilterOperator.IN,
          FilterOperator.GREATER_THAN,
          FilterOperator.LESS_THAN
        ],
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' }
        ]
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        type: FilterType.DATE,
        operators: [
          FilterOperator.DATE_BEFORE,
          FilterOperator.DATE_AFTER,
          FilterOperator.DATE_BETWEEN,
          FilterOperator.IS_EMPTY,
          FilterOperator.IS_NOT_EMPTY
        ]
      },
      {
        key: 'createdAt',
        label: 'Created Date',
        type: FilterType.DATE,
        operators: [
          FilterOperator.DATE_BEFORE,
          FilterOperator.DATE_AFTER,
          FilterOperator.DATE_BETWEEN
        ]
      },
      {
        key: 'labels',
        label: 'Labels',
        type: FilterType.MULTI_SELECT,
        operators: [
          FilterOperator.IN,
          FilterOperator.NOT_IN,
          FilterOperator.CONTAINS,
          FilterOperator.IS_EMPTY
        ]
      }
    ];

    // Set field definitions for each view
    this.fieldDefinitions = {
      overview: commonFields,
      board: commonFields,
      list: commonFields,
      timeline: [
        ...commonFields,
        {
          key: 'duration',
          label: 'Duration (days)',
          type: FilterType.NUMBER,
          operators: [
            FilterOperator.GREATER_THAN,
            FilterOperator.LESS_THAN,
            FilterOperator.EQUALS,
            FilterOperator.GREATER_THAN_OR_EQUAL,
            FilterOperator.LESS_THAN_OR_EQUAL
          ]
        }
      ],
      milestones: [
        ...commonFields.filter(f => ['title', 'description', 'assignee', 'dueDate', 'createdAt'].includes(f.key)),
        {
          key: 'progress',
          label: 'Progress (%)',
          type: FilterType.NUMBER,
          operators: [
            FilterOperator.GREATER_THAN,
            FilterOperator.LESS_THAN,
            FilterOperator.EQUALS,
            FilterOperator.GREATER_THAN_OR_EQUAL,
            FilterOperator.LESS_THAN_OR_EQUAL
          ]
        }
      ],
      backlog: [
        ...commonFields,
        {
          key: 'storyPoints',
          label: 'Story Points',
          type: FilterType.NUMBER,
          operators: [
            FilterOperator.GREATER_THAN,
            FilterOperator.LESS_THAN,
            FilterOperator.EQUALS,
            FilterOperator.GREATER_THAN_OR_EQUAL,
            FilterOperator.LESS_THAN_OR_EQUAL
          ]
        },
        {
          key: 'epic',
          label: 'Epic',
          type: FilterType.SELECT,
          operators: [
            FilterOperator.EQUALS,
            FilterOperator.NOT_EQUALS,
            FilterOperator.IS_EMPTY
          ]
        }
      ]
    };
  }

  // Apply filters to data
  public applyFilters(data: any[], filterSet: FilterSet): any[] {
    if (!filterSet.rules.length) return data;

    return data.filter(item => {
      const results = filterSet.rules.map(rule => this.evaluateRule(item, rule));
      
      return filterSet.logicalOperator === LogicalOperator.AND
        ? results.every(result => result)
        : results.some(result => result);
    });
  }

  private evaluateRule(item: any, rule: FilterRule): boolean {
    const fieldValue = this.getFieldValue(item, rule.field);
    const ruleValue = rule.value;

    switch (rule.operator) {
      case FilterOperator.EQUALS:
        return fieldValue === ruleValue;
      
      case FilterOperator.NOT_EQUALS:
        return fieldValue !== ruleValue;
      
      case FilterOperator.CONTAINS:
        return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
      
      case FilterOperator.NOT_CONTAINS:
        return !String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
      
      case FilterOperator.STARTS_WITH:
        return String(fieldValue).toLowerCase().startsWith(String(ruleValue).toLowerCase());
      
      case FilterOperator.ENDS_WITH:
        return String(fieldValue).toLowerCase().endsWith(String(ruleValue).toLowerCase());
      
      case FilterOperator.GREATER_THAN:
        return Number(fieldValue) > Number(ruleValue);
      
      case FilterOperator.LESS_THAN:
        return Number(fieldValue) < Number(ruleValue);
      
      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return Number(fieldValue) >= Number(ruleValue);
      
      case FilterOperator.LESS_THAN_OR_EQUAL:
        return Number(fieldValue) <= Number(ruleValue);
      
      case FilterOperator.IN:
        return Array.isArray(ruleValue) ? ruleValue.includes(fieldValue) : false;
      
      case FilterOperator.NOT_IN:
        return Array.isArray(ruleValue) ? !ruleValue.includes(fieldValue) : true;
      
      case FilterOperator.IS_EMPTY:
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
      
      case FilterOperator.IS_NOT_EMPTY:
        return fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
      
      case FilterOperator.DATE_BEFORE:
        return new Date(fieldValue) < new Date(ruleValue);
      
      case FilterOperator.DATE_AFTER:
        return new Date(fieldValue) > new Date(ruleValue);
      
      case FilterOperator.DATE_BETWEEN:
        if (!Array.isArray(ruleValue) || ruleValue.length !== 2) return false;
        const date = new Date(fieldValue);
        return date >= new Date(ruleValue[0]) && date <= new Date(ruleValue[1]);
      
      case FilterOperator.REGEX:
        try {
          const regex = new RegExp(ruleValue, 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      
      default:
        return false;
    }
  }

  private getFieldValue(item: any, field: string): any {
    return field.split('.').reduce((obj, key) => obj?.[key], item);
  }

  // Smart filter suggestions
  public generateFilterSuggestions(
    data: any[],
    currentView: ProjectView,
    recentActions: string[]
  ): FilterSuggestion[] {
    const suggestions: FilterSuggestion[] = [];

    // Overdue tasks suggestion
    const overdueTasks = data.filter(item => {
      const dueDate = new Date(item.dueDate);
      return dueDate < new Date() && item.status !== 'done';
    });

    if (overdueTasks.length > 0) {
      suggestions.push({
        id: 'overdue-tasks',
        label: `Show Overdue Tasks (${overdueTasks.length})`,
        description: 'Filter to show only tasks that are past their due date',
        confidence: 0.9,
        reason: 'Multiple overdue tasks detected',
        context: 'task_management',
        rules: [
          {
            id: 'overdue-rule',
            field: 'dueDate',
            operator: FilterOperator.DATE_BEFORE,
            value: new Date().toISOString().split('T')[0],
            type: FilterType.DATE
          },
          {
            id: 'not-done-rule',
            field: 'status',
            operator: FilterOperator.NOT_EQUALS,
            value: 'done',
            type: FilterType.STATUS
          }
        ],
        preview: {
          resultCount: overdueTasks.length,
          sampleResults: overdueTasks.slice(0, 3)
        }
      });
    }

    // High priority tasks
    const highPriorityTasks = data.filter(item => 
      ['high', 'urgent'].includes(item.priority) && item.status !== 'done'
    );

    if (highPriorityTasks.length > 0) {
      suggestions.push({
        id: 'high-priority',
        label: `High Priority Tasks (${highPriorityTasks.length})`,
        description: 'Show tasks marked as high or urgent priority',
        confidence: 0.8,
        reason: 'Multiple high priority tasks available',
        context: 'priority_management',
        rules: [
          {
            id: 'priority-rule',
            field: 'priority',
            operator: FilterOperator.IN,
            value: ['high', 'urgent'],
            type: FilterType.PRIORITY
          },
          {
            id: 'not-done-rule',
            field: 'status',
            operator: FilterOperator.NOT_EQUALS,
            value: 'done',
            type: FilterType.STATUS
          }
        ],
        preview: {
          resultCount: highPriorityTasks.length,
          sampleResults: highPriorityTasks.slice(0, 3)
        }
      });
    }

    // My tasks (if user is frequently viewing their own tasks)
    if (recentActions.includes('filter:assignee:me')) {
      suggestions.push({
        id: 'my-tasks',
        label: 'My Assigned Tasks',
        description: 'Show only tasks assigned to you',
        confidence: 0.7,
        reason: 'You frequently filter by your assignments',
        context: 'personal_workflow',
        rules: [
          {
            id: 'assignee-rule',
            field: 'assignee',
            operator: FilterOperator.EQUALS,
            value: 'current-user', // Would be replaced with actual user ID
            type: FilterType.USER
          }
        ]
      });
    }

    // Recent activity (tasks updated in last 24 hours)
    const recentTasks = data.filter(item => {
      const updatedAt = new Date(item.updatedAt || item.createdAt);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return updatedAt > dayAgo;
    });

    if (recentTasks.length > 0) {
      suggestions.push({
        id: 'recent-activity',
        label: `Recent Activity (${recentTasks.length})`,
        description: 'Tasks updated in the last 24 hours',
        confidence: 0.6,
        reason: 'Show recent changes and updates',
        context: 'activity_tracking',
        rules: [
          {
            id: 'recent-rule',
            field: 'updatedAt',
            operator: FilterOperator.DATE_AFTER,
            value: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            type: FilterType.DATE
          }
        ],
        preview: {
          resultCount: recentTasks.length,
          sampleResults: recentTasks.slice(0, 3)
        }
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Preset management
  public saveFilterPreset(
    name: string,
    description: string,
    filters: FilterSet[],
    userId: string,
    isShared = false
  ): FilterPreset {
    const preset: FilterPreset = {
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      filters,
      createdBy: userId,
      createdAt: new Date(),
      lastUsed: new Date(),
      isShared,
      permissions: {
        canEdit: [userId],
        canView: isShared ? [] : [userId] // Empty array means public if shared
      }
    };

    this.presets.push(preset);
    this.savePresetsToStorage();
    return preset;
  }

  public getFilterPresets(userId: string): FilterPreset[] {
    return this.presets.filter(preset => 
      preset.createdBy === userId || 
      preset.permissions.canView.includes(userId) ||
      (preset.isShared && preset.permissions.canView.length === 0)
    );
  }

  public generateShareUrl(presetId: string): string {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset || !preset.isShared) {
      throw new Error('Preset not found or not shareable');
    }

    const shareData = {
      presetId,
      filters: preset.filters,
      timestamp: Date.now()
    };

    // In a real implementation, this would generate a secure share URL
    const encoded = btoa(JSON.stringify(shareData));
    return `${window.location.origin}/shared-filter/${encoded}`;
  }

  public importSharedFilter(shareUrl: string): FilterPreset | null {
    try {
      const encoded = shareUrl.split('/shared-filter/')[1];
      const shareData = JSON.parse(atob(encoded));
      
      // Validate and import the filter
      return {
        id: `imported_${Date.now()}`,
        name: 'Imported Filter',
        description: 'Filter imported from shared link',
        filters: shareData.filters,
        createdBy: 'imported',
        createdAt: new Date(),
        lastUsed: new Date(),
        isShared: false,
        permissions: {
          canEdit: ['current-user'],
          canView: ['current-user']
        }
      };
    } catch (error) {
      console.error('Failed to import shared filter:', error);
      return null;
    }
  }

  // Storage management
  private savePresetsToStorage(): void {
    try {
      localStorage.setItem('meridian_filter_presets', JSON.stringify(this.presets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }

  private loadPresetsFromStorage(): void {
    try {
      const stored = localStorage.getItem('meridian_filter_presets');
      if (stored) {
        this.presets = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
      this.presets = [];
    }
  }

  // Field definitions
  public getFieldDefinitions(view: ProjectView): FilterableField[] {
    return this.fieldDefinitions[view] || this.fieldDefinitions.overview;
  }

  // Quick filters (commonly used combinations)
  public getQuickFilters(view: ProjectView): FilterSet[] {
    const quickFilters: FilterSet[] = [
      {
        id: 'my-open-tasks',
        name: 'My Open Tasks',
        description: 'Tasks assigned to me that are not completed',
        rules: [
          {
            id: 'assignee-me',
            field: 'assignee',
            operator: FilterOperator.EQUALS,
            value: 'current-user',
            type: FilterType.USER
          },
          {
            id: 'status-not-done',
            field: 'status',
            operator: FilterOperator.NOT_IN,
            value: ['done', 'cancelled'],
            type: FilterType.STATUS
          }
        ],
        logicalOperator: LogicalOperator.AND,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true,
        isDefault: false,
        usageCount: 0,
        tags: ['personal', 'open'],
        applicableViews: ['board', 'list', 'timeline']
      },
      {
        id: 'urgent-tasks',
        name: 'Urgent Tasks',
        description: 'All urgent priority tasks',
        rules: [
          {
            id: 'priority-urgent',
            field: 'priority',
            operator: FilterOperator.EQUALS,
            value: 'urgent',
            type: FilterType.PRIORITY
          }
        ],
        logicalOperator: LogicalOperator.AND,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true,
        isDefault: false,
        usageCount: 0,
        tags: ['priority', 'urgent'],
        applicableViews: ['board', 'list', 'timeline', 'overview']
      },
      {
        id: 'due-this-week',
        name: 'Due This Week',
        description: 'Tasks due within the next 7 days',
        rules: [
          {
            id: 'due-this-week',
            field: 'dueDate',
            operator: FilterOperator.DATE_BETWEEN,
            value: [
              new Date().toISOString().split('T')[0],
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            ],
            type: FilterType.DATE
          }
        ],
        logicalOperator: LogicalOperator.AND,
        createdBy: 'system',
        createdAt: new Date(),
        isPublic: true,
        isDefault: false,
        usageCount: 0,
        tags: ['deadline', 'week'],
        applicableViews: ['timeline', 'list', 'board']
      }
    ];

    return quickFilters.filter(filter => 
      filter.applicableViews.includes(view)
    );
  }
}

// Singleton instance
const advancedFilteringEngine = new AdvancedFilteringEngine();

// Export functions
export const applyAdvancedFilters = (data: any[], filterSet: FilterSet) => {
  return advancedFilteringEngine.applyFilters(data, filterSet);
};

export const generateFilterSuggestions = (
  data: any[],
  currentView: ProjectView,
  recentActions: string[]
) => {
  return advancedFilteringEngine.generateFilterSuggestions(data, currentView, recentActions);
};

export const saveFilterPreset = (
  name: string,
  description: string,
  filters: FilterSet[],
  userId: string,
  isShared = false
) => {
  return advancedFilteringEngine.saveFilterPreset(name, description, filters, userId, isShared);
};

export const getFilterPresets = (userId: string) => {
  return advancedFilteringEngine.getFilterPresets(userId);
};

export const generateShareUrl = (presetId: string) => {
  return advancedFilteringEngine.generateShareUrl(presetId);
};

export const importSharedFilter = (shareUrl: string) => {
  return advancedFilteringEngine.importSharedFilter(shareUrl);
};

export const getFieldDefinitions = (view: ProjectView) => {
  return advancedFilteringEngine.getFieldDefinitions(view);
};

export const getQuickFilters = (view: ProjectView) => {
  return advancedFilteringEngine.getQuickFilters(view);
};

export {
  FilterOperator,
  FilterType,
  LogicalOperator,
  type FilterRule,
  type FilterSet,
  type FilterPreset,
  type FilterSuggestion,
  type FilterableField
};