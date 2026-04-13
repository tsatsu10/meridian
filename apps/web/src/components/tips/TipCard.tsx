import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Lightbulb,
  BookOpen,
  Video,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Tip } from '@/types/tips';

interface TipCardProps {
  tip: Tip;
  onDismiss?: (permanent?: boolean) => void;
  onAction?: (action: string) => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'floating';
  autoClose?: number; // Auto-close after X milliseconds
  showActions?: boolean;
}

const CATEGORY_COLORS = {
  navigation: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  tasks: 'bg-green-500/10 text-green-700 dark:text-green-300',
  communication: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  analytics: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  automation: 'bg-pink-500/10 text-pink-700 dark:text-pink-300',
  shortcuts: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  collaboration: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
  workflows: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  reports: 'bg-red-500/10 text-red-700 dark:text-red-300',
  settings: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
};

const LEVEL_ICONS = {
  beginner: Lightbulb,
  intermediate: BookOpen,
  advanced: Sparkles,
};

export function TipCard({
  tip,
  onDismiss,
  onAction,
  onBookmark,
  isBookmarked = false,
  className,
  variant = 'default',
  autoClose,
  showActions = true,
}: TipCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(autoClose);

  const LevelIcon = LEVEL_ICONS[tip.level];

  // Auto-close timer
  useEffect(() => {
    if (!autoClose) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (!prev || prev <= 100) {
          handleDismiss(false);
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [autoClose]);

  const handleDismiss = (permanent: boolean = false) => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.(permanent);
    }, 300);
  };

  const handleAction = (actionId: string, actionHandler?: () => void) => {
    if (actionHandler) {
      actionHandler();
    }
    onAction?.(actionId);
  };

  const cardVariants = {
    initial: { opacity: 0, y: variant === 'floating' ? -20 : 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: variant === 'floating' ? -20 : 20, scale: 0.95 },
  };

  const progressPercentage = autoClose && timeRemaining
    ? (timeRemaining / autoClose) * 100
    : 0;

  if (variant === 'compact') {
    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className={cn('relative', className)}
          >
            <div className="flex items-start gap-3 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
              <LevelIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tip.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{tip.content}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0"
                onClick={() => handleDismiss(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
          className={cn('relative', className)}
        >
          <Card className={cn(
            'overflow-hidden',
            variant === 'floating' && 'shadow-lg border-2'
          )}>
            {/* Progress bar for auto-close */}
            {autoClose && timeRemaining && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '100%' }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <LevelIcon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{tip.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', CATEGORY_COLORS[tip.category])}
                      >
                        {tip.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {tip.level}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onBookmark && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={onBookmark}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDismiss(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <CardDescription className="text-sm">
                {tip.content}
              </CardDescription>

              {tip.example && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground">
                    {tip.example}
                  </p>
                </div>
              )}

              {tip.media && (
                <div className="rounded-md overflow-hidden">
                  {tip.media.type === 'image' && (
                    <img
                      src={tip.media.url}
                      alt={tip.media.alt || tip.title}
                      className="w-full h-auto"
                    />
                  )}
                  {tip.media.type === 'video' && (
                    <video
                      src={tip.media.url}
                      controls
                      className="w-full h-auto"
                      poster={tip.media.thumbnail}
                    />
                  )}
                </div>
              )}

              {showActions && (tip.actions || tip.learnMoreUrl || tip.videoUrl) && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tip.actions?.map((action, index) => (
                    <Button
                      key={index}
                      variant={index === 0 ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleAction(action.action, action.handler)}
                      className="gap-1"
                    >
                      {action.label}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  ))}

                  {tip.learnMoreUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(tip.learnMoreUrl, '_blank');
                        onAction?.('learn_more');
                      }}
                      className="gap-1"
                    >
                      <BookOpen className="h-3 w-3" />
                      Learn More
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}

                  {tip.videoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(tip.videoUrl, '_blank');
                        onAction?.('watch_video');
                      }}
                      className="gap-1"
                    >
                      <Video className="h-3 w-3" />
                      Watch Tutorial
                    </Button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(true)}
                  className="text-xs text-muted-foreground"
                >
                  Don't show again
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
