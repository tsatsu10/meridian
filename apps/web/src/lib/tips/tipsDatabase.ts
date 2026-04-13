import type { Tip } from '@/types/tips';

/**
 * Tips Database - Football Manager Style
 * Comprehensive collection of tips for Meridian platform
 */

export const TIPS_DATABASE: Tip[] = [
  // ===== NAVIGATION TIPS =====
  {
    id: 'nav-001',
    category: 'navigation',
    type: 'loading',
    title: 'Quick Navigation with Command Palette',
    content: 'Press Cmd+K (Mac) or Ctrl+K (Windows) to open the command palette and quickly jump to any project, task, or page.',
    level: 'beginner',
    priority: 100,
    frequency: 'once',
    tags: ['keyboard', 'shortcuts', 'productivity'],
    keywords: ['command palette', 'keyboard', 'quick navigation'],
  },
  {
    id: 'nav-002',
    category: 'navigation',
    type: 'loading',
    title: 'Breadcrumb Navigation',
    content: 'Use the breadcrumb trail at the top to quickly navigate between workspace, project, and task levels.',
    level: 'beginner',
    priority: 90,
    frequency: 'daily',
    tags: ['navigation', 'ui'],
  },
  {
    id: 'nav-003',
    category: 'navigation',
    type: 'contextual',
    title: 'Sidebar Toggle',
    content: 'Click the menu icon or press [ to toggle the sidebar and get more screen space.',
    level: 'beginner',
    priority: 80,
    frequency: 'once',
    triggers: [{ condition: 'route', route: '/dashboard' }],
  },

  // ===== TASK MANAGEMENT TIPS =====
  {
    id: 'task-001',
    category: 'tasks',
    type: 'loading',
    title: 'Bulk Task Operations',
    content: 'Hold Shift and click to select multiple tasks, then use the bulk actions menu to update status, priority, or assignees all at once.',
    level: 'intermediate',
    priority: 95,
    frequency: 'weekly',
    tags: ['tasks', 'productivity', 'bulk actions'],
  },
  {
    id: 'task-002',
    category: 'tasks',
    type: 'loading',
    title: 'Drag and Drop Tasks',
    content: 'Drag tasks between columns on the Kanban board to instantly update their status. Works across all project boards!',
    level: 'beginner',
    priority: 100,
    frequency: 'once',
    tags: ['kanban', 'tasks'],
  },
  {
    id: 'task-003',
    category: 'tasks',
    type: 'contextual',
    title: 'Quick Task Creation',
    content: 'Press Cmd+N or Ctrl+N to create a new task from anywhere in the app. The task will be automatically added to the current project.',
    level: 'beginner',
    priority: 90,
    frequency: 'daily',
    triggers: [{ condition: 'route', route: '/project' }],
  },
  {
    id: 'task-004',
    category: 'tasks',
    type: 'loading',
    title: 'Task Dependencies',
    content: 'Link related tasks by setting dependencies. This helps visualize task relationships and prevents bottlenecks in your workflow.',
    level: 'intermediate',
    priority: 85,
    frequency: 'weekly',
    tags: ['tasks', 'dependencies', 'workflow'],
  },
  {
    id: 'task-005',
    category: 'tasks',
    type: 'loading',
    title: 'Keyboard Shortcuts for Task Status',
    content: 'Use number keys 1-4 to quickly change task status: 1=To Do, 2=In Progress, 3=In Review, 4=Done.',
    level: 'advanced',
    priority: 75,
    frequency: 'once',
    tags: ['shortcuts', 'productivity'],
  },

  // ===== COMMUNICATION TIPS =====
  {
    id: 'comm-001',
    category: 'communication',
    type: 'loading',
    title: 'Mention Team Members',
    content: 'Start a message with @username to mention team members. They\'ll receive a notification and can quickly respond.',
    level: 'beginner',
    priority: 90,
    frequency: 'once',
    tags: ['chat', 'mentions', 'collaboration'],
  },
  {
    id: 'comm-002',
    category: 'communication',
    type: 'loading',
    title: 'Channel Organization',
    content: 'Create separate channels for different topics or projects to keep conversations organized and easy to follow.',
    level: 'beginner',
    priority: 85,
    frequency: 'weekly',
    tags: ['channels', 'organization'],
  },
  {
    id: 'comm-003',
    category: 'communication',
    type: 'contextual',
    title: 'Message Threading',
    content: 'Reply to specific messages to create threads. This keeps related discussions together and makes conversations easier to follow.',
    level: 'intermediate',
    priority: 80,
    frequency: 'daily',
    triggers: [{ condition: 'route', route: '/chat' }],
  },
  {
    id: 'comm-004',
    category: 'communication',
    type: 'loading',
    title: 'File Sharing',
    content: 'Drag and drop files directly into chat messages or task comments. All uploaded files are searchable and organized by project.',
    level: 'beginner',
    priority: 85,
    frequency: 'once',
    tags: ['files', 'sharing'],
  },

  // ===== ANALYTICS TIPS =====
  {
    id: 'analytics-001',
    category: 'analytics',
    type: 'loading',
    title: 'Drill-Down Charts',
    content: 'Click any chart or metric to drill down into detailed analytics. You can explore data at workspace, project, team, or individual levels.',
    level: 'intermediate',
    priority: 80,
    frequency: 'weekly',
    tags: ['analytics', 'charts', 'insights'],
  },
  {
    id: 'analytics-002',
    category: 'analytics',
    type: 'contextual',
    title: 'Export Reports',
    content: 'Generate and export reports as PDF or CSV for stakeholder presentations. Customize report templates to match your needs.',
    level: 'intermediate',
    priority: 75,
    frequency: 'weekly',
    triggers: [{ condition: 'route', route: '/analytics' }],
  },
  {
    id: 'analytics-003',
    category: 'analytics',
    type: 'loading',
    title: 'Real-Time Metrics',
    content: 'Dashboard metrics update in real-time. Watch your team\'s progress without refreshing the page!',
    level: 'beginner',
    priority: 70,
    frequency: 'once',
    tags: ['real-time', 'dashboard'],
  },
  {
    id: 'analytics-004',
    category: 'analytics',
    type: 'loading',
    title: 'Custom Dashboards',
    content: 'Create custom dashboard views by selecting and arranging widgets. Save different layouts for different use cases.',
    level: 'advanced',
    priority: 70,
    frequency: 'weekly',
    tags: ['customization', 'dashboard'],
  },

  // ===== AUTOMATION TIPS =====
  {
    id: 'auto-001',
    category: 'automation',
    type: 'loading',
    title: 'Workflow Automation',
    content: 'Set up workflow rules to automatically assign tasks, send notifications, or update statuses based on conditions you define.',
    level: 'advanced',
    priority: 85,
    frequency: 'weekly',
    tags: ['automation', 'workflows'],
  },
  {
    id: 'auto-002',
    category: 'automation',
    type: 'loading',
    title: 'Webhook Integrations',
    content: 'Connect Meridian to external tools like Slack, GitHub, or Jira using webhooks. Automate cross-platform workflows effortlessly.',
    level: 'advanced',
    priority: 80,
    frequency: 'weekly',
    tags: ['webhooks', 'integrations'],
  },
  {
    id: 'auto-003',
    category: 'automation',
    type: 'loading',
    title: 'Task Templates',
    content: 'Create task templates for recurring workflows. Save time by reusing common task structures with predefined fields.',
    level: 'intermediate',
    priority: 75,
    frequency: 'weekly',
    tags: ['templates', 'productivity'],
  },

  // ===== KEYBOARD SHORTCUTS =====
  {
    id: 'short-001',
    category: 'shortcuts',
    type: 'loading',
    title: 'View All Shortcuts',
    content: 'Press ? (question mark) to view all available keyboard shortcuts. Learn them to become a power user!',
    level: 'beginner',
    priority: 95,
    frequency: 'once',
    tags: ['shortcuts', 'help'],
  },
  {
    id: 'short-002',
    category: 'shortcuts',
    type: 'loading',
    title: 'Search Everything',
    content: 'Press Cmd+F or Ctrl+F to search across all tasks, messages, and files in your current workspace.',
    level: 'beginner',
    priority: 90,
    frequency: 'once',
    tags: ['search', 'shortcuts'],
  },
  {
    id: 'short-003',
    category: 'shortcuts',
    type: 'loading',
    title: 'Quick Actions',
    content: 'Use keyboard shortcuts for common actions: N=New Task, E=Edit, D=Delete, R=Refresh. Check the shortcuts menu for more.',
    level: 'intermediate',
    priority: 80,
    frequency: 'daily',
    tags: ['shortcuts', 'productivity'],
  },

  // ===== COLLABORATION TIPS =====
  {
    id: 'collab-001',
    category: 'collaboration',
    type: 'loading',
    title: 'Team Calendar',
    content: 'Use the team calendar to view all tasks and deadlines in a timeline view. Perfect for sprint planning and resource management.',
    level: 'intermediate',
    priority: 85,
    frequency: 'weekly',
    tags: ['calendar', 'planning'],
  },
  {
    id: 'collab-002',
    category: 'collaboration',
    type: 'loading',
    title: 'Presence Indicators',
    content: 'See who\'s online and actively working on tasks with real-time presence indicators. Great for knowing when to reach out!',
    level: 'beginner',
    priority: 70,
    frequency: 'once',
    tags: ['presence', 'real-time'],
  },
  {
    id: 'collab-003',
    category: 'collaboration',
    type: 'loading',
    title: 'Project Permissions',
    content: 'Manage who can view, edit, or admin projects with granular permission controls. Keep sensitive projects secure.',
    level: 'advanced',
    priority: 75,
    frequency: 'weekly',
    tags: ['permissions', 'security'],
  },

  // ===== WORKFLOW TIPS =====
  {
    id: 'workflow-001',
    category: 'workflows',
    type: 'loading',
    title: 'Kanban vs List View',
    content: 'Switch between Kanban board and list view based on your preference. Both views sync in real-time!',
    level: 'beginner',
    priority: 80,
    frequency: 'once',
    tags: ['views', 'kanban', 'list'],
  },
  {
    id: 'workflow-002',
    category: 'workflows',
    type: 'loading',
    title: 'Filter and Sort Tasks',
    content: 'Use advanced filters to view tasks by assignee, priority, status, or labels. Save filter presets for quick access.',
    level: 'intermediate',
    priority: 75,
    frequency: 'weekly',
    tags: ['filters', 'organization'],
  },

  // ===== SETTINGS TIPS =====
  {
    id: 'settings-001',
    category: 'settings',
    type: 'contextual',
    title: 'Notification Preferences',
    content: 'Customize which notifications you receive via email, push, or in-app. Set quiet hours to avoid interruptions.',
    level: 'beginner',
    priority: 70,
    frequency: 'once',
    triggers: [{ condition: 'route', route: '/settings' }],
    tags: ['notifications', 'preferences'],
  },
  {
    id: 'settings-002',
    category: 'settings',
    type: 'loading',
    title: 'Theme Customization',
    content: 'Switch between light and dark themes, or create custom themes to match your brand. Available in appearance settings.',
    level: 'beginner',
    priority: 65,
    frequency: 'once',
    tags: ['themes', 'customization'],
  },

  // ===== REPORTS TIPS =====
  {
    id: 'reports-001',
    category: 'reports',
    type: 'loading',
    title: 'Scheduled Reports',
    content: 'Set up automatic report generation and distribution. Perfect for weekly status updates to stakeholders.',
    level: 'advanced',
    priority: 70,
    frequency: 'weekly',
    tags: ['reports', 'automation'],
  },
  {
    id: 'reports-002',
    category: 'reports',
    type: 'loading',
    title: 'Time Tracking Reports',
    content: 'Track time spent on tasks and generate detailed time reports for billing or productivity analysis.',
    level: 'intermediate',
    priority: 75,
    frequency: 'weekly',
    tags: ['time tracking', 'reports'],
  },
];

// Helper functions to get tips by category or level
export function getTipsByCategory(category: string): Tip[] {
  return TIPS_DATABASE.filter((tip) => tip.category === category);
}

export function getTipsByLevel(level: string): Tip[] {
  return TIPS_DATABASE.filter((tip) => tip.level === level);
}

export function getTipsByType(type: string): Tip[] {
  return TIPS_DATABASE.filter((tip) => tip.type === type);
}

export function getRandomLoadingTip(): Tip | null {
  const loadingTips = getTipsByType('loading');
  if (loadingTips.length === 0) return null;
  return loadingTips[Math.floor(Math.random() * loadingTips.length)];
}
