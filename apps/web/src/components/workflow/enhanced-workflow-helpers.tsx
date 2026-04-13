// Phase 6 Enhancement: Enhanced Workflow Automation Helpers
import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Plus, 
  Play, 
  Pause, 
  Settings, 
  Brain,
  Clock,
  Users,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Mail,
  Webhook,
  Code,
  Database,
  GitBranch,
  Target
} from 'lucide-react';
import { toast } from '@/lib/toast';

interface WorkflowCondition {
  id: string;
  type: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex' | 'custom';
  field: string;
  operator: string;
  value: any;
  negate: boolean;
}

interface WorkflowAction {
  id: string;
  type: 'send_message' | 'create_task' | 'assign_user' | 'update_status' | 'notify' | 'webhook' | 'custom';
  config: Record<string, any>;
  delay?: number;
  retries?: number;
  onError?: 'stop' | 'continue' | 'retry';
}

interface WorkflowTrigger {
  id: string;
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  config: Record<string, any>;
  conditions: WorkflowCondition[];
}

interface EnhancedWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  analytics: {
    executionCount: number;
    successRate: number;
    averageExecutionTime: number;
    lastExecuted?: Date;
    errorCount: number;
  };
  created: Date;
  lastModified: Date;
}

interface SmartWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'productivity' | 'communication' | 'automation' | 'integration';
  useCase: string;
  workflow: Partial<EnhancedWorkflow>;
  aiSuggestions: {
    optimizations: string[];
    alternatives: string[];
    bestPractices: string[];
  };
}

interface EnhancedWorkflowHelpersProps {
  workflows: EnhancedWorkflow[];
  onCreateWorkflow: (workflow: EnhancedWorkflow) => void;
  onUpdateWorkflow: (id: string, updates: Partial<EnhancedWorkflow>) => void;
  onDeleteWorkflow: (id: string) => void;
  className?: string;
}

