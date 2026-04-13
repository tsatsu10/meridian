import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Target,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { OnboardingFlow, OnboardingStep } from '@/types/tips';
import { useOnboarding } from '@/hooks/use-tips';
import { toast } from '@/lib/toast';

interface OnboardingTourProps {
  flow: OnboardingFlow;
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

export function OnboardingTour({
  flow,
  onComplete,
  onSkip,
  className,
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightElement, setSpotlightElement] = useState<HTMLElement | null>(null);
  const { completeStep, skipStep, complete } = useOnboarding();
  const spotlightRef = useRef<HTMLDivElement>(null);

  const currentStep = flow.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === flow.steps.length - 1;
  const progress = ((currentStepIndex + 1) / flow.steps.length) * 100;

  // Update spotlight position when step changes
  useEffect(() => {
    if (currentStep?.targetElement) {
      const element = document.querySelector(currentStep.targetElement) as HTMLElement;
      setSpotlightElement(element);

      // Scroll element into view
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setSpotlightElement(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep) {
      completeStep(currentStep.id);
    }

    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep?.skippable) {
      skipStep(currentStep.id);
      handleNext();
    } else {
      toast.error('This step cannot be skipped');
    }
  };

  const handleComplete = () => {
    complete();
    toast.success('Onboarding completed! 🎉');
    onComplete?.();
  };

  const handleClose = () => {
    toast.info('You can restart the tour anytime from settings');
    onSkip?.();
  };

  // Calculate spotlight position
  const spotlightStyle = spotlightElement
    ? {
        top: spotlightElement.offsetTop - 8,
        left: spotlightElement.offsetLeft - 8,
        width: spotlightElement.offsetWidth + 16,
        height: spotlightElement.offsetHeight + 16,
      }
    : null;

  // Calculate tour card position relative to spotlight
  const getTourCardPosition = () => {
    if (!spotlightElement || !currentStep) return {};

    const placement = currentStep.placement || 'bottom';
    const rect = spotlightElement.getBoundingClientRect();

    switch (placement) {
      case 'top':
        return {
          bottom: `calc(100vh - ${rect.top}px + 16px)`,
          left: rect.left,
        };
      case 'bottom':
        return {
          top: rect.bottom + 16,
          left: rect.left,
        };
      case 'left':
        return {
          top: rect.top,
          right: `calc(100vw - ${rect.left}px + 16px)`,
        };
      case 'right':
        return {
          top: rect.top,
          left: rect.right + 16,
        };
      case 'center':
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <AnimatePresence>
      <div className={cn('fixed inset-0 z-[100]', className)}>
        {/* Backdrop with spotlight cutout */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm">
          {/* Spotlight effect */}
          {spotlightStyle && (
            <motion.div
              ref={spotlightRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute"
              style={spotlightStyle}
            >
              <div className="absolute inset-0 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-lg" />
              <div className="absolute inset-0 border-2 border-primary rounded-lg animate-pulse" />
            </motion.div>
          )}
        </div>

        {/* Tour Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute z-10"
          style={getTourCardPosition()}
        >
          <Card className="w-[400px] max-w-[90vw] shadow-2xl border-2">
            {/* Progress bar */}
            <div className="h-1 bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <Badge variant="outline" className="text-xs">
                      Step {currentStepIndex + 1} of {flow.steps.length}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{currentStep?.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {currentStep?.description}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Tip content if available */}
              {currentStep?.tip && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{currentStep.tip.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentStep.tip.content}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <div className="flex gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevious}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-3 w-3" />
                      Previous
                    </Button>
                  )}

                  {currentStep?.skippable && (
                    <Button variant="ghost" size="sm" onClick={handleSkip}>
                      Skip
                    </Button>
                  )}
                </div>

                <Button onClick={handleNext} size="sm" className="gap-1">
                  {isLastStep ? (
                    <>
                      <Check className="h-3 w-3" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>

              {/* Footer info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{flow.name}</span>
                <span>~{flow.estimatedDuration} min</span>
              </div>
            </CardContent>
          </Card>

          {/* Pointer arrow if spotlight is active */}
          {spotlightElement && currentStep?.placement !== 'center' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'absolute w-0 h-0',
                currentStep.placement === 'top' && 'top-full left-8 border-l-8 border-r-8 border-t-8 border-transparent border-t-border',
                currentStep.placement === 'bottom' && 'bottom-full left-8 border-l-8 border-r-8 border-b-8 border-transparent border-b-border',
                currentStep.placement === 'left' && 'left-full top-8 border-t-8 border-b-8 border-l-8 border-transparent border-l-border',
                currentStep.placement === 'right' && 'right-full top-8 border-t-8 border-b-8 border-r-8 border-transparent border-r-border'
              )}
            />
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
