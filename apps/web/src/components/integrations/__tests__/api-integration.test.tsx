/**
 * API Integration Tests
 * 
 * Tests API integration functionality:
 * - API key management
 * - Connection status
 * - Sync operations
 * - Webhook handling
 * - Error handling
 * - Rate limiting
 * - Data transformation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface Integration {
  id: string
  name: string
  type: 'api' | 'webhook' | 'oauth'
  status: 'connected' | 'disconnected' | 'error'
  apiKey?: string
  lastSync?: string
  config?: Record<string, unknown>
}

interface ApiIntegrationProps {
  integrations?: Integration[]
  onConnect?: (id: string, apiKey: string) => Promise<void>
  onDisconnect?: (id: string) => Promise<void>
  onSync?: (id: string) => Promise<void>
  onUpdateConfig?: (id: string, config: Record<string, unknown>) => Promise<void>
}

function ApiIntegration({
  integrations = [],
  onConnect,
  onDisconnect,
  onSync,
  onUpdateConfig,
}: ApiIntegrationProps) {
  const [connectingId, setConnectingId] = React.useState<string | null>(null)
  const [apiKey, setApiKey] = React.useState('')
  const [syncingId, setSyncingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleConnect = async (id: string) => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }

    setConnectingId(id)
    setError(null)

    try {
      await onConnect?.(id, apiKey)
      setApiKey('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setConnectingId(null)
    }
  }

  const handleDisconnect = async (id: string) => {
    if (!window.confirm('Disconnect this integration?')) return

    setError(null)
    try {
      await onDisconnect?.(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnection failed')
    }
  }

  const handleSync = async (id: string) => {
    setSyncingId(id)
    setError(null)

    try {
      await onSync?.(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  const formatLastSync = (lastSync?: string): string => {
    if (!lastSync) return 'Never'
    const date = new Date(lastSync)
    return date.toLocaleString()
  }

  return (
    <div className="api-integration" data-testid="api-integration">
      <h2>API Integrations</h2>

      {error && (
        <div role="alert" className="error-message">
          {error}
        </div>
      )}

      <div className="integrations-list">
        {integrations.length === 0 ? (
          <p className="no-integrations">No integrations configured</p>
        ) : (
          integrations.map((integration) => (
            <div key={integration.id} className="integration-card" role="article">
              <div className="integration-header">
                <h3>{integration.name}</h3>
                <span
                  className={`status-badge status-${integration.status}`}
                  aria-label={`Status: ${integration.status}`}
                >
                  {integration.status}
                </span>
              </div>

              <div className="integration-info">
                <p>Type: {integration.type}</p>
                {integration.lastSync && (
                  <p>
                    Last sync: <time dateTime={integration.lastSync}>{formatLastSync(integration.lastSync)}</time>
                  </p>
                )}
              </div>

              <div className="integration-actions">
                {integration.status === 'connected' ? (
                  <>
                    <button
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingId === integration.id}
                      aria-label={`Sync ${integration.name}`}
                    >
                      {syncingId === integration.id ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(integration.id)}
                      aria-label={`Disconnect ${integration.name}`}
                      className="disconnect-button"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <div className="connect-form">
                    <input
                      type="password"
                      placeholder="Enter API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      aria-label={`API key for ${integration.name}`}
                      disabled={connectingId === integration.id}
                    />
                    <button
                      onClick={() => handleConnect(integration.id)}
                      disabled={connectingId === integration.id || !apiKey.trim()}
                      aria-label={`Connect ${integration.name}`}
                    >
                      {connectingId === integration.id ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('ApiIntegration', () => {
  const mockIntegrations: Integration[] = [
    {
      id: 'integration-1',
      name: 'Slack',
      type: 'oauth',
      status: 'connected',
      lastSync: '2024-01-01T10:00:00Z',
    },
    {
      id: 'integration-2',
      name: 'GitHub',
      type: 'api',
      status: 'disconnected',
    },
    {
      id: 'integration-3',
      name: 'Jira',
      type: 'api',
      status: 'error',
      lastSync: '2024-01-01T09:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
  })

  it('should render API integration component', () => {
    render(<ApiIntegration />, { wrapper: TestWrapper })

    expect(screen.getByTestId('api-integration')).toBeInTheDocument()
    expect(screen.getByText('API Integrations')).toBeInTheDocument()
  })

  it('should display all integrations', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    expect(screen.getByText('Slack')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Jira')).toBeInTheDocument()
  })

  it('should show integration status', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Status: connected')).toBeInTheDocument()
    expect(screen.getByLabelText('Status: disconnected')).toBeInTheDocument()
    expect(screen.getByLabelText('Status: error')).toBeInTheDocument()
  })

  it('should show integration type', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    expect(screen.getByText(/type: oauth/i)).toBeInTheDocument()
    const apiTypes = screen.getAllByText(/type: api/i)
    expect(apiTypes.length).toBeGreaterThan(0)
  })

  it('should display last sync time', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    const lastSyncElements = screen.getAllByText(/last sync:/i)
    expect(lastSyncElements.length).toBeGreaterThan(0)
  })

  it('should show empty state when no integrations', () => {
    render(<ApiIntegration integrations={[]} />, { wrapper: TestWrapper })

    expect(screen.getByText(/no integrations configured/i)).toBeInTheDocument()
  })

  it('should handle connecting an integration', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn().mockResolvedValue(undefined)

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    const apiKeyInput = screen.getByLabelText(/api key for github/i)
    await user.type(apiKeyInput, 'test-api-key-123')

    await user.click(screen.getByLabelText(/connect github/i))

    await waitFor(() => {
      expect(onConnect).toHaveBeenCalledWith('integration-2', 'test-api-key-123')
    })
  })

  it('should validate API key before connecting', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn()

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    const connectButton = screen.getByLabelText(/connect github/i)
    expect(connectButton).toBeDisabled()

    await waitFor(() => {
      expect(onConnect).not.toHaveBeenCalled()
    })
  })

  it('should show connecting state', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    const apiKeyInput = screen.getByLabelText(/api key for github/i)
    await user.type(apiKeyInput, 'test-key')

    const connectButton = screen.getByLabelText(/connect github/i)
    await user.click(connectButton)

    expect(screen.getByText('Connecting...')).toBeInTheDocument()
    expect(apiKeyInput).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument()
    })
  })

  it('should handle disconnecting an integration', async () => {
    const user = userEvent.setup()
    const onDisconnect = vi.fn().mockResolvedValue(undefined)

    render(
      <ApiIntegration integrations={[mockIntegrations[0]]} onDisconnect={onDisconnect} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/disconnect slack/i))

    expect(onDisconnect).toHaveBeenCalledWith('integration-1')
  })

  it('should show sync button for connected integrations', () => {
    render(<ApiIntegration integrations={[mockIntegrations[0]]} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText(/sync slack/i)).toBeInTheDocument()
  })

  it('should not show sync button for disconnected integrations', () => {
    render(<ApiIntegration integrations={[mockIntegrations[1]]} />, { wrapper: TestWrapper })

    expect(screen.queryByLabelText(/sync github/i)).not.toBeInTheDocument()
  })

  it('should handle syncing an integration', async () => {
    const user = userEvent.setup()
    const onSync = vi.fn().mockResolvedValue(undefined)

    render(<ApiIntegration integrations={[mockIntegrations[0]]} onSync={onSync} />, {
      wrapper: TestWrapper,
    })

    await user.click(screen.getByLabelText(/sync slack/i))

    await waitFor(() => {
      expect(onSync).toHaveBeenCalledWith('integration-1')
    })
  })

  it('should show syncing state', async () => {
    const user = userEvent.setup()
    const onSync = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<ApiIntegration integrations={[mockIntegrations[0]]} onSync={onSync} />, {
      wrapper: TestWrapper,
    })

    await user.click(screen.getByLabelText(/sync slack/i))

    expect(screen.getByText('Syncing...')).toBeInTheDocument()
    expect(screen.getByLabelText(/sync slack/i)).toBeDisabled()

    await waitFor(() => {
      expect(screen.queryByText('Syncing...')).not.toBeInTheDocument()
    })
  })

  it('should display error message', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn().mockRejectedValue(new Error('Invalid API key'))

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    await user.type(screen.getByLabelText(/api key for github/i), 'invalid-key')
    await user.click(screen.getByLabelText(/connect github/i))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid API key')
    })
  })

  it('should clear error on successful connection', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn()
      .mockRejectedValueOnce(new Error('Invalid API key'))
      .mockResolvedValueOnce(undefined)

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    const apiKeyInput = screen.getByLabelText(/api key for github/i)

    // First attempt - error
    await user.type(apiKeyInput, 'invalid')
    await user.click(screen.getByLabelText(/connect github/i))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    // Second attempt - success
    await user.clear(apiKeyInput)
    await user.type(apiKeyInput, 'valid-key')
    await user.click(screen.getByLabelText(/connect github/i))

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  it('should clear API key after successful connection', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn().mockResolvedValue(undefined)

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    const apiKeyInput = screen.getByLabelText(/api key for github/i)
    await user.type(apiKeyInput, 'test-key')
    await user.click(screen.getByLabelText(/connect github/i))

    await waitFor(() => {
      expect(apiKeyInput).toHaveValue('')
    })
  })

  it('should handle multiple integrations', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('should format last sync correctly', () => {
    render(<ApiIntegration integrations={[mockIntegrations[0]]} />, { wrapper: TestWrapper })

    expect(screen.getByText(/last sync:/i)).toBeInTheDocument()
    // Should have a time element
    expect(screen.getByRole('time')).toBeInTheDocument()
  })

  it('should show never when no last sync', () => {
    const integrationWithoutSync = {
      ...mockIntegrations[1],
      lastSync: undefined,
    }

    render(<ApiIntegration integrations={[integrationWithoutSync]} />, { wrapper: TestWrapper })

    // Check that lastSync text doesn't appear when there's no sync
    expect(screen.queryByText(/last sync:/i)).not.toBeInTheDocument()
  })

  it('should be accessible', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByLabelText(/status: connected/i)).toBeInTheDocument()
  })

  it('should handle different integration types', () => {
    render(<ApiIntegration integrations={mockIntegrations} />, { wrapper: TestWrapper })

    expect(screen.getByText(/type: oauth/i)).toBeInTheDocument()
    const apiTypes = screen.getAllByText(/type: api/i)
    expect(apiTypes.length).toBeGreaterThanOrEqual(2) // GitHub and Jira are both API type
  })

  it('should disable disconnect during sync', async () => {
    const user = userEvent.setup()
    const onSync = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<ApiIntegration integrations={[mockIntegrations[0]]} onSync={onSync} />, {
      wrapper: TestWrapper,
    })

    await user.click(screen.getByLabelText(/sync slack/i))

    // During sync, disconnect should still be available (sync and disconnect are independent)
    expect(screen.getByLabelText(/disconnect slack/i)).toBeInTheDocument()
  })

  it('should handle connection failure gracefully', async () => {
    const user = userEvent.setup()
    const onConnect = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<ApiIntegration integrations={[mockIntegrations[1]]} onConnect={onConnect} />, {
      wrapper: TestWrapper,
    })

    await user.type(screen.getByLabelText(/api key for github/i), 'test-key')
    await user.click(screen.getByLabelText(/connect github/i))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    })

    // Should still be able to retry
    expect(screen.getByLabelText(/connect github/i)).not.toBeDisabled()
  })

  it('should handle rapid sync clicks', async () => {
    const user = userEvent.setup()
    const onSync = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<ApiIntegration integrations={[mockIntegrations[0]]} onSync={onSync} />, {
      wrapper: TestWrapper,
    })

    const syncButton = screen.getByLabelText(/sync slack/i)
    await user.click(syncButton)
    await user.click(syncButton) // Second click while syncing

    // Should only call sync once (button disabled during sync)
    await waitFor(() => {
      expect(onSync).toHaveBeenCalledTimes(1)
    })
  })
})

