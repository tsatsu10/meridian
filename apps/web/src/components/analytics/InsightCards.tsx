import React, { useState, useEffect } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Lightbulb,
  Target,
  Clock,
  Users,
  Zap,
  ArrowRight,
  RefreshCw,
  Eye,
  Star,
  MessageSquare,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/toast';
import { useAuth } from '@/components/providers/unified-context-provider';

interface Insight {
  id: string;
  type: 'prediction' | 'anomaly' | 'recommendation' | 'pattern' | 'risk';
  category: 'productivity' | 'quality' | 'timeline' | 'resource' | 'performance';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  data: any;
  insights: string[];
  recommendations: string[];
  created: Date;
  relevantUntil?: Date;
  isNew?: boolean;
  isDismissed?: boolean;
  workspaceId: string;
}

interface InsightCardsProps {
  workspaceId: string;
  className?: string;
  onInsightAction?: (insight: Insight, action: string) => void;
}

export const InsightCards: React.FC<InsightCardsProps> = ({
  workspaceId,
  className = '',
  onInsightAction
}) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<'all' | 'prediction' | 'anomaly' | 'recommendation' | 'pattern' | 'risk'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'created'>('confidence');
  const [isLoading, setIsLoading] = useState(true);

  // Load insights from API
  useEffect(() => {
    loadInsights();
  }, [workspaceId]);

  const loadInsights = async () => {
    if (!workspaceId || !user?.token) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/analytics/insights?workspaceId=${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
      } else {
        console.error('Failed to load insights');
        toast.error('Failed to load AI insights');
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return <Target className="w-5 h-5" />;
      case 'anomaly': return <AlertTriangle className="w-5 h-5" />;
      case 'recommendation': return <Lightbulb className="w-5 h-5" />;
      case 'pattern': return <TrendingUp className="w-5 h-5" />;
      case 'risk': return <AlertTriangle className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'productivity': return <Zap className="w-4 h-4" />;
      case 'quality': return <Star className="w-4 h-4" />;
      case 'timeline': return <Clock className="w-4 h-4" />;
      case 'resource': return <Users className="w-4 h-4" />;
      case 'performance': return <TrendingUp className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const filteredInsights = insights
    .filter(insight => !insight.isDismissed)
    .filter(insight => filter === 'all' || insight.type === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'impact':
          const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return impactOrder[b.impact] - impactOrder[a.impact];
        case 'created':
          return new Date(b.created).getTime() - new Date(a.created).getTime();
        default:
          return 0;
      }
    });

  const handleInsightAction = async (insight: Insight, action: string) => {
    if (!user?.token) return;

    try {
      if (action === 'dismiss') {
        const response = await fetch(`${API_BASE_URL}/analytics/insights/${insight.id}/dismiss`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setInsights(insights.map(i => 
            i.id === insight.id ? { ...i, isDismissed: true } : i
          ));
          toast.success('Insight dismissed');
        }
      } else if (action === 'implement') {
        const response = await fetch(`${API_BASE_URL}/analytics/insights/${insight.id}/implement`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setInsights(insights.map(i => 
            i.id === insight.id ? { ...i, isNew: false } : i
          ));
          toast.success('Insight marked as implemented');
        }
      }
      
      onInsightAction?.(insight, action);
    } catch (error) {
      console.error('Error handling insight action:', error);
      toast.error('Failed to process insight action');
    }
  };

  const refreshInsights = async () => {
    if (!workspaceId || !user?.token) return;
    
    try {
      setIsLoading(true);
      
      // Trigger new insight generation
      const response = await fetch(`${API_BASE_URL}/analytics/insights/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workspaceId,
          timeRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date()
          }
        })
      });

      if (response.ok) {
        // Reload insights after generation
        await loadInsights();
        toast.success('New insights generated successfully');
      } else {
        throw new Error('Failed to generate insights');
      }
    } catch (error) {
      console.error('Error refreshing insights:', error);
      toast.error('Failed to refresh insights');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">AI Insights</h3>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold">AI Insights</h3>
          <Badge variant="secondary" className="ml-2">
            {filteredInsights.length} insights
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="prediction">Predictions</option>
            <option value="anomaly">Anomalies</option>
            <option value="recommendation">Recommendations</option>
            <option value="pattern">Patterns</option>
            <option value="risk">Risks</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="confidence">Sort by Confidence</option>
            <option value="impact">Sort by Impact</option>
            <option value="created">Sort by Date</option>
          </select>
          <Button variant="outline" size="sm" onClick={refreshInsights} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`relative ${insight.isNew ? 'ring-2 ring-blue-500' : ''}`}>
                {insight.isNew && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-blue-600 text-white text-xs">NEW</Badge>
                  </div>
                )}
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold leading-tight">
                          {insight.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getImpactColor(insight.impact)}`}
                          >
                            {insight.impact.toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(insight.category)}
                            <span className="text-xs text-gray-500 capitalize">
                              {insight.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    {insight.description}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Confidence</span>
                        <span>{insight.confidence}%</span>
                      </div>
                      <Progress value={insight.confidence} className="h-2" />
                    </div>

                    {insight.insights.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Key Insights</h4>
                        <ul className="space-y-1">
                          {insight.insights.slice(0, 2).map((insightText, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                              <div className="w-1 h-1 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span>{insightText}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {insight.actionable && insight.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Recommendations</h4>
                        <ul className="space-y-1">
                          {insight.recommendations.slice(0, 2).map((rec, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                              <Lightbulb className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleInsightAction(insight, 'view')}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                        {insight.actionable && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleInsightAction(insight, 'implement')}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Implement
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsightAction(insight, 'dismiss')}
                      >
                        <MessageSquare className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {filteredInsights.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Brain className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No insights available</p>
              <p className="text-sm text-gray-400">Check back later for new AI-powered insights</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 