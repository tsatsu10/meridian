// Chat Notification - Toast notification component

import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useChatActions } from '../context/ChatContext';
import type { NotificationState } from '../types';

interface ChatNotificationProps {
  notification: NotificationState;
}

const ICON_MAP = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const STYLE_MAP = {
  info: 'bg-blue-600 text-white',
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-orange-600 text-white',
};

export function ChatNotification({ notification }: ChatNotificationProps) {
  const Icon = ICON_MAP[notification.type];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "absolute top-4 right-4 z-50",
        "px-4 py-2 rounded-lg shadow-lg",
        "flex items-center gap-2",
        "animate-in slide-in-from-top-2 fade-in",
        STYLE_MAP[notification.type]
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{notification.message}</span>
    </div>
  );
}

