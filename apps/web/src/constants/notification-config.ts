// @epic-3.5-communication: Enhanced notification configuration constants
// @persona-sarah: PM needs clear notification categorization for project updates
// @persona-jennifer: Exec needs priority-based notification styling for decision-making

import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Target,
  MessageSquare,
  Users,
  Clock,
  FileText,
  Settings,
  Shield,
  Activity,
  Zap
} from "lucide-react";

export const NOTIFICATION_CONFIG = {
  info: {
    icon: Bell,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950",
    label: "Information"
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-950",
    label: "Success"
  },
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-950",
    label: "Warning"
  },
  error: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950",
    label: "Error"
  },
  task: {
    icon: Target,
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950",
    label: "Task"
  },
  workspace: {
    icon: Users,
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950",
    label: "Workspace"
  },
  'time-entry': {
    icon: Clock,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950",
    label: "Time Entry"
  },
  file: {
    icon: FileText,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950",
    label: "File"
  },
  message: {
    icon: MessageSquare,
    color: "text-cyan-600",
    bg: "bg-cyan-50 dark:bg-cyan-950",
    label: "Message"
  },
  approval: {
    icon: Shield,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950",
    label: "Approval"
  },
  system: {
    icon: Settings,
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-950",
    label: "System"
  },
  security: {
    icon: Shield,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950",
    label: "Security"
  }
} as const;

export const PRIORITY_COLORS = {
  low: "border-l-green-500",
  medium: "border-l-yellow-500", 
  high: "border-l-orange-500",
  critical: "border-l-red-500"
} as const;

export const PRIORITY_BADGES = {
  low: {
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-800 dark:text-green-200",
    label: "Low"
  },
  medium: {
    bg: "bg-yellow-100 dark:bg-yellow-900", 
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Medium"
  },
  high: {
    bg: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-800 dark:text-orange-200", 
    label: "High"
  },
  critical: {
    bg: "bg-red-100 dark:bg-red-900",
    text: "text-red-800 dark:text-red-200",
    label: "Critical"
  }
} as const;

export type NotificationType = keyof typeof NOTIFICATION_CONFIG;
export type NotificationPriority = keyof typeof PRIORITY_COLORS;