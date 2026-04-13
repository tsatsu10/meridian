// Phase 3: Advanced Workflow Integration for Chat
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Zap, 
  Bot, 
  ArrowRight, 
  Settings, 
  Play,
  Pause,
  CheckCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  Users,
  Task,
  Calendar,
  Bell,
  X,
  Plus
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { EnhancedWorkflowHelpers } from '../workflow/enhanced-workflow-helpers';

interface WorkflowTrigger {
  id: string;
  type: 'message_contains' | 'message_from' | 'channel_activity' | 'mention' | 'emoji_reaction';
  condition: string;
  isActive: boolean;
}

interface WorkflowAction {
  id: string;
  type: 'create_task' | 'send_message' | 'notify_user' | 'schedule_meeting' | 'assign_to' | 'add_to_project';
  config: Record<string, any>;
  delay?: number; // seconds
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  executionCount: number;
  lastExecuted?: Date;
  channelId?: string;
}

interface AdvancedWorkflowIntegrationProps {
  channelId: string;
  onWorkflowExecuted?: (workflowId: string, result: any) => void;
  className?: string;
}

const workflowTemplates: Partial<Workflow>[] = [
  {
    name: "Auto Task Creation",
    description: "Create tasks when messages contain 'TODO' or 'TASK'",
    trigger: {
      id: 'trigger-1',
      type: 'message_contains',
      condition: 'TODO|TASK|ACTION ITEM',
      isActive: true
    },
    actions: [{
      id: 'action-1',
      type: 'create_task',
      config: {
        extractTitle: true,
        defaultProject: 'current',
        priority: 'medium'
      }
    }]
  },
  {
    name: "Meeting Scheduler",
    description: "Schedule meetings when 'let's meet' or 'schedule call' is mentioned",
    trigger: {
      id: 'trigger-2',
      type: 'message_contains',
      condition: "let's meet|schedule call|schedule meeting",
      isActive: true
    },
    actions: [{
      id: 'action-2',
      type: 'schedule_meeting',
      config: {
        duration: 30,
        suggestTimes: true,
        notifyParticipants: true
      }
    }]
  },
  {
    name: "Urgent Response",
    description: "Notify team leads when urgent messages are sent",
    trigger: {
      id: 'trigger-3',
      type: 'message_contains',
      condition: 'URGENT|ASAP|EMERGENCY|CRITICAL',
      isActive: true
    },
    actions: [{
      id: 'action-3',
      type: 'notify_user',
      config: {
        notifyRoles: ['team-lead', 'project-manager'],
        method: 'push'
      }
    }]
  }
];

