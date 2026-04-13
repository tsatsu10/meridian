import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Loader2 } from 'lucide-react';
import { useLoadingTip } from '@/hooks/use-tips';
import { cn } from '@/lib/cn';

interface LoadingScreenTipsProps {
  isLoading?: boolean;
  message?: string;
  className?: string;
  showTip?: boolean;
}

export function LoadingScreenTips({
  isLoading = true,
  message = 'Loading...',
  className,
  showTip = true,
}: LoadingScreenTipsProps) {
  const tip = useLoadingTip();

  if (!isLoading) return null;

  return (
    <div className={cn('flex items-center justify-center min-h-[200px] w-full', className)}>
      <div className="flex flex-col items-center gap-6 max-w-md px-4">
        {/* Loading spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>

        {/* Loading message */}
        <p className="text-sm text-muted-foreground">{message}</p>

        {/* Tip */}
        {showTip && tip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="w-full"
          >
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-1">
                    💡 {tip.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tip.content}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
