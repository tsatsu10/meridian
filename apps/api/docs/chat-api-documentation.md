# Meridian Chat API Documentation

## Overview

The Meridian Chat API provides comprehensive messaging capabilities including team communication, direct messaging, real-time features, and advanced chat functionality. This documentation covers all chat-related endpoints, WebSocket events, and integration patterns.

## Base URL

```
Development: http://localhost:3001/api
Production: https://api.meridian.com/api
```

## Authentication

All chat endpoints require authentication via session cookies or JWT tokens. Include the authentication header in all requests:

```http
Authorization: Bearer <your-jwt-token>
Cookie: session=<session-cookie>
```

## Rate Limiting

Chat endpoints are rate-limited to prevent abuse:
- Message sending: 30 requests per minute per user
- Message retrieval: 100 requests per minute per user
- File uploads: 10 requests per minute per user

## Data Models

### Message Model

```typescript
interface Message {
  id: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'voice' | 'system' | 'command_result';
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  channelId?: string;
  teamId?: string;
  workspaceId: string;
  timestamp: string; // ISO 8601
  editedAt?: string;
  parentMessageId?: string; // For threading
  reactions: Reaction[];
  readBy: string[]; // User IDs who have read the message
  deliveryStatus: 'sending' | 'sent' | 'delivered' | 'failed';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    thumbnailUrl?: string;
    voiceDuration?: number;
  };
}
```

### Reaction Model

```typescript
interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  timestamp: string;
}
```

### Channel Model

```typescript
interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  workspaceId: string;
  teamId?: string;
  memberIds: string[];
  lastMessageAt?: string;
  createdAt: string;
  createdBy: string;
}
```

---

## Team Messaging Endpoints

### Get Team Messages

Retrieve messages for a specific team channel.

```http
GET /message/:teamId
```

**Parameters:**
- `teamId` (path): Team identifier
- `workspaceId` (query): Workspace identifier
- `limit` (query, optional): Number of messages to retrieve (default: 50, max: 100)
- `before` (query, optional): Message ID to fetch messages before (for pagination)
- `after` (query, optional): Message ID to fetch messages after
- `search` (query, optional): Search term for filtering messages

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "content": "Hello team!",
      "type": "text",
      "authorId": "user_456",
      "authorName": "John Doe",
      "authorAvatar": "https://example.com/avatar.jpg",
      "teamId": "team_789",
      "workspaceId": "workspace_012",
      "timestamp": "2024-01-01T10:00:00.000Z",
      "reactions": [],
      "readBy": ["user_456"],
      "deliveryStatus": "delivered"
    }
  ],
  "pagination": {
    "hasMore": true,
    "nextCursor": "msg_122",
    "prevCursor": "msg_124"
  }
}
```

### Send Team Message

Send a new message to a team channel.

```http
POST /message
```

**Request Body:**
```json
{
  "content": "Hello team!",
  "type": "text",
  "teamId": "team_789",
  "workspaceId": "workspace_012",
  "parentMessageId": null
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_124",
    "content": "Hello team!",
    "type": "text",
    "authorId": "user_456",
    "authorName": "John Doe",
    "teamId": "team_789",
    "workspaceId": "workspace_012",
    "timestamp": "2024-01-01T10:05:00.000Z",
    "reactions": [],
    "readBy": ["user_456"],
    "deliveryStatus": "sent"
  }
}
```

### Edit Message

Update an existing message (only by the author).

```http
PUT /message/:messageId
```

**Request Body:**
```json
{
  "content": "Updated message content",
  "workspaceId": "workspace_012"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_124",
    "content": "Updated message content",
    "editedAt": "2024-01-01T10:10:00.000Z"
  }
}
```

### Delete Message

Delete a message (by author or team admin).

```http
DELETE /message/:messageId
```

**Query Parameters:**
- `workspaceId`: Workspace identifier

**Response:**
```json
{
  "success": true,
  "messageId": "msg_124"
}
```

### Add Reaction

Add an emoji reaction to a message.

```http
POST /message/:messageId/reaction
```

**Request Body:**
```json
{
  "emoji": "👍",
  "workspaceId": "workspace_012"
}
```

**Response:**
```json
{
  "success": true,
  "reaction": {
    "emoji": "👍",
    "userId": "user_456",
    "userName": "John Doe",
    "timestamp": "2024-01-01T10:15:00.000Z"
  }
}
```

### Remove Reaction

Remove a reaction from a message.

```http
DELETE /message/:messageId/reaction
```

**Request Body:**
```json
{
  "emoji": "👍",
  "workspaceId": "workspace_012"
}
```

---

## Direct Messaging Endpoints

### Get Direct Messages

Retrieve direct messages between two users.

```http
GET /direct-messaging/messages
```

**Query Parameters:**
- `workspaceId`: Workspace identifier
- `otherUserId`: The other user in the conversation
- `limit` (optional): Number of messages (default: 50)
- `before` (optional): Message ID for pagination

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": "dm_123",
      "content": "Hey there!",
      "type": "text",
      "authorId": "user_456",
      "authorName": "John Doe",
      "recipientId": "user_789",
      "workspaceId": "workspace_012",
      "timestamp": "2024-01-01T09:00:00.000Z",
      "readBy": ["user_456"],
      "deliveryStatus": "delivered"
    }
  ]
}
```

