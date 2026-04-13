import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  User,
  Calendar,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  Zap,
  Star,
  AlertCircle,
} from 'lucide-react';

// @epic-3.2-time: Enhanced micro-interactions for power users
// @persona-mike: Developer needs smooth, responsive UI feedback

interface AnimatedTaskActionsProps {
  status: string;
  priority: string;
  onStatusChange?: (status: string) => void;
  onPriorityChange?: (priority: string) => void;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  isCompact?: boolean;
  className?: string;
}

const statusConfig = {
  'todo': {
    icon: Circle,
    label: 'To Do',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    hoverColor: 'hover:bg-gray-200',
    nextStatus: 'in_progress'
  },
  'in_progress': {
    icon: Clock,
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    hoverColor: 'hover:bg-blue-200',
    nextStatus: 'done'
  },
  'done': {
    icon: AlertCircle,
    label: 'In Review',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    hoverColor: 'hover:bg-purple-200',
    nextStatus: 'done'
  },
  'done': {
    icon: CheckCircle2,
    label: 'Done',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    hoverColor: 'hover:bg-green-200',
    nextStatus: 'todo'
  }
};

const priorityConfig = {
  'low': {
    icon: Flag,
    label: 'Low',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    hoverColor: 'hover:bg-gray-200'
  },
  'medium': {
    icon: Flag,
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    hoverColor: 'hover:bg-yellow-200'
  },
  'high': {
    icon: Flag,
    label: 'High',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    hoverColor: 'hover:bg-orange-200'
  },
  'urgent': {
    icon: Zap,
    label: 'Urgent',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    hoverColor: 'hover:bg-red-200'
  }
};

export const AnimatedTaskActions: React.FC<AnimatedTaskActionsProps> = ({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  onEdit,
  onView,
  onDelete,
  isCompact = false,
  className
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [statusAnimating, setStatusAnimating] = useState(false);
  const [priorityAnimating, setPriorityAnimating] = useState(false);

  const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig['todo'];
  const currentPriority = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig['medium'];

  const handleStatusClick = () => {
    if (!onStatusChange) return;
    
    setStatusAnimating(true);
    setTimeout(() => {
      onStatusChange(currentStatus.nextStatus);
      setStatusAnimating(false);
    }, 150);
  };

  const handlePriorityClick = () => {
    if (!onPriorityChange) return;
    
    setPriorityAnimating(true);
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(priority);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    
    setTimeout(() => {
      onPriorityChange(nextPriority);
      setPriorityAnimating(false);
    }, 150);
  };

  const StatusIcon = currentStatus.icon;
  const PriorityIcon = currentPriority.icon;

  return (
    <motion.div
      className={cn("flex items-center gap-2", className)}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Status Badge with Animation */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={statusAnimating ? { 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        } : {}}
        transition={{ duration: 0.3 }}
      >
        <Badge
          className={cn(
            "cursor-pointer transition-all duration-200 flex items-center gap-1",
            currentStatus.color,
            currentStatus.hoverColor,
            statusAnimating && "animate-pulse"
          )}
          onClick={handleStatusClick}
        >
          <StatusIcon className="h-3 w-3" />
          {!isCompact && currentStatus.label}
        </Badge>
      </motion.div>

      {/* Priority Badge with Animation */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={priorityAnimating ? { 
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        } : {}}
        transition={{ duration: 0.3 }}
      >
        <Badge
          className={cn(
            "cursor-pointer transition-all duration-200 flex items-center gap-1",
            currentPriority.color,
            currentPriority.hoverColor,
            priorityAnimating && "animate-pulse"
          )}
          onClick={handlePriorityClick}
        >
          <PriorityIcon className="h-3 w-3" />
          {!isCompact && currentPriority.label}
        </Badge>
      </motion.div>

      {/* Action Buttons with Stagger Animation */}
      <AnimatePresence>
        {isHovering && (
          <motion.div
            className="flex items-center gap-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {onView && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-blue-100 hover:text-blue-600"
                  onClick={onView}
                  title="View task"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
            
            {onEdit && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-yellow-100 hover:text-yellow-600"
                  onClick={onEdit}
                  title="Edit task"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
            
            {onDelete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                  onClick={onDelete}
                  title="Delete task"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Mode - Always Show Actions */}
      {isCompact && !isHovering && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setIsHovering(true);
          }}
        >
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
};

// Loading skeleton with animations
export const AnimatedTaskActionsSkeleton: React.FC<{ isCompact?: boolean }> = ({ 
  isCompact = false 
}) => {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="h-6 w-16 bg-muted rounded-full"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.div
        className="h-6 w-12 bg-muted rounded-full"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
      />
      {!isCompact && (
        <motion.div
          className="h-6 w-6 bg-muted rounded"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      )}
    </div>
  );
};

export default AnimatedTaskActions; 