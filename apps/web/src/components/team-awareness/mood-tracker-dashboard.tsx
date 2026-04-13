/**
 * Mood Tracker Dashboard Component
 * Track and visualize team morale
 * Phase 2 - Team Awareness Features
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

type MoodType = 'great' | 'good' | 'okay' | 'stressed' | 'overwhelmed' | 'frustrated';
type WorkloadLevel = 'light' | 'balanced' | 'heavy' | 'overloaded';

interface MoodTrackerDashboardProps {
  workspaceId: string;
  currentUserId?: string;
  className?: string;
}

export const MoodTrackerDashboard: React.FC<MoodTrackerDashboardProps> = ({
  workspaceId,
  currentUserId,
  className = '',
}) => {
  const [showLogMood, setShowLogMood] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType>('good');
  const [moodNote, setMoodNote] = useState('');
  const [workloadLevel, setWorkloadLevel] = useState<WorkloadLevel>('balanced');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [morale, setMorale] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMoodData();
  }, [workspaceId]);

  const fetchMoodData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats, morale, and trend in parallel
      const [statsRes, moraleRes, trendRes] = await Promise.all([
        fetch(`/api/team-awareness/mood/stats?workspaceId=${workspaceId}&days=7`),
        fetch(`/api/team-awareness/mood/morale?workspaceId=${workspaceId}`),
        fetch(`/api/team-awareness/mood/trend?workspaceId=${workspaceId}&days=30`),
      ]);

      const [statsData, moraleData, trendData] = await Promise.all([
        statsRes.json(),
        moraleRes.json(),
        trendRes.json(),
      ]);

      setStats(statsData);
      setMorale(moraleData);
      setTrend(trendData.trend || []);
    } catch (err) {
      console.error('Failed to fetch mood data:', err);
    } finally {
      setLoading(false);
    }
  };

  const logMood = async () => {
    if (!currentUserId) return;

    const moodScores: Record<MoodType, number> = {
      great: 5,
      good: 4,
      okay: 3,
      stressed: 2,
      overwhelmed: 1,
      frustrated: 1,
    };

    try {
      const response = await fetch('/api/team-awareness/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          workspaceId,
          mood: selectedMood,
          moodScore: moodScores[selectedMood],
          note: moodNote.trim() || undefined,
          workloadLevel,
          isAnonymous,
        }),
      });

      if (response.ok) {
        await fetchMoodData();
        setMoodNote('');
        setShowLogMood(false);
      }
    } catch (err) {
      console.error('Failed to log mood:', err);
    }
  };

  const getMoodEmoji = (mood: MoodType) => {
    const emojis: Record<MoodType, string> = {
      great: '😊',
      good: '🙂',
      okay: '😐',
      stressed: '😟',
      overwhelmed: '😰',
      frustrated: '😤',
    };
    return emojis[mood];
  };

  const getMoodColor = (mood: MoodType) => {
    const colors: Record<MoodType, string> = {
      great: 'bg-green-100 text-green-800 hover:bg-green-200',
      good: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      okay: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      stressed: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      overwhelmed: 'bg-red-100 text-red-800 hover:bg-red-200',
      frustrated: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    };
    return colors[mood];
  };

  const getMoraleColor = (level: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-500',
      good: 'bg-blue-500',
      moderate: 'bg-yellow-500',
      low: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colors[level] || 'bg-gray-500';
  };

  const getMoraleIcon = (level: string) => {
    const icons: Record<string, string> = {
      high: '🎉',
      good: '😊',
      moderate: '😐',
      low: '😟',
      critical: '🆘',
    };
    return icons[level] || '📊';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return '📈';
    if (trend === 'declining') return '📉';
    return '➡️';
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-32 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Team Morale Indicator */}
      {morale && (
        <div className={`mb-6 p-6 rounded-lg text-white ${getMoraleColor(morale.level)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-4xl">{getMoraleIcon(morale.level)}</span>
                <h2 className="text-2xl font-bold capitalize">{morale.level} Team Morale</h2>
              </div>
              <p className="text-white/90">
                Score: {morale.score.toFixed(1)}/5.0 {getTrendIcon(morale.trend)} {morale.trend}
              </p>
            </div>
            
            {currentUserId && (
              <button
                onClick={() => setShowLogMood(!showLogMood)}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors backdrop-blur-sm"
              >
                Log Your Mood
              </button>
            )}
          </div>
        </div>
      )}

      {/* Log Mood Form */}
      {showLogMood && currentUserId && (
        <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">How are you feeling today?</h3>

          {/* Mood Selection */}
          <div className="grid grid-cols-3 gap-3">
            {(['great', 'good', 'okay', 'stressed', 'overwhelmed', 'frustrated'] as MoodType[]).map((mood) => (
              <button
                key={mood}
                onClick={() => setSelectedMood(mood)}
                className={`px-4 py-3 rounded-lg text-center transition-colors ${
                  selectedMood === mood
                    ? getMoodColor(mood)
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-1">{getMoodEmoji(mood)}</div>
                <div className="text-sm font-medium capitalize">{mood}</div>
              </button>
            ))}
          </div>

          {/* Workload Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Workload
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['light', 'balanced', 'heavy', 'overloaded'] as WorkloadLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setWorkloadLevel(level)}
                  className={`px-3 py-2 text-sm rounded-lg capitalize transition-colors ${
                    workloadLevel === level
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional & Private)
            </label>
            <textarea
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="What's on your mind? This is private..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
              Log anonymously (your identity won't be shown in team stats)
            </label>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={logMood}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Mood
            </button>
            <button
              onClick={() => setShowLogMood(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">Average Mood</p>
            <p className="text-2xl font-bold text-gray-900">{stats.averageMood.toFixed(1)}/5.0</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">Total Check-ins</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.moodDistribution.reduce((sum: number, m: any) => sum + m.count, 0)}
            </p>
          </div>
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">Top Feeling</p>
            <p className="text-2xl font-bold text-gray-900 capitalize">
              {stats.moodDistribution[0]?.mood || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Mood Distribution */}
      {stats && stats.moodDistribution.length > 0 && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Mood Distribution (Last 7 Days)</h3>
          <div className="space-y-2">
            {stats.moodDistribution.map((item: any) => {
              const percentage = (item.count / stats.totalLogs) * 100;
              return (
                <div key={item.mood} className="flex items-center space-x-3">
                  <span className="text-2xl">{getMoodEmoji(item.mood as MoodType)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 capitalize">{item.mood}</span>
                      <span className="text-sm text-gray-500">{item.count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getMoodColor(item.mood as MoodType).split(' ')[0]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Workload Distribution */}
      {stats && stats.workloadDistribution.length > 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Workload Distribution</h3>
          <div className="grid grid-cols-4 gap-2">
            {stats.workloadDistribution.map((item: any) => (
              <div key={item.workloadLevel} className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-lg font-bold text-gray-900">{item.count}</p>
                <p className="text-xs text-gray-600 capitalize">{item.workloadLevel}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mood Trend Chart (Simple) */}
      {trend.length > 0 && (
        <div className="mt-6 p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-4">30-Day Mood Trend</h3>
          <div className="h-32 flex items-end space-x-1">
            {trend.slice(-14).map((day: any, index: number) => {
              const height = (day.averageMood / 5) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                  style={{ height: `${height}%` }}
                  title={`${format(new Date(day.date), 'MMM d')}: ${day.averageMood.toFixed(1)}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>{format(new Date(trend[trend.length - 14]?.date || Date.now()), 'MMM d')}</span>
            <span>{format(new Date(trend[trend.length - 1]?.date || Date.now()), 'MMM d')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodTrackerDashboard;

