/**
 * Timeline View Component
 * Simplified timeline visualization for project milestones
 * Phase 3.2 - Gantt Chart & Timeline Visualization
 */

import React, { useState, useEffect } from 'react';

interface TimelineEvent {
  id: string;
  title: string;
  date: Date;
  type: 'milestone' | 'task' | 'deadline';
  status: string;
  isCritical: boolean;
}

interface TimelineViewProps {
  projectId: string;
  onEventClick?: (eventId: string) => void;
  className?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  projectId,
  onEventClick,
  className = '',
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'milestones' | 'critical'>('all');

  useEffect(() => {
    fetchTimelineData();
  }, [projectId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gantt/${projectId}`);
      const data = await response.json();

      const { ganttData } = data;

      // Convert tasks to timeline events
      const timelineEvents: TimelineEvent[] = ganttData.tasks
        .filter((t: any) => t.dueDate || t.endDate)
        .map((t: any) => ({
          id: t.id,
          title: t.title,
          date: new Date(t.dueDate || t.endDate),
          type: t.status === 'milestone' ? 'milestone' : 'task',
          status: t.status,
          isCritical: t.isCritical,
        }))
        .sort((a: TimelineEvent, b: TimelineEvent) => a.date.getTime() - b.date.getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filter === 'milestones') return event.type === 'milestone';
    if (filter === 'critical') return event.isCritical;
    return true;
  });

  const groupByMonth = (events: TimelineEvent[]) => {
    const groups: Record<string, TimelineEvent[]> = {};

    events.forEach((event) => {
      const monthKey = event.date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
    });

    return groups;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return '🎯';
      case 'deadline':
        return '⏰';
      default:
        return '📋';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in-progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'blocked':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading timeline...</div>
      </div>
    );
  }

  const groupedEvents = groupByMonth(filteredEvents);

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Project Timeline</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredEvents.length} events across {Object.keys(groupedEvents).length} months
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
            {(['all', 'milestones', 'critical'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📅</div>
            <p>No events to display</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month}>
                {/* Month Header */}
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-32">
                    <div className="text-lg font-bold text-gray-900">{month.split(' ')[0]}</div>
                    <div className="text-sm text-gray-500">{month.split(' ')[1]}</div>
                  </div>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Events */}
                <div className="ml-32 space-y-3">
                  {monthEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick && onEventClick(event.id)}
                      className={`relative pl-6 pb-3 border-l-2 transition-all cursor-pointer hover:bg-gray-50 p-3 rounded-r-lg ${
                        event.isCritical
                          ? 'border-red-500'
                          : 'border-blue-300'
                      }`}
                    >
                      {/* Dot */}
                      <div
                        className={`absolute left-0 top-3 w-4 h-4 rounded-full transform -translate-x-1/2 ${
                          event.isCritical
                            ? 'bg-red-500 ring-4 ring-red-100'
                            : 'bg-blue-500 ring-4 ring-blue-100'
                        }`}
                      />

                      {/* Content */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xl">{getEventIcon(event.type)}</span>
                            <h3 className="font-semibold text-gray-900">{event.title}</h3>
                            {event.isCritical && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                CRITICAL
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {event.date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>

                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            event.status
                          )}`}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🎯</span>
            <span className="text-gray-600">Milestone</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">📋</span>
            <span className="text-gray-600">Task</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl">⏰</span>
            <span className="text-gray-600">Deadline</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full ring-4 ring-red-100" />
            <span className="text-gray-600">Critical Path</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

