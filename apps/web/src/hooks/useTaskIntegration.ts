import { useState, useCallback, useRef, useEffect } from 'react';
import { logger } from "../lib/logger";

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: TaskAssignee;
  assignees: TaskAssignee[];
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  projectId?: string;
  parentTaskId?: string;
  subtasks: TaskData[];
  dependencies: TaskDependency[];
  attachments: TaskAttachment[];
  comments: TaskComment[];
  customFields: Record<string, any>;
  source: {
    type: 'chat' | 'manual' | 'imported' | 'automated';
    chatId?: string;
    messageId?: string;
    userId?: string;
    timestamp: Date;
  };
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedBy: string;
    updatedAt: Date;
    version: number;
  };
}

interface TaskAssignee {
  userId: string;
  name: string;
  email: string;
  role: 'assignee' | 'reviewer' | 'observer';
  avatar?: string;
}

interface TaskDependency {
  id: string;
  type: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates';
  taskId: string;
  description?: string;
}

interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface TaskComment {
  id: string;
  content: string;
  author: TaskAssignee;
  timestamp: Date;
  edited?: boolean;
  editedAt?: Date;
  mentions: string[];
  attachments: TaskAttachment[];
}

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  visibility: 'public' | 'private' | 'restricted';
  owner: TaskAssignee;
  members: ProjectMember[];
  startDate?: Date;
  endDate?: Date;
  progress: number; // 0-100
  budget?: number;
  tags: string[];
  customFields: Record<string, any>;
  settings: {
    allowTaskCreationFromChat: boolean;
    autoAssignFromMentions: boolean;
    defaultTaskPriority: TaskData['priority'];
    requiredFields: string[];
    taskNumberingPrefix: string;
  };
}

interface ProjectMember {
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
  joinedAt: Date;
}

interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultPriority: TaskData['priority'];
  defaultEstimatedHours?: number;
  defaultTags: string[];
  customFields: Record<string, any>;
  checklist: TaskChecklistItem[];
  applicableProjects: string[];
  category: string;
}

interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  dueDate?: Date;
}

interface MessageTaskExtraction {
  confidence: number; // 0-1
  suggestedTitle: string;
  suggestedDescription?: string;
  suggestedPriority: TaskData['priority'];
  suggestedAssignees: string[];
  suggestedDueDate?: Date;
  suggestedTags: string[];
  suggestedProject?: string;
  actionKeywords: string[];
  entityMentions: {
    users: string[];
    projects: string[];
    dates: Date[];
    priorities: string[];
  };
}

interface TaskMetrics {
  totalTasks: number;
  tasksByStatus: Record<TaskData['status'], number>;
  tasksByPriority: Record<TaskData['priority'], number>;
  createdFromChat: number;
  completionRate: number;
  averageCompletionTime: number; // hours
  overdueRate: number;
  assigneeWorkload: Record<string, {
    totalTasks: number;
    inProgress: number;
    overdue: number;
    avgCompletionTime: number;
  }>;
  projectProgress: Record<string, {
    totalTasks: number;
    completed: number;
    progress: number;
  }>;
}

interface TaskIntegrationConfig {
  enableAutoTaskCreation: boolean;
  autoTaskThreshold: number; // confidence score 0-1
  defaultProject?: string;
  taskCreationKeywords: string[];
  mentionPatterns: RegExp[];
  dueDatePatterns: RegExp[];
  priorityKeywords: Record<TaskData['priority'], string[]>;
  autoAssignment: {
    enabled: boolean;
    assignToMentionedUsers: boolean;
    assignToMessageAuthor: boolean;
    fallbackAssignee?: string;
  };
  notifications: {
    notifyOnTaskCreation: boolean;
    notifyAssignees: boolean;
    notifyProjectMembers: boolean;
    channels: ('email' | 'push' | 'chat')[];
  };
}

