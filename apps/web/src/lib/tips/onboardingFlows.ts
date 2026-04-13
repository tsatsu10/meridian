import type { OnboardingFlow } from '@/types/tips';
import { TIPS_DATABASE } from './tipsDatabase';

/**
 * Onboarding Flow Definitions
 * Interactive step-by-step guides for key features
 */

export const ONBOARDING_FLOWS: OnboardingFlow[] = [
  {
    id: 'getting-started',
    name: 'Getting Started with Meridian',
    description: 'Learn the basics of navigating and using Meridian',
    category: 'general',
    estimatedDuration: 5,
    optional: false,
    steps: [
      {
        id: 'welcome',
        order: 1,
        title: 'Welcome to Meridian! 👋',
        description: 'Let\'s take a quick tour of the platform and get you up to speed.',
        placement: 'center',
        tip: TIPS_DATABASE.find(t => t.id === 'nav-001'),
        skippable: false,
        completed: false,
      },
      {
        id: 'dashboard-overview',
        order: 2,
        title: 'Dashboard Overview',
        description: 'This is your dashboard - your central hub for all project activities.',
        targetElement: '#dashboard-container',
        placement: 'center',
        tip: TIPS_DATABASE.find(t => t.id === 'nav-002'),
        skippable: true,
        completed: false,
      },
      {
        id: 'command-palette',
        order: 3,
        title: 'Quick Navigation',
        description: 'Press Cmd+K (or Ctrl+K) to open the command palette for fast navigation.',
        targetElement: '[data-command-palette-trigger]',
        placement: 'bottom',
        tip: TIPS_DATABASE.find(t => t.id === 'short-001'),
        action: {
          type: 'wait',
          timeout: 3000,
        },
        skippable: true,
        completed: false,
      },
      {
        id: 'sidebar',
        order: 4,
        title: 'Sidebar Navigation',
        description: 'Use the sidebar to access different sections of the app.',
        targetElement: '[data-sidebar]',
        placement: 'right',
        tip: TIPS_DATABASE.find(t => t.id === 'nav-003'),
        skippable: true,
        completed: false,
      },
      {
        id: 'all-set',
        order: 5,
        title: 'You\'re All Set! 🎉',
        description: 'You\'ve learned the basics. Explore more features as you go!',
        placement: 'center',
        skippable: false,
        completed: false,
      },
    ],
  },

  {
    id: 'create-first-task',
    name: 'Create Your First Task',
    description: 'Learn how to create and manage tasks',
    category: 'tasks',
    estimatedDuration: 3,
    optional: true,
    steps: [
      {
        id: 'intro',
        order: 1,
        title: 'Task Management',
        description: 'Tasks are the building blocks of your projects. Let\'s create one!',
        placement: 'center',
        skippable: false,
        completed: false,
      },
      {
        id: 'new-task-button',
        order: 2,
        title: 'New Task Button',
        description: 'Click the "New Task" button or press Cmd+N to create a task.',
        targetElement: '[data-new-task-button]',
        placement: 'bottom',
        tip: TIPS_DATABASE.find(t => t.id === 'task-003'),
        skippable: true,
        completed: false,
      },
      {
        id: 'task-details',
        order: 3,
        title: 'Fill Task Details',
        description: 'Give your task a title, description, assignee, and due date.',
        targetElement: '[data-task-form]',
        placement: 'right',
        tip: TIPS_DATABASE.find(t => t.id === 'task-001'),
        skippable: true,
        completed: false,
      },
      {
        id: 'drag-drop',
        order: 4,
        title: 'Drag and Drop',
        description: 'Drag tasks between columns to update their status.',
        targetElement: '[data-kanban-board]',
        placement: 'top',
        tip: TIPS_DATABASE.find(t => t.id === 'task-002'),
        skippable: true,
        completed: false,
      },
      {
        id: 'complete',
        order: 5,
        title: 'Task Created! ✅',
        description: 'Great job! You know how to create and manage tasks now.',
        placement: 'center',
        skippable: false,
        completed: false,
      },
    ],
  },

  {
    id: 'team-collaboration',
    name: 'Team Collaboration Basics',
    description: 'Learn how to collaborate with your team',
    category: 'communication',
    estimatedDuration: 4,
    optional: true,
    steps: [
      {
        id: 'intro',
        order: 1,
        title: 'Collaborate with Your Team',
        description: 'Let\'s explore communication and collaboration features.',
        placement: 'center',
        skippable: false,
        completed: false,
      },
      {
        id: 'chat-nav',
        order: 2,
        title: 'Navigate to Chat',
        description: 'Click the Chat icon in the sidebar to access team communication.',
        targetElement: '[data-chat-nav]',
        placement: 'right',
        tip: TIPS_DATABASE.find(t => t.id === 'comm-001'),
        skippable: true,
        completed: false,
      },
      {
        id: 'mentions',
        order: 3,
        title: 'Mention Team Members',
        description: 'Use @username to mention and notify team members in messages.',
        targetElement: '[data-message-input]',
        placement: 'top',
        tip: TIPS_DATABASE.find(t => t.id === 'comm-001'),
        skippable: true,
        completed: false,
      },
      {
        id: 'channels',
        order: 4,
        title: 'Create Channels',
        description: 'Organize conversations by topic using channels.',
        targetElement: '[data-create-channel]',
        placement: 'bottom',
        tip: TIPS_DATABASE.find(t => t.id === 'comm-002'),
        skippable: true,
        completed: false,
      },
      {
        id: 'complete',
        order: 5,
        title: 'Ready to Collaborate! 🤝',
        description: 'You\'re all set to communicate with your team effectively.',
        placement: 'center',
        skippable: false,
        completed: false,
      },
    ],
  },

  {
    id: 'analytics-intro',
    name: 'Understanding Analytics',
    description: 'Learn how to use analytics and reports',
    category: 'analytics',
    estimatedDuration: 3,
    optional: true,
    steps: [
      {
        id: 'intro',
        order: 1,
        title: 'Analytics Dashboard',
        description: 'Track progress and gain insights with powerful analytics.',
        placement: 'center',
        skippable: false,
        completed: false,
      },
      {
        id: 'navigate',
        order: 2,
        title: 'Access Analytics',
        description: 'Navigate to the Analytics section to view detailed metrics.',
        targetElement: '[data-analytics-nav]',
        placement: 'right',
        tip: TIPS_DATABASE.find(t => t.id === 'analytics-001'),
        skippable: true,
        completed: false,
      },
      {
        id: 'drill-down',
        order: 3,
        title: 'Drill Down',
        description: 'Click on any chart to drill down into detailed data.',
        targetElement: '[data-chart-container]',
        placement: 'top',
        tip: TIPS_DATABASE.find(t => t.id === 'analytics-001'),
        skippable: true,
        completed: false,
      },
      {
        id: 'export',
        order: 4,
        title: 'Export Reports',
        description: 'Export reports as PDF or CSV for sharing with stakeholders.',
        targetElement: '[data-export-button]',
        placement: 'bottom',
        tip: TIPS_DATABASE.find(t => t.id === 'analytics-002'),
        skippable: true,
        completed: false,
      },
      {
        id: 'complete',
        order: 5,
        title: 'Analytics Pro! 📊',
        description: 'You\'re now ready to leverage analytics for better decision making.',
        placement: 'center',
        skippable: false,
        completed: false,
      },
    ],
  },

  {
    id: 'keyboard-shortcuts',
    name: 'Master Keyboard Shortcuts',
    description: 'Become a power user with keyboard shortcuts',
    category: 'productivity',
    estimatedDuration: 2,
    optional: true,
    requiredForRole: ['power-user', 'admin'],
    steps: [
      {
        id: 'intro',
        order: 1,
        title: 'Keyboard Shortcuts',
        description: 'Learn essential shortcuts to work faster and more efficiently.',
        placement: 'center',
        skippable: false,
        completed: false,
      },
      {
        id: 'view-shortcuts',
        order: 2,
        title: 'View All Shortcuts',
        description: 'Press ? to see all available keyboard shortcuts.',
        placement: 'center',
        tip: TIPS_DATABASE.find(t => t.id === 'short-001'),
        skippable: true,
        completed: false,
      },
      {
        id: 'navigation',
        order: 3,
        title: 'Quick Navigation',
        description: 'Use Cmd/Ctrl + K for command palette, Cmd/Ctrl + F for search.',
        placement: 'center',
        tip: TIPS_DATABASE.find(t => t.id === 'short-002'),
        skippable: true,
        completed: false,
      },
      {
        id: 'task-shortcuts',
        order: 4,
        title: 'Task Shortcuts',
        description: 'Use 1-4 for status, U/H/M/L for priority.',
        placement: 'center',
        tip: TIPS_DATABASE.find(t => t.id === 'task-005'),
        skippable: true,
        completed: false,
      },
      {
        id: 'complete',
        order: 5,
        title: 'Power User! ⚡',
        description: 'You\'re now equipped with shortcuts to boost your productivity!',
        placement: 'center',
        skippable: false,
        completed: false,
      },
    ],
  },
];

// Helper functions
export function getFlowById(flowId: string): OnboardingFlow | undefined {
  return ONBOARDING_FLOWS.find((flow) => flow.id === flowId);
}

export function getFlowsByCategory(category: string): OnboardingFlow[] {
  return ONBOARDING_FLOWS.filter((flow) => flow.category === category);
}

export function getRequiredFlows(): OnboardingFlow[] {
  return ONBOARDING_FLOWS.filter((flow) => !flow.optional);
}

export function getOptionalFlows(): OnboardingFlow[] {
  return ONBOARDING_FLOWS.filter((flow) => flow.optional);
}
