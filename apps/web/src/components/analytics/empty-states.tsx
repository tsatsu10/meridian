import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  Target,
  Users,
  Clock,
  TrendingUp,
  Plus,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

// @epic-3.1-analytics: Contextual empty states for analytics dashboard
// @persona-sarah: PM needs guidance on getting started with analytics
// @persona-david: Team lead needs clear next steps to populate data

interface EmptyStateProps {
  type: "analytics" | "projects" | "teams" | "time-series" | "no-workspace";
  title?: string;
  description?: string;
  className?: string;
}

const emptyStateConfig = {
  analytics: {
    icon: BarChart3,
    title: "No Analytics Data Yet",
    description: "Start tracking your team's progress to see powerful insights and trends.",
    illustration: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <BarChart3 className="h-24 w-24 text-primary/20 relative" strokeWidth={1.5} />
      </div>
    ),
    actions: [
      {
        label: "Create Your First Project",
        icon: Plus,
        variant: "default" as const,
        path: "/dashboard/projects/new",
      },
      {
        label: "Learn About Analytics",
        icon: FileText,
        variant: "outline" as const,
        path: "/help/analytics",
      },
    ],
    steps: [
      { icon: Target, text: "Create a project", done: false },
      { icon: CheckCircle2, text: "Add tasks to your project", done: false },
      { icon: Clock, text: "Track time on tasks", done: false },
      { icon: TrendingUp, text: "View analytics and insights", done: false },
    ],
  },
  projects: {
    icon: Target,
    title: "No Projects to Analyze",
    description: "Create projects and add tasks to see health metrics and performance insights.",
    illustration: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-full blur-3xl" />
        <Target className="h-24 w-24 text-green-500/20 relative" strokeWidth={1.5} />
      </div>
    ),
    actions: [
      {
        label: "Create Project",
        icon: Plus,
        variant: "default" as const,
        path: "/dashboard/projects/new",
      },
      {
        label: "Browse Templates",
        icon: Sparkles,
        variant: "outline" as const,
        path: "/dashboard/templates",
      },
    ],
    steps: [
      { icon: Plus, text: "Create a new project", done: false },
      { icon: CheckCircle2, text: "Define project milestones", done: false },
      { icon: Users, text: "Assign team members", done: false },
      { icon: BarChart3, text: "Monitor project health", done: false },
    ],
  },
  teams: {
    icon: Users,
    title: "No Team Activity Data",
    description: "Invite team members and assign them to tasks to see resource utilization insights.",
    illustration: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-full blur-3xl" />
        <Users className="h-24 w-24 text-orange-500/20 relative" strokeWidth={1.5} />
      </div>
    ),
    actions: [
      {
        label: "Invite Team Members",
        icon: Plus,
        variant: "default" as const,
        path: "/dashboard/settings/team",
      },
      {
        label: "View All Projects",
        icon: Target,
        variant: "outline" as const,
        path: "/dashboard/projects",
      },
    ],
    steps: [
      { icon: Users, text: "Invite team members", done: false },
      { icon: Target, text: "Assign members to projects", done: false },
      { icon: CheckCircle2, text: "Assign tasks to members", done: false },
      { icon: TrendingUp, text: "View team analytics", done: false },
    ],
  },
  "time-series": {
    icon: TrendingUp,
    title: "Not Enough Historical Data",
    description: "Continue using Meridian to build up historical data for trend analysis.",
    illustration: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        <TrendingUp className="h-24 w-24 text-purple-500/20 relative" strokeWidth={1.5} />
      </div>
    ),
    actions: [
      {
        label: "View Current Projects",
        icon: Target,
        variant: "default" as const,
        path: "/dashboard/projects",
      },
    ],
    steps: [
      { icon: Clock, text: "Track time regularly", done: false },
      { icon: CheckCircle2, text: "Complete tasks consistently", done: false },
      { icon: BarChart3, text: "Build 7+ days of data", done: false },
      { icon: TrendingUp, text: "Analyze trends", done: false },
    ],
  },
  "no-workspace": {
    icon: BarChart3,
    title: "No Workspace Selected",
    description: "Please select or create a workspace to view analytics and insights.",
    illustration: (
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-full blur-3xl" />
        <BarChart3 className="h-24 w-24 text-muted-foreground/20 relative" strokeWidth={1.5} />
      </div>
    ),
    actions: [
      {
        label: "Select Workspace",
        icon: ArrowRight,
        variant: "default" as const,
        path: "/dashboard",
      },
    ],
    steps: [],
  },
};

export function AnalyticsEmptyState({ 
  type, 
  title, 
  description, 
  className = "" 
}: EmptyStateProps) {
  const navigate = useNavigate();
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={className}
    >
      <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/30">
        <CardContent className="pt-12 pb-12">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            {/* Illustration */}
            <div className="flex justify-center mb-6">
              {config.illustration}
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-foreground">
                {title || config.title}
              </h3>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                {description || config.description}
              </p>
            </div>

            {/* Steps to Get Started */}
            {config.steps.length > 0 && (
              <div className="bg-background/50 rounded-lg p-6 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Getting Started
                </h4>
                <div className="space-y-3 text-left">
                  {config.steps.map((step, index) => {
                    const StepIcon = step.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 text-sm text-muted-foreground"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium">{index + 1}</span>
                        </div>
                        <StepIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{step.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              {config.actions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant}
                    onClick={() => navigate({ to: action.path })}
                    className="gap-2"
                  >
                    <ActionIcon className="h-4 w-4" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Specific empty state variants for easy use
export function NoAnalyticsData(props: Omit<EmptyStateProps, "type">) {
  return <AnalyticsEmptyState type="analytics" {...props} />;
}

export function NoProjectsData(props: Omit<EmptyStateProps, "type">) {
  return <AnalyticsEmptyState type="projects" {...props} />;
}

export function NoTeamData(props: Omit<EmptyStateProps, "type">) {
  return <AnalyticsEmptyState type="teams" {...props} />;
}

export function NoTimeSeriesData(props: Omit<EmptyStateProps, "type">) {
  return <AnalyticsEmptyState type="time-series" {...props} />;
}

export function NoWorkspaceSelected(props: Omit<EmptyStateProps, "type">) {
  return <AnalyticsEmptyState type="no-workspace" {...props} />;
}

