/**
 * Chat Message Component Tests
 * 
 * Tests chat message rendering and interactions:
 * - Message display
 * - User mentions
 * - Message actions (edit, delete, react)
 * - Timestamps
 * - Message states
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '../../../test-utils/test-wrapper';

// Mock chat message component
interface ChatMessageProps {
  message: {
    id: string;
    content: string;
    authorName: string;
    authorEmail: string;
    timestamp: Date;
    isEdited?: boolean;
    reactions?: Array<{ emoji: string; count: number; userEmails: string[] }>;
  };
  currentUserEmail: string;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

function ChatMessage({
  message,
  currentUserEmail,
  onEdit,
  onDelete,
  onReact,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editContent, setEditContent] = React.useState(message.content);
  const isOwnMessage = message.authorEmail === currentUserEmail;

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };

  return (
    <div 
      className="chat-message" 
      data-message-id={message.id}
      role="article"
      aria-label={`Message from ${message.authorName}`}
    >
      <div className="message-header">
        <span className="author-name">{message.authorName}</span>
        <time className="message-timestamp" dateTime={message.timestamp.toISOString()}>
          {message.timestamp.toLocaleTimeString()}
        </time>
      </div>

      <div className="message-content">
        {isEditing ? (
          <div>
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              aria-label="Edit message"
            />
            <button onClick={handleSaveEdit}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <p>{message.content}</p>
            {message.isEdited && <span className="edited-indicator">(edited)</span>}
          </>
        )}
      </div>

      {isOwnMessage && !isEditing && (
        <div className="message-actions">
          <button 
            onClick={() => setIsEditing(true)}
            aria-label="Edit message"
          >
            Edit
          </button>
          <button 
            onClick={() => onDelete?.(message.id)}
            aria-label="Delete message"
          >
            Delete
          </button>
        </div>
      )}

      {message.reactions && message.reactions.length > 0 && (
        <div className="message-reactions" role="group" aria-label="Message reactions">
          {message.reactions.map((reaction, idx) => (
            <button
              key={idx}
              className="reaction"
              onClick={() => onReact?.(message.id, reaction.emoji)}
              aria-label={`React with ${reaction.emoji}`}
            >
              {reaction.emoji} {reaction.count}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Need React import for useState
import React from 'react';

describe('Chat Message Component', () => {
  const mockMessage = {
    id: 'msg-123',
    content: 'Hello, World!',
    authorName: 'John Doe',
    authorEmail: 'john@example.com',
    timestamp: new Date('2025-01-01T10:00:00Z'),
  };

  const currentUserEmail = 'jane@example.com';

  it('should render message content', () => {
    render(
      <ChatMessage message={mockMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('should display author name', () => {
    render(
      <ChatMessage message={mockMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should display timestamp', () => {
    render(
      <ChatMessage message={mockMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const timestamp = screen.getByRole('time');
    expect(timestamp).toBeInTheDocument();
    expect(timestamp).toHaveAttribute('datetime', mockMessage.timestamp.toISOString());
  });

  it('should show edit indicator for edited messages', () => {
    const editedMessage = {
      ...mockMessage,
      isEdited: true,
    };

    render(
      <ChatMessage message={editedMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText('(edited)')).toBeInTheDocument();
  });

  it('should show message actions for own messages', () => {
    render(
      <ChatMessage 
        message={{...mockMessage, authorEmail: currentUserEmail}} 
        currentUserEmail={currentUserEmail} 
      />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByRole('button', { name: /edit message/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete message/i })).toBeInTheDocument();
  });

  it('should not show message actions for other users messages', () => {
    render(
      <ChatMessage message={mockMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.queryByRole('button', { name: /edit message/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete message/i })).not.toBeInTheDocument();
  });

  it('should handle message edit', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <ChatMessage 
        message={{...mockMessage, authorEmail: currentUserEmail}} 
        currentUserEmail={currentUserEmail}
        onEdit={onEdit}
      />,
      { wrapper: TestWrapper }
    );

    // Click edit button
    await user.click(screen.getByRole('button', { name: /edit message/i }));

    // Edit input should appear
    const editInput = screen.getByLabelText(/edit message/i);
    expect(editInput).toBeInTheDocument();
    expect(editInput).toHaveValue('Hello, World!');

    // Change the content
    await user.clear(editInput);
    await user.type(editInput, 'Updated message');

    // Save the edit
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalledWith('msg-123', 'Updated message');
    });
  });

  it('should cancel message edit', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <ChatMessage 
        message={{...mockMessage, authorEmail: currentUserEmail}} 
        currentUserEmail={currentUserEmail}
        onEdit={onEdit}
      />,
      { wrapper: TestWrapper }
    );

    // Click edit button
    await user.click(screen.getByRole('button', { name: /edit message/i }));

    // Cancel the edit
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Original message should still be visible
    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('should handle message deletion', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <ChatMessage 
        message={{...mockMessage, authorEmail: currentUserEmail}} 
        currentUserEmail={currentUserEmail}
        onDelete={onDelete}
      />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /delete message/i }));

    expect(onDelete).toHaveBeenCalledWith('msg-123');
  });

  it('should display message reactions', () => {
    const messageWithReactions = {
      ...mockMessage,
      reactions: [
        { emoji: '👍', count: 3, userEmails: ['user1@example.com', 'user2@example.com', 'user3@example.com'] },
        { emoji: '❤️', count: 1, userEmails: ['user4@example.com'] },
      ],
    };

    render(
      <ChatMessage message={messageWithReactions} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(/👍 3/)).toBeInTheDocument();
    expect(screen.getByText(/❤️ 1/)).toBeInTheDocument();
  });

  it('should handle reaction click', async () => {
    const user = userEvent.setup();
    const onReact = vi.fn();

    const messageWithReactions = {
      ...mockMessage,
      reactions: [
        { emoji: '👍', count: 3, userEmails: ['user1@example.com'] },
      ],
    };

    render(
      <ChatMessage 
        message={messageWithReactions} 
        currentUserEmail={currentUserEmail}
        onReact={onReact}
      />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /react with 👍/i }));

    expect(onReact).toHaveBeenCalledWith('msg-123', '👍');
  });

  it('should be accessible', () => {
    const { container } = render(
      <ChatMessage message={mockMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    // Message should have article role
    const message = screen.getByRole('article', { name: /message from John Doe/i });
    expect(message).toBeInTheDocument();

    // Timestamp should be a time element
    expect(screen.getByRole('time')).toBeInTheDocument();

    // All buttons should be accessible
    const ownMessage = {
      ...mockMessage,
      authorEmail: currentUserEmail,
    };

    const { unmount } = render(
      <ChatMessage message={ownMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
    const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];

    expect(editButton).toHaveAccessibleName();
    expect(deleteButton).toHaveAccessibleName();

    unmount();
  });

  it('should prevent empty message edits', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <ChatMessage 
        message={{...mockMessage, authorEmail: currentUserEmail}} 
        currentUserEmail={currentUserEmail}
        onEdit={onEdit}
      />,
      { wrapper: TestWrapper }
    );

    await user.click(screen.getByRole('button', { name: /edit message/i }));

    const editInput = screen.getByLabelText(/edit message/i);
    await user.clear(editInput);

    await user.click(screen.getByRole('button', { name: /save/i }));

    // Should not call onEdit with empty content
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('should handle long messages', () => {
    const longMessage = {
      ...mockMessage,
      content: 'A'.repeat(1000),
    };

    render(
      <ChatMessage message={longMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByText(longMessage.content)).toBeInTheDocument();
  });

  it('should handle special characters in content', () => {
    const specialMessage = {
      ...mockMessage,
      content: '<script>alert("XSS")</script>',
    };

    const { container } = render(
      <ChatMessage message={specialMessage} currentUserEmail={currentUserEmail} />,
      { wrapper: TestWrapper }
    );

    // Content should be displayed as text, not executed
    expect(screen.getByText(specialMessage.content)).toBeInTheDocument();
    
    // No script tag should be in the DOM
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });
});

