/**
 * Alert Rules Builder Component
 * Visual rule creation with conditions and actions
 * Phase 2.2 - Smart Notifications System
 */

import React, { useState, useEffect } from 'react';

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  config: any;
}

interface Rule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  conditions: Condition[];
  actions: Action[];
  isEnabled: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
}

interface AlertRulesBuilderProps {
  workspaceId: string;
  userId: string;
  className?: string;
}

const TRIGGER_TYPES = [
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_updated', label: 'Task Updated' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'comment_added', label: 'Comment Added' },
  { value: 'deadline_approaching', label: 'Deadline Approaching' },
];

const CONDITION_FIELDS = [
  { value: 'status', label: 'Status', type: 'string' },
  { value: 'priority', label: 'Priority', type: 'string' },
  { value: 'assignee', label: 'Assignee', type: 'string' },
  { value: 'title', label: 'Title', type: 'string' },
  { value: 'dueDate', label: 'Due Date', type: 'date' },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals', types: ['string', 'number', 'date'] },
  { value: 'not_equals', label: 'Not Equals', types: ['string', 'number', 'date'] },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'not_contains', label: 'Does Not Contain', types: ['string'] },
  { value: 'greater_than', label: 'Greater Than', types: ['number', 'date'] },
  { value: 'less_than', label: 'Less Than', types: ['number', 'date'] },
  { value: 'is_empty', label: 'Is Empty', types: ['string'] },
  { value: 'is_not_empty', label: 'Is Not Empty', types: ['string'] },
];

const ACTION_TYPES = [
  { value: 'send_notification', label: 'Send Notification', icon: '🔔' },
  { value: 'send_webhook', label: 'Send to Webhook', icon: '🔗' },
  { value: 'send_email', label: 'Send Email', icon: '📧' },
];

export const AlertRulesBuilder: React.FC<AlertRulesBuilderProps> = ({
  workspaceId,
  userId,
  className = '',
}) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Builder state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('task_created');
  const [conditions, setConditions] = useState<Condition[]>([
    { field: 'status', operator: 'equals', value: '' },
  ]);
  const [actions, setActions] = useState<Action[]>([
    { type: 'send_notification', config: {} },
  ]);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/rules?workspaceId=${workspaceId}`);
      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    try {
      const response = await fetch('/api/notifications/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workspaceId,
          name,
          description,
          triggerType,
          conditions,
          actions,
        }),
      });

      if (response.ok) {
        await fetchRules();
        resetBuilder();
        setShowBuilder(false);
      }
    } catch (err) {
      console.error('Failed to create rule:', err);
      alert('Failed to create rule. Please try again.');
    }
  };

  const updateRule = async (ruleId: string, updates: any) => {
    try {
      await fetch(`/api/notifications/rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      await fetchRules();
    } catch (err) {
      console.error('Failed to update rule:', err);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await fetch(`/api/notifications/rules/${ruleId}`, { method: 'DELETE' });
      await fetchRules();
    } catch (err) {
      console.error('Failed to delete rule:', err);
    }
  };

  const resetBuilder = () => {
    setName('');
    setDescription('');
    setTriggerType('task_created');
    setConditions([{ field: 'status', operator: 'equals', value: '' }]);
    setActions([{ type: 'send_notification', config: {} }]);
    setEditingRule(null);
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'status', operator: 'equals', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<Condition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    setConditions(newConditions);
  };

  const addAction = () => {
    setActions([...actions, { type: 'send_notification', config: {} }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], ...updates };
    setActions(newActions);
  };

  if (loading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Alert Rules</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create custom notification rules with conditions and actions
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="p-6">
        {rules.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-lg">
            <div className="text-5xl mb-4">⚡</div>
            <p className="text-gray-600 mb-4">No alert rules configured yet</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      {!rule.isEnabled && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                          Disabled
                        </span>
                      )}
                    </div>

                    {rule.description && (
                      <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">
                        Trigger: {rule.triggerType}
                      </span>
                      <span>{rule.conditions.length} condition(s)</span>
                      <span>{rule.actions.length} action(s)</span>
                      {rule.triggerCount > 0 && (
                        <span>Triggered {rule.triggerCount} time(s)</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.isEnabled}
                        onChange={(e) => updateRule(rule.id, { isEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>

                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rule Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-xl font-bold text-gray-900">Create Alert Rule</h3>
              <p className="text-sm text-gray-600 mt-1">
                Define when and how notifications should be sent
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Notify on High Priority Tasks"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this rule do?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Trigger */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Event *
                </label>
                <select
                  value={triggerType}
                  onChange={(e) => setTriggerType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TRIGGER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Conditions (All must match)
                  </label>
                  <button
                    onClick={addCondition}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Condition
                  </button>
                </div>

                <div className="space-y-3">
                  {conditions.map((condition, index) => (
                    <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <select
                          value={condition.field}
                          onChange={(e) => updateCondition(index, { field: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          {CONDITION_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(index, { operator: e.target.value })}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, { value: e.target.value })}
                          placeholder="Value"
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {conditions.length > 1 && (
                        <button
                          onClick={() => removeCondition(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">Actions</label>
                  <button
                    onClick={addAction}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Action
                  </button>
                </div>

                <div className="space-y-3">
                  {actions.map((action, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(index, { type: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {ACTION_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </option>
                          ))}
                        </select>

                        {actions.length > 1 && (
                          <button
                            onClick={() => removeAction(index)}
                            className="ml-2 p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {action.type === 'send_notification' && (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Notification title (use {{field}} for variables)"
                            value={action.config.title || ''}
                            onChange={(e) =>
                              updateAction(index, {
                                config: { ...action.config, title: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <textarea
                            placeholder="Notification message (use {{field}} for variables)"
                            value={action.config.message || ''}
                            onChange={(e) =>
                              updateAction(index, {
                                config: { ...action.config, message: e.target.value },
                              })
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  💡 Tip: Use <code className="px-1 bg-blue-100 rounded">{'{{field}}'}</code> syntax to insert dynamic values (e.g., {'{{title}}'}, {'{{assignee}}'})
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowBuilder(false);
                  resetBuilder();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRule}
                disabled={!name || !triggerType}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertRulesBuilder;

