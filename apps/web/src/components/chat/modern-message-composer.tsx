// Modern Message Composer - 2025 Design
// Advanced message input with rich features

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
  Link,
  Image,
  File,
  Mic,
  Calendar,
  X,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MeridianButton } from '@/components/ui/meridian-button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatFileSize } from '@/lib/utils/file';

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  preview?: string;
  file: File;
}

interface ModernMessageComposerProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string, attachments: Attachment[]) => void;
  onScheduleSend?: (message: string, attachments: Attachment[], scheduleTime: Date) => void;
  disabled?: boolean;
  channelName?: string;
  className?: string;
  maxLength?: number;
  showFormatting?: boolean;
  showAttachments?: boolean;
  showScheduling?: boolean;
  showMentions?: boolean;
  allowVoiceMessage?: boolean;
}

export function ModernMessageComposer({
  placeholder = 'Type a message...',
  value,
  onChange,
  onSend,
  onScheduleSend,
  disabled = false,
  channelName,
  className,
  maxLength = 2000,
  showFormatting = true,
  showAttachments = true,
  showScheduling = false,
  showMentions = true,
  allowVoiceMessage = false
}: ModernMessageComposerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout>();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }

    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);

  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || disabled) return;
    onSend(value, attachments);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }

    // Format shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          insertFormatting('**', '**');
          break;
        case 'i':
          e.preventDefault();
          insertFormatting('*', '*');
          break;
        case 'k':
          e.preventDefault();
          insertFormatting('[', '](url)');
          break;
      }
    }
  };

  const insertFormatting = (before: string, after: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newValue = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newValue);

    // Set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + before.length + selectedText.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleFileUpload = (files: FileList) => {
    const newAttachments: Attachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 25 * 1024 * 1024) { // 25MB limit
        alert(`File ${file.name} is too large. Maximum size is 25MB.`);
        continue;
      }

      const attachment: Attachment = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        file: file
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachment]);
        };
        reader.readAsDataURL(file);
      } else {
        newAttachments.push(attachment);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  // formatFileSize now imported from shared utilities

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSend = (value.trim() || attachments.length > 0) && !disabled;

  return (
    <div className={cn("relative", className)}>
      {/* Drag Overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-meridian-primary-50/80 dark:bg-meridian-primary-900/20 border-2 border-dashed border-meridian-primary-300 rounded-xl flex items-center justify-center z-10 backdrop-blur-sm"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-center">
              <Paperclip className="w-8 h-8 text-meridian-primary-600 mx-auto mb-2" />
              <p className="font-medium text-meridian-primary-700 dark:text-meridian-primary-300">
                Drop files here to attach
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {attachments.length} file{attachments.length !== 1 ? 's' : ''} attached
              </span>
              <MeridianButton
                variant="ghost"
                size="icon-sm"
                onClick={() => setAttachments([])}
                className="h-6 w-6"
              >
                <X className="w-3 h-3" />
              </MeridianButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachments.map((attachment) => (
                <motion.div
                  key={attachment.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600"
                >
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-meridian-primary-100 dark:bg-meridian-primary-900 rounded flex items-center justify-center">
                      <File className="w-4 h-4 text-meridian-primary-600 dark:text-meridian-primary-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {attachment.size}
                    </p>
                  </div>
                  <MeridianButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeAttachment(attachment.id)}
                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </MeridianButton>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Recording voice message
                </span>
                <Badge variant="secondary" className="text-xs">
                  {formatTime(recordingTime)}
                </Badge>
              </div>
              <div className="flex gap-2">
                <MeridianButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRecording(false)}
                  className="text-red-600 hover:text-red-700"
                >
                  Cancel
                </MeridianButton>
                <MeridianButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Handle voice message send
                    setIsRecording(false);
                  }}
                  className="text-green-600 hover:text-green-700"
                >
                  Send
                </MeridianButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Composer */}
      <div className={cn(
        "relative rounded-xl border bg-white dark:bg-slate-800 transition-all",
        "border-slate-200 dark:border-slate-700",
        "focus-within:border-meridian-primary-300 dark:focus-within:border-meridian-primary-700",
        "focus-within:ring-2 focus-within:ring-meridian-primary-100 dark:focus-within:ring-meridian-primary-900/50"
      )}>
        {/* Format Toolbar */}
        <AnimatePresence>
          {showFormatToolbar && showFormatting && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => insertFormatting('**', '**')}
                    >
                      <Bold className="w-3 h-3" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Bold (Ctrl+B)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => insertFormatting('*', '*')}
                    >
                      <Italic className="w-3 h-3" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Italic (Ctrl+I)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => insertFormatting('`', '`')}
                    >
                      <Code className="w-3 h-3" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Code</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => insertFormatting('[', '](url)')}
                    >
                      <Link className="w-3 h-3" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Link (Ctrl+K)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="flex items-end gap-2 p-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowFormatToolbar(true)}
              onBlur={() => setTimeout(() => setShowFormatToolbar(false), 200)}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              placeholder={placeholder}
              disabled={disabled || isRecording}
              maxLength={maxLength}
              rows={1}
              className={cn(
                "w-full resize-none border-0 bg-transparent text-sm",
                "placeholder-slate-500 dark:placeholder-slate-400",
                "focus:outline-none focus:ring-0",
                "text-slate-900 dark:text-slate-100",
                "min-h-[20px] max-h-[120px]"
              )}
            />
            
            {/* Character Counter */}
            {maxLength && value.length > maxLength * 0.8 && (
              <div className={cn(
                "text-xs mt-1",
                value.length > maxLength * 0.9 
                  ? "text-red-500" 
                  : "text-slate-400"
              )}>
                {value.length}/{maxLength}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {/* File Upload */}
            {showAttachments && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled}
                    >
                      <Paperclip className="w-4 h-4" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Attach files</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Voice Message */}
            {allowVoiceMessage && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsRecording(!isRecording)}
                      disabled={disabled}
                      className={cn(isRecording && "text-red-500")}
                    >
                      <Mic className="w-4 h-4" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Voice message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Emoji Picker */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MeridianButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={disabled}
                  >
                    <Smile className="w-4 h-4" />
                  </MeridianButton>
                </TooltipTrigger>
                <TooltipContent>Add emoji</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Schedule Send */}
            {showScheduling && onScheduleSend && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MeridianButton
                      variant="ghost"
                      size="icon-sm"
                      disabled={!canSend}
                    >
                      <Calendar className="w-4 h-4" />
                    </MeridianButton>
                  </TooltipTrigger>
                  <TooltipContent>Schedule message</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Send Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MeridianButton
                    onClick={handleSend}
                    disabled={!canSend}
                    size="icon-sm"
                    className="h-8 w-8"
                  >
                    <Send className="w-4 h-4" />
                  </MeridianButton>
                </TooltipTrigger>
                <TooltipContent>Send message (Enter)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        className="hidden"
      />
    </div>
  );
}