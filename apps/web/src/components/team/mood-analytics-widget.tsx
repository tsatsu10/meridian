import { useState } from 'react';
import { useMoodTracker } from '@/hooks/use-mood-tracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { MoodCheckinModal } from './mood-checkin-modal';
import { Smile, TrendingUp, Users, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const moodConfig = {
  great: { emoji: '😄', label: 'Great', color: 'bg-green-500', score: 5 },
  good: { emoji: '🙂', label: 'Good', color: 'bg-blue-500', score: 4 },
  okay: { emoji: '😐', label: 'Okay', color: 'bg-yellow-500', score: 3 },
  bad: { emoji: '😞', label: 'Bad', color: 'bg-orange-500', score: 2 },
  stressed: { emoji: '😰', label: 'Stressed', color: 'bg-red-500', score: 1 },
};

export function MoodAnalyticsWidget() {
  const { todaySummary, myHistory, hasCheckedInToday, loading } = useMoodTracker();
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5" />
            Team Mood
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  const averageScorePercent = todaySummary ? (todaySummary.averageScore / 5) * 100 : 0;
  const lastCheckin = myHistory[0];
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Smile className="h-5 w-5" />
            Team Mood
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setShowCheckinModal(true)}
            disabled={hasCheckedInToday}
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasCheckedInToday ? 'Checked In' : 'Check In'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Today's Summary */}
          {todaySummary && todaySummary.totalCheckins > 0 ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Team Average</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-medium">
                      {todaySummary.averageScore.toFixed(1)}/5.0
                    </span>
                  </div>
                </div>
                <Progress value={averageScorePercent} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-muted-foreground">Today's Check-ins</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{todaySummary.totalCheckins}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(moodConfig).map(([mood, config]) => {
                    const count = todaySummary.distribution[mood as keyof typeof moodConfig] || 0;
                    const percentage = todaySummary.totalCheckins > 0
                      ? (count / todaySummary.totalCheckins) * 100
                      : 0;
                    
                    if (count === 0) return null;
                    
                    return (
                      <div key={mood} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.emoji}</span>
                            <span className="text-muted-foreground">{config.label}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress
                          value={percentage}
                          className={`h-1.5 ${config.color}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Smile className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">No check-ins today yet</p>
              <p className="text-sm">Be the first to check in!</p>
              <Button
                className="mt-4"
                onClick={() => setShowCheckinModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Check In Now
              </Button>
            </div>
          )}
          
          {/* Personal Status */}
          {lastCheckin && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your last check-in</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {moodConfig[lastCheckin.mood as keyof typeof moodConfig].emoji}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(lastCheckin.createdAt, { addSuffix: true })}
                  </span>
                </div>
              </div>
              {lastCheckin.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  "{lastCheckin.notes}"
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <MoodCheckinModal
        open={showCheckinModal}
        onOpenChange={setShowCheckinModal}
      />
    </>
  );
}

