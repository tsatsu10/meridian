/**
 * Team Status Board Component
 * Display real-time team availability
 * Phase 2 - Team Awareness Features
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

type StatusType = 'online' | 'away' | 'busy' | 'offline' | 'in-meeting' | 'focus';

interface TeamMember {
  userId: string;
  status: StatusType;
  statusMessage?: string;
  statusEmoji?: string;
  lastSeenAt?: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
  };
}

interface TeamStatusBoardProps {
  workspaceId: string;
  currentUserId?: string;
  onStatusChange?: (userId: string, status: StatusType) => void;
  className?: string;
}

export const TeamStatusBoard: React.FC<TeamStatusBoardProps> = ({
  workspaceId,
  currentUserId,
  onStatusChange,
  className = '',
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    fetchTeamStatuses();
    const interval = setInterval(fetchTeamStatuses, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [workspaceId]);

  const fetchTeamStatuses = async () => {
    try {
      const response = await fetch(`/api/team-awareness/status/workspace/${workspaceId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch team statuses');
      }

      setTeamMembers(data.statuses);
    } catch (err) {
      console.error('Failed to fetch team statuses:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateMyStatus = async (status: StatusType, message?: string, emoji?: string) => {
    if (!currentUserId) return;

    try {
      const response = await fetch('/api/team-awareness/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          workspaceId,
          status,
          statusMessage: message,
          statusEmoji: emoji,
        }),
      });

      if (response.ok) {
        await fetchTeamStatuses();
        setShowStatusMenu(false);
        setCustomMessage('');
        onStatusChange?.(currentUserId, status);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getStatusColor = (status: StatusType) => {
    const colors: Record<StatusType, string> = {
      online: 'bg-green-500',
      away: 'bg-yellow-500',
      busy: 'bg-red-500',
      offline: 'bg-gray-400',
      'in-meeting': 'bg-purple-500',
      focus: 'bg-blue-500',
    };
    return colors[status] || 'bg-gray-400';
  };

  const getStatusLabel = (status: StatusType) => {
    const labels: Record<StatusType, string> = {
      online: '🟢 Online',
      away: '🟡 Away',
      busy: '🔴 Busy',
      offline: '⚫ Offline',
      'in-meeting': '🟣 In Meeting',
      focus: '🔵 Focus Mode',
    };
    return labels[status] || status;
  };

  const getStatusCount = (status: StatusType) => {
    return teamMembers.filter((m) => m.status === status).length;
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const currentUser = teamMembers.find((m) => m.userId === currentUserId);
  const otherMembers = teamMembers.filter((m) => m.userId !== currentUserId);

  return (
    <div className={className}>
      {/* Current User Status */}
      {currentUser && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                {currentUser.user.avatarUrl ? (
                  <img
                    src={currentUser.user.avatarUrl}
                    alt="You"
                    className="w-12 h-12 rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
                    {currentUser.user.username[0].toUpperCase()}
                  </div>
                )}
                <div className={`absolute bottom-0 right-0 w-4 h-4 ${getStatusColor(currentUser.status)} rounded-full border-2 border-white`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">You</p>
                <p className="text-sm text-gray-600">
                  {currentUser.statusEmoji && <span className="mr-1">{currentUser.statusEmoji}</span>}
                  {currentUser.statusMessage || getStatusLabel(currentUser.status)}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Change Status
            </button>
          </div>

          {/* Status Change Menu */}
          {showStatusMenu && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {(['online', 'away', 'busy', 'in-meeting', 'focus'] as StatusType[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => updateMyStatus(status)}
                    className="px-3 py-2 text-sm text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t">
                <input
                  type="text"
                  placeholder="Custom status message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customMessage) {
                      updateMyStatus('online', customMessage);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Availability Summary */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{getStatusCount('online')}</p>
          <p className="text-xs text-green-700">Online</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{getStatusCount('away')}</p>
          <p className="text-xs text-yellow-700">Away</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{getStatusCount('busy')}</p>
          <p className="text-xs text-red-700">Busy</p>
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Team Members ({otherMembers.length})</h3>
        {otherMembers.map((member) => (
          <div
            key={member.userId}
            className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="relative">
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.username}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {member.user.username[0].toUpperCase()}
                </div>
              )}
              <div className={`absolute bottom-0 right-0 w-3 h-3 ${getStatusColor(member.status)} rounded-full border-2 border-white`} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{member.user.username}</p>
              <p className="text-sm text-gray-600 truncate">
                {member.statusEmoji && <span className="mr-1">{member.statusEmoji}</span>}
                {member.statusMessage || getStatusLabel(member.status)}
              </p>
              {member.lastSeenAt && member.status === 'offline' && (
                <p className="text-xs text-gray-400">
                  Last seen {format(new Date(member.lastSeenAt), 'MMM d, h:mm a')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {otherMembers.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No other team members online</p>
        </div>
      )}
    </div>
  );
};

export default TeamStatusBoard;

