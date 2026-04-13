import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Lightbulb, Info, AlertCircle } from 'lucide-react';
import { useContextualTip, useTips } from '@/hooks/use-tips';
import { cn } from '@/lib/cn';
import type { Tip } from '@/types/tips';

interface ContextualTipProps {
  /**
   * Manual tip to show (overrides context-based tip)
   */
  tip?: Tip | null;

  /**
   * Position of the tip
   */
  position?: 'top' | 'bottom' | 'left' | 'right' | 'floating';

  /**
   * Auto-hide after duration (ms)
   */
  autoHide?: number;

  /**
   * Show backdrop overlay
   */
  showBackdrop?: boolean;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Callback when tip is dismissed
   */
  onDismiss?: () => void;
}

const POSITION_STYLES = {
  top: 'top-0 left-0 right-0',
  bottom: 'bottom-0 left-0 right-0',
  left: 'left-0 top-0 bottom-0',
  right: 'right-0 top-0 bottom-0',
  floating: 'top-4 right-4',
};

const POSITION_ANIMATIONS = {
  top: { initial: { y: -100 }, animate: { y: 0 }, exit: { y: -100 } },
  bottom: { initial: { y: 100 }, animate: { y: 0 }, exit: { y: 100 } },
  left: { initial: { x: -100 }, animate: { x: 0 }, exit: { x: -100 } },
  right: { initial: { x: 100 }, animate: { x: 0 }, exit: { x: 100 } },
  floating: { initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } },
};

export function ContextualTip({
  tip: manualTip,
  position = 'floating',
  autoHide,
  showBackdrop = false,
  className,
  onDismiss,
}: ContextualTipProps) {
  const contextTip = useContextualTip();
  const { dismissTip, userProgress } = useTips();
  const [isVisible, setIsVisible] = useState(true);

  // Use manual tip if provided, otherwise use context tip
  const tip = manualTip || contextTip;

  // Auto-hide timer
  useEffect(() => {
    if (!tip || !autoHide) return;

    const timer = setTimeout(() => {
      handleDismiss(false);
    }, autoHide);

    return () => clearTimeout(timer);
  }, [tip, autoHide]);

  // Reset visibility when tip changes
  useEffect(() => {
    setIsVisible(true);
  }, [tip?.id]);

  if (!tip) return null;

  // Don't show if permanently dismissed
  if (userProgress.dismissedTips.includes(tip.id)) return null;

  const handleDismiss = (permanent: boolean = false) => {
    setIsVisible(false);

    setTimeout(() => {
      dismissTip(tip.id, permanent);
      onDismiss?.();
    }, 300);
  };

  const positionStyle = POSITION_STYLES[position];
  const animation = POSITION_ANIMATIONS[position];

  const getIcon = () => {
    switch (tip.level) {
      case 'beginner':
        return <Lightbulb className="w-4 h-4" />;
      case 'intermediate':
        return <Info className="w-4 h-4" />;
      case 'advanced':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          {showBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => handleDismiss(false)}
            />
          )}

          {/* Tip */}
          <motion.div
            initial={animation.initial}
            animate={animation.animate}
            exit={animation.exit}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'fixed z-50',
              position !== 'floating' ? 'w-full' : 'max-w-md',
              positionStyle,
              className
            )}
          >
            <div
              className={cn(
                'bg-gradient-to-r from-primary/10 to-primary/5 border-l-4 border-primary',
                'p-4 shadow-lg backdrop-blur-sm',
                position === 'floating' ? 'rounded-lg' : ''
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5 text-primary">
                  {getIcon()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {tip.title}
                    </p>
                    <button
                      onClick={() => handleDismiss(false)}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tip.content}
                  </p>

                  {/* Actions */}
                  {tip.actions && tip.actions.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      {tip.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            action.handler?.();
                            handleDismiss(false);
                          }}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Dismiss */}
                  <button
                    onClick={() => handleDismiss(true)}
                    className="text-xs text-muted-foreground hover:text-foreground mt-2"
                  >
                    Don't show this again
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
