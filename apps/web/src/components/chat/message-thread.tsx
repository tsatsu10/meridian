/**
 * Message Thread Component
 * Threaded conversations for messages
 * Phase 4.3 - Enhanced Chat Features
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Send,
  X,
  Check,
  MoreVertical,
  Pin,
  Smile,
  Mic,
  Image as ImageIcon,
  AtSign,
} from 'lucide-react';

interface Message {
  id: string;
  userId: string;
  content: string;
  contentHtml?: string;
  messageType: string;
  voiceUrl?: string;
  voiceDuration?: number;
  attachments: any[];
  mentions: string[];
  reactions: Record<string, string[]>;
  isEdited: boolean;
  createdAt: string;
}

interface Thread {
  id: string;
  parentMessageId: string;
  title: string | null;
  messageCount: number;
  participantCount: number;
  lastMessageAt: string | null;
  isResolved: boolean;
  messages: Message[];
}

interface MessageThreadProps {
  threadId: string;
  userId: string;
  displayName: string;
  onClose: () => void;
}

export function MessageThread({
  threadId,
  userId,
  displayName,
  onClose,
}: MessageThreadProps) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThread();
  }, [threadId]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  const loadThread = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chat/thread/${threadId}`);
      const data = await response.json();
      setThread(data.thread);
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/chat/thread/${threadId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          content: newMessage,
          messageType: 'text',
        }),
      });

      const data = await response.json();

      // Add message to thread
      if (thread) {
        setThread({
          ...thread,
          messages: [...thread.messages, data.message],
          messageCount: thread.messageCount + 1,
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async () => {
    try {
      const response = await fetch(`/api/chat/thread/${threadId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setThread(data.thread);
    } catch (error) {
      console.error('Failed to resolve thread:', error);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch('/api/chat/reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, userId, emoji }),
      });

      // Update local state
      if (thread) {
        const updatedMessages = thread.messages.map(msg => {
          if (msg.id === messageId) {
            const reactions = { ...msg.reactions };
            if (!reactions[emoji]) {
              reactions[emoji] = [];
            }
            if (!reactions[emoji].includes(userId)) {
              reactions[emoji].push(userId);
            }
            return { ...msg, reactions };
          }
          return msg;
        });

        setThread({ ...thread, messages: updatedMessages });
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Card className="fixed right-4 bottom-4 w-96 h-[500px]">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading thread...</p>
        </CardContent>
      </Card>
    );
  }

  if (!thread) {
    return (
      <Card className="fixed right-4 bottom-4 w-96 h-[500px]">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500">Thread not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed right-4 bottom-4 w-96 h-[500px] flex flex-col shadow-xl">
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium">Thread</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              {thread.messageCount} {thread.messageCount === 1 ? 'reply' : 'replies'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {!thread.isResolved && (
              <Button
                onClick={handleResolve}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Resolve
              </Button>
            )}

            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {thread.isResolved && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700">
            <Check className="w-3 h-3 inline mr-1" />
            This thread has been resolved
          </div>
        )}
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.messages.map((message) => (
          <div key={message.id} className="flex gap-2">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-white">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Message Content */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{displayName}</span>
                <span className="text-xs text-gray-500">
                  {formatTime(message.createdAt)}
                </span>
                {message.isEdited && (
                  <span className="text-xs text-gray-400">(edited)</span>
                )}
              </div>

              {/* Message Text */}
              <div
                className="text-sm text-gray-700 mt-0.5"
                dangerouslySetInnerHTML={{ __html: message.contentHtml || message.content }}
              />

              {/* Voice Message */}
              {message.messageType === 'voice' && message.voiceUrl && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <audio src={message.voiceUrl} controls className="w-full" />
                  {message.voiceDuration && (
                    <p className="text-xs text-gray-600 mt-1">
                      Duration: {Math.floor(message.voiceDuration / 60)}:
                      {(message.voiceDuration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                </div>
              )}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((attachment: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2 text-xs"
                    >
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                      <span className="flex-1 truncate">{attachment.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reactions */}
              {Object.keys(message.reactions || {}).length > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  {Object.entries(message.reactions).map(([emoji, users]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(message.id, emoji)}
                      className="bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                    >
                      <span>{emoji}</span>
                      <span className="text-gray-600">{users.length}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => handleReaction(message.id, '👍')}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Add reaction"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      {!thread.isResolved && (
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Reply..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sending}
              className="flex-1"
            />

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mt-2">
            <button
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Add attachment"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Record voice"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Mention user"
            >
              <AtSign className="w-4 h-4" />
            </button>
            <button
              className="text-gray-400 hover:text-gray-600 p-1"
              title="Add emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