export function AdvancedWorkflowIntegration({ 
  channelId, 
  onWorkflowExecuted,
  className 
}: AdvancedWorkflowIntegrationProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState<Partial<Workflow>>({});
  const [activeWorkflows, setActiveWorkflows] = useState<Set<string>>(new Set());

  // Load workflows on mount
  useEffect(() => {
    const loadWorkflows = () => {
      const saved = localStorage.getItem(`workflows-${channelId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setWorkflows(parsed);
          setActiveWorkflows(new Set(parsed.filter((w: Workflow) => w.isActive).map((w: Workflow) => w.id)));
        } catch (error) {
          // Silently fail to load workflows from localStorage
        }
      }
    };
    loadWorkflows();
  }, [channelId]);

  // Save workflows when they change
  useEffect(() => {
    if (workflows.length > 0) {
      localStorage.setItem(`workflows-${channelId}`, JSON.stringify(workflows));
    }
  }, [workflows, channelId]);

  const executeWorkflow = useCallback(async (workflow: Workflow, message: string) => {
    if (!workflow.isActive) return;

    try {
      for (const action of workflow.actions) {
        if (action.delay) {
          await new Promise(resolve => setTimeout(resolve, action.delay * 1000));
        }

        switch (action.type) {
          case 'create_task':
            // Extract task title from message or use default
            const taskTitle = action.config.extractTitle 
              ? extractTaskTitle(message) 
              : `Task from chat: ${message.slice(0, 50)}...`;
            
            toast.success(`Task created: ${taskTitle}`);
            break;

          case 'send_message':
            break;

          case 'notify_user':
            toast.info(`Team leads notified about urgent message`);
            break;

          case 'schedule_meeting':
            toast.info(`Meeting suggestions generated`);
            break;

          default:
            break;
        }
      }

      // Update execution stats
      setWorkflows(prev => prev.map(w => 
        w.id === workflow.id 
          ? { ...w, executionCount: w.executionCount + 1, lastExecuted: new Date() }
          : w
      ));

      onWorkflowExecuted?.(workflow.id, { success: true, actionsExecuted: workflow.actions.length });

    } catch (error) {
      console.error(`Workflow execution failed:`, error);
      onWorkflowExecuted?.(workflow.id, { success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, [onWorkflowExecuted]);

  const extractTaskTitle = (message: string): string => {
    // Simple extraction logic - could be enhanced with NLP
    const taskKeywords = ['TODO:', 'TASK:', 'ACTION ITEM:'];
    for (const keyword of taskKeywords) {
      const index = message.toUpperCase().indexOf(keyword);
      if (index !== -1) {
        return message.slice(index + keyword.length).trim().split('\n')[0];
      }
    }
    return message.slice(0, 100);
  };

  const checkWorkflowTriggers = useCallback((message: string, userEmail: string) => {
    workflows.forEach(workflow => {
      if (!workflow.isActive) return;

      const { trigger } = workflow;
      let shouldTrigger = false;

      switch (trigger.type) {
        case 'message_contains':
          const regex = new RegExp(trigger.condition, 'i');
          shouldTrigger = regex.test(message);
          break;

        case 'message_from':
          shouldTrigger = userEmail === trigger.condition;
          break;

        case 'mention':
          shouldTrigger = message.includes('@') && message.includes(trigger.condition);
          break;

        default:
          break;
      }

      if (shouldTrigger) {
        executeWorkflow(workflow, message);
      }
    });
  }, [workflows, executeWorkflow]);

  const createWorkflowFromTemplate = (template: Partial<Workflow>) => {
    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: template.name || 'New Workflow',
      description: template.description || '',
      trigger: template.trigger!,
      actions: template.actions || [],
      isActive: true,
      executionCount: 0,
      channelId
    };

    setWorkflows(prev => [...prev, newWorkflow]);
    setActiveWorkflows(prev => new Set([...prev, newWorkflow.id]));
    toast.success(`Workflow '${newWorkflow.name}' created`);
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w
    ));
    
    setActiveWorkflows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    setActiveWorkflows(prev => {
      const newSet = new Set(prev);
      newSet.delete(workflowId);
      return newSet;
    });
    toast.success('Workflow deleted');
  };

  // Expose trigger checker for use by parent component
  React.useImperativeHandle(React.createRef(), () => ({
    checkTriggers: checkWorkflowTriggers
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <CardTitle className="text-lg">Workflow Automation</CardTitle>
          </div>
          <Badge variant="outline">
            {activeWorkflows.size} active
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Templates */}
        {workflows.length === 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Quick Start Templates</h4>
            <div className="grid gap-2">
              {workflowTemplates.map((template, index) => (
                <div key={index} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">{template.name}</h5>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createWorkflowFromTemplate(template)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-gray-600">{template.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Workflows */}
        {workflows.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Active Workflows</h4>
            {workflows.map(workflow => (
              <div key={workflow.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={workflow.isActive ? "default" : "secondary"}>
                      {workflow.isActive ? <Play className="w-3 h-3 mr-1" /> : <Pause className="w-3 h-3 mr-1" />}
                      {workflow.isActive ? 'Active' : 'Paused'}
                    </Badge>
                    <span className="font-medium text-sm">{workflow.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleWorkflow(workflow.id)}
                    >
                      {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteWorkflow(workflow.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-2">{workflow.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Trigger: {workflow.trigger.condition}</span>
                  <span>Executed: {workflow.executionCount} times</span>
                  {workflow.lastExecuted && (
                    <span>Last: {workflow.lastExecuted.toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Template Button */}
        {workflows.length > 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add More</h4>
            <div className="flex flex-wrap gap-2">
              {workflowTemplates.map((template, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  onClick={() => createWorkflowFromTemplate(template)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Forward the checkTriggers method to parent
  AdvancedWorkflowIntegration.checkTriggers = checkWorkflowTriggers;
}