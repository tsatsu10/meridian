import React, { useState, useEffect } from 'react';
import { API_BASE_URL, API_URL } from '@/constants/urls';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertTriangle, Shield, Lock, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  eventType: string;
  success: boolean;
  timestamp: number;
  userEmail?: string;
  ipAddress: string;
  riskScore?: number;
  riskFactors?: string[];
  errorCode?: string;
  errorMessage?: string;
  location?: string;
  authMethod?: string;
}

interface SecurityStats {
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  highRiskEvents: number;
  uniqueIPs: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
  riskTrends: Array<{ date: string; avgRisk: number }>;
}

export function SecurityDashboard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      const [eventsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/audit/security-logs?limit=20`),
        fetch(`${API_BASE_URL}/audit/stats?days=${timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30}`)
      ]);

      const eventsData = await eventsResponse.json();
      const statsData = await statsResponse.json();

      if (eventsData.success) {
        setEvents(eventsData.data);
      }

      if (statsData.success) {
        // Transform stats for security view
        const securityStats: SecurityStats = {
          totalEvents: statsData.data.totalEvents,
          successfulLogins: statsData.data.recentSecurityFailures.length, // This would need proper backend calculation
          failedLogins: statsData.data.recentSecurityFailures.length,
          highRiskEvents: 0, // Calculate from events
          uniqueIPs: 0, // Calculate from events
          topFailureReasons: [],
          riskTrends: [],
        };
        setStats(securityStats);
      }
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Refresh every 30 seconds for security monitoring
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const getRiskColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 70) return 'bg-red-100 text-red-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getRiskLevel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 70) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  };

  const renderSecurityEvent = (event: SecurityEvent) => (
    <div key={event.id} className="border rounded-lg p-4 mb-3 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {event.success ? (
              <Shield className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="font-medium">
              {event.eventType.replace(/_/g, ' ').toUpperCase()}
            </span>
            {event.riskScore && (
              <Badge className={getRiskColor(event.riskScore)}>
                {getRiskLevel(event.riskScore)} Risk ({event.riskScore})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
            <div className="flex items-center gap-1">
              <span className="font-medium">User:</span>
              <span>{event.userEmail || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">IP:</span>
              <span className="font-mono">{event.ipAddress}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Time:</span>
              <span>{format(new Date(event.timestamp * 1000), 'MMM dd, HH:mm:ss')}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Method:</span>
              <span>{event.authMethod || 'N/A'}</span>
            </div>
          </div>

          {!event.success && event.errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
              <p className="text-sm text-red-700">
                <span className="font-medium">Error:</span> {event.errorMessage}
              </p>
            </div>
          )}

          {event.riskFactors && event.riskFactors.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {event.riskFactors.map((factor, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {factor.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && !events.length) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading security dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats ? Math.round((stats.successfulLogins / (stats.successfulLogins + stats.failedLogins)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last {timeRange}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.failedLogins || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Events</CardTitle>
            <Shield className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {events.filter(e => (e.riskScore || 0) >= 70).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(events.map(e => e.ipAddress)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Active sources
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {['24h', '7d', '30d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Recent Security Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Recent Security Events
          </CardTitle>
          <p className="text-sm text-gray-600">
            Latest authentication and security events
          </p>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No security events found.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {events.map(renderSecurityEvent)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Active Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.filter(e => !e.success && (e.riskScore || 0) >= 70).length === 0 ? (
            <div className="text-center py-4">
              <Shield className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">All Clear</p>
              <p className="text-sm text-gray-600">No active security alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events
                .filter(e => !e.success && (e.riskScore || 0) >= 70)
                .slice(0, 5)
                .map(event => (
                  <div key={event.id} className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">
                          High Risk {event.eventType.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-red-700">
                          {event.userEmail || 'Anonymous user'} from {event.ipAddress}
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          {format(new Date(event.timestamp * 1000), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}