/**
 * @fileoverview Search Analytics Component
 * @description Provides insights and analytics for message search patterns
 * @author Claude Code Assistant
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ChartWrapper } from '../charts/ChartWrapper';
import { 
  TrendingUp, 
  Search, 
  Clock, 
  Users, 
  MessageSquare,
  Calendar,
  Hash,
  Target
} from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface SearchAnalyticsProps {
  searchHistory?: SearchHistoryItem[];
  searchResults?: any[];
  className?: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
  userId: string;
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    users?: string[];
    channels?: string[];
    types?: string[];
  };
}

export default function SearchAnalytics({ 
  searchHistory = [], 
  searchResults = [],
  className 
}: SearchAnalyticsProps) {
  // Mock data for demonstration - in production this would come from backend analytics
  const mockSearchHistory: SearchHistoryItem[] = [
    {
      id: '1',
      query: 'project requirements',
      timestamp: subDays(new Date(), 1),
      resultCount: 23,
      userId: 'user1',
      filters: { types: ['text'] }
    },
    {
      id: '2', 
      query: 'from:sarah@company.com deadline',
      timestamp: subDays(new Date(), 2),
      resultCount: 12,
      userId: 'user1',
      filters: { users: ['sarah@company.com'] }
    },
    {
      id: '3',
      query: 'meeting notes',
      timestamp: subDays(new Date(), 3),
      resultCount: 45,
      userId: 'user2'
    },
    {
      id: '4',
      query: 'budget approval',
      timestamp: subDays(new Date(), 4),
      resultCount: 8,
      userId: 'user1'
    },
    {
      id: '5',
      query: 'is:pinned announcement',
      timestamp: subDays(new Date(), 5),
      resultCount: 5,
      userId: 'user3',
      filters: { types: ['text'] }
    }
  ];

  const history = searchHistory.length > 0 ? searchHistory : mockSearchHistory;

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalSearches = history.length;
    const uniqueQueries = new Set(history.map(h => h.query.toLowerCase())).size;
    const avgResultsPerSearch = history.reduce((sum, h) => sum + h.resultCount, 0) / totalSearches || 0;
    
    // Most common search terms
    const termFrequency = new Map<string, number>();
    history.forEach(h => {
      const words = h.query.toLowerCase().split(' ').filter(w => w.length > 2);
      words.forEach(word => {
        termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
      });
    });
    
    const popularTerms = Array.from(termFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Search frequency by day
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });
    
    const searchesByDay = last7Days.map(day => {
      const daySearches = history.filter(h => 
        format(h.timestamp, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).length;
      
      return {
        date: format(day, 'MMM dd'),
        searches: daySearches
      };
    });

    // Filter usage analytics
    const filterUsage = {
      userFilters: history.filter(h => h.filters?.users?.length).length,
      dateFilters: history.filter(h => h.filters?.dateFrom || h.filters?.dateTo).length,
      typeFilters: history.filter(h => h.filters?.types?.length).length,
      totalWithFilters: history.filter(h => h.filters && Object.keys(h.filters).length > 0).length
    };

    return {
      totalSearches,
      uniqueQueries,
      avgResultsPerSearch: Math.round(avgResultsPerSearch * 10) / 10,
      popularTerms,
      searchesByDay,
      filterUsage
    };
  }, [history]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const filterData = [
    { name: 'User Filters', value: analytics.filterUsage.userFilters, color: COLORS[0] },
    { name: 'Date Filters', value: analytics.filterUsage.dateFilters, color: COLORS[1] },
    { name: 'Type Filters', value: analytics.filterUsage.typeFilters, color: COLORS[2] },
    { name: 'No Filters', value: analytics.totalSearches - analytics.filterUsage.totalWithFilters, color: COLORS[3] }
  ];

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="filters">Filter Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalSearches}</div>
                <p className="text-xs text-muted-foreground">
                  Last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Queries</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.uniqueQueries}</div>
                <p className="text-xs text-muted-foreground">
                  {Math.round((analytics.uniqueQueries / analytics.totalSearches) * 100)}% unique
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Results</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgResultsPerSearch}</div>
                <p className="text-xs text-muted-foreground">
                  Per search query
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Filter Usage</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((analytics.filterUsage.totalWithFilters / analytics.totalSearches) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Searches with filters
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Popular Search Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Most Popular Search Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analytics.popularTerms.map(([term, count], index) => (
                  <Badge key={term} variant="secondary" className="text-sm">
                    {term} ({count})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Search History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Searches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {history.slice(0, 10).map((search) => (
                    <div key={search.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-mono">{search.query}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(search.timestamp, 'MMM dd, HH:mm')} • {search.resultCount} results
                        </p>
                      </div>
                      {search.filters && Object.keys(search.filters).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Filtered
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Search Activity (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <BarChart data={analytics.searchesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="searches" fill="#8884d8" />
                </BarChart>
              </ChartWrapper>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Filter Usage Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <PieChart>
                  <Pie
                    data={filterData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {filterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ChartWrapper>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">User Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.filterUsage.userFilters}</div>
                <p className="text-xs text-muted-foreground">from:user searches</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Date Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.filterUsage.dateFilters}</div>
                <p className="text-xs text-muted-foreground">after:/before: searches</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Type Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.filterUsage.typeFilters}</div>
                <p className="text-xs text-muted-foreground">type: searches</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}