const smartTemplates: SmartWorkflowTemplate[] = [
  {
    id: 'smart-task-assignment',
    name: 'AI-Powered Task Assignment',
    description: 'Automatically assign tasks based on team member skills and workload',
    category: 'productivity',
    useCase: 'When a new task is created, analyze team capacity and skills to suggest optimal assignment',
    workflow: {
      name: 'Smart Task Assignment',
      trigger: {
        id: 'task-created',
        type: 'event',
        config: { event: 'task.created' },
        conditions: []
      },
      actions: [
        {
          id: 'analyze-skills',
          type: 'custom',
          config: {
            function: 'analyzeTeamSkills',
            parameters: { taskRequirements: '{{task.tags}}', urgency: '{{task.priority}}' }
          }
        },
        {
          id: 'suggest-assignment',
          type: 'notify',
          config: {
            type: 'smart_suggestion',
            message: 'AI suggests assigning to {{suggested_user}} based on skills match and availability'
          }
        }
      ]
    },
    aiSuggestions: {
      optimizations: [
        'Add workload balancing to prevent overallocation',
        'Include historical performance data in assignment logic',
        'Consider time zone differences for remote teams'
      ],
      alternatives: [
        'Round-robin assignment for equal distribution',
        'Skills-first assignment for complex tasks',
        'Volunteer-based assignment for flexibility'
      ],
      bestPractices: [
        'Always include a fallback assignment rule',
        'Notify both assignee and team lead',
        'Track assignment effectiveness over time'
      ]
    }
  },
  {
    id: 'escalation-workflow',
    name: 'Smart Escalation System',
    description: 'Automatically escalate overdue or high-priority items',
    category: 'productivity',
    useCase: 'Monitor task progress and escalate to managers when deadlines are at risk',
    workflow: {
      name: 'Smart Escalation',
      trigger: {
        id: 'task-overdue',
        type: 'schedule',
        config: { schedule: '0 9 * * *' }, // Daily at 9 AM
        conditions: [
          {
            id: 'overdue-check',
            type: 'custom',
            field: 'task.dueDate',
            operator: 'less_than',
            value: 'now',
            negate: false
          }
        ]
      },
      actions: [
        {
          id: 'notify-assignee',
          type: 'notify',
          config: {
            recipient: '{{task.assignee}}',
            message: 'Task "{{task.title}}" is overdue. Please update status or request assistance.'
          }
        },
        {
          id: 'escalate-to-manager',
          type: 'notify',
          config: {
            recipient: '{{task.assignee.manager}}',
            message: 'Task "{{task.title}}" assigned to {{task.assignee.name}} is overdue.',
            delay: 2 * 60 * 60 * 1000 // 2 hours delay
          }
        }
      ]
    },
    aiSuggestions: {
      optimizations: [
        'Implement grace period based on task complexity',
        'Consider assignee workload before escalating',
        'Add predictive escalation based on progress patterns'
      ],
      alternatives: [
        'Peer-to-peer escalation before manager involvement',
        'Flexible deadline adjustment with approval',
        'Automatic task redistribution for chronic delays'
      ],
      bestPractices: [
        'Set clear escalation criteria and timelines',
        'Provide context in escalation messages',
        'Track escalation patterns to identify systemic issues'
      ]
    }
  },
  {
    id: 'meeting-optimization',
    name: 'Meeting Efficiency Optimizer',
    description: 'Optimize meeting scheduling and follow-up actions',
    category: 'communication',
    useCase: 'Automatically schedule follow-ups and track action items from meetings',
    workflow: {
      name: 'Meeting Follow-up Automation',
      trigger: {
        id: 'meeting-ended',
        type: 'event',
        config: { event: 'meeting.ended' },
        conditions: []
      },
      actions: [
        {
          id: 'extract-action-items',
          type: 'custom',
          config: {
            function: 'extractActionItems',
            parameters: { transcript: '{{meeting.transcript}}', notes: '{{meeting.notes}}' }
          }
        },
        {
          id: 'create-follow-up-tasks',
          type: 'create_task',
          config: {
            title: 'Follow-up: {{action_item.description}}',
            assignee: '{{action_item.owner}}',
            dueDate: '{{action_item.deadline}}',
            project: '{{meeting.project}}'
          }
        },
        {
          id: 'schedule-check-in',
          type: 'custom',
          config: {
            function: 'scheduleCheckIn',
            parameters: { 
              participants: '{{meeting.participants}}',
              checkInDate: '{{date_add meeting.date 3 days}}'
            }
          }
        }
      ]
    },
    aiSuggestions: {
      optimizations: [
        'Use NLP to better extract action items from notes',
        'Integrate with calendar systems for automatic scheduling',
        'Add sentiment analysis to identify potential issues'
      ],
      alternatives: [
        'Manual action item confirmation before task creation',
        'Template-based follow-up for recurring meetings',
        'Automated meeting summaries for absent participants'
      ],
      bestPractices: [
        'Always confirm action items with meeting participants',
        'Set realistic deadlines based on task complexity',
        'Track completion rates to improve meeting effectiveness'
      ]
    }
  },
  {
    id: 'quality-assurance',
    name: 'Automated Quality Checks',
    description: 'Run quality checks and validations on completed work',
    category: 'automation',
    useCase: 'Automatically validate deliverables and ensure quality standards are met',
    workflow: {
      name: 'Quality Assurance Pipeline',
      trigger: {
        id: 'task-completed',
        type: 'event',
        config: { event: 'task.status_changed' },
        conditions: [
          {
            id: 'status-completed',
            type: 'equals',
            field: 'task.status',
            operator: 'equals',
            value: 'completed',
            negate: false
          }
        ]
      },
      actions: [
        {
          id: 'run-automated-checks',
          type: 'custom',
          config: {
            function: 'runQualityChecks',
            parameters: { 
              taskType: '{{task.type}}',
              deliverables: '{{task.attachments}}',
              criteria: '{{task.project.qualityCriteria}}'
            }
          }
        },
        {
          id: 'assign-reviewer',
          type: 'assign_user',
          config: {
            role: 'reviewer',
            criteria: 'skills_match',
            exclude: '{{task.assignee}}'
          }
        },
        {
          id: 'create-review-task',
          type: 'create_task',
          config: {
            title: 'Review: {{task.title}}',
            description: 'Quality review for completed task',
            assignee: '{{assigned_reviewer}}',
            dueDate: '{{date_add now 2 days}}',
            priority: '{{task.priority}}'
          }
        }
      ]
    },
    aiSuggestions: {
      optimizations: [
        'Implement ML-based quality scoring',
        'Add automated testing for code deliverables',
        'Use historical data to predict review time'
      ],
      alternatives: [
        'Peer review pools for distributed quality checks',
        'Self-assessment checklists before external review',
        'Automated quality gates with manual override'
      ],
      bestPractices: [
        'Define clear quality criteria for each task type',
        'Provide detailed feedback templates for reviewers',
        'Track quality metrics to identify improvement areas'
      ]
    }
  }
];

