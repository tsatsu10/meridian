// Enhanced Chat Layout - Modern 2025 Design
// Responsive, accessible, and performance-optimized chat interface

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  Settings,
  Users,
  Hash,
  MessageCircle,
  Phone,
  Video,
  Archive,
  Star,
  Pin,
  MoreVertical,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MeridianButton } from '@/components/ui/meridian-button';
import { MeridianCard } from '@/components/ui/meridian-card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ModernChatInterface } from './modern-chat-interface';
import { ModernMessageComposer } from './modern-message-composer';
import useWorkspaceStore from '@/store/workspace';
import { useAuth } from '@/components/providers/unified-context-provider';
import { logger } from "../../lib/logger";

interface EnhancedChatLayoutProps {
  className?: string;
  onStartVideoCall?: (chatId: string) => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface ChatLayoutState {
  selectedChatId: string | null;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  activePanel: 'chat' | 'members' | 'files' | 'settings';
  searchQuery: string;
  showSearch: boolean;
  isMobile: boolean;
}

export function EnhancedChatLayout({
  className,
  onStartVideoCall,
  fullscreen = false,
  onToggleFullscreen
}: EnhancedChatLayoutProps) {
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();
  
  const [state, setState] = useState<ChatLayoutState>({
    selectedChatId: null,
    sidebarCollapsed: false,
    rightPanelCollapsed: true,
    activePanel: 'chat',
    searchQuery: '',
    showSearch: false,
    isMobile: false
  });

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Responsive handling
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 768;
      setState(prev => ({
        ...prev,
        isMobile: mobile,
        sidebarCollapsed: mobile && prev.selectedChatId !== null,
        rightPanelCollapsed: mobile || prev.rightPanelCollapsed
      }));
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Update state helper
  const updateState = useCallback((updates: Partial<ChatLayoutState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSelectChat = (chatId: string) => {
    updateState({
      selectedChatId: chatId,
      sidebarCollapsed: state.isMobile,
      rightPanelCollapsed: false
    });
  };

  const handleSendMessage = (message: string, attachments: any[]) => {
    if (!state.selectedChatId || (!message.trim() && attachments.length === 0)) return;
    
    // Handle message sending logic here
    logger.info("Sending message:");
    setNewMessage('');
  };

  const handleScheduleMessage = (message: string, attachments: any[], scheduleTime: Date) => {
    if (!state.selectedChatId) return;
    
    // Handle scheduled message logic here
    logger.info("Scheduling message:");
    setNewMessage('');
  };

  // Chat actions
  const chatActions = [
    {
      icon: Phone,
      label: 'Voice call',
      onClick: () => state.selectedChatId && onStartVideoCall?.(state.selectedChatId),
      variant: 'ghost' as const
    },
    {
      icon: Video,
      label: 'Video call',
      onClick: () => state.selectedChatId && onStartVideoCall?.(state.selectedChatId),
      variant: 'ghost' as const,
      className: 'text-green-600 hover:text-green-700'
    },
    {
      icon: Users,
      label: 'Members',
      onClick: () => updateState({ 
        activePanel: 'members', 
        rightPanelCollapsed: false 
      }),
      variant: 'ghost' as const,
      active: state.activePanel === 'members' && !state.rightPanelCollapsed
    },
    {
      icon: Archive,
      label: 'Files',
      onClick: () => updateState({ 
        activePanel: 'files', 
        rightPanelCollapsed: false 
      }),
      variant: 'ghost' as const,
      active: state.activePanel === 'files' && !state.rightPanelCollapsed
    }
  ];

  const RightPanel = () => {
    if (state.rightPanelCollapsed || !state.selectedChatId) return null;

    const panelContent = {
      members: (
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Channel Members
          </h3>
          <div className="space-y-3">
            {/* Sample members - replace with real data */}
            {[
              { name: 'Alice Smith', status: 'online', role: 'Admin' },
              { name: 'Bob Johnson', status: 'away', role: 'Member' },
              { name: 'Carol Davis', status: 'offline', role: 'Member' }
            ].map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-meridian-primary-100 dark:bg-meridian-primary-900 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-meridian-primary-700 dark:text-meridian-primary-300">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800",
                    member.status === 'online' && "bg-green-500",
                    member.status === 'away' && "bg-yellow-500",
                    member.status === 'offline' && "bg-slate-400"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {member.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      files: (
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Shared Files
          </h3>
          <div className="space-y-3">
            {/* Sample files - replace with real data */}
            {[
              { name: 'project-timeline.pdf', size: '2.4 MB', date: '2 hours ago' },
              { name: 'design-mockups.zip', size: '15.2 MB', date: '1 day ago' },
              { name: 'meeting-notes.docx', size: '128 KB', date: '3 days ago' }
            ].map((file) => (
              <div key={file.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                  <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {file.size} • {file.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    };

    return (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 320, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {state.activePanel === 'members' ? 'Members' : 'Files'}
          </h3>
          <MeridianButton
            variant="ghost"
            size="icon-sm"
            onClick={() => updateState({ rightPanelCollapsed: true })}
          >
            <X className="w-4 h-4" />
          </MeridianButton>
        </div>
        <ScrollArea className="h-full">
          {panelContent[state.activePanel as keyof typeof panelContent]}
        </ScrollArea>
      </motion.div>
    );
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-white dark:bg-slate-900 relative",
      fullscreen && "fixed inset-0 z-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {state.isMobile && (
            <MeridianButton
              variant="ghost"
              size="icon-sm"
              onClick={() => updateState({ sidebarCollapsed: !state.sidebarCollapsed })}
            >
              <Menu className="w-4 h-4" />
            </MeridianButton>
          )}
          
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Team Chat
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {workspace?.name || 'Workspace'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <MeridianButton
            variant="ghost"
            size="icon-sm"
            onClick={() => updateState({ showSearch: !state.showSearch })}
            className={cn(state.showSearch && "bg-meridian-primary-50 text-meridian-primary-700")}
          >
            <Search className="w-4 h-4" />
          </MeridianButton>

          {/* Chat Actions */}
          {state.selectedChatId && (
            <div className="flex items-center gap-1">
              {chatActions.map((action, index) => (
                <MeridianButton
                  key={index}
                  variant={action.variant}
                  size="icon-sm"
                  onClick={action.onClick}
                  className={cn(
                    action.className,
                    action.active && "bg-meridian-primary-50 text-meridian-primary-700"
                  )}
                  title={action.label}
                >
                  <action.icon className="w-4 h-4" />
                </MeridianButton>
              ))}
            </div>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <MeridianButton
              variant="ghost"
              size="icon-sm"
              onClick={onToggleFullscreen}
            >
              {fullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </MeridianButton>
          )}

          <MeridianButton variant="ghost" size="icon-sm">
            <Settings className="w-4 h-4" />
          </MeridianButton>
        </div>
      </div>

      {/* Global Search */}
      <AnimatePresence>
        {state.showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
          >
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages, channels, and people..."
                  value={state.searchQuery}
                  onChange={(e) => updateState({ searchQuery: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-meridian-primary-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        <ModernChatInterface
          selectedChatId={state.selectedChatId}
          onSelectChat={handleSelectChat}
          onStartVideoCall={onStartVideoCall}
          className="flex-1"
        />
        
        <AnimatePresence>
          <RightPanel />
        </AnimatePresence>
      </div>

      {/* Message Composer */}
      {state.selectedChatId && (
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="p-4">
            <ModernMessageComposer
              value={newMessage}
              onChange={setNewMessage}
              onSend={handleSendMessage}
              onScheduleSend={handleScheduleMessage}
              placeholder={`Message #general`}
              showFormatting={true}
              showAttachments={true}
              showScheduling={true}
              allowVoiceMessage={true}
            />
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {state.isMobile && !state.sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => updateState({ sidebarCollapsed: true })}
          />
        )}
      </AnimatePresence>

      {/* Performance Indicators (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          <Badge variant="secondary" className="text-xs">
            🚀 Enhanced Layout
          </Badge>
          <Badge variant="secondary" className="text-xs">
            📱 {state.isMobile ? 'Mobile' : 'Desktop'}
          </Badge>
        </div>
      )}
    </div>
  );
}