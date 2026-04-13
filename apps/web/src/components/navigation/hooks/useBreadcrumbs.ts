// Advanced breadcrumb management with auto-generation and customization
import { useEffect, useMemo } from 'react';
import { useLocation, useParams } from '@tanstack/react-router';
import { useNavigation, BreadcrumbItem } from '../providers/NavigationProvider';
import useWorkspaceStore from '@/store/workspace';
import { useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/fetch';

interface BreadcrumbConfig {
  // Custom breadcrumb items that override auto-generated ones
  custom?: BreadcrumbItem[];
  
  // Whether to include the home/dashboard link
  includeHome?: boolean;
  
  // Whether to include workspace in breadcrumbs
  includeWorkspace?: boolean;
  
  // Maximum number of breadcrumb items to show
  maxItems?: number;
  
  // Custom separator (defaults to visual separator in component)
  separator?: string;
  
  // Custom resolver for dynamic route parameters
  paramResolver?: Record<string, (id: string) => Promise<string> | string>;
}

interface RouteMapping {
  pattern: RegExp;
  template: (params: Record<string, string>, resolved?: Record<string, string>) => BreadcrumbItem[];
}

// Define route mappings for automatic breadcrumb generation
const ROUTE_MAPPINGS: RouteMapping[] = [
  // Dashboard routes
  {
    pattern: /^\/dashboard$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' }
    ]
  },
  
  // Project routes
  {
    pattern: /^\/dashboard\/projects$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'projects', label: 'Projects', href: '/dashboard/projects' }
    ]
  },
  
  {
    pattern: /^\/dashboard\/workspace\/([^/]+)\/project\/([^/]+)$/,
    template: (params, resolved) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'projects', label: 'Projects', href: '/dashboard/projects' },
      { 
        id: 'project', 
        label: resolved?.projectName || `Project ${params.projectId}`, 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}` 
      }
    ]
  },
  
  {
    pattern: /^\/dashboard\/workspace\/([^/]+)\/project\/([^/]+)\/task\/([^/]+)$/,
    template: (params, resolved) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'projects', label: 'Projects', href: '/dashboard/projects' },
      { 
        id: 'project', 
        label: resolved?.projectName || `Project ${params.projectId}`, 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}` 
      },
      { 
        id: 'task', 
        label: resolved?.taskTitle || `Task ${params.taskId}`, 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}/task/${params.taskId}` 
      }
    ]
  },
  
  // Teams routes
  {
    pattern: /^\/dashboard\/teams$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'teams', label: 'Teams', href: '/dashboard/teams' }
    ]
  },
  
  // Chat routes
  {
    pattern: /^\/dashboard\/chat$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'chat', label: 'Team Communication', href: '/dashboard/chat' }
    ]
  },
  
  // Settings routes
  {
    pattern: /^\/dashboard\/settings$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings' }
    ]
  },
  
  {
    pattern: /^\/dashboard\/settings\/([^/]+)$/,
    template: (params) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
      { 
        id: `settings-${params.section}`, 
        label: formatSettingsSection(params.section), 
        href: `/dashboard/settings/${params.section}` 
      }
    ]
  },
  
  // Analytics routes
  {
    pattern: /^\/dashboard\/analytics$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics' }
    ]
  },
  
  {
    pattern: /^\/dashboard\/analytics\/widgets$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'analytics', label: 'Analytics', href: '/dashboard/analytics' },
      { id: 'widgets', label: 'Widgets', href: '/dashboard/analytics/widgets' }
    ]
  },
  
  // All tasks route
  {
    pattern: /^\/dashboard\/all-tasks$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'all-tasks', label: 'All Tasks', href: '/dashboard/all-tasks' }
    ]
  },
  
  // Notifications route
  {
    pattern: /^\/dashboard\/notifications$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'notifications', label: 'Notifications', href: '/dashboard/notifications' }
    ]
  },
  
  // Help routes
  {
    pattern: /^\/dashboard\/help$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'help', label: 'Help Center', href: '/dashboard/help' }
    ]
  },
  
  {
    pattern: /^\/dashboard\/help\/admin$/,
    template: () => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'help', label: 'Help Center', href: '/dashboard/help' },
      { id: 'help-admin', label: 'Admin Guide', href: '/dashboard/help/admin' }
    ]
  },
  
  {
    pattern: /^\/dashboard\/help\/([^/]+)$/,
    template: (params) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'help', label: 'Help Center', href: '/dashboard/help' },
      { 
        id: `help-${params.slug}`, 
        label: formatHelpSlug(params.slug), 
        href: `/dashboard/help/${params.slug}` 
      }
    ]
  },
  
  // Project milestones
  {
    pattern: /^\/dashboard\/workspace\/([^/]+)\/project\/([^/]+)\/milestones$/,
    template: (params, resolved) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'projects', label: 'Projects', href: '/dashboard/projects' },
      { 
        id: 'project', 
        label: resolved?.projectName || `Project ${params.projectId}`, 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}` 
      },
      { 
        id: 'milestones', 
        label: 'Milestones', 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}/milestones` 
      }
    ]
  },
  
  // Project settings
  {
    pattern: /^\/dashboard\/workspace\/([^/]+)\/project\/([^/]+)\/settings$/,
    template: (params, resolved) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'projects', label: 'Projects', href: '/dashboard/projects' },
      { 
        id: 'project', 
        label: resolved?.projectName || `Project ${params.projectId}`, 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}` 
      },
      { 
        id: 'project-settings', 
        label: 'Settings', 
        href: `/dashboard/workspace/${params.workspaceId}/project/${params.projectId}/settings` 
      }
    ]
  },
  
  // Workspace settings
  {
    pattern: /^\/dashboard\/workspace-settings\/([^/]+)$/,
    template: (params, resolved) => [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
      { id: 'settings', label: 'Settings', href: '/dashboard/settings' },
      { 
        id: 'workspace-settings', 
        label: resolved?.workspaceName ? `${resolved.workspaceName} Settings` : 'Workspace Settings', 
        href: `/dashboard/workspace-settings/${params.workspaceId}` 
      }
    ]
  }
];

