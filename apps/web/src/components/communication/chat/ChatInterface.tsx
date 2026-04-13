import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MessageInput from './MessageInput';
import { ChatMessageList } from './ChatMessageList';
import { ChatSidebar } from './ChatSidebar';
import { TypingIndicator } from './TypingIndicator';
import { useChat as useChatService } from '../../../hooks/useChat';
import { ChatProvider } from '../../../providers/ChatProvider';
import { Message, MessageUser, Channel } from '../../../types/chat';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  workspaceId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isOpen,
  onClose,
  userId,
  workspaceId,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isDetached, setIsDetached] = useState(false);
  const [typingUsers, setTypingUsers] = useState<MessageUser[]>([]);
  
  const {
    messages,
    channels,
    sendMessage,
    addReaction,
    removeReaction,
    isLoading,
    error,
    setTypingStatus,
  } = useChatService(workspaceId, userId);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Implement search functionality
      } else if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        // Implement channel switcher
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle typing status updates
  useEffect(() => {
    const typingTimeout = setTimeout(() => {
      setTypingUsers((prev) => prev.filter(user => user.id !== userId));
    }, 3000);

    return () => clearTimeout(typingTimeout);
  }, [typingUsers, userId]);

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!selectedChannel) return;
    await sendMessage(selectedChannel.id, content, attachments);
  };

  const handleTyping = () => {
    if (!selectedChannel) return;
    setTypingStatus(selectedChannel.id, true);
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <ChatProvider workspaceId={workspaceId}>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed ${
            isDetached ? 'right-4 bottom-4' : 'inset-0'
          } bg-background z-50 flex`}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex w-full h-full overflow-hidden rounded-lg shadow-xl">
            <ChatSidebar
              channels={channels}
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
              className="w-64 border-r"
            />
            
            <div className="flex flex-col flex-1">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                  {selectedChannel?.name || 'Select a channel'}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsDetached(!isDetached)}
                    className="p-2 rounded hover:bg-accent"
                  >
                    {isDetached ? 'Dock' : 'Detach'}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded hover:bg-accent"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-hidden">
                {selectedChannel ? (
                  <>
                    <ChatMessageList
                      messages={messages}
                      onReaction={addReaction}
                      onRemoveReaction={removeReaction}
                      isLoading={isLoading}
                    />
                    <TypingIndicator users={typingUsers} />
                    <MessageInput
                      onSend={(content, files, mentions) => {
                        if (!selectedChannel) return;
                        sendMessage(selectedChannel.id, content, files);
                      }}
                      placeholder={selectedChannel ? `Message #${selectedChannel.name}` : 'Type a message...'}
                      disabled={!selectedChannel}
                      // Optionally pass teamMembers, replyingTo, etc. if available
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a channel to start chatting
                  </div>
                )}
              </div>

              {error && (
                <div className="p-2 text-sm text-red-500 bg-red-100">
                  {error}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
      </ChatProvider>
  );
}; 

  export default ChatInterface; 