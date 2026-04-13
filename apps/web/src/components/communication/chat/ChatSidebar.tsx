import React, { useState } from 'react';
import { useChat } from '../../../providers/ChatProvider';
import type { Channel } from '../../../types/chat';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { Plus, Hash, Lock, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatSidebarProps {
  className?: string;
  channels?: Channel[];
  selectedChannel?: Channel | null;
  onSelectChannel?: (channel: Channel) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ className, channels: propChannels, selectedChannel, onSelectChannel }) => {
  const ctx = (() => {
    try {
      return useChat();
    } catch {
      return null;
    }
  })();

  const channels = propChannels ?? ctx?.channels ?? [];
  const activeChannelId = selectedChannel?.id ?? ctx?.activeChannelId ?? null;
  const setActiveChannelId = ctx?.setActiveChannelId;
  const createChannel = ctx?.createChannel ?? (async () => {});
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      await createChannel(newChannelName.trim());
      setNewChannelName('');
      setIsPrivate(false);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  return (
    <motion.div
      className={`w-64 border-r border-border/50 flex flex-col ${className}`}
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="p-4 border-b border-border/50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Channels</h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-4">
                <Input
                  placeholder="Channel name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                />
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="private-channel"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  <label htmlFor="private-channel">Private channel</label>
                </div>
                <Button onClick={handleCreateChannel}>Create Channel</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels"
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      <ScrollArea className="flex-1">
        <AnimatePresence mode="popLayout">
          <motion.div className="p-2 space-y-1">
            {filteredChannels.map((channel) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant={channel.id === activeChannelId ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    if (onSelectChannel) {
                      onSelectChannel(channel);
                    } else if (setActiveChannelId) {
                      setActiveChannelId(channel.id);
                    }
                  }}
                >
                  {channel.type === 'private' ? (
                    <Lock className="h-4 w-4 mr-2" />
                  ) : (
                    <Hash className="h-4 w-4 mr-2" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
}; 