### Send Direct Message

Send a direct message to another user.

```http
POST /direct-messaging/send
```

**Request Body:**
```json
{
  "content": "Hello!",
  "type": "text",
  "recipientId": "user_789",
  "workspaceId": "workspace_012"
}
```

### Search Users

Find users available for direct messaging.

```http
GET /direct-messaging/search-users
```

**Query Parameters:**
- `query`: Search term (name or email)
- `workspaceId`: Workspace identifier
- `excludeUserEmail` (optional): Email to exclude from results

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_789",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "avatar": "https://example.com/avatar2.jpg",
      "isOnline": true
    }
  ]
}
```

### Get Online Users

Get list of currently online users in the workspace.

```http
GET /direct-messaging/online-users
```

**Query Parameters:**
- `workspaceId`: Workspace identifier

---

## Message Search Endpoints

### Search Messages

Search across all messages with advanced filtering.

```http
GET /message/search
```

**Query Parameters:**
- `query`: Search term
- `workspaceId`: Workspace identifier
- `teamId` (optional): Limit search to specific team
- `authorId` (optional): Filter by message author
- `type` (optional): Filter by message type
- `from` (optional): Start date (ISO 8601)
- `to` (optional): End date (ISO 8601)
- `limit` (optional): Number of results (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "message": {
        "id": "msg_123",
        "content": "Hello team!",
        "highlight": "Hello <mark>team</mark>!",
        "authorName": "John Doe",
        "timestamp": "2024-01-01T10:00:00.000Z",
        "teamId": "team_789"
      },
      "score": 0.95
    }
  ],
  "totalResults": 42,
  "searchTime": 0.123
}
```

---

## File Upload Endpoints

### Upload File

Upload a file for sharing in chat.

```http
POST /attachment
```

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `file`: The file to upload
- `workspaceId`: Workspace identifier
- `teamId` (optional): Team identifier
- `description` (optional): File description

**Response:**
```json
{
  "success": true,
  "attachment": {
    "id": "att_123",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "url": "https://example.com/files/document.pdf",
    "thumbnailUrl": "https://example.com/thumbnails/document.jpg",
    "uploadedBy": "user_456",
    "uploadedAt": "2024-01-01T10:20:00.000Z"
  }
}
```

### Get Attachments

Retrieve file attachments for a team or workspace.

```http
GET /attachment/:workspaceId
```

**Query Parameters:**
- `teamId` (optional): Filter by team
- `type` (optional): Filter by file type
- `limit` (optional): Number of results

---

## Presence and Status Endpoints

### Update User Presence

Update the current user's online status and activity.

```http
POST /presence/update
```

**Request Body:**
```json
{
  "status": "online",
  "activity": "typing",
  "workspaceId": "workspace_012",
  "teamId": "team_789"
}
```

### Get Team Presence

Get presence information for team members.

```http
GET /presence/team/:teamId
```

**Query Parameters:**
- `workspaceId`: Workspace identifier

**Response:**
```json
{
  "success": true,
  "presence": [
    {
      "userId": "user_456",
      "userName": "John Doe",
      "status": "online",
      "lastSeen": "2024-01-01T10:25:00.000Z",
      "activity": "active"
    }
  ]
}
```

---

## WebSocket Events

### Connection

Connect to the real-time messaging system:

```javascript
const socket = io('ws://localhost:3002', {
  query: {
    workspaceId: 'workspace_012',
    userId: 'user_456'
  }
});
```

### Event Types

#### Incoming Events (Server → Client)

**New Message**
```javascript
socket.on('new_message', (data) => {
  // data contains the full message object
  console.log('New message:', data.message);
});
```

**Message Updated**
```javascript
socket.on('message_updated', (data) => {
  console.log('Message edited:', data.messageId, data.content);
});
```

**Message Deleted**
```javascript
socket.on('message_deleted', (data) => {
  console.log('Message deleted:', data.messageId);
});
```

**Reaction Added**
```javascript
socket.on('reaction_added', (data) => {
  console.log('Reaction added:', data.messageId, data.reaction);
});
```

