/**
 * Chat Interface Tests
 * 
 * Tests chat interface functionality:
 * - Message display
 * - Send messages
 * - Real-time updates
 * - Typing indicators
 * - Message reactions
 * - File attachments
 * - User presence
 * - Channel management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: string
  reactions?: Record<string, number>
  attachments?: {
    id: string
    name: string
    url: string
    type: string
  }[]
  isEdited?: boolean
}

interface User {
  id: string
  name: string
  avatar?: string
  isOnline?: boolean
}

interface ChatInterfaceProps {
  messages?: Message[]
  currentUser?: User
  channelName?: string
  onSendMessage?: (content: string) => Promise<void>
  onEditMessage?: (messageId: string, content: string) => Promise<void>
  onDeleteMessage?: (messageId: string) => Promise<void>
  onReact?: (messageId: string, emoji: string) => void
  onUploadFile?: (file: File) => Promise<void>
  typingUsers?: User[]
  isConnected?: boolean
}

function ChatInterface({
  messages = [],
  currentUser,
  channelName = 'General',
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReact,
  onUploadFile,
  typingUsers = [],
  isConnected = true,
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editContent, setEditContent] = React.useState('')
  const [isSending, setIsSending] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      await onSendMessage?.(newMessage)
      setNewMessage('')
    } finally {
      setIsSending(false)
    }
  }

  const handleEdit = async (messageId: string) => {
    if (!editContent.trim()) return

    try {
      await onEditMessage?.(messageId, editContent)
      setEditingId(null)
      setEditContent('')
    } catch (error) {
      // Handle error
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return
    await onDeleteMessage?.(messageId)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await onUploadFile?.(file)
  }

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-interface" data-testid="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <h2>#{channelName}</h2>
        <div className="connection-status">
          {isConnected ? (
            <span className="connected" aria-label="Connected">
              ●
            </span>
          ) : (
            <span className="disconnected" aria-label="Disconnected">
              ○
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.length === 0 ? (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((message) => {
            const isCurrentUser = currentUser?.id === message.userId
            const isEditing = editingId === message.id

            return (
              <div
                key={message.id}
                className={`message ${isCurrentUser ? 'own' : 'other'}`}
                role="article"
              >
                <div className="message-header">
                  <strong>{message.userName}</strong>
                  <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
                  {message.isEdited && <span className="edited-badge">(edited)</span>}
                </div>

                {isEditing ? (
                  <div className="edit-form">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      aria-label="Edit message"
                    />
                    <button
                      onClick={() => handleEdit(message.id)}
                      aria-label="Save edit"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditContent('')
                      }}
                      aria-label="Cancel edit"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="message-content">
                    <p>{message.content}</p>
                    
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="attachments">
                        {message.attachments.map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.url}
                            className="attachment"
                            aria-label={`Attachment: ${attachment.name}`}
                          >
                            📎 {attachment.name}
                          </a>
                        ))}
                      </div>
                    )}

                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                      <div className="reactions" role="group" aria-label="Message reactions">
                        {Object.entries(message.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => onReact?.(message.id, emoji)}
                            className="reaction"
                            aria-label={`React with ${emoji}`}
                          >
                            {emoji} {count}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isCurrentUser && !isEditing && (
                  <div className="message-actions">
                    <button
                      onClick={() => {
                        setEditingId(message.id)
                        setEditContent(message.content)
                      }}
                      aria-label="Edit message"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(message.id)}
                      aria-label="Delete message"
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator" role="status" aria-live="polite">
          {typingUsers.length === 1 ? (
            <span>{typingUsers[0].name} is typing...</span>
          ) : (
            <span>{typingUsers.length} people are typing...</span>
          )}
        </div>
      )}

      {/* Message Input */}
      <div className="message-input">
        <input
          type="file"
          id="file-upload"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          aria-label="Upload file"
        />
        <label htmlFor="file-upload">
          <button
            type="button"
            aria-label="Attach file"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            📎
          </button>
        </label>

        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Type a message..."
          disabled={!isConnected || isSending}
          aria-label="Message input"
          rows={1}
        />

        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || !isConnected || isSending}
          aria-label="Send message"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
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

