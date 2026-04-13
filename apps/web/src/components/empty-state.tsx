import { motion } from 'framer-motion';
import { 
  FileQuestion, 
  Briefcase, 
  GraduationCap, 
  Star, 
  Users, 
  Plus,
  Search,
  LucideIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Empty State Component
 * Provides beautiful, informative empty states with call-to-action
 */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {/* Animated Icon Circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1 
        }}
        className="relative mb-6"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
        
        {/* Icon Container */}
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
          <Icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2"
      >
        {title}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md"
      >
        {description}
      </motion.p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button onClick={onAction} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Pre-configured Empty States for common scenarios
 */

export function EmptyExperience({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No work experience yet"
      description="Add your professional experience to showcase your career journey and attract opportunities."
      actionLabel="Add Experience"
      onAction={onAdd}
    />
  );
}

export function EmptyEducation({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={GraduationCap}
      title="No education added"
      description="Share your educational background to highlight your qualifications and academic achievements."
      actionLabel="Add Education"
      onAction={onAdd}
    />
  );
}

export function EmptySkills({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Star}
      title="No skills listed"
      description="Add your skills to help others understand your expertise and find collaboration opportunities."
      actionLabel="Add Skill"
      onAction={onAdd}
    />
  );
}

export function EmptyConnections() {
  return (
    <EmptyState
      icon={Users}
      title="No connections yet"
      description="Start connecting with colleagues and team members to build your professional network."
    />
  );
}

export function EmptySearch() {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
    />
  );
}

/**
 * Generic empty state with custom content
 */
export function EmptyContent({
  icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  const Icon = icon || FileQuestion;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
          <Icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md">
        {description}
      </p>
      {children}
    </motion.div>
  );
}

export default EmptyState;

