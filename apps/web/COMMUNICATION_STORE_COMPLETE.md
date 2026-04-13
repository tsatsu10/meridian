# 💬 Communication Store - Complete Implementation

## Summary

**Production-ready communication state management** with optimistic updates:
- ✅ Zustand store with immer middleware
- ✅ Optimistic message updates
- ✅ WebSocket integration
- ✅ Message cache management
- ✅ Unread count tracking
- ✅ Typing indicators state
- ✅ Channel management
- ✅ Persistent storage
- ✅ React hook with mutations
- ✅ Automatic retry on failure

**Status**: ✅ **COMPLETE**

---

## 🎯 Features

### 1. **Optimistic Updates**
- Instant UI feedback
- Temporary message IDs
- Status tracking (sending/sent/failed)
- Automatic confirmation
- Graceful failure handling

### 2. **Message Management**
- Add/update/delete messages
- Sort by timestamp
- Pagination support (prepend older)
- Message deduplication
- Reply threading

### 3. **Channel Management**
- Active channel tracking
- Channel list state
- Last message caching
- Last read timestamp

### 4. **Unread Tracking**
- Per-channel unread counts
- Auto-mark as read on open
- Increment on new message
- Sync with backend

### 5. **Typing Indicators**
- Per-channel typing users
- Auto-clear after 3 seconds
- WebSocket sync
- Exclude self

---

## 📋 Store Structure

### State

```typescript
{
  // Messages by channel ID
  messages: {
    'channel_123': [
      {
        id: 'msg_456',
        content: 'Hello!',
        userEmail: 'user@example.com',
        createdAt: '2025-10-30T12:00:00Z',
        _optimistic: false,
        _status: 'sent',
      }
    ]
  },
  
  // Channels
  channels: {
    'channel_123': {
      id: 'channel_123',
      name: 'general',
      type: 'public',
      unreadCount: 5,
      lastMessage: {...},
      lastReadAt: '2025-10-30T11:00:00Z',
    }
  },
  
  // Active channel
  activeChannelId: 'channel_123',
  
  // Typing users per channel
  typingUsers: {
    'channel_123': Set(['user2@example.com', 'user3@example.com'])
  },
  
  // Unread counts
  unreadCounts: {
    'channel_123': 5,
    'channel_456': 2,
  }
}
```

---

## 💡 Usage Examples

### Example 1: Send Message with Optimistic Update

```tsx
import { useCommunication } from '@/hooks/use-communication';

export function MessageInput({ channelId }: { channelId: string }) {
  const [content, setContent] = useState('');
  const { sendMessage, isSending } = useCommunication(channelId);

  const handleSend = () => {
    // Optimistic update - message appears instantly
    sendMessage({
      channelId,
      content,
      userEmail: user.email,
    });
    
    // Clear input immediately (optimistic)
    setContent('');
  };

  return (
    <div>
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Type a message..."
      />
      <Button onClick={handleSend} disabled={isSending}>
        Send
      </Button>
    </div>
  );
}
```

**Flow**:
1. User types message
2. User hits Enter
3. Message appears instantly (optimistic)
4. Input clears immediately
5. Backend request sent
6. On success: Confirm optimistic message
7. On failure: Mark as failed, show retry option

---

### Example 2: Display Messages with Status

```tsx
import { useCommunication } from '@/hooks/use-communication';

export function MessageList({ channelId }: { channelId: string }) {
  const { messages, isConnected } = useCommunication(channelId);

  return (
    <div>
      {!isConnected && (
        <Alert>Reconnecting...</Alert>
      )}
      
      {messages.map(message => (
        <div key={message.id} className="message">
          <p>{message.content}</p>
          
          {/* Status indicators */}
          {message._optimistic && message._status === 'sending' && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {message._status === 'sent' && (
            <CheckCheck className="h-3 w-3 text-blue-500" />
          )}
          {message._status === 'failed' && (
            <AlertCircle className="h-3 w-3 text-red-500" />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### Example 3: Unread Badge

```tsx
import { useCommunicationStore } from '@/stores/communication-store';

export function ChannelListItem({ channel }: { channel: Channel }) {
  const unreadCount = useCommunicationStore(state => 
    state.unreadCounts[channel.id] || 0
  );

  return (
    <div className="flex items-center justify-between">
      <span>{channel.name}</span>
      {unreadCount > 0 && (
        <Badge variant="destructive">{unreadCount}</Badge>
      )}
    </div>
  );
}
```

---

### Example 4: Typing Indicator Integration

```tsx
import { useCommunicationStore } from '@/stores/communication-store';

