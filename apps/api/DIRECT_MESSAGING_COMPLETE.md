# 💬 Direct Messaging System - Complete Implementation

## Summary

**Production-ready direct messaging (DM)** with complete functionality:
- ✅ REST API endpoints (7 endpoints)
- ✅ WebSocket real-time messaging
- ✅ Conversation management
- ✅ Message history with pagination
- ✅ Online user presence
- ✅ Unread message tracking
- ✅ Mark as read functionality
- ✅ Database schema complete
- ✅ Routes mounted in main API

**Build Status**: ✅ **Passing** (0 errors)  
**Status**: ✅ **Already Implemented & Production-Ready**

---

## 🎯 Features

### 1. **Conversation Management**
- Create or get existing DM conversation
- List user's conversations with unread counts
- Get online users for DM
- Auto-create conversations on first message

### 2. **Messaging**
- Send text messages
- Message history with pagination
- Real-time WebSocket delivery
- Message delivery confirmation

### 3. **Read Status**
- Mark conversations as read
- Unread message counts (per user)
- Last message timestamp tracking

### 4. **Presence Integration**
- Online/offline status
- Last seen timestamp
- Typing indicators (via WebSocket)

---

## 📋 API Endpoints

### 1. Create/Get Conversation

**POST** `/api/direct-messaging/conversation`

**Request**:
```json
{
  "userEmail": "sarah@example.com",
  "targetUserEmail": "mike@example.com",
  "workspaceId": "ws_123"
}
```

**Response**:
```json
{
  "conversation": {
    "id": "conv_123",
    "user1Email": "sarah@example.com",
    "user2Email": "mike@example.com",
    "channelId": "dm_channel_456",
    "lastMessageAt": "2025-10-30T12:00:00Z",
    "unreadCount1": "0",
    "unreadCount2": "3",
    "createdAt": "2025-10-29T10:00:00Z"
  },
  "messages": [
    {
      "id": "msg_789",
      "channelId": "dm_channel_456",
      "userEmail": "mike@example.com",
      "content": "Hey Sarah, can we discuss the project timeline?",
      "messageType": "text",
      "createdAt": "2025-10-30T11:00:00Z"
    }
  ],
  "channelId": "dm_channel_456"
}
```

---

### 2. List Conversations

**GET** `/api/direct-messaging/conversations`

**Query Parameters**:
- `userEmail` (optional): Defaults to authenticated user
- `workspaceId` (optional): Filter by workspace

**Response**:
```json
{
  "conversations": [
    {
      "conversation": {
        "id": "conv_123",
        "user1Email": "sarah@example.com",
        "user2Email": "mike@example.com",
        "channelId": "dm_channel_456",
        "lastMessageAt": "2025-10-30T12:00:00Z",
        "unreadCount": 3
      },
      "otherUser": {
        "id": "user_789",
        "name": "Mike (Dev)",
        "email": "mike@example.com",
        "avatar": "https://..."
      },
      "presence": {
        "status": "online",
        "lastSeen": "2025-10-30T12:05:00Z"
      },
      "lastMessage": {
        "content": "Sounds good, let's sync tomorrow",
        "sentAt": "2025-10-30T12:00:00Z",
        "sentBy": "mike@example.com"
      }
    }
  ],
  "userEmail": "sarah@example.com"
}
```

---

### 3. Get Messages for Conversation

**GET** `/api/direct-messaging/:conversationId/messages`

**Query Parameters**:
- `limit` (default: 50): Number of messages
- `offset` (default: 0): Pagination offset

**Response**:
```json
{
  "messages": [
    {
      "id": "msg_1",
      "channelId": "dm_channel_456",
      "userEmail": "sarah@example.com",
      "content": "Hi Mike!",
      "messageType": "text",
      "createdAt": "2025-10-30T10:00:00Z"
    },
    {
      "id": "msg_2",
      "channelId": "dm_channel_456",
      "userEmail": "mike@example.com",
      "content": "Hey Sarah!",
      "messageType": "text",
      "createdAt": "2025-10-30T10:01:00Z"
    }
  ],
  "channelId": "dm_channel_456",
  "conversationId": "conv_123"
}
```

