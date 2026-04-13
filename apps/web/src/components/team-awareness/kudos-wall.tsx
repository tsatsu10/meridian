/**
 * Kudos Wall Component
 * Team recognition and appreciation
 * Phase 2 - Team Awareness Features
 */

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

type KudosType = 'great-work' | 'helpful' | 'creative' | 'teamwork' | 'leadership' | 'problem-solving';

interface Kudos {
  id: string;
  giverId: string;
  receiverId: string;
  type: KudosType;
  message: string;
  reactions: Record<string, string[]>;
  createdAt: string;
  giver: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  receiver?: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
}

interface KudosWallProps {
  workspaceId: string;
  currentUserId?: string;
  limit?: number;
  className?: string;
}

export const KudosWall: React.FC<KudosWallProps> = ({
  workspaceId,
  currentUserId,
  limit = 20,
  className = '',
}) => {
  const [kudosList, setKudosList] = useState<Kudos[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGiveKudos, setShowGiveKudos] = useState(false);
  const [selectedType, setSelectedType] = useState<KudosType>('great-work');
  const [message, setMessage] = useState('');
  const [receiverId, setReceiverId] = useState('');

  useEffect(() => {
    fetchKudos();
  }, [workspaceId]);

  const fetchKudos = async () => {
    try {
      const response = await fetch(
        `/api/team-awareness/kudos?workspaceId=${workspaceId}&limit=${limit}`
      );
      const data = await response.json();

      if (response.ok) {
        setKudosList(data.kudos);
      }
    } catch (err) {
      console.error('Failed to fetch kudos:', err);
    } finally {
      setLoading(false);
    }
  };

  const giveKudos = async () => {
    if (!currentUserId || !receiverId || !message.trim()) return;

    try {
      const response = await fetch('/api/team-awareness/kudos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          giverId: currentUserId,
          receiverId,
          type: selectedType,
          message: message.trim(),
          isPublic: true,
        }),
      });

      if (response.ok) {
        await fetchKudos();
        setMessage('');
        setReceiverId('');
        setShowGiveKudos(false);
      }
    } catch (err) {
      console.error('Failed to give kudos:', err);
    }
  };

  const addReaction = async (kudosId: string, emoji: string) => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/team-awareness/kudos/${kudosId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, emoji }),
      });

      if (response.ok) {
        await fetchKudos();
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }
  };

  const getKudosIcon = (type: KudosType) => {
    const icons: Record<KudosType, string> = {
      'great-work': '⭐',
      helpful: '🤝',
      creative: '💡',
      teamwork: '👥',
      leadership: '👑',
      'problem-solving': '🧩',
    };
    return icons[type];
  };

  const getKudosColor = (type: KudosType) => {
    const colors: Record<KudosType, string> = {
      'great-work': 'bg-yellow-100 text-yellow-800',
      helpful: 'bg-blue-100 text-blue-800',
      creative: 'bg-purple-100 text-purple-800',
      teamwork: 'bg-green-100 text-green-800',
      leadership: 'bg-red-100 text-red-800',
      'problem-solving': 'bg-indigo-100 text-indigo-800',
    };
    return colors[type];
  };

  const getKudosLabel = (type: KudosType) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
            <div className="h-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Give Kudos Button */}
      {currentUserId && (
        <div className="mb-6">
          <button
            onClick={() => setShowGiveKudos(!showGiveKudos)}
            className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-medium rounded-lg hover:from-yellow-500 hover:to-orange-600 transition-all shadow-md hover:shadow-lg"
          >
            ⭐ Give Kudos to a Team Member
          </button>

          {/* Give Kudos Form */}
          {showGiveKudos && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kudos Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['great-work', 'helpful', 'creative', 'teamwork', 'leadership', 'problem-solving'] as KudosType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedType === type
                          ? getKudosColor(type)
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {getKudosIcon(type)} {getKudosLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient (User ID)
                </label>
                <input
                  type="text"
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  placeholder="Enter user ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Why are you giving kudos? Share the details..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">{message.length}/500</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={giveKudos}
                  disabled={!receiverId || !message.trim()}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Send Kudos
                </button>
                <button
                  onClick={() => setShowGiveKudos(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kudos Feed */}
      <div className="space-y-4">
        {kudosList.map((kudos) => (
          <div
            key={kudos.id}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            {/* Kudos Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                {/* Giver */}
                <div className="flex-shrink-0">
                  {kudos.giver.avatarUrl ? (
                    <img
                      src={kudos.giver.avatarUrl}
                      alt={kudos.giver.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {kudos.giver.username[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{kudos.giver.username}</span>
                    {' gave kudos to '}
                    <span className="font-medium">{kudos.receiver?.username || 'someone'}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(kudos.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Kudos Type Badge */}
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getKudosColor(kudos.type)}`}>
                {getKudosIcon(kudos.type)} {getKudosLabel(kudos.type)}
              </span>
            </div>

            {/* Kudos Message */}
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{kudos.message}</p>
            </div>

            {/* Reactions */}
            <div className="flex items-center space-x-2">
              {['👏', '❤️', '🎉', '🔥', '💯'].map((emoji) => {
                const count = kudos.reactions[emoji]?.length || 0;
                const hasReacted = currentUserId && kudos.reactions[emoji]?.includes(currentUserId);

                return (
                  <button
                    key={emoji}
                    onClick={() => addReaction(kudos.id, emoji)}
                    className={`px-2 py-1 text-sm rounded-lg transition-colors ${
                      hasReacted
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {emoji} {count > 0 && count}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {kudosList.length === 0 && (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-500">No kudos yet. Be the first to recognize someone!</p>
        </div>
      )}
    </div>
  );
};

export default KudosWall;

