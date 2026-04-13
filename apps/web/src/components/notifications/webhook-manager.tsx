/**
 * Webhook Manager Component
 * Manage Slack/Teams/Discord integrations
 * Phase 2.2 - Smart Notifications System
 */

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';

type WebhookProvider = 'slack' | 'teams' | 'discord' | 'custom';

interface Webhook {
  id: string;
  provider: WebhookProvider;
  name: string;
  description?: string;
  webhookUrl: string;
  isEnabled: boolean;
  notificationTypes?: string[];
  projectIds?: string[];
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  failureCount: number;
}

interface WebhookManagerProps {
  workspaceId: string;
  userId: string;
  className?: string;
}

export const WebhookManager: React.FC<WebhookManagerProps> = ({
  workspaceId,
  userId,
  className = '',
}) => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    provider: 'slack' as WebhookProvider,
    name: '',
    description: '',
    webhookUrl: '',
    notificationTypes: [] as string[],
  });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications/webhooks?workspaceId=${workspaceId}`);
      const data = await response.json();
      setWebhooks(data.webhooks || []);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      const response = await fetch('/api/notifications/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          workspaceId,
          userId,
        }),
      });

      if (response.ok) {
        await fetchWebhooks();
        resetForm();
        setShowAddModal(false);
      }
    } catch (err) {
      console.error('Failed to create webhook:', err);
      alert('Failed to create webhook. Please try again.');
    }
  };

  const updateWebhook = async (webhookId: string, updates: any) => {
    try {
      const response = await fetch(`/api/notifications/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchWebhooks();
        setEditingWebhook(null);
      }
    } catch (err) {
      console.error('Failed to update webhook:', err);
      alert('Failed to update webhook. Please try again.');
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await fetch(`/api/notifications/webhooks/${webhookId}`, {
        method: 'DELETE',
      });
      await fetchWebhooks();
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      setTestingWebhook(webhookId);
      const response = await fetch(`/api/notifications/webhooks/${webhookId}/test`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        alert('✅ Webhook test successful! Check your channel for the test message.');
      } else {
        alert('❌ Webhook test failed. Please check your configuration.');
      }
    } catch (err) {
      console.error('Failed to test webhook:', err);
      alert('❌ Webhook test failed. Please check your configuration.');
    } finally {
      setTestingWebhook(null);
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'slack',
      name: '',
      description: '',
      webhookUrl: '',
      notificationTypes: [],
    });
  };

  const getProviderIcon = (provider: WebhookProvider) => {
    const icons: Record<WebhookProvider, string> = {
      slack: '💬',
      teams: '👥',
      discord: '🎮',
      custom: '🔗',
    };
    return icons[provider];
  };

  const getProviderColor = (provider: WebhookProvider) => {
    const colors: Record<WebhookProvider, string> = {
      slack: 'bg-purple-100 text-purple-700',
      teams: 'bg-blue-100 text-blue-700',
      discord: 'bg-indigo-100 text-indigo-700',
      custom: 'bg-gray-100 text-gray-700',
    };
    return colors[provider];
  };

  const getHealthStatus = (webhook: Webhook) => {
    if (webhook.failureCount >= 5) {
      return { color: 'bg-red-500', label: 'Unhealthy', icon: '❌' };
    }
    if (webhook.lastErrorAt) {
      return { color: 'bg-yellow-500', label: 'Warning', icon: '⚠️' };
    }
    if (webhook.lastSuccessAt) {
      return { color: 'bg-green-500', label: 'Healthy', icon: '✅' };
    }
    return { color: 'bg-gray-400', label: 'Unknown', icon: '❓' };
  };

  if (loading) {
    return (
      <div className={`p-8 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Webhook Integrations</h2>
          <p className="mt-1 text-sm text-gray-600">
            Send notifications to Slack, Teams, Discord, and more
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      <div className="p-6">
        {webhooks.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-lg">
            <div className="text-5xl mb-4">🔗</div>
            <p className="text-gray-600 mb-4">No webhooks configured yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Webhook
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => {
              const health = getHealthStatus(webhook);
              return (
                <div
                  key={webhook.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* Webhook Info */}
                    <div className="flex items-start space-x-4 flex-1">
                      <div
                        className={`px-3 py-2 rounded-lg text-2xl ${getProviderColor(webhook.provider)}`}
                      >
                        {getProviderIcon(webhook.provider)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{webhook.name}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded capitalize ${getProviderColor(
                              webhook.provider
                            )}`}
                          >
                            {webhook.provider}
                          </span>
                          {!webhook.isEnabled && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                              Disabled
                            </span>
                          )}
                        </div>

                        {webhook.description && (
                          <p className="text-sm text-gray-600 mb-2">{webhook.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {/* Health Status */}
                          <div className="flex items-center space-x-1">
                            <div className={`w-2 h-2 rounded-full ${health.color}`} />
                            <span>{health.label}</span>
                          </div>

                          {/* Last Success */}
                          {webhook.lastSuccessAt && (
                            <span>
                              ✓ Last success:{' '}
                              {formatDistanceToNow(new Date(webhook.lastSuccessAt), {
                                addSuffix: true,
                              })}
                            </span>
                          )}

                          {/* Failure Count */}
                          {webhook.failureCount > 0 && (
                            <span className="text-red-600">
                              {webhook.failureCount} failure{webhook.failureCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Last Error */}
                        {webhook.lastError && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                            {webhook.lastError}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => testWebhook(webhook.id)}
                        disabled={testingWebhook === webhook.id}
                        className="px-3 py-1.5 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 disabled:opacity-50 transition-colors"
                      >
                        {testingWebhook === webhook.id ? 'Testing...' : 'Test'}
                      </button>

                      <button
                        onClick={() =>
                          updateWebhook(webhook.id, { isEnabled: !webhook.isEnabled })
                        }
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          webhook.isEnabled
                            ? 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                            : 'text-green-600 border border-green-600 hover:bg-green-50'
                        }`}
                      >
                        {webhook.isEnabled ? 'Disable' : 'Enable'}
                      </button>

                      <button
                        onClick={() => deleteWebhook(webhook.id)}
                        className="px-3 py-1.5 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Webhook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Add Webhook Integration</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['slack', 'teams', 'discord', 'custom'] as WebhookProvider[]).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => setFormData({ ...formData, provider })}
                      className={`p-3 border-2 rounded-lg text-center transition-colors ${
                        formData.provider === provider
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{getProviderIcon(provider)}</div>
                      <div className="text-xs font-medium capitalize">{provider}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Team Notifications"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this webhook for?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL *
                </label>
                <input
                  type="url"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Get this URL from your {formData.provider} workspace settings
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createWebhook}
                disabled={!formData.name || !formData.webhookUrl}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Add Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebhookManager;