const conditionTypes = [
  { value: 'equals', label: 'Equals', icon: '=' },
  { value: 'contains', label: 'Contains', icon: '⊃' },
  { value: 'greater_than', label: 'Greater Than', icon: '>' },
  { value: 'less_than', label: 'Less Than', icon: '<' },
  { value: 'regex', label: 'Regex Match', icon: '/.*/' },
  { value: 'custom', label: 'Custom Logic', icon: '{}' }
];

const actionTypes = [
  { value: 'send_message', label: 'Send Message', icon: MessageSquare },
  { value: 'create_task', label: 'Create Task', icon: CheckCircle },
  { value: 'assign_user', label: 'Assign User', icon: Users },
  { value: 'update_status', label: 'Update Status', icon: TrendingUp },
  { value: 'notify', label: 'Send Notification', icon: Mail },
  { value: 'webhook', label: 'Call Webhook', icon: Webhook },
  { value: 'custom', label: 'Custom Function', icon: Code }
];

export function EnhancedWorkflowHelpers({ 
  workflows, 
  onCreateWorkflow, 
  onUpdateWorkflow, 
  onDeleteWorkflow,
  className 
}: EnhancedWorkflowHelpersProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SmartWorkflowTemplate | null>(null);
  const [showAdvancedBuilder, setShowAdvancedBuilder] = useState(false);
  const [workflowDraft, setWorkflowDraft] = useState<Partial<EnhancedWorkflow>>({});

  const createWorkflowFromTemplate = useCallback((template: SmartWorkflowTemplate) => {
    const newWorkflow: EnhancedWorkflow = {
      id: `workflow-${Date.now()}`,
      name: template.workflow.name || template.name,
      description: template.description,
      trigger: template.workflow.trigger as WorkflowTrigger,
      actions: template.workflow.actions as WorkflowAction[],
      isActive: true,
      priority: 'medium',
      tags: [template.category],
      analytics: {
        executionCount: 0,
        successRate: 0,
        averageExecutionTime: 0,
        errorCount: 0
      },
      created: new Date(),
      lastModified: new Date()
    };

    onCreateWorkflow(newWorkflow);
    toast.success(`Created workflow: ${newWorkflow.name}`);
  }, [onCreateWorkflow]);

  const analyzeWorkflowPerformance = (workflow: EnhancedWorkflow) => {
    const { analytics } = workflow;
    
    let status = 'healthy';
    let recommendations: string[] = [];

    if (analytics.successRate < 0.8) {
      status = 'needs_attention';
      recommendations.push('Low success rate detected. Review error logs and conditions.');
    }

    if (analytics.averageExecutionTime > 5000) {
      status = 'slow';
      recommendations.push('Workflow is running slowly. Consider optimizing actions or conditions.');
    }

    if (analytics.errorCount > analytics.executionCount * 0.1) {
      status = 'error_prone';
      recommendations.push('High error rate. Check action configurations and dependencies.');
    }

    return { status, recommendations };
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              Enhanced Workflow Automation
            </h2>
            <p className="text-muted-foreground">
              AI-powered workflow templates and advanced automation helpers
            </p>
          </div>
          <Button onClick={() => setShowAdvancedBuilder(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Advanced Builder
          </Button>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="templates">Smart Templates</TabsTrigger>
            <TabsTrigger value="active">Active Workflows</TabsTrigger>
            <TabsTrigger value="analytics">Performance</TabsTrigger>
            <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
          </TabsList>

          {/* Smart Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {smartTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        {template.name}
                      </CardTitle>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Use Case</h4>
                      <p className="text-sm text-blue-800">{template.useCase}</p>
                    </div>

                    {/* AI Suggestions Preview */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">AI Optimizations</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {template.aiSuggestions.optimizations.slice(0, 2).map((suggestion, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <Zap className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTemplate(template)}
                        className="flex-1"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Customize
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => createWorkflowFromTemplate(template)}
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Active Workflows Tab */}
          <TabsContent value="active" className="space-y-6">
            <div className="space-y-4">
              {workflows.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Workflows</h3>
                      <p className="text-muted-foreground mb-4">
                        Create your first workflow from our smart templates
                      </p>
                      <Button onClick={() => setShowAdvancedBuilder(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Workflow
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                workflows.map((workflow) => {
                  const analysis = analyzeWorkflowPerformance(workflow);
                  
                  return (
                    <Card key={workflow.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              workflow.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {workflow.name}
                                <Badge variant={
                                  workflow.priority === 'critical' ? 'destructive' :
                                  workflow.priority === 'high' ? 'secondary' :
                                  'outline'
                                }>
                                  {workflow.priority}
                                </Badge>
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {workflow.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              analysis.status === 'healthy' ? 'default' :
                              analysis.status === 'needs_attention' ? 'secondary' :
                              'destructive'
                            }>
                              {analysis.status.replace('_', ' ')}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onUpdateWorkflow(workflow.id, { isActive: !workflow.isActive })}
                            >
                              {workflow.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {workflow.analytics.executionCount}
                            </div>
                            <div className="text-xs text-muted-foreground">Executions</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {Math.round(workflow.analytics.successRate * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Success Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {Math.round(workflow.analytics.averageExecutionTime)}ms
                            </div>
                            <div className="text-xs text-muted-foreground">Avg Time</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {workflow.analytics.errorCount}
                            </div>
                            <div className="text-xs text-muted-foreground">Errors</div>
                          </div>
                        </div>

                        {analysis.recommendations.length > 0 && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Recommendations
                            </h4>
                            <ul className="text-sm text-yellow-800 space-y-1">
                              {analysis.recommendations.map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-4">
                          {workflow.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Performance Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Total Executions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {workflows.reduce((sum, w) => sum + w.analytics.executionCount, 0)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Across {workflows.length} workflows
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    Average Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {workflows.length > 0 
                      ? Math.round(workflows.reduce((sum, w) => sum + w.analytics.successRate, 0) / workflows.length * 100)
                      : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Workflow reliability score
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {workflows.length > 0
                      ? Math.round(workflows.reduce((sum, w) => sum + w.analytics.averageExecutionTime, 0) / workflows.length)
                      : 0}ms
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Average execution time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.length === 0 ? (
                    <p className="text-muted-foreground">No workflow data available</p>
                  ) : (
                    <>
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2">Top Performing Workflows</h4>
                        <ul className="text-sm text-green-800 space-y-1">
                          {workflows
                            .filter(w => w.analytics.successRate > 0.9)
                            .slice(0, 3)
                            .map(w => (
                              <li key={w.id}>• {w.name} ({Math.round(w.analytics.successRate * 100)}% success)</li>
                            ))}
                        </ul>
                      </div>

                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Optimization Opportunities</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Consider adding retry logic to workflows with >5% error rate</li>
                          <li>• Workflows taking >3s could benefit from parallel action execution</li>
                          <li>• Inactive workflows should be archived or reactivated</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workflow Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Workflow Builder</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Build custom workflows with advanced conditions and actions
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Code className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Advanced Builder</h3>
                  <p className="text-muted-foreground mb-4">
                    Visual workflow builder with drag-and-drop interface
                  </p>
                  <Button>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Launch Builder
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}