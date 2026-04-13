import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  ArrowRight, 
  Clock, 
  CheckSquare, 
  Lightbulb,
  X,
  TrendingUp,
  Zap,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import useProjectStore, { type ProjectView } from '@/store/project';
import { useProjectNavigation } from '@/hooks/use-project-navigation';
import { 
  getViewRecommendations, 
  recordUserBehavior, 
  getSmartShortcuts,
  type ViewRecommendation,
  type ProjectContext,
  type UserBehaviorPattern 
} from '@/services/ai-view-recommendations';
import type { ProjectAnalytics } from '@/types/project-view';
import { toast } from '@/lib/toast';

interface SmartViewSuggestionsProps {
  projectId: string;
  workspaceId: string;
  analytics: ProjectAnalytics;
  className?: string;
  compact?: boolean;
  autoShow?: boolean;
}

// Smart suggestions component with AI recommendations
const SmartViewSuggestions: React.FC<SmartViewSuggestionsProps> = ({
  projectId,
  workspaceId,
  analytics,
  className,
  compact = false,
  autoShow = true
}) => {
  const { activeView, viewStates, navigationHistory } = useProjectStore();
  const { navigateToView } = useProjectNavigation(workspaceId, projectId);
  
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  const [userBehaviorSession, setUserBehaviorSession] = useState<Partial<UserBehaviorPattern>>({
    userId: 'current-user', // Would come from auth
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    currentView: activeView,
    previousViews: [],
    sessionDuration: 0,
    tasksCompleted: 0,
    actionsPerformed: [],
    contextSwitches: 0
  });

  // Create project context from analytics
  const projectContext: ProjectContext = useMemo(() => ({
    totalTasks: analytics.totalTasks,
    overdueTasks: analytics.overdueTasks,
    inProgressTasks: analytics.totalTasks - analytics.completedTasks - analytics.overdueTasks,
    completionRate: analytics.totalTasks > 0 ? analytics.completedTasks / analytics.totalTasks : 0,
    averageTaskAge: 7, // Placeholder - would calculate from actual data
    upcomingDeadlines: Math.floor(analytics.totalTasks * 0.3), // Estimate
    teamSize: 5, // Placeholder - would come from team data
    projectPhase: analytics.completedTasks / analytics.totalTasks > 0.8 ? 'review' : 
                 analytics.completedTasks / analytics.totalTasks > 0.3 ? 'execution' : 'planning'
  }), [analytics]);

  // Get AI recommendations
  const recommendations = useMemo(() => {
    const recs = getViewRecommendations(activeView, projectContext, userBehaviorSession, analytics);
    
    // Filter out dismissed recommendations
    return recs.filter(rec => !dismissedRecommendations.has(`${rec.view}-${rec.reason}`));
  }, [activeView, projectContext, userBehaviorSession, analytics, dismissedRecommendations]);

  // Get smart shortcuts
  const smartShortcuts = useMemo(() => {
    return getSmartShortcuts(activeView, projectContext, userBehaviorSession.actionsPerformed || []);
  }, [activeView, projectContext, userBehaviorSession.actionsPerformed]);

  // Track user behavior
  useEffect(() => {
    const sessionStart = Date.now();
    let contextSwitches = 0;
    
    const updateBehavior = () => {
      const sessionDuration = (Date.now() - sessionStart) / (1000 * 60); // minutes
      
      setUserBehaviorSession(prev => {
        const updated = {
          ...prev,
          currentView: activeView,
          previousViews: [...(prev.previousViews || []), prev.currentView].filter(Boolean).slice(-5),
          sessionDuration,
          contextSwitches: contextSwitches++
        };
        
        // Record behavior for AI learning
        recordUserBehavior(updated as UserBehaviorPattern);
        
        return updated;
      });
    };

    updateBehavior();
  }, [activeView]);

  // Auto-show logic
  useEffect(() => {
    if (!autoShow) return;
    
    const shouldShow = 
      recommendations.length > 0 && 
      recommendations.some(r => r.priority === 'high') &&
      !isVisible;
    
    if (shouldShow) {
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [recommendations, autoShow, isVisible]);

  // Handle recommendation selection
  const handleRecommendationClick = async (recommendation: ViewRecommendation) => {
    try {
      await navigateToView(recommendation.view);
      
      // Track successful recommendation usage
      setUserBehaviorSession(prev => ({
        ...prev,
        actionsPerformed: [...(prev.actionsPerformed || []), `accept-recommendation:${recommendation.view}`]
      }));
      
      toast.success(`Switched to ${recommendation.view} view`, {
        description: recommendation.reason
      });
      
      setIsVisible(false);
    } catch (error) {
      toast.error('Failed to switch views');
    }
  };

  // Handle recommendation dismissal
  const handleDismissRecommendation = (recommendation: ViewRecommendation) => {
    setDismissedRecommendations(prev => 
      new Set([...prev, `${recommendation.view}-${recommendation.reason}`])
    );
    
    // Track dismissal
    setUserBehaviorSession(prev => ({
      ...prev,
      actionsPerformed: [...(prev.actionsPerformed || []), `dismiss-recommendation:${recommendation.view}`]
    }));
  };

  // Priority colors and icons
  const getPriorityStyles = (priority: ViewRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-700',
          icon: <Target className="h-4 w-4" />,
          badge: 'bg-red-500'
        };
      case 'medium':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-700',
          icon: <TrendingUp className="h-4 w-4" />,
          badge: 'bg-orange-500'
        };
      case 'low':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-700',
          icon: <Lightbulb className="h-4 w-4" />,
          badge: 'bg-blue-500'
        };
    }
  };

  if (!isVisible || recommendations.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={cn("fixed bottom-4 right-4 z-50 max-w-sm", className)}
      >
        <Card className="shadow-xl border-2 border-primary/20 bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <CardTitle className="text-lg">Smart Suggestions</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {recommendations.slice(0, compact ? 1 : 3).map((rec, index) => {
              const styles = getPriorityStyles(rec.priority);
              
              return (
                <motion.div
                  key={`${rec.view}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md cursor-pointer",
                    styles.bg
                  )}
                  onClick={() => handleRecommendationClick(rec)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {styles.icon}
                      <span className={cn("font-medium capitalize", styles.text)}>
                        {rec.view.replace('-', ' ')}
                      </span>
                      <Badge 
                        className={cn("text-white text-xs px-2 py-0.5", styles.badge)}
                      >
                        {Math.round(rec.confidence * 100)}%
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismissRecommendation(rec);
                      }}
                      className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {rec.reason}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      {rec.timeToComplete && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{rec.timeToComplete}m</span>
                        </div>
                      )}
                      {rec.requiredActions && (
                        <div className="flex items-center space-x-1">
                          <CheckSquare className="h-3 w-3" />
                          <span>{rec.requiredActions.length} actions</span>
                        </div>
                      )}
                    </div>
                    
                    <ArrowRight className="h-4 w-4 text-primary" />
                  </div>
                  
                  {rec.requiredActions && !compact && (
                    <div className="mt-2 pt-2 border-t border-current/10">
                      <div className="space-y-1">
                        {rec.requiredActions.slice(0, 2).map((action, i) => (
                          <div key={i} className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <div className="h-1 w-1 bg-current rounded-full" />
                            <span>{action}</span>
                          </div>
                        ))}
                        {rec.requiredActions.length > 2 && (
                          <div className="text-xs text-muted-foreground/70">
                            +{rec.requiredActions.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            
            {/* Smart Shortcuts */}
            {smartShortcuts.length > 0 && !compact && (
              <div className="pt-2 border-t">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs font-medium text-muted-foreground">Smart Shortcuts</span>
                </div>
                <div className="space-y-1">
                  {smartShortcuts.slice(0, 2).map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{shortcut.description}</span>
                      <Badge variant="outline" className="text-xs">
                        {shortcut.shortcut}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="text-xs text-muted-foreground"
              >
                Hide suggestions
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact floating button version
export const SmartSuggestionsButton: React.FC<{
  projectId: string;
  workspaceId: string;
  analytics: ProjectAnalytics;
}> = ({ projectId, workspaceId, analytics }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { activeView } = useProjectStore();
  
  const projectContext: ProjectContext = useMemo(() => ({
    totalTasks: analytics.totalTasks,
    overdueTasks: analytics.overdueTasks,
    inProgressTasks: analytics.totalTasks - analytics.completedTasks,
    completionRate: analytics.totalTasks > 0 ? analytics.completedTasks / analytics.totalTasks : 0,
    averageTaskAge: 7,
    upcomingDeadlines: Math.floor(analytics.totalTasks * 0.3),
    teamSize: 5,
    projectPhase: 'execution'
  }), [analytics]);
  
  const hasHighPriorityRecommendations = useMemo(() => {
    const recs = getViewRecommendations(activeView, projectContext, {}, analytics);
    return recs.some(r => r.priority === 'high');
  }, [activeView, projectContext, analytics]);

  return (
    <>
      <motion.div
        className="fixed bottom-4 left-4 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg relative",
            hasHighPriorityRecommendations 
              ? "bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600" 
              : "bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          )}
        >
          <Brain className="h-5 w-5 text-white" />
          {hasHighPriorityRecommendations && (
            <motion.div
              className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          )}
        </Button>
      </motion.div>
      
      {showSuggestions && (
        <SmartViewSuggestions
          projectId={projectId}
          workspaceId={workspaceId}
          analytics={analytics}
          autoShow={false}
          className="bottom-20 left-4"
        />
      )}
    </>
  );
};

export default SmartViewSuggestions;