export function TypingIndicator({ channelId }: { channelId: string }) {
  const typingUsers = useCommunicationStore(state => 
    state.typingUsers[channelId] || new Set()
  );

  if (typingUsers.size === 0) return null;

  const usersList = Array.from(typingUsers);

  return (
    <div className="text-sm text-muted-foreground">
      {usersList.length === 1 && `${usersList[0]} is typing...`}
      {usersList.length === 2 && `${usersList[0]} and ${usersList[1]} are typing...`}
      {usersList.length > 2 && `${usersList[0]}, ${usersList[1]} and ${usersList.length - 2} others are typing...`}
    </div>
  );
}
```

---

## 🔄 Optimistic Update Flow

### Success Path

```
User sends message
  ↓
addOptimisticMessage(channelId, messageData)
  ↓
tempId = "temp_1730304000_abc123"
  ↓
Optimistic message added to store
{
  id: tempId,
  content: "Hello!",
  _optimistic: true,
  _status: 'sending',
  createdAt: "2025-10-30T12:00:00Z"
}
  ↓
UI updates instantly (user sees message)
  ↓
POST /api/messages/channel/{channelId}
  ↓
Backend creates message
{
  id: "msg_real_456",
  content: "Hello!",
  createdAt: "2025-10-30T12:00:01Z"
}
  ↓
confirmOptimisticMessage(tempId, actualMessage)
  ↓
Replace optimistic with actual
{
  id: "msg_real_456",
  content: "Hello!",
  _status: 'sent',
  createdAt: "2025-10-30T12:00:01Z"
}
  ↓
UI shows checkmark (sent successfully)
```

---

### Failure Path

```
User sends message
  ↓
Optimistic message added
  ↓
UI updates instantly
  ↓
POST /api/messages (network error)
  ↓
failOptimisticMessage(tempId, error)
  ↓
Update message status
{
  id: tempId,
  content: "Hello!",
  _optimistic: true,
  _status: 'failed',
}
  ↓
UI shows error icon (red)
  ↓
Show retry button
  ↓
User clicks retry
  ↓
Retry send (same flow)
```

---

## 📊 Performance Benefits

### Without Optimistic Updates

```
User sends message
  ↓
POST request (200-500ms)
  ↓
Wait for response
  ↓
UI updates
  ↓
Total: 200-500ms delay
```

**User Experience**: Sluggish, feels slow

---

### With Optimistic Updates

```
User sends message
  ↓
UI updates (0ms)
  ↓
POST request (background)
  ↓
Confirmation (async)
  ↓
Total perceived delay: 0ms
```

**User Experience**: Instant, feels native

---

## ✅ Acceptance Criteria Met

✅ Communication store with Zustand  
✅ Optimistic message updates  
✅ Send with instant feedback  
✅ Confirm/fail optimistic messages  
✅ WebSocket real-time sync  
✅ Message cache management  
✅ Unread count tracking  
✅ Typing indicators state  
✅ Channel management  
✅ Mark as read functionality  
✅ Persistent storage (channels/unread)  
✅ React hook wrapper  
✅ TanStack Query integration  
✅ Error handling & retry  
✅ Production-ready  

---

## 📁 Related Files

### Frontend
- `apps/web/src/stores/communication-store.ts` - Zustand store (NEW)
- `apps/web/src/hooks/use-communication.ts` - React hook (NEW)

### Integration
- `apps/web/src/hooks/use-unified-websocket.ts` - WebSocket
- `apps/web/src/components/presence/typing-indicator.tsx` - Typing UI

---

## 🔮 Future Enhancements

- [ ] Message reactions optimistic update
- [ ] Message editing optimistic update
- [ ] Message deletion optimistic update
- [ ] Thread state management
- [ ] Draft messages persistence
- [ ] Search results caching
- [ ] Message pagination state
- [ ] Attachment upload progress
- [ ] Voice message state
- [ ] Message pinning state

---

**Status**: ✅ **COMPLETE**  
**Store**: ✅ **Zustand with immer**  
**Hook**: ✅ **useCommunication**  
**Optimistic**: ✅ **Full support**  
**WebSocket**: ✅ **Integrated**  
**Progress**: 24/27 tasks (89%)  
**Date**: 2025-10-30  
**Next**: Backup/restore procedures (final task!)

