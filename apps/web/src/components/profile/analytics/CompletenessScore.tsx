/**
 * 📊 Enhanced Profile Completeness Score
 * 
 * Displays quality-based profile completeness with progress breakdown
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { getCompletenessScore, smartProfileKeys } from "@/fetchers/profile/smart-profile-fetchers";
import NumberTicker from "@/components/magicui/number-ticker";

interface CompletenessScoreProps {
  userId: string;
  className?: string;
}

export function CompletenessScore({ userId, className }: CompletenessScoreProps) {
  const { data, isLoading } = useQuery({
    queryKey: smartProfileKeys.completeness(userId),
    queryFn: () => getCompletenessScore(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const score = data?.data?.score || 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 50) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Improvement";
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Profile Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 animate-pulse">
            <div className="h-20 bg-muted rounded" />
            <div className="h-4 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Profile Quality</span>
          <Badge
            variant={score >= 90 ? "default" : "secondary"}
            className={score >= 90 ? "bg-green-600" : ""}
          >
            {getScoreLabel(score)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score display */}
        <div className="text-center">
          <div className={cn("text-5xl font-bold", getScoreColor(score))}>
            <NumberTicker value={score} />%
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Completeness Score
          </p>
        </div>

        {/* Progress bar */}
        <Progress value={score} className="h-2" />

        {/* Score breakdown (simplified) */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Basic Info</span>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </div>
          
          {score >= 15 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Profile Picture</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          )}
          
          {score >= 30 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bio & Headline</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          )}
          
          {score >= 50 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Skills & Experience</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          )}

          {score < 100 && (
            <div className="flex items-center justify-between text-yellow-600 dark:text-yellow-400">
              <span>More improvements available</span>
              <TrendingUp className="h-4 w-4" />
            </div>
          )}
        </div>

        {score === 100 && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              🎉 Perfect Profile!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