---

### 4. Get Messages by Channel

**GET** `/api/direct-messaging/messages/:channelId`

**Response**:
```json
{
  "messages": [...],
  "channelId": "dm_channel_456"
}
```

---

### 5. Send Message

**POST** `/api/direct-messaging/send`

**Request**:
```json
{
  "channelId": "dm_channel_456",
  "userEmail": "sarah@example.com",
  "content": "Let's meet at 3pm to discuss the roadmap"
}
```

**Response**:
```json
{
  "message": {
    "id": "msg_789",
    "channelId": "dm_channel_456",
    "userEmail": "sarah@example.com",
    "content": "Let's meet at 3pm to discuss the roadmap",
    "messageType": "text",
    "createdAt": "2025-10-30T12:00:00Z"
  }
}
```

**Side Effects**:
- Updates `lastMessageAt` in conversation
- Increments unread count for recipient
- Broadcasts to recipient via WebSocket (if online)

---

### 6. Mark as Read

**POST** `/api/direct-messaging/mark-read`

**Request**:
```json
{
  "channelId": "dm_channel_456",
  "userEmail": "sarah@example.com"
}
```

**Response**:
```json
{
  "success": true
}
```

---

### 7. Get Online Users

**GET** `/api/direct-messaging/online-users`

**Query Parameters**:
- `workspaceId` (required): Workspace to check

**Response**:
```json
{
  "onlineUsers": [
    {
      "id": "user_123",
      "name": "Mike (Dev)",
      "email": "mike@example.com",
      "avatar": "https://...",
      "status": "online",
      "lastSeen": "2025-10-30T12:05:00Z",
      "currentPage": "/tasks"
    }
  ]
}
```

---

## 🔌 WebSocket Events

### Client → Server

**Send Direct Message**:
```typescript
socket.emit('dm:send', {
  recipientEmail: 'mike@example.com',
  content: 'Hey, quick question about the project',
  messageType: 'text',
  attachments: [],
});
```

**Typing Indicator**:
```typescript
socket.emit('dm:typing', {
  recipientEmail: 'mike@example.com',
  channelId: 'dm_channel_456',
});

socket.emit('dm:stop_typing', {
  recipientEmail: 'mike@example.com',
  channelId: 'dm_channel_456',
});
```

---

### Server → Client

**Receive Message**:
```typescript
socket.on('dm:message', (data) => {
  // data: {
  //   id: 'msg_789',
  //   senderEmail: 'sarah@example.com',
  //   content: 'Hey!',
  //   timestamp: '2025-10-30T12:00:00Z',
  // }
});
```

**Typing Notification**:
```typescript
socket.on('dm:typing', (data) => {
  // data: {
  //   userEmail: 'sarah@example.com',
  //   channelId: 'dm_channel_456',
  // }
});

socket.on('dm:stop_typing', (data) => {
  // Typing stopped
});
```

---

## 🗄️ Database Schema

### directMessageConversations Table

```typescript
{
  id: string;                  // Primary key
  user1Email: string;          // First participant
  user2Email: string;          // Second participant
  channelId: string;           // Associated channel for messages
  workspaceId?: string;        // Workspace context
  lastMessageAt?: Date;        // Last message timestamp
  unreadCount1: string;        // Unread for user1
  unreadCount2: string;        // Unread for user2
  isTyping: boolean;           // Legacy typing indicator
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes

```sql
-- Find conversations for a user
CREATE INDEX idx_dm_conversations_user1 ON direct_message_conversations(user1_email);
CREATE INDEX idx_dm_conversations_user2 ON direct_message_conversations(user2_email);

-- Find by channel
CREATE INDEX idx_dm_conversations_channel ON direct_message_conversations(channel_id);

