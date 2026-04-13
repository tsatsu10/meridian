import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Target
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface MilestoneProgressCardProps {
  milestones: any[];
  className?: string;
}

export default function MilestoneProgressCard({ milestones, className }: MilestoneProgressCardProps) {
  const stats = useMemo(() => {
    const total = milestones.length;
    const achieved = milestones.filter(m => m.status === 'achieved').length;
    const upcoming = milestones.filter(m => m.status === 'upcoming').length;
    const missed = milestones.filter(m => m.status === 'missed').length;
    const highRisk = milestones.filter(m => m.riskLevel === 'high' || m.riskLevel === 'critical').length;
    
    // Count upcoming high-risk milestones (for accurate on-track calculation)
    const upcomingHighRisk = milestones.filter(m => 
      m.status === 'upcoming' && (m.riskLevel === 'high' || m.riskLevel === 'critical')
    ).length;
    
    const completionRate = total > 0 ? Math.round((achieved / total) * 100) : 0;
    const missRate = total > 0 ? Math.round((missed / total) * 100) : 0;
    const onTrack = upcoming - upcomingHighRisk; // Only upcoming milestones that are NOT high-risk
    
    // Calculate trend (comparing last month vs this month)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const lastMonthAchieved = milestones.filter(m => {
      const date = new Date(m.updatedAt || m.createdAt);
      return m.status === 'achieved' && date >= lastMonth && date < thisMonth;
    }).length;
    
    const thisMonthAchieved = milestones.filter(m => {
      const date = new Date(m.updatedAt || m.createdAt);
      return m.status === 'achieved' && date >= thisMonth;
    }).length;
    
    const trend = thisMonthAchieved - lastMonthAchieved;
    
    return {
      total,
      achieved,
      upcoming,
      missed,
      highRisk,
      upcomingHighRisk,
      onTrack,
      completionRate,
      missRate,
      trend,
    };
  }, [milestones]);

  const getHealthStatus = () => {
    if (stats.completionRate >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (stats.completionRate >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (stats.completionRate >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'Needs Attention', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const health = getHealthStatus();

  if (milestones.length === 0) return null;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Overall Progress
          </span>
          <Badge variant="outline" className={cn("text-xs font-medium", health.color, health.bg)}>
            {health.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completion Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Completion Rate</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.completionRate}%</span>
              {stats.trend !== 0 && (
                <div className={cn(
                  "flex items-center text-xs font-medium",
                  stats.trend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {stats.trend > 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(stats.trend)}
                </div>
              )}
            </div>
          </div>
          <Progress value={stats.completionRate} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {stats.achieved} of {stats.total} milestones achieved
          </p>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.achieved}</div>
            <div className="text-xs text-muted-foreground">Achieved</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{stats.missed}</div>
            <div className="text-xs text-muted-foreground">Missed</div>
          </div>
        </div>

        {/* Risk Overview - Only show if there are UPCOMING high-risk milestones */}
        {stats.upcomingHighRisk > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-md">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">
                  {stats.upcomingHighRisk} upcoming high-risk milestone{stats.upcomingHighRisk !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-orange-700">
                Requires attention
              </span>
            </div>
          </div>
        )}

        {/* Quick Insights */}
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">On Track</span>
            <span className="font-medium">{stats.onTrack} milestone{stats.onTrack !== 1 ? 's' : ''}</span>
          </div>
          {stats.missRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Miss Rate</span>
              <span className="font-medium text-red-600">{stats.missRate}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