export function useTaskIntegration(config?: Partial<TaskIntegrationConfig>) {
  const [tasks, setTasks] = useState<Map<string, TaskData>>(new Map());
  const [projects, setProjects] = useState<Map<string, ProjectData>>(new Map());
  const [templates, setTemplates] = useState<Map<string, TaskTemplate>>(new Map());
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const integrationConfig = useRef<TaskIntegrationConfig>({
    enableAutoTaskCreation: true,
    autoTaskThreshold: 0.7,
    taskCreationKeywords: [
      'task', 'todo', 'action item', 'follow up', 'complete', 'finish',
      'implement', 'fix', 'create', 'build', 'develop', 'design',
      'review', 'test', 'deploy', 'update', 'research'
    ],
    mentionPatterns: [
      /@([a-zA-Z0-9_-]+)/g, // @username
      /assign to ([a-zA-Z\s]+)/gi,
      /([a-zA-Z\s]+) should/gi
    ],
    dueDatePatterns: [
      /by ([a-zA-Z]+ \d{1,2})/gi,
      /due ([a-zA-Z]+ \d{1,2})/gi,
      /deadline ([a-zA-Z]+ \d{1,2})/gi,
      /(today|tomorrow|this week|next week)/gi,
      /in (\d+) (days?|weeks?|months?)/gi
    ],
    priorityKeywords: {
      urgent: ['urgent', 'asap', 'critical', 'emergency', 'immediately'],
      high: ['high', 'important', 'priority', 'soon'],
      medium: ['medium', 'normal', 'standard'],
      low: ['low', 'minor', 'when possible', 'nice to have']
    },
    autoAssignment: {
      enabled: true,
      assignToMentionedUsers: true,
      assignToMessageAuthor: false,
      fallbackAssignee: undefined
    },
    notifications: {
      notifyOnTaskCreation: true,
      notifyAssignees: true,
      notifyProjectMembers: false,
      channels: ['chat', 'push']
    },
    ...config
  });

  // Initialize task integration
  useEffect(() => {
    initializeTaskIntegration();
    loadDefaultTemplates();
    loadProjects();
  }, []);

  const initializeTaskIntegration = async () => {
    try {
      // Load existing tasks
      await loadTasks();
      
      // Calculate metrics
      updateMetrics();
      
    } catch (error) {
      console.error('Failed to initialize task integration:', error);
    }
  };

  const loadTasks = async () => {
    // Mock implementation - would load from API
    const mockTasks: TaskData[] = [
      {
        id: 'task-1',
        title: 'Review chat integration feature',
        description: 'Review the new chat integration feature before release',
        status: 'in_progress',
        priority: 'high',
        assignees: [{
          userId: 'user-1',
          name: 'John Doe',
          email: 'john@meridian.app',
          role: 'assignee'
        }],
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        tags: ['review', 'integration'],
        projectId: 'project-1',
        subtasks: [],
        dependencies: [],
        attachments: [],
        comments: [],
        customFields: {},
        source: {
          type: 'chat',
          chatId: 'chat-123',
          messageId: 'msg-456',
          userId: 'user-2',
          timestamp: new Date()
        },
        metadata: {
          createdBy: 'user-2',
          createdAt: new Date(),
          updatedBy: 'user-2',
          updatedAt: new Date(),
          version: 1
        }
      }
    ];

    setTasks(new Map(mockTasks.map(t => [t.id, t])));
  };

  const loadProjects = async () => {
    // Mock implementation - would load from API
    const mockProjects: ProjectData[] = [
      {
        id: 'project-1',
        name: 'Chat Platform Enhancement',
        description: 'Improve chat functionality with new integrations',
        status: 'active',
        visibility: 'private',
        owner: {
          userId: 'user-1',
          name: 'John Doe',
          email: 'john@meridian.app',
          role: 'assignee'
        },
        members: [],
        progress: 65,
        tags: ['chat', 'integration'],
        customFields: {},
        settings: {
          allowTaskCreationFromChat: true,
          autoAssignFromMentions: true,
          defaultTaskPriority: 'medium',
          requiredFields: ['title', 'assignee'],
          taskNumberingPrefix: 'CHAT'
        }
      }
    ];

    setProjects(new Map(mockProjects.map(p => [p.id, p])));
  };

  const loadDefaultTemplates = () => {
    const defaultTemplates: TaskTemplate[] = [
      {
        id: 'bug-fix',
        name: 'Bug Fix',
        defaultTitle: 'Fix: {{issue}}',
        defaultDescription: 'Bug report: {{description}}\n\nSteps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n\nActual behavior:',
        defaultPriority: 'high',
        defaultTags: ['bug', 'fix'],
        customFields: { severity: 'medium', reproduced: false },
        checklist: [
          { id: '1', text: 'Reproduce the issue', completed: false },
          { id: '2', text: 'Identify root cause', completed: false },
          { id: '3', text: 'Implement fix', completed: false },
          { id: '4', text: 'Test fix', completed: false },
          { id: '5', text: 'Update documentation', completed: false }
        ],
        applicableProjects: [],
        category: 'development'
      },
      {
        id: 'feature-request',
        name: 'Feature Request',
        defaultTitle: 'Feature: {{feature}}',
        defaultDescription: 'Feature description: {{description}}\n\nAcceptance criteria:\n- \n- \n- \n\nDesign considerations:\n\nTechnical notes:',
        defaultPriority: 'medium',
        defaultEstimatedHours: 8,
        defaultTags: ['feature', 'enhancement'],
        customFields: { complexity: 'medium', userStoryPoints: 0 },
        checklist: [
          { id: '1', text: 'Define requirements', completed: false },
          { id: '2', text: 'Create design mockups', completed: false },
          { id: '3', text: 'Implement feature', completed: false },
          { id: '4', text: 'Write tests', completed: false },
          { id: '5', text: 'Code review', completed: false },
          { id: '6', text: 'User testing', completed: false }
        ],
        applicableProjects: [],
        category: 'development'
      },
      {
        id: 'meeting-followup',
        name: 'Meeting Follow-up',
        defaultTitle: 'Follow-up: {{meeting}}',
        defaultDescription: 'Meeting: {{meeting}}\nDate: {{date}}\n\nAction items:\n- \n- \n- \n\nNext steps:',
        defaultPriority: 'medium',
        defaultTags: ['meeting', 'followup'],
        customFields: { meetingType: 'general' },
        checklist: [],
        applicableProjects: [],
        category: 'planning'
      }
    ];

    setTemplates(new Map(defaultTemplates.map(t => [t.id, t])));
  };

  // Extract task information from message
  const extractTaskFromMessage = useCallback((
    messageContent: string,
    messageAuthor: string,
    chatId: string,
    messageId: string,
    mentionedUsers: string[] = []
  ): MessageTaskExtraction => {
    const config = integrationConfig.current;
    let confidence = 0;
    
    // Check for task creation keywords
    const hasTaskKeywords = config.taskCreationKeywords.some(keyword => 
      messageContent.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasTaskKeywords) confidence += 0.3;

    // Check for action-oriented language
    const actionPatterns = [
      /need to/gi,
      /should/gi,
      /must/gi,
      /have to/gi,
      /let's/gi,
      /can (you|we|someone)/gi
    ];
    
    const hasActionLanguage = actionPatterns.some(pattern => 
      pattern.test(messageContent)
    );
    
    if (hasActionLanguage) confidence += 0.2;

    // Check for assignments
    const hasMentions = mentionedUsers.length > 0;
    if (hasMentions) confidence += 0.2;

    // Extract suggested title (first sentence or main action)
    let suggestedTitle = messageContent.split(/[.!?]/)[0].trim();
    if (suggestedTitle.length > 80) {
      suggestedTitle = suggestedTitle.substring(0, 77) + '...';
    }

    // Extract priority indicators
    let suggestedPriority: TaskData['priority'] = 'medium';
    for (const [priority, keywords] of Object.entries(config.priorityKeywords)) {
      if (keywords.some(keyword => 
        messageContent.toLowerCase().includes(keyword.toLowerCase())
      )) {
        suggestedPriority = priority as TaskData['priority'];
        confidence += 0.1;
        break;
      }
    }

    // Extract due date
    let suggestedDueDate: Date | undefined;
    for (const pattern of config.dueDatePatterns) {
      const matches = messageContent.match(pattern);
      if (matches) {
        const dateText = matches[0];
        suggestedDueDate = parseDateFromText(dateText);
        if (suggestedDueDate) {
          confidence += 0.1;
          break;
        }
      }
    }

    // Extract mentioned users for assignment
    const suggestedAssignees: string[] = [];
    if (config.autoAssignment.assignToMentionedUsers) {
      suggestedAssignees.push(...mentionedUsers);
    }
    if (config.autoAssignment.assignToMessageAuthor && !suggestedAssignees.includes(messageAuthor)) {
      suggestedAssignees.push(messageAuthor);
    }

    // Extract tags from content
    const suggestedTags: string[] = [];
    const commonTags = ['urgent', 'bug', 'feature', 'design', 'frontend', 'backend', 'testing'];
    for (const tag of commonTags) {
      if (messageContent.toLowerCase().includes(tag)) {
        suggestedTags.push(tag);
      }
    }

    // Extract project reference
    let suggestedProject: string | undefined;
    const projectMentions = messageContent.match(/#([a-zA-Z0-9_-]+)/g);
    if (projectMentions) {
      const projectName = projectMentions[0].substring(1);
      const project = Array.from(projects.values()).find(p => 
        p.name.toLowerCase().includes(projectName.toLowerCase())
      );
      if (project) {
        suggestedProject = project.id;
        confidence += 0.1;
      }
    }

    return {
      confidence,
      suggestedTitle,
      suggestedDescription: messageContent,
      suggestedPriority,
      suggestedAssignees,
      suggestedDueDate,
      suggestedTags,
      suggestedProject: suggestedProject || config.defaultProject,
      actionKeywords: config.taskCreationKeywords.filter(keyword =>
        messageContent.toLowerCase().includes(keyword.toLowerCase())
      ),
      entityMentions: {
        users: mentionedUsers,
        projects: projectMentions || [],
        dates: suggestedDueDate ? [suggestedDueDate] : [],
        priorities: [suggestedPriority]
      }
    };
  }, [projects]);

  // Create task from message
  const createTaskFromMessage = useCallback(async (
    messageContent: string,
    messageAuthor: string,
    chatId: string,
    messageId: string,
    mentionedUsers: string[] = [],
    overrides?: Partial<TaskData>
  ): Promise<TaskData> => {
    setIsProcessing(true);
    
    try {
      const extraction = extractTaskFromMessage(
        messageContent, 
        messageAuthor, 
        chatId, 
        messageId, 
        mentionedUsers
      );

      // Check if confidence meets threshold
      if (extraction.confidence < integrationConfig.current.autoTaskThreshold) {
        throw new Error('Message confidence too low for automatic task creation');
      }

      const taskId = generateTaskId();
      const task: TaskData = {
        id: taskId,
        title: overrides?.title || extraction.suggestedTitle,
        description: overrides?.description || extraction.suggestedDescription,
        status: overrides?.status || 'todo',
        priority: overrides?.priority || extraction.suggestedPriority,
        assignees: overrides?.assignees || await getUsersFromIds(extraction.suggestedAssignees),
        dueDate: overrides?.dueDate || extraction.suggestedDueDate,
        tags: overrides?.tags || extraction.suggestedTags,
        projectId: overrides?.projectId || extraction.suggestedProject,
        subtasks: [],
        dependencies: [],
        attachments: [],
        comments: [],
        customFields: overrides?.customFields || {},
        source: {
          type: 'chat',
          chatId,
          messageId,
          userId: messageAuthor,
          timestamp: new Date()
        },
        metadata: {
          createdBy: messageAuthor,
          createdAt: new Date(),
          updatedBy: messageAuthor,
          updatedAt: new Date(),
          version: 1
        }
      };

      // Save task
      setTasks(prev => new Map(prev).set(taskId, task));

      // Send notifications
      if (integrationConfig.current.notifications.notifyOnTaskCreation) {
        await sendTaskNotifications(task, 'created');
      }

      // Update metrics
      updateMetrics();

      return task;
    } finally {
      setIsProcessing(false);
    }
  }, [extractTaskFromMessage]);

  // Create task from template
  const createTaskFromTemplate = useCallback(async (
    templateId: string,
    variables: Record<string, string> = {},
    overrides?: Partial<TaskData>
  ): Promise<TaskData> => {
    const template = templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const taskId = generateTaskId();
    
    // Replace variables in template
    const processTemplate = (text: string) => {
      return Object.entries(variables).reduce((result, [key, value]) => {
        return result.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }, text);
    };

    const task: TaskData = {
      id: taskId,
      title: processTemplate(template.defaultTitle),
      description: processTemplate(template.defaultDescription),
      status: 'todo',
      priority: template.defaultPriority,
      assignees: overrides?.assignees || [],
      estimatedHours: template.defaultEstimatedHours,
      tags: [...template.defaultTags, ...(overrides?.tags || [])],
      projectId: overrides?.projectId,
      subtasks: [],
      dependencies: [],
      attachments: [],
      comments: [],
      customFields: { ...template.customFields, ...(overrides?.customFields || {}) },
      source: {
        type: 'manual',
        timestamp: new Date()
      },
      metadata: {
        createdBy: overrides?.metadata?.createdBy || 'system',
        createdAt: new Date(),
        updatedBy: overrides?.metadata?.createdBy || 'system',
        updatedAt: new Date(),
        version: 1
      }
    };

    setTasks(prev => new Map(prev).set(taskId, task));
    updateMetrics();

    return task;
  }, [templates]);

  // Update task
  const updateTask = useCallback(async (
    taskId: string,
    updates: Partial<TaskData>
  ): Promise<TaskData> => {
    const existingTask = tasks.get(taskId);
    if (!existingTask) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updatedTask: TaskData = {
      ...existingTask,
      ...updates,
      metadata: {
        ...existingTask.metadata,
        updatedAt: new Date(),
        version: existingTask.metadata.version + 1
      }
    };

    setTasks(prev => new Map(prev).set(taskId, updatedTask));
    
    // Send notifications for significant changes
    if (updates.status || updates.assignees || updates.dueDate) {
      await sendTaskNotifications(updatedTask, 'updated');
    }

    updateMetrics();
    return updatedTask;
  }, [tasks]);

  // Add comment to task
  const addTaskComment = useCallback(async (
    taskId: string,
    content: string,
    author: TaskAssignee,
    mentions: string[] = []
  ): Promise<void> => {
    const task = tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const comment: TaskComment = {
      id: generateCommentId(),
      content,
      author,
      timestamp: new Date(),
      mentions,
      attachments: []
    };

    task.comments.push(comment);
    task.metadata.updatedAt = new Date();
    task.metadata.version += 1;

    setTasks(prev => new Map(prev).set(taskId, task));

    // Notify mentioned users
    if (mentions.length > 0) {
      await sendTaskNotifications(task, 'mentioned');
    }
  }, [tasks]);

  // Send task notifications
  const sendTaskNotifications = async (
    task: TaskData,
    action: 'created' | 'updated' | 'completed' | 'mentioned'
  ) => {
    const config = integrationConfig.current.notifications;
    
    if (!config.notifyAssignees && !config.notifyProjectMembers) return;

    // Determine recipients
    const recipients: string[] = [];
    
    if (config.notifyAssignees) {
      recipients.push(...task.assignees.map(a => a.userId));
    }
    
    if (config.notifyProjectMembers && task.projectId) {
      const project = projects.get(task.projectId);
      if (project) {
        recipients.push(...project.members.map(m => m.userId));
      }
    }

    // Send notifications through configured channels
    for (const channel of config.channels) {
      try {
        await sendNotificationThroughChannel(task, action, channel, recipients);
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error);
      }
    }
  };

  const sendNotificationThroughChannel = async (
    task: TaskData,
    action: string,
    channel: string,
    recipients: string[]
  ) => {
    // Mock implementation - would integrate with notification services
    logger.info("Sending ${channel} notification for task ${action}:");
  };

  // Utility functions
  const generateTaskId = (): string => 
    `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const generateCommentId = (): string => 
    `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const getUsersFromIds = async (userIds: string[]): Promise<TaskAssignee[]> => {
    // Mock implementation - would fetch user details from API
    return userIds.map((id, index) => ({
      userId: id,
      name: `User ${index + 1}`,
      email: `user${index + 1}@meridian.app`,
      role: 'assignee'
    }));
  };

  const parseDateFromText = (dateText: string): Date | undefined => {
    const now = new Date();
    const text = dateText.toLowerCase();
    
    if (text.includes('today')) {
      return now;
    } else if (text.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow;
    } else if (text.includes('this week')) {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + (5 - now.getDay())); // Friday
      return endOfWeek;
    } else if (text.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return nextWeek;
    }
    
    // Try to parse relative dates like "in 3 days"
    const relativeMatch = text.match(/in (\d+) (days?|weeks?|months?)/);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2];
      const futureDate = new Date(now);
      
      if (unit.startsWith('day')) {
        futureDate.setDate(now.getDate() + amount);
      } else if (unit.startsWith('week')) {
        futureDate.setDate(now.getDate() + amount * 7);
      } else if (unit.startsWith('month')) {
        futureDate.setMonth(now.getMonth() + amount);
      }
      
      return futureDate;
    }
    
    return undefined;
  };

  const updateMetrics = () => {
    const allTasks = Array.from(tasks.values());
    const totalTasks = allTasks.length;
    
    const tasksByStatus = allTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<TaskData['status'], number>);

    const tasksByPriority = allTasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<TaskData['priority'], number>);

    const createdFromChat = allTasks.filter(t => t.source.type === 'chat').length;
    const completedTasks = allTasks.filter(t => t.status === 'done');
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
    
    const overdueTasks = allTasks.filter(t => 
      t.dueDate && t.dueDate < new Date() && t.status !== 'done'
    );
    const overdueRate = totalTasks > 0 ? (overdueTasks.length / totalTasks) * 100 : 0;

    const metrics: TaskMetrics = {
      totalTasks,
      tasksByStatus: {
        todo: tasksByStatus.todo || 0,
        in_progress: tasksByStatus.in_progress || 0,
        review: tasksByStatus.review || 0,
        done: tasksByStatus.done || 0,
        cancelled: tasksByStatus.cancelled || 0
      },
      tasksByPriority: {
        low: tasksByPriority.low || 0,
        medium: tasksByPriority.medium || 0,
        high: tasksByPriority.high || 0,
        urgent: tasksByPriority.urgent || 0
      },
      createdFromChat,
      completionRate,
      averageCompletionTime: calculateAverageCompletionTime(completedTasks),
      overdueRate,
      assigneeWorkload: calculateAssigneeWorkload(allTasks),
      projectProgress: calculateProjectProgress(allTasks)
    };

    setMetrics(metrics);
  };

  const calculateAverageCompletionTime = (completedTasks: TaskData[]): number => {
    if (completedTasks.length === 0) return 0;
    
    const totalTime = completedTasks.reduce((sum, task) => {
      if (task.completedAt && task.metadata.createdAt) {
        return sum + (task.completedAt.getTime() - task.metadata.createdAt.getTime());
      }
      return sum;
    }, 0);
    
    return totalTime / completedTasks.length / (1000 * 60 * 60); // Convert to hours
  };

  const calculateAssigneeWorkload = (allTasks: TaskData[]) => {
    const workload: Record<string, any> = {};
    
    allTasks.forEach(task => {
      task.assignees.forEach(assignee => {
        if (!workload[assignee.userId]) {
          workload[assignee.userId] = {
            totalTasks: 0,
            inProgress: 0,
            overdue: 0,
            avgCompletionTime: 0
          };
        }
        
        workload[assignee.userId].totalTasks++;
        
        if (task.status === 'in_progress') {
          workload[assignee.userId].inProgress++;
        }
        
        if (task.dueDate && task.dueDate < new Date() && task.status !== 'done') {
          workload[assignee.userId].overdue++;
        }
      });
    });
    
    return workload;
  };

  const calculateProjectProgress = (allTasks: TaskData[]) => {
    const progress: Record<string, any> = {};
    
    allTasks.forEach(task => {
      if (task.projectId) {
        if (!progress[task.projectId]) {
          progress[task.projectId] = {
            totalTasks: 0,
            completed: 0,
            progress: 0
          };
        }
        
        progress[task.projectId].totalTasks++;
        
        if (task.status === 'done') {
          progress[task.projectId].completed++;
        }
      }
    });
    
    // Calculate progress percentage
    Object.keys(progress).forEach(projectId => {
      const proj = progress[projectId];
      proj.progress = proj.totalTasks > 0 ? (proj.completed / proj.totalTasks) * 100 : 0;
    });
    
    return progress;
  };

  return {
    // State
    tasks: Array.from(tasks.values()),
    projects: Array.from(projects.values()),
    templates: Array.from(templates.values()),
    metrics,
    isProcessing,
    
    // Task operations
    createTaskFromMessage,
    createTaskFromTemplate,
    updateTask,
    deleteTask: async (taskId: string) => {
      setTasks(prev => {
        const updated = new Map(prev);
        updated.delete(taskId);
        return updated;
      });
      updateMetrics();
    },
    
    // Comments
    addTaskComment,
    
    // Message analysis
    extractTaskFromMessage,
    
    // Configuration
    updateConfig: (newConfig: Partial<TaskIntegrationConfig>) => {
      integrationConfig.current = { ...integrationConfig.current, ...newConfig };
    },
    
    // Templates
    createTemplate: (template: Omit<TaskTemplate, 'id'>) => {
      const templateId = generateTaskId();
      setTemplates(prev => new Map(prev).set(templateId, { ...template, id: templateId }));
    },
    
    // Queries
    getTasksByProject: (projectId: string) => 
      Array.from(tasks.values()).filter(t => t.projectId === projectId),
    
    getTasksByAssignee: (userId: string) => 
      Array.from(tasks.values()).filter(t => 
        t.assignees.some(a => a.userId === userId)
      ),
    
    getOverdueTasks: () => 
      Array.from(tasks.values()).filter(t => 
        t.dueDate && t.dueDate < new Date() && t.status !== 'done'
      ),
    
    getTasksFromChat: (chatId: string) =>
      Array.from(tasks.values()).filter(t => t.source.chatId === chatId),
    
    // Computed values
    pendingTasks: Array.from(tasks.values()).filter(t => 
      ['todo', 'in_progress'].includes(t.status)
    ),
    
    recentTasks: Array.from(tasks.values())
      .filter(t => Date.now() - t.metadata.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => b.metadata.createdAt.getTime() - a.metadata.createdAt.getTime())
  };
}