**User Typing**
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data.userId, data.teamId);
});
```

**User Stopped Typing**
```javascript
socket.on('user_stopped_typing', (data) => {
  console.log('User stopped typing:', data.userId, data.teamId);
});
```

**Presence Update**
```javascript
socket.on('presence_update', (data) => {
  console.log('User presence changed:', data.userId, data.status);
});
```

#### Outgoing Events (Client → Server)

**Join Team Channel**
```javascript
socket.emit('join_team', {
  teamId: 'team_789',
  workspaceId: 'workspace_012'
});
```

**Leave Team Channel**
```javascript
socket.emit('leave_team', {
  teamId: 'team_789',
  workspaceId: 'workspace_012'
});
```

**Start Typing**
```javascript
socket.emit('start_typing', {
  teamId: 'team_789',
  workspaceId: 'workspace_012'
});
```

**Stop Typing**
```javascript
socket.emit('stop_typing', {
  teamId: 'team_789',
  workspaceId: 'workspace_012'
});
```

**Update Presence**
```javascript
socket.emit('update_presence', {
  status: 'online',
  workspaceId: 'workspace_012'
});
```

---

## Error Handling

### Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "content",
      "issue": "Content cannot be empty"
    }
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: User not authenticated
- `PERMISSION_DENIED`: User lacks required permissions
- `VALIDATION_ERROR`: Invalid request data
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `FILE_TOO_LARGE`: File exceeds size limit
- `WORKSPACE_MISMATCH`: Resource not in specified workspace
- `MESSAGE_EDIT_FORBIDDEN`: Cannot edit message (time limit or permissions)

---

## Integration Examples

### React Hook Example

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { useWebSocket } from './hooks/useWebSocket';

export function useTeamChat(teamId: string, workspaceId: string) {
  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', teamId, workspaceId],
    queryFn: () => fetchTeamMessages(teamId, workspaceId),
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: (content: string) => 
      sendTeamMessage({ content, teamId, workspaceId }),
    onSuccess: (newMessage) => {
      // Optimistic update
      queryClient.setQueryData(['messages', teamId, workspaceId], 
        (old) => [...old, newMessage]
      );
    },
  });

  // WebSocket integration
  const { socket } = useWebSocket({
    onNewMessage: (message) => {
      if (message.teamId === teamId) {
        queryClient.setQueryData(['messages', teamId, workspaceId],
          (old) => [...old, message]
        );
      }
    },
  });

  return {
    messages,
    isLoading,
    sendMessage: sendMessage.mutate,
    socket,
  };
}
```

### Slash Command Integration

```typescript
// Send a command message
const executeCommand = async (command: string) => {
  const response = await fetch('/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: command,
      type: 'command_result',
      teamId,
      workspaceId,
    }),
  });
  
  return response.json();
};
```

---

## Performance Considerations

### Pagination

Use pagination for message lists to improve performance:

```javascript
// Initial load
const response = await fetch(`/api/message/${teamId}?limit=50&workspaceId=${workspaceId}`);

// Load more (older messages)
const olderMessages = await fetch(
  `/api/message/${teamId}?limit=50&before=${oldestMessageId}&workspaceId=${workspaceId}`
);
```

### Message Caching

Implement client-side caching to reduce API calls:

```typescript
// Cache messages in React Query
const { data: messages } = useQuery({
  queryKey: ['messages', teamId, workspaceId],
  queryFn: fetchMessages,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});
```

### WebSocket Connection Management

Manage WebSocket connections efficiently:

```typescript
// Reconnection logic
socket.on('disconnect', () => {
  setTimeout(() => {
    socket.connect();
  }, 1000);
});

// Clean up on component unmount
useEffect(() => {
  return () => {
    socket.disconnect();
  };
}, []);
```

---

## Security Considerations

### Input Validation

All message content is validated and sanitized:
- HTML content is escaped
- URLs are validated
- File uploads are scanned for malware
- Message length is limited (max 4000 characters)

### Permission Checks

Every API call includes permission validation:
- User must be member of workspace
- User must have access to team/channel
- File access is restricted to workspace members

### Rate Limiting

Implement proper rate limiting in your client:

```typescript
// Debounce typing indicators
const debouncedTyping = debounce(() => {
  socket.emit('start_typing', { teamId, workspaceId });
}, 300);
```

---

## Changelog

### Version 2.1.0 (Current)
- Added slash command support
- Enhanced file upload with thumbnails
- Improved search functionality with full-text indexing
- Added message threading capabilities

### Version 2.0.0
- Real-time messaging with WebSocket
- Direct messaging support
- File attachments and media preview
- Message reactions and read receipts

### Version 1.0.0
- Basic team messaging
- User authentication
- Basic file upload