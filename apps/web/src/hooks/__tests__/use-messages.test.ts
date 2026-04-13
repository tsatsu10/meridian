import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { 
  useMessages, 
  useSendMessage, 
  useEditMessage, 
  useDeleteMessage,
  useMessageReaction,
  usePinMessage 
} from '../use-messages'
import * as fetchModule from '../../lib/fetch'

// Mock the fetch module
vi.mock('../../lib/fetch', () => ({
  fetchApi: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches messages for a channel', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello world',
        messageType: 'text',
        userEmail: 'user@example.com',
        createdAt: new Date(),
        isEdited: false,
      },
    ]

    vi.mocked(fetchModule.fetchApi).mockResolvedValue({
      messages: mockMessages,
    })

    const { result } = renderHook(
      () => useMessages('channel-1', { limit: 50 }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockMessages)
    expect(fetchModule.fetchApi).toHaveBeenCalledWith(
      '/message/channel-1?limit=50'
    )
  })

  it('does not fetch when channelId is empty', () => {
    renderHook(
      () => useMessages('', { limit: 50 }),
      { wrapper: createWrapper() }
    )

    expect(fetchModule.fetchApi).not.toHaveBeenCalled()
  })

  it('includes pagination parameters in request', async () => {
    vi.mocked(fetchModule.fetchApi).mockResolvedValue({ messages: [] })

    renderHook(
      () => useMessages('channel-1', { limit: 25, offset: 10 }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(fetchModule.fetchApi).toHaveBeenCalledWith(
        '/message/channel-1?limit=25&offset=10'
      )
    })
  })
})

describe('useSendMessage', () => {
  it('sends a message successfully', async () => {
    const mockResponse = { id: 'msg-1', success: true }
    vi.mocked(fetchModule.fetchApi).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    )

    const messageData = {
      channelId: 'channel-1',
      content: 'Hello world',
      messageType: 'text',
    }

    await result.current.mutateAsync(messageData)

    expect(fetchModule.fetchApi).toHaveBeenCalledWith('/message/channel-1', {
      method: 'POST',
      body: JSON.stringify({ content: 'Hello world', messageType: 'text' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  it('includes optional fields in request', async () => {
    vi.mocked(fetchModule.fetchApi).mockResolvedValue({ success: true })

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    )

    const messageData = {
      channelId: 'channel-1',
      content: 'Reply message',
      messageType: 'text',
      parentMessageId: 'parent-msg-1',
      mentions: ['user1@example.com'],
      attachments: [{ id: 'file-1', name: 'document.pdf' }],
    }

    await result.current.mutateAsync(messageData)

    expect(fetchModule.fetchApi).toHaveBeenCalledWith('/message/channel-1', {
      method: 'POST',
      body: JSON.stringify({
        content: 'Reply message',
        messageType: 'text',
        parentMessageId: 'parent-msg-1',
        mentions: ['user1@example.com'],
        attachments: [{ id: 'file-1', name: 'document.pdf' }]
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })
})

describe('useEditMessage', () => {
  it('edits a message successfully', async () => {
    const mockResponse = { success: true }
    vi.mocked(fetchModule.fetchApi).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => useEditMessage(),
      { wrapper: createWrapper() }
    )

    const editData = {
      messageId: 'msg-1',
      content: 'Updated content',
    }

    await result.current.mutateAsync(editData)

    expect(fetchModule.fetchApi).toHaveBeenCalledWith('/message/msg-1', {
      method: 'PUT',
      body: JSON.stringify({ content: 'Updated content' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })
})

describe('useDeleteMessage', () => {
  it('deletes a message successfully', async () => {
    const mockResponse = { success: true }
    vi.mocked(fetchModule.fetchApi).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => useDeleteMessage(),
      { wrapper: createWrapper() }
    )

    await result.current.mutateAsync('msg-1')

    expect(fetchModule.fetchApi).toHaveBeenCalledWith('/message/msg-1', {
      method: 'DELETE',
    })
  })
})

describe('useMessageReaction', () => {
  it('adds a reaction to a message', async () => {
    const mockResponse = { success: true }
    vi.mocked(fetchModule.fetchApi).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => useMessageReaction(),
      { wrapper: createWrapper() }
    )

    const reactionData = {
      messageId: 'msg-1',
      emoji: '👍',
    }

    await result.current.mutateAsync(reactionData)

    expect(fetchModule.fetchApi).toHaveBeenCalledWith('/message/msg-1/reactions', {
      method: 'POST',
      body: JSON.stringify({ emoji: '👍' }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })
})

describe('usePinMessage', () => {
  it('pins a message successfully', async () => {
    const mockResponse = { success: true }
    vi.mocked(fetchModule.fetchApi).mockResolvedValue(mockResponse)

    const { result } = renderHook(
      () => usePinMessage(),
      { wrapper: createWrapper() }
    )

    await result.current.mutateAsync('msg-1')

    expect(fetchModule.fetchApi).toHaveBeenCalledWith('/message/msg-1/pin', {
      method: 'POST',
    })
  })
})

describe('Message hook error handling', () => {
  it('handles fetch errors gracefully', async () => {
    const error = new Error('Network error')
    vi.mocked(fetchModule.fetchApi).mockRejectedValue(error)

    const { result } = renderHook(
      () => useMessages('channel-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(error)
  })

  it('handles mutation errors', async () => {
    const error = new Error('Send failed')
    vi.mocked(fetchModule.fetchApi).mockRejectedValue(error)

    const { result } = renderHook(
      () => useSendMessage(),
      { wrapper: createWrapper() }
    )

    await act(async () => {
      try {
        await result.current.mutateAsync({
          channelId: 'channel-1',
          content: 'Test message',
        })
      } catch (e) {
        expect(e).toEqual(error)
      }
    })

    // Wait for error state to be updated
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})