// Phase 1.3: Lazy Loading Implementation for Bundle Size Reduction
// Target: Reduce initial bundle by 50%
import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component for lazy-loaded components
const LazyLoadingFallback = ({ componentName }: { componentName: string }) => (
  <div className="flex items-center justify-center p-4 space-x-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span className="text-sm text-muted-foreground">Loading {componentName}...</span>
  </div>
);

// Priority 1: Lazy Loading Implementation
const LazyAdvancedMessageSearch = lazy(() => 
  import('./advanced-message-search').then(module => ({ 
    default: module.AdvancedMessageSearch 
  }))
);

const LazyChatModals = lazy(() => 
  import('./chat-modals').then(module => ({ 
    default: module.ChatModals 
  }))
);

const LazyFilePreview = lazy(() => 
  import('./file-preview').then(module => ({ 
    default: module.FilePreview 
  }))
);

const LazyVideoCall = lazy(() => 
  import('./video-call').then(module => ({ 
    default: module.VideoCall 
  }))
);

const LazyAdvancedSettings = lazy(() => 
  import('./advanced-settings').then(module => ({ 
    default: module.AdvancedSettings 
  }))
);

const LazyMessageAnalytics = lazy(() => 
  import('./message-analytics').then(module => ({ 
    default: module.MessageAnalytics 
  }))
);

const LazyWorkflowAutomation = lazy(() => 
  import('./workflow-automation').then(module => ({ 
    default: module.WorkflowAutomation 
  }))
);

const LazyTaskIntegration = lazy(() => 
  import('./task-integration').then(module => ({ 
    default: module.TaskIntegration 
  }))
);

const LazyFileManagement = lazy(() => 
  import('./file-management').then(module => ({ 
    default: module.FileManagement 
  }))
);

const LazyUserPresence = lazy(() => 
  import('./user-presence').then(module => ({ 
    default: module.UserPresence 
  }))
);

// Wrapper components with Suspense
export const AdvancedMessageSearch = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Message Search" />}>
    <LazyAdvancedMessageSearch {...props} />
  </Suspense>
);

export const ChatModals = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Chat Modals" />}>
    <LazyChatModals {...props} />
  </Suspense>
);

export const FilePreview = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="File Preview" />}>
    <LazyFilePreview {...props} />
  </Suspense>
);

export const VideoCall = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Video Call" />}>
    <LazyVideoCall {...props} />
  </Suspense>
);

export const AdvancedSettings = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Advanced Settings" />}>
    <LazyAdvancedSettings {...props} />
  </Suspense>
);

export const MessageAnalytics = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Message Analytics" />}>
    <LazyMessageAnalytics {...props} />
  </Suspense>
);

export const WorkflowAutomation = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Workflow Automation" />}>
    <LazyWorkflowAutomation {...props} />
  </Suspense>
);

export const TaskIntegration = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="Task Integration" />}>
    <LazyTaskIntegration {...props} />
  </Suspense>
);

export const FileManagement = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="File Management" />}>
    <LazyFileManagement {...props} />
  </Suspense>
);

export const UserPresence = (props: any) => (
  <Suspense fallback={<LazyLoadingFallback componentName="User Presence" />}>
    <LazyUserPresence {...props} />
  </Suspense>
);

// Bundle analysis utility
export const getBundleInfo = () => {
  const bundleInfo = {
    lazyComponents: [
      'AdvancedMessageSearch',
      'ChatModals', 
      'FilePreview',
      'VideoCall',
      'AdvancedSettings',
      'MessageAnalytics',
      'WorkflowAutomation',
      'TaskIntegration',
      'FileManagement',
      'UserPresence'
    ],
    estimatedSizeReduction: '50%',
    targetBundleSize: '<500KB',
    implementation: 'React.lazy with Suspense'
  };
  
  return bundleInfo;
};

// Preload utility for critical components
export const preloadCriticalComponents = () => {
  // Preload components that are likely to be used soon
  const criticalComponents = [
    () => import('./advanced-message-search'),
    () => import('./chat-modals'),
    () => import('./file-preview')
  ];
  
  criticalComponents.forEach(importFn => {
    importFn().catch(console.error);
  });
};

// Dynamic import utility for conditional loading
export const loadComponentOnDemand = async (componentName: string) => {
  const componentMap: Record<string, () => Promise<any>> = {
    'AdvancedMessageSearch': () => import('./advanced-message-search'),
    'ChatModals': () => import('./chat-modals'),
    'FilePreview': () => import('./file-preview'),
    'VideoCall': () => import('./video-call'),
    'AdvancedSettings': () => import('./advanced-settings'),
    'MessageAnalytics': () => import('./message-analytics'),
    'WorkflowAutomation': () => import('./workflow-automation'),
    'TaskIntegration': () => import('./task-integration'),
    'FileManagement': () => import('./file-management'),
    'UserPresence': () => import('./user-presence')
  };
  
  const importFn = componentMap[componentName];
  if (!importFn) {
    throw new Error(`Component ${componentName} not found in lazy loading map`);
  }
  
  return importFn();
}; 