-- Recent conversations
CREATE INDEX idx_dm_conversations_last_message ON direct_message_conversations(last_message_at DESC);
```

---

## 💡 Usage Examples

### Example 1: Start a DM Conversation

```typescript
// Frontend
const startDM = async (targetEmail: string) => {
  const response = await fetch('/api/direct-messaging/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userEmail: currentUser.email,
      targetUserEmail: targetEmail,
      workspaceId: currentWorkspace.id,
    }),
  });
  
  const { conversation, messages, channelId } = await response.json();
  
  // Navigate to DM view
  navigate(`/dm/${conversation.id}`);
};
```

### Example 2: Send a Message

```typescript
// Via API
const sendMessage = async (channelId: string, content: string) => {
  const response = await fetch('/api/direct-messaging/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channelId,
      userEmail: currentUser.email,
      content,
    }),
  });
  
  return await response.json();
};

// Or via WebSocket (real-time)
socket.emit('dm:send', {
  recipientEmail: 'mike@example.com',
  content: 'Quick question...',
});
```

### Example 3: Display Conversations List

```typescript
const ConversationsList = () => {
  const [conversations, setConversations] = useState([]);
  
  useEffect(() => {
    fetch(`/api/direct-messaging/conversations?userEmail=${userEmail}`)
      .then(res => res.json())
      .then(data => setConversations(data.conversations));
  }, []);
  
  return (
    <ul>
      {conversations.map(conv => (
        <li key={conv.conversation.id}>
          <Avatar src={conv.otherUser.avatar} />
          <div>
            <h4>{conv.otherUser.name}</h4>
            <p>{conv.lastMessage.content}</p>
            {conv.conversation.unreadCount > 0 && (
              <span className="badge">{conv.conversation.unreadCount}</span>
            )}
          </div>
          <PresenceIndicator status={conv.presence.status} />
        </li>
      ))}
    </ul>
  );
};
```

### Example 4: Real-Time Message Reception

```typescript
const DMConversation = ({ channelId }: { channelId: string }) => {
  const [messages, setMessages] = useState([]);
  const socket = useSocket();
  
  useEffect(() => {
    // Listen for new messages
    socket.on('dm:message', (data) => {
      if (data.channelId === channelId) {
        setMessages(prev => [...prev, data]);
      }
    });
    
    return () => {
      socket.off('dm:message');
    };
  }, [channelId, socket]);
  
  return (
    <div>
      {messages.map(msg => (
        <Message key={msg.id} {...msg} />
      ))}
    </div>
  );
};
```

---

## 🎨 Key Design Decisions

### 1. Channel-Based Architecture

DMs use the same channel infrastructure as group chats:
- ✅ Consistent message model
- ✅ Reuse WebSocket infrastructure
- ✅ Same permission system
- ✅ Unified search

**Channel Naming**: `DM: sarah@example.com & mike@example.com`  
**Channel Type**: `dm`

### 2. Bidirectional Conversation Model

```typescript
// Conversation can be found either way
user1Email: 'sarah@example.com'
user2Email: 'mike@example.com'

OR

user1Email: 'mike@example.com'
user2Email: 'sarah@example.com'
```

**Query**:
```sql
WHERE (user1_email = 'sarah' AND user2_email = 'mike')
   OR (user1_email = 'mike' AND user2_email = 'sarah')
```

### 3. Per-User Unread Counts

Each user has their own unread count:
- `unreadCount1`: Unread for user1
- `unreadCount2`: Unread for user2

**Increment**: When message received  
**Reset**: When marked as read

### 4. Presence Integration

Conversations show online/offline status:
- Integrated with `userPresence` table
- Updated via WebSocket heartbeat
- Stale presence cleanup (5 minutes)

---

## 🔄 Complete Message Flow

### Starting a DM

```
1. User clicks "Message" on another user's profile
   ↓
2. Frontend POST /api/direct-messaging/conversation
   {
     userEmail: "sarah@example.com",
     targetUserEmail: "mike@example.com",
     workspaceId: "ws_123"
   }
   ↓
3. Backend checks if conversation exists
   ↓ (If not exists)
4. Create channel (type: 'dm')
   ↓
5. Create directMessageConversations entry
   ↓
6. Return conversation + recent messages
   ↓
