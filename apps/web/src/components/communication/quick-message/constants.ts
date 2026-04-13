/**
 * Constants for QuickMessage feature
 * Centralized configuration to replace hardcoded values
 */

export const MESSAGE_LIMITS = {
  MAX_LENGTH: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_RECIPIENTS_DISPLAY: 5,
  MAX_RECENT_CONVERSATIONS: 3,
} as const;

export const AUTO_SAVE = {
  DEBOUNCE_DELAY: 2000, // 2 seconds
  DRAFT_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const UI_CONFIG = {
  MODAL_MAX_WIDTH: 'sm:max-w-[600px]',
  MODAL_MAX_HEIGHT: 'max-h-[80vh]',
  ATTACHMENT_PREVIEW_WIDTH: 'max-w-[150px]',
} as const;

export const FILE_TYPES = {
  ALLOWED_EXTENSIONS: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip',
  AUDIO_TYPES: ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/m4a'],
} as const;

export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  SYSTEM: 'system',
} as const;

export const RECIPIENT_TYPES = {
  USER: 'user',
  TEAM: 'team',
  CHANNEL: 'channel',
} as const;

export const CONTEXT_TYPES = {
  PROJECT: 'project',
  TASK: 'task',
  GENERAL: 'general',
} as const;

export const KEYBOARD_SHORTCUTS = {
  SEND_MESSAGE: ['Ctrl+Enter', 'Cmd+Enter'],
  ESCAPE: 'Escape',
} as const;

export const MAGIC_UI_COLORS = [
  '#A07CFE',
  '#FE8FB5', 
  '#FFBE7B'
] as const;