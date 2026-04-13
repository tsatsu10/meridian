import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  X,
  BarChart3,
  Target,
  Users,
  Sparkles,
  Filter,
  Download,
  TrendingDown,
  Keyboard,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/cn";

interface OnboardingTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const tourSteps = [
  {
    icon: BarChart3,
    title: "Welcome to Analytics Dashboard",
    description: "Get comprehensive insights into your workspace performance, team productivity, and project health.",
    tips: [
      "Track key metrics in real-time",
      "Compare performance across time periods",
      "Export data in multiple formats",
      "Set up custom filters for focused insights"
    ],
    color: "bg-blue-500"
  },
  {
    icon: Target,
    title: "Overview Tab",
    description: "Your command center for workspace-wide metrics. Monitor total projects, completed tasks, team productivity, and time utilization at a glance.",
    tips: [
      "8 key performance indicators",
      "Performance trend charts",
      "Resource distribution visualization",
      "Click any metric card to drill down"
    ],
    color: "bg-purple-500"
  },
  {
    icon: Target,
    title: "Projects Tab",
    description: "View detailed health metrics for each project including completion rates, velocity, risk levels, and team allocation.",
    tips: [
      "Project health scoring (0-100)",
      "Risk assessment indicators",
      "Completion rate tracking",
      "Click projects to view detailed analytics"
    ],
    color: "bg-green-500"
  },
  {
    icon: Users,
    title: "Teams Tab",
    description: "Analyze team member resource utilization, workload balance, and productivity metrics to optimize team performance.",
    tips: [
      "Individual utilization percentages",
      "Workload balance indicators (optimal/overloaded/critical)",
      "Task completion tracking per member",
      "Hours logged and project assignments"
    ],
    color: "bg-orange-500"
  },
  {
    icon: Sparkles,
    title: "Insights Tab",
    description: "Access AI-powered recommendations, alerts, and actionable insights to improve workspace efficiency and identify potential issues.",
    tips: [
      "Automated performance recommendations",
      "Risk and bottleneck alerts",
      "Trend analysis and predictions",
      "Actionable improvement suggestions"
    ],
    color: "bg-pink-500"
  },
  {
    icon: Filter,
    title: "Advanced Filtering",
    description: "Use the Filter button to narrow down your analytics by specific projects, users, or time ranges for focused analysis.",
    tips: [
      "Multi-select projects and team members",
      "Time range selection (7d, 30d, 90d)",
      "Comparison mode for period-over-period analysis",
      "Filters apply in real-time"
    ],
    color: "bg-cyan-500"
  },
  {
    icon: TrendingDown,
    title: "Comparison Mode",
    description: "Enable comparison mode in the filters panel to analyze performance changes between different time periods.",
    tips: [
      "Compare current vs. previous period",
      "Identify positive and negative trends",
      "Percentage change indicators",
      "Visual trend direction arrows"
    ],
    color: "bg-indigo-500"
  },
  {
    icon: Download,
    title: "Export Analytics",
    description: "Export your analytics data in CSV, PDF, or Excel formats for presentations, reports, or further analysis.",
    tips: [
      "CSV for data analysis",
      "PDF for printable reports",
      "Excel with multiple formatted sheets",
      "Exports include all filtered data"
    ],
    color: "bg-emerald-500"
  },
  {
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    description: "Speed up your workflow with powerful keyboard shortcuts for navigation, actions, and view controls.",
    tips: [
      "Press Ctrl+/ (or Cmd+/) to view all shortcuts",
      "Use 1-4 to switch between tabs",
      "Ctrl+R to refresh data",
      "Ctrl+F to open filters"
    ],
    color: "bg-violet-500"
  },
  {
    icon: Check,
    title: "You're All Set!",
    description: "You're now ready to explore your analytics dashboard. Remember, you can revisit this tour anytime from the settings.",
    tips: [
      "Data updates in real-time",
      "Customize your view with filters",
      "Export reports whenever needed",
      "Check insights regularly for recommendations"
    ],
    color: "bg-green-600"
  }
];

export function OnboardingTour({ open, onOpenChange, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepData = tourSteps[currentStep];
  const Icon = currentStepData.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Last step - complete tour
      onComplete?.();
      onOpenChange(false);
      setCurrentStep(0);
    }
  }, [currentStep, onComplete, onOpenChange]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onOpenChange(false);
    setCurrentStep(0);
  }, [onOpenChange]);

  // Reset to first step when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="relative">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Skip tour</span>
            </Button>
          </div>
          <Progress value={progress} className="h-2 mb-4" />
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className={cn("p-3 rounded-lg", currentStepData.color)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl mb-2">
                    {currentStepData.title}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {currentStepData.description}
                  </DialogDescription>
                </div>
              </div>

              <Card className="p-4 bg-muted/30">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Key Features
                </h4>
                <ul className="space-y-2">
                  {currentStepData.tips.map((tip, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{tip}</span>
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </div>
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="flex items-center justify-between sm:justify-between mt-6">
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
            >
              Skip Tour
            </Button>
            <Button
              onClick={handleNext}
              className="gap-2"
            >
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <Check className="h-4 w-4" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

