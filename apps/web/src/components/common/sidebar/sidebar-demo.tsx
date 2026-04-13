"use client";

import React, { useState } from 'react';
import { ModernSidebar } from './modern-sidebar';
import { 
  Home,
  FolderOpen,
  Users,
  BarChart3,
  Settings,
  Bell,
  CheckSquare,
  Calendar,
  MessageSquare,
  Archive,
  Star,
  Trash2,
  HelpCircle,
  FileText,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Database,
  Code,
  Palette
} from 'lucide-react';

// Sample sidebar configuration
const sampleSections = [
  {
    id: 'main',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: Home,
        href: '/dashboard',
        isActive: true,
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        href: '/notifications',
        badge: 3,
      }
    ]
  },
  {
    id: 'workspace',
    title: 'Workspace',
    items: [
      {
        id: 'projects',
        label: 'Projects',
        icon: FolderOpen,
        href: '/projects',
        children: [
          { id: 'active-projects', label: 'Active Projects', icon: Target, href: '/projects/active' },
          { id: 'archived-projects', label: 'Archived', icon: Archive, href: '/projects/archived' },
          { id: 'starred-projects', label: 'Starred', icon: Star, href: '/projects/starred' }
        ]
      },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: CheckSquare,
        href: '/tasks',
        badge: 12,
        children: [
          { id: 'my-tasks', label: 'My Tasks', icon: CheckSquare, href: '/tasks/mine', badge: 5 },
          { id: 'assigned-tasks', label: 'Assigned to Me', icon: Target, href: '/tasks/assigned', badge: 7 },
          { id: 'completed-tasks', label: 'Completed', icon: CheckSquare, href: '/tasks/completed' }
        ]
      },
      {
        id: 'calendar',
        label: 'Calendar',
        icon: Calendar,
        href: '/calendar'
      },
      {
        id: 'teams',
        label: 'Teams',
        icon: Users,
        href: '/teams',
        children: [
          { id: 'my-teams', label: 'My Teams', icon: Users, href: '/teams/mine' },
          { id: 'team-directory', label: 'Directory', icon: FileText, href: '/teams/directory' }
        ]
      }
    ]
  },
  {
    id: 'insights',
    title: 'Insights',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        icon: BarChart3,
        href: '/analytics',
        children: [
          { id: 'performance', label: 'Performance', icon: TrendingUp, href: '/analytics/performance' },
          { id: 'reports', label: 'Reports', icon: FileText, href: '/analytics/reports' },
          { id: 'insights', label: 'Insights', icon: Zap, href: '/analytics/insights' }
        ]
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: MessageSquare,
        href: '/messages',
        badge: 2
      }
    ]
  },
  {
    id: 'tools',
    title: 'Tools',
    items: [
      {
        id: 'integrations',
        label: 'Integrations',
        icon: Code,
        href: '/integrations'
      },
      {
        id: 'automation',
        label: 'Automation',
        icon: Zap,
        href: '/automation'
      },
      {
        id: 'api',
        label: 'API & Webhooks',
        icon: Database,
        href: '/api'
      }
    ]
  },
  {
    id: 'admin',
    title: 'Administration',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        href: '/settings',
        children: [
          { id: 'general-settings', label: 'General', icon: Settings, href: '/settings/general' },
          { id: 'security-settings', label: 'Security', icon: Shield, href: '/settings/security' },
          { id: 'appearance-settings', label: 'Appearance', icon: Palette, href: '/settings/appearance' }
        ]
      },
      {
        id: 'help',
        label: 'Help & Support',
        icon: HelpCircle,
        href: '/help'
      },
      {
        id: 'trash',
        label: 'Trash',
        icon: Trash2,
        href: '/trash'
      }
    ]
  }
];

// Demo Component
export const SidebarDemo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: any) => {// Handle navigation here
  };

  // Update sections with click handlers
  const sectionsWithHandlers = sampleSections.map(section => ({
    ...section,
    items: section.items.map(item => ({
      ...item,
      onClick: () => handleItemClick(item),
      children: item.children?.map(child => ({
        ...child,
        onClick: () => handleItemClick(child)
      }))
    }))
  })) as any; // Type assertion to handle complex nested typing

  return (
    <div className="h-screen flex bg-gray-100">
      <ModernSidebar
        sections={sectionsWithHandlers}
        isOpen={isOpen}
        onToggle={handleToggle}
        userName="Sarah Chen"
        userEmail="sarah@meridian.app"
      />
      
      {/* Main Content Area */}
      <div className="flex-1 p-8 ml-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Modern Sidebar Demo
          </h1>
          
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🎨 Features Showcase
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Smooth animations with Framer Motion</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Responsive design (desktop & mobile)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-gray-700">Collapsible with icon-only mode</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-gray-700">Smart tooltips with positioning</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Nested expandable menus</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700">Badge notifications</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="text-gray-700">Active state indicators</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                  <span className="text-gray-700">WCAG 2.2 AA accessibility</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              ⚡ Interactive Controls
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={handleToggle}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Toggle Sidebar ({isOpen ? 'Open' : 'Closed'})
              </button>
              
              <div className="text-gray-600">
                <p>Try these interactions:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Click the toggle button to collapse/expand</li>
                  <li>Hover over icons when collapsed to see tooltips</li>
                  <li>Click on menu items with children to expand them</li>
                  <li>Notice the smooth animations and micro-interactions</li>
                  <li>Check the responsive behavior by resizing your window</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarDemo; 