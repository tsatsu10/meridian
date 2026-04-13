import { Star, Clock, Users, TrendingUp, CheckCircle2 } from "lucide-react";
import type { ProjectTemplate } from "../../types/templates";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface TemplateCardProps {
  template: ProjectTemplate;
  onViewDetails: () => void;
  onApply?: () => void;
}

export function TemplateCard({ template, onViewDetails, onApply }: TemplateCardProps) {
  const difficultyColor = {
    beginner: "bg-green-500/10 text-green-700 dark:text-green-400",
    intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    advanced: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader>
        {/* Header with Icon */}
        <div className="flex items-start justify-between mb-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${template.color}15` }}
          >
            <div
              className="h-6 w-6 rounded"
              style={{ backgroundColor: template.color }}
            />
          </div>
          {template.isOfficial && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Official
            </Badge>
          )}
        </div>

        <CardTitle className="line-clamp-2">{template.name}</CardTitle>
        <CardDescription className="text-sm">
          {template.profession}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {template.description}
        </p>

        {/* Meta Info */}
        <div className="flex flex-wrap gap-2">
          {/* Difficulty */}
          <Badge
            variant="outline"
            className={cn("capitalize text-xs", difficultyColor[template.difficulty])}
          >
            {template.difficulty}
          </Badge>

          {/* Rating */}
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {template.rating.toFixed(1)}
            <span className="text-muted-foreground">({template.ratingCount})</span>
          </Badge>

          {/* Duration */}
          {template.estimatedDuration && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {template.estimatedDuration} days
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {template.usageCount} uses
          </div>
          {template.taskCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {template.taskCount} tasks
            </div>
          )}
        </div>

        {/* Tags */}
        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onViewDetails}
        >
          View Details
        </Button>
        {onApply && (
          <Button
            className="flex-1"
            onClick={onApply}
            style={{ backgroundColor: template.color }}
          >
            Use Template
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

