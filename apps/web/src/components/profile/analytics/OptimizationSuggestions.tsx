/**
 * 💡 Profile Optimization Suggestions
 * 
 * Displays actionable suggestions to improve profile
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, X, CheckCircle2, TrendingUp, Image, FileText, Award, Briefcase } from "lucide-react";
import { 
  getOptimizationSuggestions, 
  dismissSuggestion,
  smartProfileKeys 
} from "@/fetchers/profile/smart-profile-fetchers";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface OptimizationSuggestionsProps {
  userId: string;
  className?: string;
}

const suggestionIcons: Record<string, any> = {
  picture: Image,
  bio: FileText,
  skill: Award,
  experience: Briefcase,
  education: TrendingUp,
};

const priorityColors = {
  high: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30",
  medium: "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30",
  low: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30",
};

const priorityBadgeColors = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export function OptimizationSuggestions({ userId, className }: OptimizationSuggestionsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.suggestions(userId),
    queryFn: () => getOptimizationSuggestions(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const dismissMutation = useMutation({
    mutationFn: (suggestionId: string) => dismissSuggestion(suggestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smartProfileKeys.suggestions(userId) });
      toast.success("Suggestion dismissed");
    },
  });

  const suggestions = data?.data || [];
  const activeSuggestions = suggestions.filter(
    (s: any) => !s.isDismissed && !s.isCompleted
  );

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Optimize Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-muted rounded-lg" />
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeSuggestions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Optimize Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-600 dark:text-green-400" />
            <p className="font-medium text-green-800 dark:text-green-200">
              Your profile is fully optimized!
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No suggestions at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Optimize Your Profile
          <Badge variant="secondary" className="ml-auto">
            {activeSuggestions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activeSuggestions.map((suggestion: any) => {
            const Icon = suggestionIcons[suggestion.suggestionType] || Lightbulb;
            const priorityClass = priorityColors[suggestion.priority as keyof typeof priorityColors];
            const badgeClass = priorityBadgeColors[suggestion.priority as keyof typeof priorityBadgeColors];

            return (
              <div
                key={suggestion.id}
                className={cn(
                  "relative p-4 rounded-lg border-2 transition-all",
                  priorityClass
                )}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-background/80 flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium leading-snug">
                        {suggestion.suggestionText}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => dismissMutation.mutate(suggestion.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", badgeClass)}>
                        {suggestion.priority} priority
                      </Badge>
                      {suggestion.impactScore && (
                        <Badge variant="outline" className="text-xs">
                          +{suggestion.impactScore} impact
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

