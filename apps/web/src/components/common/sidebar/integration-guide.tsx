// Integration Guide: Meridian Modern Sidebar
// This shows how to integrate the ModernSidebar with your existing Meridian structure

import React, { useState } from 'react';
import { ModernSidebar } from './modern-sidebar';
import useWorkspaceStore from '@/store/workspace';
import useProjectStore from '@/store/project';
import useGetProjects from '@/hooks/queries/project/use-get-projects';
import { useUserPreferencesStore } from '@/store/user-preferences';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { 
  Home,
  FolderOpen, 
  Users,
  BarChart3,
  Settings,
  CheckSquare,
  Calendar,
  Bell,
  HelpCircle,
  Plus,
  LayoutDashboard
} from 'lucide-react';

// Convert your existing navigation to the new format
export const useMeridianSidebarSections = () => {
  const { workspace } = useWorkspaceStore();
  const { project } = useProjectStore();
  const { data: projects } = useGetProjects({ 
    workspaceId: workspace?.id || '' 
  });
  const location = useLocation();
  const navigate = useNavigate();

  // Helper function to create navigation handlers
  const createNavHandler = (href: string) => () => {
    navigate({ to: href });
  };

  return [
    // Main Navigation
    {
      id: 'main',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: Home,
          href: '/dashboard',
          isActive: location.pathname === '/dashboard',
          onClick: createNavHandler('/dashboard'),
        },
        {
          id: 'all-tasks',
          label: 'All Tasks',
          icon: CheckSquare,
          href: '/dashboard/all-tasks',
          isActive: location.pathname === '/dashboard/all-tasks',
          onClick: createNavHandler('/dashboard/all-tasks'),
        },
        {
          id: 'projects-overview',
          label: 'Projects',
          icon: FolderOpen,
          href: '/dashboard/projects',
          isActive: location.pathname === '/dashboard/projects',
          onClick: createNavHandler('/dashboard/projects'),
        },
        {
          id: 'teams-global',
          label: 'Teams',
          icon: Users,
          href: '/dashboard/teams',
          isActive: location.pathname === '/dashboard/teams',
          onClick: createNavHandler('/dashboard/teams'),
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: BarChart3,
          href: '/dashboard/analytics',
          isActive: location.pathname === '/dashboard/analytics',
          onClick: createNavHandler('/dashboard/analytics'),
        }
      ]
    },

    // Current Workspace
    ...(workspace ? [{
      id: 'workspace',
      title: workspace.name,
      items: [
        // Projects in this workspace
        ...(projects?.map(proj => ({
          id: `project-${proj.id}`,
          label: proj.name,
          icon: FolderOpen, // You can use proj.icon here
          href: `/dashboard/workspace/${workspace.id}/project/${proj.id}`,
          isActive: project?.id === proj.id,
          onClick: createNavHandler(`/dashboard/workspace/${workspace.id}/project/${proj.id}`),
          children: [
            {
              id: `project-${proj.id}-overview`,
              label: 'Overview',
              icon: Home,
              href: `/dashboard/workspace/${workspace.id}/project/${proj.id}`,
              onClick: createNavHandler(`/dashboard/workspace/${workspace.id}/project/${proj.id}`),
            },
            {
              id: `project-${proj.id}-board`,
              label: 'Board',
              icon: LayoutDashboard,
              href: `/dashboard/workspace/${workspace.id}/project/${proj.id}/board`,
              onClick: createNavHandler(`/dashboard/workspace/${workspace.id}/project/${proj.id}/board`),
            },
            {
              id: `project-${proj.id}-timeline`,
              label: 'Timeline',
              icon: Calendar,
              href: `/dashboard/workspace/${workspace.id}/project/${proj.id}/timeline`,
              onClick: createNavHandler(`/dashboard/workspace/${workspace.id}/project/${proj.id}/timeline`),
            },
            {
              id: `project-${proj.id}-teams`,
              label: 'Teams',
              icon: Users,
              href: `/dashboard/workspace/${workspace.id}/project/${proj.id}/teams`,
              onClick: createNavHandler(`/dashboard/workspace/${workspace.id}/project/${proj.id}/teams`),
            }
          ]
        })) || []),

        // Workspace actions
        {
          id: 'workspace-members',
          label: 'Members',
          icon: Users,
          href: `/dashboard/teams/${workspace.id}/members`,
          onClick: createNavHandler(`/dashboard/teams/${workspace.id}/members`),
        }
      ]
    }] : []),

    // Administration
    {
      id: 'admin',
      title: 'Administration',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          href: '/dashboard/settings',
          isActive: location.pathname.startsWith('/dashboard/settings'),
          onClick: createNavHandler('/dashboard/settings'),
        },
        {
          id: 'help',
          label: 'Help',
          icon: HelpCircle,
          href: '/dashboard/help',
          onClick: createNavHandler('/dashboard/help'),
        }
      ]
    }
  ];
};

// Main Layout Component
export const MeridianLayoutWithModernSidebar: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { isSidebarOpened, setIsSidebarOpened } = useUserPreferencesStore();
  const { user } = useAuth();
  const sections = useMeridianSidebarSections();

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gradient-dark">
      <ModernSidebar
        sections={sections}
        isOpen={isSidebarOpened}
        onToggle={setIsSidebarOpened}
        userName={user?.name || "User"}
        userEmail={user?.email || "user@meridian.app"}
        className="transition-all duration-300"
      />
      
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

// Integration Steps:
// 
// 1. Install dependencies:
//    npm install framer-motion
//
// 2. Replace your existing sidebar in layout:
//    <MeridianLayoutWithModernSidebar>
//      {/* Your app content */}
//    </MeridianLayoutWithModernSidebar>
//
// 3. Update your user preferences store to include sidebar state
//
// 4. Add navigation handlers:
//    const handleNavigation = (item) => {
//      navigate(item.href);
//    };
//
// 5. Customize the design tokens in your CSS:
//    :root {
//      --sidebar-bg: your-brand-gradient;
//      --sidebar-accent: your-brand-color;
//    }

export default MeridianLayoutWithModernSidebar; 