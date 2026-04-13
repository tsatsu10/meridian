import { Clock, Zap, CheckCircle2 } from "lucide-react";

export const priorityOptions = [
  { 
    value: "low", 
    label: "Low", 
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", 
    icon: "bg-slate-500",
    description: "Nice to have, no rush"
  },
  { 
    value: "medium", 
    label: "Medium", 
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", 
    icon: "bg-blue-500",
    description: "Standard priority task"
  },
  { 
    value: "high", 
    label: "High", 
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300", 
    icon: "bg-orange-500",
    description: "Important, needs attention"
  },
  { 
    value: "urgent", 
    label: "Urgent", 
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", 
    icon: "bg-red-500",
    description: "Critical, immediate action required"
  },
];

export const statusOptions = [
  { value: "todo", label: "To Do", icon: Clock, color: "text-slate-600" },
  { value: "in_progress", label: "In Progress", icon: Zap, color: "text-blue-600" },
  { value: "done", label: "Done", icon: CheckCircle2, color: "text-green-600" },
]; 