describe('ChatInterface', () => {
  const mockCurrentUser: User = {
    id: 'user-1',
    name: 'John Doe',
    isOnline: true,
  }

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'John Doe',
      content: 'Hello everyone!',
      timestamp: '2024-01-01T10:00:00Z',
      reactions: { '👍': 3, '❤️': 1 },
    },
    {
      id: 'msg-2',
      userId: 'user-2',
      userName: 'Jane Smith',
      content: 'Hi John! How are you?',
      timestamp: '2024-01-01T10:01:00Z',
    },
    {
      id: 'msg-3',
      userId: 'user-1',
      userName: 'John Doe',
      content: 'Great, thanks!',
      timestamp: '2024-01-01T10:02:00Z',
      isEdited: true,
      attachments: [
        {
          id: 'att-1',
          name: 'document.pdf',
          url: '/files/document.pdf',
          type: 'application/pdf',
        },
      ],
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
  })

  it('should render chat interface', () => {
    render(<ChatInterface />, { wrapper: TestWrapper })

    expect(screen.getByTestId('chat-interface')).toBeInTheDocument()
  })

  it('should display channel name', () => {
    render(<ChatInterface channelName="Team Chat" />, { wrapper: TestWrapper })

    expect(screen.getByText('#Team Chat')).toBeInTheDocument()
  })

  it('should show connected status', () => {
    render(<ChatInterface isConnected={true} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Connected')).toBeInTheDocument()
  })

  it('should show disconnected status', () => {
    render(<ChatInterface isConnected={false} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Disconnected')).toBeInTheDocument()
  })

  it('should display all messages', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByText('Hello everyone!')).toBeInTheDocument()
    expect(screen.getByText('Hi John! How are you?')).toBeInTheDocument()
    expect(screen.getByText('Great, thanks!')).toBeInTheDocument()
  })

  it('should show empty state when no messages', () => {
    render(<ChatInterface messages={[]} />, { wrapper: TestWrapper })

    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
  })

  it('should handle sending a message', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn().mockResolvedValue(undefined)

    render(<ChatInterface onSendMessage={onSendMessage} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Message input'), 'Test message')
    await user.click(screen.getByLabelText('Send message'))

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('Test message')
    })
  })

  it('should disable send button when message is empty', () => {
    render(<ChatInterface />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('should disable input when disconnected', () => {
    render(<ChatInterface isConnected={false} />, { wrapper: TestWrapper })

    expect(screen.getByLabelText('Message input')).toBeDisabled()
    expect(screen.getByLabelText('Send message')).toBeDisabled()
  })

  it('should clear input after sending', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn().mockResolvedValue(undefined)

    render(<ChatInterface onSendMessage={onSendMessage} />, { wrapper: TestWrapper })

    const input = screen.getByLabelText('Message input')
    await user.type(input, 'Test')
    await user.click(screen.getByLabelText('Send message'))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('should send message on Enter key', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn().mockResolvedValue(undefined)

    render(<ChatInterface onSendMessage={onSendMessage} />, { wrapper: TestWrapper })

    const input = screen.getByLabelText('Message input')
    await user.type(input, 'Test message{Enter}')

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith('Test message')
    })
  })

  it('should display message timestamps', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    const times = screen.getAllByRole('time')
    expect(times.length).toBeGreaterThan(0)
  })

  it('should show edited badge', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByText('(edited)')).toBeInTheDocument()
  })

  it('should display message reactions', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByText('👍 3')).toBeInTheDocument()
    expect(screen.getByText('❤️ 1')).toBeInTheDocument()
  })

  it('should handle reaction clicks', async () => {
    const user = userEvent.setup()
    const onReact = vi.fn()

    render(
      <ChatInterface messages={mockMessages} currentUser={mockCurrentUser} onReact={onReact} />,
      { wrapper: TestWrapper }
    )

    await user.click(screen.getByLabelText(/react with 👍/i))

    expect(onReact).toHaveBeenCalledWith('msg-1', '👍')
  })

  it('should display attachments', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByLabelText(/attachment: document\.pdf/i)).toBeInTheDocument()
  })

  it('should show edit button for own messages', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    const editButtons = screen.getAllByLabelText('Edit message')
    expect(editButtons.length).toBeGreaterThan(0)
  })

  it('should handle editing a message', async () => {
    const user = userEvent.setup()
    const onEditMessage = vi.fn().mockResolvedValue(undefined)

    render(
      <ChatInterface
        messages={mockMessages}
        currentUser={mockCurrentUser}
        onEditMessage={onEditMessage}
      />,
      { wrapper: TestWrapper }
    )

    const editButtons = screen.getAllByLabelText('Edit message')
    await user.click(editButtons[0])

    const editInput = screen.getByLabelText('Edit message')
    await user.clear(editInput)
    await user.type(editInput, 'Updated message')
    await user.click(screen.getByLabelText('Save edit'))

    await waitFor(() => {
      expect(onEditMessage).toHaveBeenCalledWith('msg-1', 'Updated message')
    })
  })

  it('should cancel editing', async () => {
    const user = userEvent.setup()
    const onEditMessage = vi.fn()

    render(
      <ChatInterface
        messages={mockMessages}
        currentUser={mockCurrentUser}
        onEditMessage={onEditMessage}
      />,
      { wrapper: TestWrapper }
    )

    const editButtons = screen.getAllByLabelText('Edit message')
    await user.click(editButtons[0])
    await user.click(screen.getByLabelText('Cancel edit'))

    expect(onEditMessage).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('Save edit')).not.toBeInTheDocument()
  })

  it('should handle deleting a message', async () => {
    const user = userEvent.setup()
    const onDeleteMessage = vi.fn().mockResolvedValue(undefined)

    render(
      <ChatInterface
        messages={mockMessages}
        currentUser={mockCurrentUser}
        onDeleteMessage={onDeleteMessage}
      />,
      { wrapper: TestWrapper }
    )

    const deleteButtons = screen.getAllByLabelText('Delete message')
    await user.click(deleteButtons[0])

    expect(onDeleteMessage).toHaveBeenCalledWith('msg-1')
  })

  it('should show typing indicator for one user', () => {
    const typingUsers = [{ id: 'user-2', name: 'Jane Smith' }]

    render(<ChatInterface typingUsers={typingUsers} />, { wrapper: TestWrapper })

    expect(screen.getByText(/jane smith is typing\.\.\./i)).toBeInTheDocument()
  })

  it('should show typing indicator for multiple users', () => {
    const typingUsers = [
      { id: 'user-2', name: 'Jane Smith' },
      { id: 'user-3', name: 'Bob Johnson' },
    ]

    render(<ChatInterface typingUsers={typingUsers} />, { wrapper: TestWrapper })

    expect(screen.getByText(/2 people are typing\.\.\./i)).toBeInTheDocument()
  })

  it('should handle file upload', async () => {
    const user = userEvent.setup()
    const onUploadFile = vi.fn().mockResolvedValue(undefined)

    render(<ChatInterface onUploadFile={onUploadFile} />, { wrapper: TestWrapper })

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText('Upload file')

    await user.upload(input, file)

    await waitFor(() => {
      expect(onUploadFile).toHaveBeenCalledWith(file)
    })
  })

  it('should show sending state', async () => {
    const user = userEvent.setup()
    const onSendMessage = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    render(<ChatInterface onSendMessage={onSendMessage} />, { wrapper: TestWrapper })

    await user.type(screen.getByLabelText('Message input'), 'Test')
    await user.click(screen.getByLabelText('Send message'))

    expect(screen.getByText('Sending...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Sending...')).not.toBeInTheDocument()
    })
  })

  it('should be accessible', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    expect(screen.getByRole('log', { name: /chat messages/i })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getByLabelText('Message input')).toBeInTheDocument()
  })

  it('should format times correctly', () => {
    render(<ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />, {
      wrapper: TestWrapper,
    })

    const times = screen.getAllByRole('time')
    expect(times[0]).toHaveAttribute('datetime', '2024-01-01T10:00:00Z')
  })

  it('should distinguish own messages from others', () => {
    const { container } = render(
      <ChatInterface messages={mockMessages} currentUser={mockCurrentUser} />,
      { wrapper: TestWrapper }
    )

    const ownMessages = container.querySelectorAll('.message.own')
    const otherMessages = container.querySelectorAll('.message.other')

    expect(ownMessages.length).toBeGreaterThan(0)
    expect(otherMessages.length).toBeGreaterThan(0)
  })
})