function formatHelpSlug(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatSettingsSection(section: string): string {
  const sectionNames: Record<string, string> = {
    'profile': 'Profile',
    'security': 'Security',
    'notifications': 'Notifications',
    'integrations': 'Integrations',
    'billing': 'Billing',
    'team-management': 'Team Management',
    'appearance': 'Appearance',
    'api': 'API Keys',
    'data': 'Data & Privacy'
  };
  
  return sectionNames[section] || section.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Extract route parameters from pathname
function extractParams(pathname: string, pattern: RegExp): Record<string, string> | null {
  const match = pathname.match(pattern);
  if (!match) return null;
  
  const params: Record<string, string> = {};
  const groups = match.slice(1);
  
  // Map common parameter patterns
  if (pathname.includes('/workspace/')) {
    const workspaceMatch = pathname.match(/\/workspace\/([^/]+)/);
    if (workspaceMatch) params.workspaceId = workspaceMatch[1];
  }
  
  if (pathname.includes('/project/')) {
    const projectMatch = pathname.match(/\/project\/([^/]+)/);
    if (projectMatch) params.projectId = projectMatch[1];
  }
  
  if (pathname.includes('/task/')) {
    const taskMatch = pathname.match(/\/task\/([^/]+)/);
    if (taskMatch) params.taskId = taskMatch[1];
  }
  
  if (pathname.includes('/settings/')) {
    const settingsMatch = pathname.match(/\/settings\/([^/]+)/);
    if (settingsMatch) params.section = settingsMatch[1];
  }
  
  return params;
}

// Hook for resolving dynamic route parameters to human-readable names
function useParamResolver(params: Record<string, string>) {
  // Project name resolution
  const { data: projectData } = useQuery({
    queryKey: ['project', params.projectId],
    queryFn: async () => {
      if (!params.projectId) return null;
      const response = await fetchApi(`/project/${params.projectId}`);
      return response.project;
    },
    enabled: !!params.projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Task title resolution
  const { data: taskData } = useQuery({
    queryKey: ['task', params.taskId],
    queryFn: async () => {
      if (!params.taskId) return null;
      const response = await fetchApi(`/task/${params.taskId}`);
      return response.task;
    },
    enabled: !!params.taskId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Workspace name resolution
  const { data: workspaceData } = useQuery({
    queryKey: ['workspace', params.workspaceId],
    queryFn: async () => {
      if (!params.workspaceId) return null;
      const response = await fetchApi(`/workspace/${params.workspaceId}`);
      return response.workspace;
    },
    enabled: !!params.workspaceId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return useMemo(() => ({
    projectName: projectData?.name,
    taskTitle: taskData?.title,
    workspaceName: workspaceData?.name,
  }), [projectData?.name, taskData?.title, workspaceData?.name]);
}

export function useBreadcrumbs(config: BreadcrumbConfig = {}) {
  const {
    custom,
    includeHome = true,
    includeWorkspace = true,
    maxItems = 5,
    paramResolver,
  } = config;
  
  const location = useLocation();
  const { setBreadcrumbs, state } = useNavigation();
  const { workspace } = useWorkspaceStore();
  
  // Extract route parameters
  const params = useMemo(() => {
    for (const mapping of ROUTE_MAPPINGS) {
      const extractedParams = extractParams(location.pathname, mapping.pattern);
      if (extractedParams) return extractedParams;
    }
    return {};
  }, [location.pathname]);
  
  // Resolve parameter names
  const resolvedParams = useParamResolver(params);
  
  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (custom) {
      return custom.map((item, index, array) => ({
        ...item,
        isCurrentPage: index === array.length - 1,
      }));
    }
    
    let items: BreadcrumbItem[] = [];
    
    // Add home/dashboard link
    if (includeHome && location.pathname !== '/dashboard') {
      items.push({
        id: 'home',
        label: 'Dashboard',
        href: '/dashboard',
      });
    }
    
    // Add workspace context if enabled and available
    if (includeWorkspace && workspace && location.pathname !== '/dashboard') {
      items.push({
        id: 'workspace',
        label: workspace.name,
        href: '/dashboard',
      });
    }
    
    // Find matching route mapping and generate breadcrumbs
    for (const mapping of ROUTE_MAPPINGS) {
      if (mapping.pattern.test(location.pathname)) {
        const routeParams = extractParams(location.pathname, mapping.pattern);
        if (routeParams) {
          const routeBreadcrumbs = mapping.template(routeParams, resolvedParams);
          
          // Merge with existing items, avoiding duplicates
          const existingIds = new Set(items.map(item => item.id));
          const newItems = routeBreadcrumbs.filter(item => !existingIds.has(item.id));
          items = [...items, ...newItems];
        }
        break;
      }
    }
    
    // Limit items and mark current page
    items = items.slice(-maxItems);
    if (items.length > 0) {
      items[items.length - 1].isCurrentPage = true;
    }
    
    return items;
  }, [custom, includeHome, includeWorkspace, maxItems, location.pathname, workspace, resolvedParams]);
  
  // Update breadcrumbs in navigation context
  useEffect(() => {
    setBreadcrumbs(breadcrumbs);
  }, [breadcrumbs, setBreadcrumbs]);
  
  // Return utilities for manual breadcrumb management
  return {
    breadcrumbs,
    setBreadcrumbs,
    addBreadcrumb: (item: BreadcrumbItem) => {
      setBreadcrumbs([...breadcrumbs.filter(b => !b.isCurrentPage), item]);
    },
    updateBreadcrumb: (id: string, updates: Partial<BreadcrumbItem>) => {
      setBreadcrumbs(breadcrumbs.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ));
    },
    removeBreadcrumb: (id: string) => {
      setBreadcrumbs(breadcrumbs.filter(item => item.id !== id));
    },
  };
}

export default useBreadcrumbs;