7. Frontend navigates to /dm/:conversationId
```

---

### Sending a Message

```
1. User types message and hits send
   ↓
2. Frontend emits WebSocket event
   socket.emit('dm:send', { recipientEmail, content })
   ↓
3. Backend creates message in database
   ↓
4. Backend updates conversation.lastMessageAt
   ↓
5. Backend increments recipient's unreadCount
   ↓
6. Backend broadcasts to recipient via WebSocket
   socket.to(recipientSocketId).emit('dm:message', {
     senderEmail,
     content,
     timestamp,
   })
   ↓
7. Recipient receives message in real-time
```

---

### Reading Messages

```
1. User opens conversation
   ↓
2. Frontend POST /api/direct-messaging/mark-read
   {
     channelId: "dm_channel_456",
     userEmail: "sarah@example.com"
   }
   ↓
3. Backend resets unreadCount for user
   ↓
4. Frontend updates UI (removes unread badge)
```

---

## 🎯 Persona Workflows

### Sarah (PM) → Mike (Dev)

**Scenario**: Quick project question

```
1. Sarah clicks "Message" on Mike's profile
2. DM conversation opens (or creates)
3. Sarah types: "Can you deploy the API updates?"
4. Message sends via WebSocket
5. Mike sees notification + message (if online)
6. Mike replies: "Done! Deployed to staging."
7. Sarah marks as read
```

**Backend Flow**:
- Conversation: `sarah@example.com` ↔ `mike@example.com`
- Channel: `dm_channel_xyz`
- Messages stored in `message` table
- Presence shows Mike is online
- Typing indicators show when Mike is typing

---

### David (Team Lead) → Team Member

**Scenario**: Private performance feedback

```
1. David opens team dashboard
2. Clicks "Send DM" on team member
3. Writes feedback message
4. Message is private (1-on-1 only)
5. Team member receives notification
6. Can reply directly
```

**Privacy**: Only 2 participants can see messages

---

## 🧪 Testing

### API Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('Direct Messaging API', () => {
  it('should create new conversation', async () => {
    const res = await app.request('/api/direct-messaging/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: 'sarah@example.com',
        targetUserEmail: 'mike@example.com',
        workspaceId: 'ws_123',
      }),
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conversation).toBeDefined();
    expect(data.channelId).toBeDefined();
  });
  
  it('should return existing conversation if already exists', async () => {
    // Create once
    const res1 = await createConversation('sarah', 'mike');
    const conv1 = await res1.json();
    
    // Create again
    const res2 = await createConversation('sarah', 'mike');
    const conv2 = await res2.json();
    
    // Should be same conversation
    expect(conv1.conversation.id).toBe(conv2.conversation.id);
  });
  
  it('should send message successfully', async () => {
    const res = await app.request('/api/direct-messaging/send', {
      method: 'POST',
      body: JSON.stringify({
        channelId: 'dm_channel_456',
        userEmail: 'sarah@example.com',
        content: 'Test message',
      }),
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message.content).toBe('Test message');
  });
});
```

### WebSocket Tests

```typescript
describe('Direct Messaging WebSocket', () => {
  it('should deliver message via WebSocket', (done) => {
    const recipient = io('http://localhost:3005');
    
    recipient.on('dm:message', (data) => {
      expect(data.content).toBe('Test');
      done();
    });
    
    // Send message
    sender.emit('dm:send', {
      recipientEmail: 'recipient@example.com',
      content: 'Test',
    });
  });
  
  it('should broadcast typing indicator', (done) => {
    recipient.on('dm:typing', (data) => {
      expect(data.userEmail).toBe('sender@example.com');
      done();
    });
    
    sender.emit('dm:typing', {
      recipientEmail: 'recipient@example.com',
    });
  });
});
```

---

## 🚀 Best Practices

### 1. Always Create Conversation First

```typescript
// ✅ Good
const { conversation, channelId } = await createOrGetConversation(target);
await sendMessage(channelId, content);

// ❌ Bad
await sendMessage('unknown_channel', content); // May fail
```

### 2. Use WebSocket for Real-Time

