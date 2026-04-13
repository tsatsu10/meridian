import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Users,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle2,
  Zap
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  predictFutureTrends,
  predictResourceNeeds,
  detectSeasonalPatterns,
  type PredictionResult
} from "@/utils/predictive-analytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PredictiveInsightsProps {
  timeSeriesData: any[]; // Accept any type for flexibility
  className?: string;
}

export function PredictiveInsights({ timeSeriesData, className }: PredictiveInsightsProps) {
  const predictions = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length < 3) return null;

    return {
      productivity: predictFutureTrends(timeSeriesData, 7, 'productivity'),
      tasksCompleted: predictFutureTrends(timeSeriesData, 7, 'tasksCompleted'),
      hoursLogged: predictFutureTrends(timeSeriesData, 7, 'hoursLogged'),
    };
  }, [timeSeriesData]);

  const resourcePrediction = useMemo(() => {
    return predictResourceNeeds(timeSeriesData);
  }, [timeSeriesData]);

  const seasonalPattern = useMemo(() => {
    return detectSeasonalPatterns(timeSeriesData, 'productivity');
  }, [timeSeriesData]);

  if (!predictions) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="py-6">
          <div className="text-center text-sm text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Not enough data for predictions</p>
            <p className="text-xs mt-1">Complete more tasks to see forecasts</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
      case "increasing":
        return <TrendingUp className="h-4 w-4" />;
      case "down":
      case "decreasing":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
      case "increasing":
        return "text-green-600";
      case "down":
      case "decreasing":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const PredictionCard = ({ prediction, title, icon: Icon }: { prediction: PredictionResult; title: string; icon: any }) => {
    const nextWeekPrediction = prediction.predictions[6]; // 7 days ahead
    
    if (!nextWeekPrediction) return null;

    return (
      <Card className="bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {Math.round(nextWeekPrediction.value)}
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn("gap-1", getTrendColor(prediction.trend))}>
                    {getTrendIcon(prediction.trend)}
                    {prediction.changeRate > 0 && "+"}
                    {prediction.changeRate}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expected {prediction.trend === "increasing" ? "increase" : prediction.trend === "decreasing" ? "decrease" : "stability"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium">{nextWeekPrediction.confidence}%</span>
            </div>
            <Progress value={nextWeekPrediction.confidence} className="h-2" />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Accuracy</span>
            <Badge variant="secondary" className="h-5 text-xs">
              {prediction.accuracy}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Predictive Insights
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered forecasts based on historical trends
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Activity className="h-3 w-3" />
          7-Day Forecast
        </Badge>
      </div>

      {/* Prediction Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PredictionCard
          prediction={predictions.productivity}
          title="Productivity Forecast"
          icon={Target}
        />
        <PredictionCard
          prediction={predictions.tasksCompleted}
          title="Tasks Completion"
          icon={CheckCircle2}
        />
        <PredictionCard
          prediction={predictions.hoursLogged}
          title="Hours Logged"
          icon={Activity}
        />
      </div>

      {/* Resource Capacity Prediction */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            Resource Capacity Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="text-2xl font-bold">{resourcePrediction.currentCapacity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Projected</p>
              <p className="text-2xl font-bold">{resourcePrediction.projectedCapacity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Change</p>
              <p className={cn("text-2xl font-bold", resourcePrediction.recommendedIncrease > 0 ? "text-green-600" : resourcePrediction.recommendedIncrease < 0 ? "text-red-600" : "")}>
                {resourcePrediction.recommendedIncrease > 0 && "+"}
                {resourcePrediction.recommendedIncrease}
              </p>
            </div>
          </div>

          {resourcePrediction.recommendedIncrease !== 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium mb-1">Recommendation</p>
                <p className="text-muted-foreground">
                  {resourcePrediction.recommendedIncrease > 0
                    ? `Consider adding ${resourcePrediction.recommendedIncrease} team member(s) to maintain productivity.`
                    : `Team capacity may be under-utilized. Consider reallocation or project expansion.`}
                </p>
                <p className="text-muted-foreground mt-1">
                  <span className="font-medium">Timeline:</span> {resourcePrediction.timeline}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seasonal Patterns */}
      {seasonalPattern.hasPattern && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Seasonal Patterns Detected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {seasonalPattern.patternType} cycle
              </Badge>
            </div>

            {seasonalPattern.peakDays.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  Peak Performance Days
                </p>
                <div className="flex flex-wrap gap-2">
                  {seasonalPattern.peakDays.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs bg-green-100 text-green-800">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {seasonalPattern.lowDays.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  Lower Activity Days
                </p>
                <div className="flex flex-wrap gap-2">
                  {seasonalPattern.lowDays.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs bg-red-100 text-red-800">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              Plan important tasks and deadlines around peak performance days for optimal results.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

