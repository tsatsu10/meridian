import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { API_BASE_URL, API_URL } from '@/constants/urls';

const EVENT_TYPES = [
  { key: 'status', label: 'Status' },
  { key: 'comment', label: 'Comment' },
  { key: 'message', label: 'Message' },
  { key: 'file', label: 'File' },
  { key: 'assignment', label: 'Assignment' },
  { key: 'label', label: 'Label' },
  { key: 'due', label: 'Due Date' },
  { key: 'attachment', label: 'Attachment' },
];

export default function TaskActivityFeed({ taskId }) {
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(EVENT_TYPES.map(e => [e.key, true]))
  );
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/activity/${taskId}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch activities');
        return res.json();
      })
      .then(data => {
        setActivities(data);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [taskId]);

  const handleFilterChange = (key) => {
    setFilters(f => ({ ...f, [key]: !f[key] }));
  };

  const filteredActivities = activities.filter(event => filters[event.type]);

  const getIcon = (type) => {
    switch (type) {
      case 'status': return '🔄';
      case 'comment': return '💬';
      case 'message': return '💬';
      case 'file': return '📎';
      case 'assignment': return '👤';
      case 'label': return '🏷️';
      case 'due': return '⏰';
      case 'attachment': return '📎';
      default: return '❓';
    }
  };

  return (
    <div>
      <style>{`
        .highlight-ring {
          transition: box-shadow 0.5s, border-color 0.5s;
          box-shadow: 0 0 0 4px #60a5fa44;
          border-color: #3b82f6;
          animation: fadeRing 2s forwards;
        }
        @keyframes fadeRing {
          0% { box-shadow: 0 0 0 4px #60a5fa44; }
          100% { box-shadow: 0 0 0 0px #60a5fa00; }
        }
        .filter-checkbox {
          margin-right: 0.5rem;
          accent-color: #3b82f6;
        }
        .filter-label {
          margin-right: 1rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .filter-label:hover {
          color: #2563eb;
        }
      `}</style>
      <div className="mb-2 flex flex-wrap gap-2">
        {EVENT_TYPES.map(e => (
          <label key={e.key} className="filter-label flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              className="filter-checkbox"
              checked={filters[e.key]}
              onChange={() => handleFilterChange(e.key)}
            />
            {e.label}
          </label>
        ))}
      </div>
      {loading && <div className="text-xs text-gray-500">Loading activity…</div>}
      {error && <div className="text-xs text-red-500">{error}</div>}
      <div className="border-l-2 border-gray-200 pl-4">
        {filteredActivities.map((event, i) => (
          <div key={i} className="mb-6 relative">
            <div className="absolute -left-3 top-0 w-6 h-6 flex items-center justify-center">
              {getIcon(event.type)}
            </div>
            <div className="ml-6">
              <div className="text-xs text-gray-500 mb-1">
                {event.user || event.userEmail} • {new Date(event.timestamp || event.createdAt).toLocaleString()}
              </div>
              <div className="mb-1">
                {event.content || event.description}
              </div>
              {event.messageId && event.channelId && (
                <Link
                  to="/dashboard/chat"
                  search={{ channel: event.channelId, message: event.messageId }}
                  className="text-xs text-blue-700 underline"
                >
                  View Message
                </Link>
              )}
              {event.commentId && (
                <a href={`/dashboard/task/${taskId}/comment/${event.commentId}`} className="text-xs text-blue-700 underline ml-2">View Comment</a>
              )}
              {event.fileId && (
                <a href={`/dashboard/task/${taskId}/file/${event.fileId}`} className="text-xs text-blue-700 underline ml-2">View File</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 