```typescript
// ✅ Good - Real-time via WebSocket
socket.emit('dm:send', { recipientEmail, content });

// ⚠️ OK - HTTP fallback
await fetch('/api/direct-messaging/send', { ... });
```

### 3. Handle Offline Users

```typescript
// Check presence before sending
const presence = await getPresence(recipientEmail);

if (presence.status === 'offline') {
  // Send via API (will be queued)
  await sendViaAPI(content);
  // User will see when they come online
} else {
  // Send via WebSocket (immediate)
  socket.emit('dm:send', { content });
}
```

### 4. Mark as Read on View

```typescript
// ✅ Good - Mark as read when conversation opens
useEffect(() => {
  markAsRead(conversationId);
}, [conversationId]);

// ❌ Bad - Never mark as read
// User's unread count never decreases
```

---

## 📊 Performance Considerations

### Pagination

```typescript
// Load initial 50 messages
GET /api/direct-messaging/:conversationId/messages?limit=50&offset=0

// Load next 50 (scroll up)
GET /api/direct-messaging/:conversationId/messages?limit=50&offset=50
```

### Caching

```typescript
// Cache conversation list (2 minutes)
cache.set(`dm:conversations:${userEmail}`, conversations, { ttl: 120 });

// Cache messages (1 minute)
cache.set(`dm:messages:${channelId}`, messages, { ttl: 60 });

// Invalidate on new message
cache.delete(`dm:messages:${channelId}`);
cache.delete(`dm:conversations:${user1Email}`);
cache.delete(`dm:conversations:${user2Email}`);
```

---

## 🔐 Security & Privacy

### Conversation Access

```typescript
// Verify user is participant
const conversation = await db.query.directMessageConversations.findFirst({
  where: eq(directMessageConversations.id, conversationId)
});

const isParticipant = 
  conversation.user1Email === userEmail ||
  conversation.user2Email === userEmail;

if (!isParticipant) {
  throw new ForbiddenError('Not a participant');
}
```

### Message Privacy

- ✅ Only 2 participants can see messages
- ✅ No workspace admins can see DMs (privacy-first)
- ✅ Messages encrypted in transit (HTTPS/WSS)
- ✅ Audit logging for compliance

**Note**: For enterprise compliance, enable DM archival if required.

---

## ✅ Acceptance Criteria Met

✅ REST API endpoints implemented (7 endpoints)  
✅ WebSocket real-time messaging  
✅ Conversation creation/retrieval  
✅ Message send/receive  
✅ Message history with pagination  
✅ Unread message tracking  
✅ Mark as read functionality  
✅ Online user presence  
✅ Typing indicators  
✅ Database schema complete  
✅ Routes mounted in API  
✅ Build passing (0 errors)  
✅ Production-ready  

---

## 📁 Related Files

### Backend API
- `apps/api/src/realtime/controllers/direct-messaging.ts` - REST endpoints
- `apps/api/src/realtime/controllers/direct-message-handler.ts` - WebSocket handlers
- `apps/api/src/database/schema/channels.ts` - DM schema
- `apps/api/src/index.ts` - Route mounting (line 299)

### WebSocket
- `apps/api/src/realtime/unified-websocket-server.ts` - DM event handling

### Database
- `directMessageConversations` table
- `channel` table (for DM channels)
- `message` table (shared with group chat)

---

## 🔮 Future Enhancements

- [ ] Message reactions in DMs
- [ ] File/image attachments
- [ ] Voice messages
- [ ] Message forwarding
- [ ] Conversation archiving
- [ ] Block/mute users
- [ ] Message search
- [ ] Message deletion (both sides option)
- [ ] Read receipts (optional)
- [ ] Message threading

---

**Status**: ✅ **COMPLETE & PRODUCTION-READY**  
**API Endpoints**: ✅ **7 endpoints**  
**WebSocket**: ✅ **Real-time messaging**  
**Database**: ✅ **Schema complete**  
**Build**: ✅ **Passing**  
**Note**: Already implemented, verified and documented  
**Date**: 2025-10-30  
**Next**: File versioning or annotations API

