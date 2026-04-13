import React from 'react';
import { processMessageContent, validateMessageSecurity } from '@/utils/sanitize-message';

interface SafeMessageContentProps {
  content: string;
  className?: string;
  onMentionClick?: (email: string) => void;
  onTaskReferenceClick?: (taskId: string) => void;
}

/**
 * Safe message content renderer that prevents XSS attacks
 * while preserving mentions and task references
 */
export function SafeMessageContent({ 
  content, 
  className = "text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap",
  onMentionClick,
  onTaskReferenceClick
}: SafeMessageContentProps) {
  // Validate content security
  if (!validateMessageSecurity(content)) {
    return (
      <div className={`${className} text-red-500 italic`}>
        ⚠️ Message contains potentially unsafe content and has been blocked
      </div>
    );
  }

  // Process and sanitize content
  const { sanitizedContent, mentions, taskReferences } = processMessageContent(content);

  // Create safe JSX content
  const renderSafeContent = () => {
    let processedContent = sanitizedContent;

    // Highlight mentions safely
    mentions.forEach(mention => {
      const safeEmail = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars
      const mentionRegex = new RegExp(`@${safeEmail}`, 'gi');
      const mentionSpan = `<span class="mention-highlight bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded cursor-pointer" data-mention="${mention}">@${mention}</span>`;
      processedContent = processedContent.replace(mentionRegex, mentionSpan);
    });

    // Highlight task references safely
    taskReferences.forEach(taskId => {
      const taskRegex = new RegExp(`#${taskId}`, 'gi');
      const taskSpan = `<span class="task-reference bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded cursor-pointer" data-task="${taskId}">#${taskId}</span>`;
      processedContent = processedContent.replace(taskRegex, taskSpan);
    });

    // Convert newlines to <br> safely
    processedContent = processedContent.replace(/\n/g, '<br>');

    return processedContent;
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    // Handle mention clicks
    if (target.classList.contains('mention-highlight')) {
      const mention = target.getAttribute('data-mention');
      if (mention && onMentionClick) {
        onMentionClick(mention);
      }
    }
    
    // Handle task reference clicks
    if (target.classList.contains('task-reference')) {
      const taskId = target.getAttribute('data-task');
      if (taskId && onTaskReferenceClick) {
        onTaskReferenceClick(taskId);
      }
    }
  };

  return (
    <div 
      className={className}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ 
        __html: renderSafeContent() 
      }}
    />
  );
}

export default SafeMessageContent;