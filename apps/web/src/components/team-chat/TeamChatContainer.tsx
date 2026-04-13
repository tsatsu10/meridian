// Team Chat Container - Main Orchestrator Component
// Coordinates chat functionality and provides context to child components

import React from 'react';
import { ChatProvider } from './context/ChatContext';
import { ChatLayout } from './layouts/ChatLayout';
import type { TeamChatProps } from './types';

/**
 * TeamChatContainer - Main entry point for team chat
 * 
 * Provides chat context and renders the complete chat interface.
 * Uses ChatProvider for state management and ChatLayout for UI structure.
 * 
 * @example
 * ```tsx
 * <TeamChatContainer 
 *   teamId="team-123" 
 *   teamName="Engineering Team"
 * />
 * ```
 */
export function TeamChatContainer({ teamId, teamName, className, onClose }: TeamChatProps) {
  return (
    <ChatProvider teamId={teamId} teamName={teamName}>
      <ChatLayout 
        teamId={teamId}
        teamName={teamName}
        className={className}
        onClose={onClose}
      />
    </ChatProvider>
  );
}

export default TeamChatContainer;

