import React, { useState } from 'react';
import { format } from 'date-fns';
import { Message, MessageUser } from '../../../types/chat';
import { useAuth } from '../../../hooks/auth';
import { Avatar, AvatarImage, AvatarFallback } from '../../ui/avatar';
import { EmojiPicker } from './EmojiPicker';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { SmileIcon } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

interface Message {
  id: string;
  content: string;
  type: 'text' | 'file';
  createdAt: string;
  userId: string;
  user: MessageUser;
  reactions: Array<{
    emoji: string;
    user: MessageUser;
  }>;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onReaction,
  onRemoveReaction,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user } = useAuth();
  const isOwnMessage = message.userId === user?.id;

  const handleReaction = (emoji: string) => {
    const hasReacted = message.reactions.some(
      (r) => r.emoji === emoji && r.user.id === user?.id
    );

    if (hasReacted) {
      onRemoveReaction(message.id, emoji);
    } else {
      onReaction(message.id, emoji);
    }
    setShowEmojiPicker(false);
  };

  const renderContent = () => {
    if (message.type === 'file') {
      const fileUrl = message.content;
      const fileName = fileUrl.split('/').pop() || 'File';
      const fileType = fileName.split('.').pop()?.toLowerCase();

      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType || '')) {
        return (
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-md rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(fileUrl, '_blank')}
          />
        );
      } else if (['mp4', 'webm'].includes(fileType || '')) {
        return (
          <video
            src={fileUrl}
            controls
            className="max-w-md rounded-lg"
          />
        );
      } else {
        return (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {fileName}
          </a>
        );
      }
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  return (
    <motion.div
      className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Avatar>
        <AvatarImage src={message.user.avatar} alt={message.user.name} />
        <AvatarFallback>{message.user.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
        </div>
        <motion.div
          className={`relative group ${
            isOwnMessage ? 'bg-primary/10' : 'bg-muted'
          } rounded-lg p-3`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
          <motion.div
            className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100"
            initial={false}
            animate={{ scale: showEmojiPicker ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-background shadow-sm"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SmileIcon className="h-4 w-4" />
            </Button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  className="absolute right-0 top-full mt-1"
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                >
                  <EmojiPicker onSelect={handleReaction} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
        {message.reactions.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-1 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Object.entries(
              message.reactions.reduce((acc, { emoji, user }) => {
                acc[emoji] = acc[emoji] || { count: 0, users: [] };
                acc[emoji].count++;
                acc[emoji].users.push(user.name);
                return acc;
              }, {} as Record<string, { count: number; users: string[] }>)
            ).map(([emoji, { count, users }]) => (
              <TooltipProvider key={emoji}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                        users.includes(user?.name || '')
                          ? 'bg-primary/20'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => handleReaction(emoji)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>{emoji}</span>
                      <span className="text-xs">{count}</span>
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {users.join(', ')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}; 