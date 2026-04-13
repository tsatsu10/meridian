import React from 'react';
import { Hash, Lock, Users, Settings, Bell } from 'lucide-react';
import { Button } from '../../ui/button';
import { Tooltip } from '../../ui/tooltip';
import { Channel } from '../../../services/chatService';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  channel: Channel | null;
  onToggleMute?: () => void;
  onOpenSettings?: () => void;
  className?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channel,
  onToggleMute,
  onOpenSettings,
  className,
}) => {
  if (!channel) return null;

  return (
    <motion.div
      className={`border-b border-border/50 p-4 ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <motion.div
          className="flex items-center space-x-3"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="flex items-center space-x-2">
            {channel.type === 'private' ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Hash className="h-4 w-4 text-muted-foreground" />
            )}
            <motion.span
              className="font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {channel.name}
            </motion.span>
          </div>
          {channel.description && (
            <motion.span
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              • {channel.description}
            </motion.span>
          )}
          <motion.div
            className="flex items-center space-x-1 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Users className="h-4 w-4" />
            <span>{channel.memberCount}</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex items-center space-x-2"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Tooltip content="Toggle notifications">
            <Button variant="ghost" size="icon" onClick={onToggleMute}>
              <Bell className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content="Channel settings">
            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
            </Button>
          </Tooltip>
        </motion.div>
      </div>
    </motion.div>
  );
}; 