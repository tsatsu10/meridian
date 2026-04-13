/**
 * 🎨 Widget Registry
 * 
 * Central registry mapping widget component IDs to actual React components
 */

import { lazy } from 'react';

import { OKRWidget } from '@/components/goals/okr-widget';
import { ChatWidget } from '@/components/chat/chat-widget';
import { UnsplashPhotoWidget } from '@/components/widgets/unsplash-photo-widget';
import { DiceBearAvatarWidget } from '@/components/widgets/dicebear-avatar-widget';

// Lazy load heavy widgets
const SkillMatrixWidget = lazy(() => import('@/components/team/skill-matrix-widget').then(m => ({ default: m.SkillMatrixWidget })));
const MoodAnalyticsWidget = lazy(() => import('@/components/team/mood-analytics-widget').then(m => ({ default: m.MoodAnalyticsWidget })));
const SecurityDashboardWidget = lazy(() => import('@/components/dashboard/security/security-dashboard-widget').then(m => ({ default: m.SecurityDashboardWidget })));
const HealthDashboardWidget = lazy(() => import('@/components/dashboard/health-dashboard-widget').then(m => ({ default: m.HealthDashboardWidget })));

export interface WidgetDefinition {
  id: string;
  component: React.ComponentType<any>;
  displayName: string;
  category: string;
  description: string;
  defaultConfig?: any;
  permissions?: string[];
  isLazyLoaded?: boolean;
}

/**
 * Widget Registry - Maps component IDs to React components
 */
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // Goals Widget
  'okr-widget': {
    id: 'okr-widget',
    component: OKRWidget,
    displayName: 'OKR Tracker',
    category: 'Goals',
    description: 'Objectives and Key Results',
    defaultConfig: { period: 'quarter' },
    permissions: ['canViewOKRs'],
  },
  
  // Communication Widget
  'chat-widget': {
    id: 'chat-widget',
    component: ChatWidget,
    displayName: 'Team Chat',
    category: 'Communication',
    description: 'Team chat and messages',
    defaultConfig: { showUnread: true, limit: 10 },
    permissions: ['canViewChat'],
  },
  
  // Team Widgets (Lazy Loaded)
  'skill-matrix-widget': {
    id: 'skill-matrix-widget',
    component: SkillMatrixWidget,
    displayName: 'Skill Matrix',
    category: 'Team',
    description: 'Team skill distribution',
    defaultConfig: { showGaps: true },
    permissions: ['canViewTeam'],
    isLazyLoaded: true,
  },
  'mood-analytics-widget': {
    id: 'mood-analytics-widget',
    component: MoodAnalyticsWidget,
    displayName: 'Mood Analytics',
    category: 'Team',
    description: 'Team morale tracking',
    defaultConfig: { period: 'week', anonymous: true },
    permissions: ['canViewTeam'],
    isLazyLoaded: true,
  },
  
  // Security Widgets (Lazy Loaded)
  'security-dashboard-widget': {
    id: 'security-dashboard-widget',
    component: SecurityDashboardWidget,
    displayName: 'Security Dashboard',
    category: 'Security',
    description: 'Security metrics and alerts',
    defaultConfig: { showAlerts: true },
    permissions: ['canViewSecurity'],
    isLazyLoaded: true,
  },
  'health-dashboard-widget': {
    id: 'health-dashboard-widget',
    component: HealthDashboardWidget,
    displayName: 'Project Health',
    category: 'Projects',
    description: 'Project health indicators',
    defaultConfig: { threshold: 70 },
    permissions: ['canViewProjects'],
    isLazyLoaded: true,
  },
  
  // Content & Media Widgets
  'unsplash-photo-widget': {
    id: 'unsplash-photo-widget',
    component: UnsplashPhotoWidget,
    displayName: 'Unsplash Photo',
    category: 'Content',
    description: 'Beautiful photos from Unsplash - Photo of the day with category selection',
    defaultConfig: { 
      defaultCategory: 'random',
      showControls: true,
    },
    permissions: [], // Available to all users
    isLazyLoaded: false,
  },
  
  // Profile & Personalization Widgets
  'dicebear-avatar-widget': {
    id: 'dicebear-avatar-widget',
    component: DiceBearAvatarWidget,
    displayName: 'My Avatar',
    category: 'Profile',
    description: 'Quick avatar preview and style switcher - Personalize your appearance',
    defaultConfig: {},
    permissions: [], // Available to all users
    isLazyLoaded: false,
  },
};

/**
 * Register a new widget at runtime
 */
export function registerWidget(definition: WidgetDefinition) {
  WIDGET_REGISTRY[definition.id] = definition;
}

/**
 * Get widget component by ID
 */
export function getWidgetComponent(widgetId: string) {
  return WIDGET_REGISTRY[widgetId]?.component || null;
}

/**
 * Get widget definition by ID
 */
export function getWidgetDefinition(widgetId: string) {
  return WIDGET_REGISTRY[widgetId] || null;
}

/**
 * Get all registered widgets
 */
export function getAllWidgets() {
  return Object.values(WIDGET_REGISTRY);
}

/**
 * Check if widget is registered
 */
export function isWidgetRegistered(widgetId: string) {
  return widgetId in WIDGET_REGISTRY;
}

/**
 * Get widgets by category
 */
export function getWidgetsByCategory(category: string) {
  return Object.values(WIDGET_REGISTRY).filter(w => w.category === category);
}

