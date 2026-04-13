import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Paperclip, Send } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { motion, AnimatePresence } from 'framer-motion';

// Icon wrappers to maintain consistent naming
const PaperClipIcon = Paperclip as React.FC<{ className?: string }>;
const SendIcon = Send as React.FC<{ className?: string }>;

interface ChatInputProps {
  onSendMessage: (content: string, type: 'text' | 'file') => void;
  onTyping: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debouncedTyping = useDebounce(onTyping, 1000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim(), 'text');
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const { url } = await response.json();
      onSendMessage(url, 'file');
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (message.trim()) {
      debouncedTyping();
    }
  }, [message, debouncedTyping]);

  return (
    <motion.div
      className="p-4 border-t border-border/50"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none pr-12"
            disabled={disabled}
          />
          <motion.div
            className="absolute right-2 bottom-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,video/*,application/pdf"
              disabled={disabled || isUploading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
            >
              <PaperClipIcon className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            type="submit"
            disabled={!message.trim() || disabled}
            className="h-10"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </motion.div>
      </form>
      <AnimatePresence>
        {isUploading && (
          <motion.div
            className="text-sm text-muted-foreground mt-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            Uploading file...
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}; 