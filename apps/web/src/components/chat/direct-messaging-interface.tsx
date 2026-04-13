// @epic-4.1-direct-messaging: Main direct messaging interface component
// @persona-sarah: PM needs comprehensive direct messaging interface
// @persona-david: Team lead needs efficient team communication tools

"use client"

import React, { useState } from 'react'
import { DirectMessageConversationList } from './direct-message-conversation-list'
import { DirectMessageChat } from './direct-message-chat'
import { NewConversationModal } from './new-conversation-modal'

interface DirectMessagingInterfaceProps {
  className?: string
}

export function DirectMessagingInterface({ className }: DirectMessagingInterfaceProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
  }

  const handleStartNewConversation = () => {
    setShowNewConversationModal(true)
  }

  const handleNewConversationStarted = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    setShowNewConversationModal(false)
  }

  const handleBackToConversations = () => {
    setSelectedConversationId(null)
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Conversation List */}
      <div className={`w-80 border-r ${selectedConversationId ? 'hidden md:block' : 'block'}`}>
        <DirectMessageConversationList
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onStartNewConversation={handleStartNewConversation}
        />
      </div>

      {/* Chat Interface */}
      <div className={`flex-1 ${selectedConversationId ? 'block' : 'hidden md:block'}`}>
        <DirectMessageChat
          conversationId={selectedConversationId}
          onBack={handleBackToConversations}
        />
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onStartConversation={handleNewConversationStarted}
      />
    </div>
  )
} 