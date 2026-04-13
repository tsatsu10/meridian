/**
 * Notification Preferences Component
 * Granular notification settings panel
 * Phase 2.2 - Smart Notifications System
 */

import React, { useState, useEffect } from 'react';

interface NotificationPreferences {
  // Channels
  inAppEnabled: boolean;
  emailEnabled: boolean;
  slackEnabled: boolean;
  teamsEnabled: boolean;

  // Type-specific preferences
  typePreferences: Record<string, { enabled: boolean; channels: string[] }>;

  // Digests
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  weeklyDigestEnabled: boolean;
  weeklyDigestDay: number;
  weeklyDigestTime: string;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;

  // Grouping
  groupSimilarNotifications: boolean;
  groupingWindowMinutes: number;

  // Priority
  minimumPriority: string;
}

interface NotificationPreferencesProps {
  userId: string;
  workspaceId: string;
  onSave?: () => void;
  className?: string;
}

const NOTIFICATION_TYPES = [
  { value: 'task_assigned', label: 'Task Assigned', description: 'When you are assigned to a task' },
  { value: 'task_completed', label: 'Task Completed', description: 'When a task you created is completed' },
  { value: 'task_overdue', label: 'Task Overdue', description: 'When your tasks become overdue' },
  { value: 'comment_mention', label: 'Mentions', description: 'When someone mentions you in a comment' },
  { value: 'comment_reply', label: 'Comment Replies', description: 'When someone replies to your comment' },
  { value: 'deadline_approaching', label: 'Upcoming Deadlines', description: 'When deadlines are approaching (24h)' },
  { value: 'kudos_received', label: 'Kudos', description: 'When you receive kudos' },
  { value: 'skill_endorsed', label: 'Skill Endorsements', description: 'When someone endorses your skills' },
  { value: 'mood_reminder', label: 'Mood Reminders', description: 'Daily reminders to log your mood' },
  { value: 'project_update', label: 'Project Updates', description: 'When projects you follow are updated' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  userId,
  workspaceId,
  onSave,
  className = '',
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'channels' | 'types' | 'digests' | 'advanced'>('channels');

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/notifications/preferences?userId=${userId}&workspaceId=${workspaceId}`
      );
      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await fetch(
        `/api/notifications/preferences?userId=${userId}&workspaceId=${workspaceId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
        }
      );

      if (onSave) {
        onSave();
      }

      // Show success message
      alert('Preferences saved successfully!');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const updateTypePreference = (type: string, updates: any) => {
    setPreferences((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        typePreferences: {
          ...prev.typePreferences,
          [type]: {
            ...prev.typePreferences[type],
            ...updates,
          },
        },
      };
    });
  };

  if (loading || !preferences) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
        <p className="mt-1 text-sm text-gray-600">
          Customize how and when you receive notifications
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1 px-6">
          {[
            { id: 'channels', label: 'Channels', icon: '📡' },
            { id: 'types', label: 'Notification Types', icon: '🔔' },
            { id: 'digests', label: 'Digests', icon: '📧' },
            { id: 'advanced', label: 'Advanced', icon: '⚙️' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Channels Section */}
        {activeSection === 'channels' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Channels</h3>
              <p className="text-sm text-gray-600 mb-6">
                Choose where you want to receive notifications
              </p>

              <div className="space-y-4">
                {[
                  { key: 'inAppEnabled', label: 'In-App Notifications', description: 'Get notifications in the app', icon: '🔔' },
                  { key: 'emailEnabled', label: 'Email Notifications', description: 'Receive notifications via email', icon: '📧' },
                  { key: 'slackEnabled', label: 'Slack Notifications', description: 'Get notified in Slack', icon: '💬' },
                  { key: 'teamsEnabled', label: 'Microsoft Teams', description: 'Get notified in Teams', icon: '👥' },
                ].map((channel) => (
                  <div
                    key={channel.key}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{channel.icon}</span>
                      <div>
                        <p className="font-medium text-gray-900">{channel.label}</p>
                        <p className="text-sm text-gray-600">{channel.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences[channel.key as keyof NotificationPreferences] as boolean}
                        onChange={(e) => updatePreference(channel.key as any, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notification Types Section */}
        {activeSection === 'types' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
              <p className="text-sm text-gray-600 mb-6">
                Control which types of notifications you receive
              </p>

              <div className="space-y-3">
                {NOTIFICATION_TYPES.map((type) => {
                  const typePref = preferences.typePreferences[type.value] || { enabled: true };
                  return (
                    <div
                      key={type.value}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{type.label}</p>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-4">
                        <input
                          type="checkbox"
                          checked={typePref.enabled !== false}
                          onChange={(e) =>
                            updateTypePreference(type.value, { enabled: e.target.checked })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Digests Section */}
        {activeSection === 'digests' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Digests</h3>
              <p className="text-sm text-gray-600 mb-6">
                Receive periodic summaries of your notifications
              </p>

              {/* Daily Digest */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Daily Digest</p>
                    <p className="text-sm text-gray-600">Get a daily summary of notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.dailyDigestEnabled}
                      onChange={(e) => updatePreference('dailyDigestEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {preferences.dailyDigestEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send time
                    </label>
                    <input
                      type="time"
                      value={preferences.dailyDigestTime}
                      onChange={(e) => updatePreference('dailyDigestTime', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Weekly Digest */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Weekly Digest</p>
                    <p className="text-sm text-gray-600">Get a weekly summary of notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.weeklyDigestEnabled}
                      onChange={(e) => updatePreference('weeklyDigestEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {preferences.weeklyDigestEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day of week
                      </label>
                      <select
                        value={preferences.weeklyDigestDay}
                        onChange={(e) => updatePreference('weeklyDigestDay', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Send time
                      </label>
                      <input
                        type="time"
                        value={preferences.weeklyDigestTime}
                        onChange={(e) => updatePreference('weeklyDigestTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Section */}
        {activeSection === 'advanced' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>

              {/* Quiet Hours */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Quiet Hours</p>
                    <p className="text-sm text-gray-600">Pause notifications during specific hours</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.quietHoursEnabled}
                      onChange={(e) => updatePreference('quietHoursEnabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {preferences.quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start time
                      </label>
                      <input
                        type="time"
                        value={preferences.quietHoursStart}
                        onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End time
                      </label>
                      <input
                        type="time"
                        value={preferences.quietHoursEnd}
                        onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Grouping */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">Group Similar Notifications</p>
                    <p className="text-sm text-gray-600">Combine related notifications</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.groupSimilarNotifications}
                      onChange={(e) => updatePreference('groupSimilarNotifications', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {preferences.groupSimilarNotifications && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grouping window (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={preferences.groupingWindowMinutes}
                      onChange={(e) =>
                        updatePreference('groupingWindowMinutes', parseInt(e.target.value))
                      }
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Priority Filtering */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Minimum Priority</p>
                <p className="text-sm text-gray-600 mb-4">Only show notifications above this priority</p>
                <select
                  value={preferences.minimumPriority}
                  onChange={(e) => updatePreference('minimumPriority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
        <button
          onClick={fetchPreferences}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

export default NotificationPreferences;

