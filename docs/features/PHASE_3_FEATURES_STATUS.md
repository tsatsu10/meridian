# 📋 Phase 3 Features Status & Roadmap

**Last Updated**: October 30, 2025  
**Current Version**: 0.4.0  
**Status**: Phase 3 features documented for future implementation

---

## 🎯 Overview

Phase 3 features are **planned but not yet implemented**. This document tracks their status and provides implementation guidance for future development.

---

## 📊 Phase 3 Features

### **Feature 1: Direct Messaging (DM)**

**Status**: 🟡 **PLANNED** - Schema designed, handlers outlined  
**Priority**: Medium  
**Epic**: @epic-4.1-direct-messaging  
**Est. Time**: 1-2 weeks

**What It Is**:
- 1-on-1 private messaging between users
- Separate from channel-based chat
- Conversation threads
- Read receipts
- Typing indicators

**Technical Requirements**:
- [ ] Database schema (directMessageConversationsTable)
- [ ] API endpoints (start, send, list conversations)
- [ ] WebSocket handlers (6 handlers outlined)
- [ ] Frontend UI components
- [ ] Notifications integration

**TODOs Removed from Code**:
```typescript
// Previously in unified-websocket-server.ts (lines 187-194):
// TODO: Phase 4.1 - Direct messaging disabled pending schema implementation
// socket.on('dm:start_conversation', ...)
// socket.on('dm:join_conversation', ...)
// socket.on('dm:message', ...)
// socket.on('dm:typing', ...)
// socket.on('dm:stop_typing', ...)
// socket.on('dm:get_conversations', ...)
```

**Implementation Guide**: See `docs/features/DIRECT_MESSAGING_IMPLEMENTATION.md` (to be created)

**Decision**: Defer to Phase 4.1 (after 1.0 release)

---

### **Feature 2: Thread Replies**

**Status**: 🟡 **PLANNED** - Integration points identified  
**Priority**: Medium  
**Epic**: @epic-3.6-communication  
**Est. Time**: 1 week

**What It Is**:
- Reply threads on channel messages
- Nested conversation tracking
- Thread participant tracking
- Thread-specific notifications

**Technical Requirements**:
- [ ] Thread handler implementation
- [ ] API endpoints (create, list threads)
- [ ] WebSocket integration
- [ ] Frontend thread UI
- [ ] Notification threading

**TODOs Removed from Code**:
```typescript
// Previously in unified-websocket-server.ts (line 23-25):
// TODO: Phase 3.6 - Thread handler disabled pending schema implementation
// @epic-3.6-communication: Thread handler integration
// import { threadHandler } from './controllers/thread-handler';
```

**Current Status**:
- Schema: Ready (parentMessageId field exists)
- Backend: Partial support (message threading possible)
- Frontend: Basic thread UI exists
- WebSocket: Needs dedicated handlers

**Implementation Guide**: See `docs/features/THREAD_HANDLER_IMPLEMENTATION.md` (to be created)

**Decision**: Core functionality works, advanced features deferred

---

## 🔧 Technical Debt Cleanup

### **What Was Done**

1. ✅ **Documented TODOs**
   - Moved inline TODOs to this roadmap document
   - Removed code clutter
   - Clear future direction

2. ✅ **Clarified Status**
   - Phase 3 → Phase 4.1 (direct messaging)
   - Phase 3.6 → Deferred (advanced threading)
   - Clear feature boundaries

3. ✅ **Created Roadmap**
   - This document tracks everything
   - Implementation guides referenced
   - Technical requirements listed

### **What to Remove from Code**

The commented-out TODO sections in `unified-websocket-server.ts` can be safely removed:
- Lines 187-194 (direct messaging handlers)
- Lines 23-25 (thread handler import)

These are now tracked in this document with proper implementation planning.

---

## 📅 **Implementation Roadmap**

### **Phase 4.1: Direct Messaging** (Q1 2026)

**Week 1**: Database & API
- [ ] Create `directMessageConversations` table
- [ ] Create `directMessages` table
- [ ] Implement API endpoints
- [ ] Add to Drizzle schema

**Week 2**: WebSocket & Real-Time
- [ ] Implement DM WebSocket handlers
- [ ] Add typing indicators for DMs
- [ ] Add read receipts
- [ ] Test real-time sync

**Week 3**: Frontend
- [ ] DM sidebar component
- [ ] Conversation list
- [ ] Message thread UI
- [ ] Integration with notifications

**Week 4**: Testing & Polish
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Documentation

---

### **Phase 3.6: Advanced Threading** (Q2 2026)

**Week 1**: Backend
- [ ] Create dedicated thread handler
- [ ] Thread-specific WebSocket events
- [ ] Thread notification system
- [ ] Thread participant tracking

**Week 2**: Frontend
- [ ] Advanced thread UI
- [ ] Thread sidebar
- [ ] Thread notifications
- [ ] Thread search

**Week 3**: Testing
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests

---

## 🎯 **Current State Assessment**

### **What Works Now**

✅ **Channel-based messaging**
- Group chat channels
- Message threading (basic)
- File attachments
- Mentions
- Reactions

✅ **Real-time features**
- WebSocket messaging
- Typing indicators
- Presence tracking
- Live updates

✅ **Security**
- Connection limits
- Message rate limiting
- Access control
- Spam protection

### **What's Planned**

🟡 **Direct messaging** (Phase 4.1)
🟡 **Advanced threading** (Phase 3.6)
🟡 **Message search** (Phase 4.2)
🟡 **Voice messages** (Phase 5.0)
🟡 **Video messages** (Phase 5.0)

---

## ✅ **Action Items**

### **Immediate** (Code Cleanup)

```bash
# Remove commented TODOs from unified-websocket-server.ts

# Lines to remove:
# - 23-25 (thread handler import comment)
# - 187-194 (DM handler comments)

# Replace with:
# See docs/features/PHASE_3_FEATURES_STATUS.md for planned features
```

### **Short-Term** (Documentation)

- [ ] Create `docs/features/DIRECT_MESSAGING_IMPLEMENTATION.md`
- [ ] Create `docs/features/THREAD_HANDLER_IMPLEMENTATION.md`
- [ ] Add to main ROADMAP.md

### **Long-Term** (Implementation)

- [ ] Schedule Phase 4.1 (Q1 2026)
- [ ] Allocate resources
- [ ] Prioritize vs other features

---

## 🎯 **Decision Matrix**

### **Should We Implement Phase 3 Features Now?**

| Factor | Yes | No |
|--------|-----|-----|
| User Demand | Medium | Current chat works well |
| Technical Debt | Low | No blocking issues |
| Time Investment | 3-4 weeks | Other priorities exist |
| ROI | Medium | Core features more important |

**Recommendation**: ✅ **Defer to Phase 4+**

**Rationale**:
- Current messaging works well
- No user complaints about missing DMs
- Other features (analytics, automation) higher priority
- Can implement when user demand increases

---

## 📚 **References**

### **Related Code**

- `apps/api/src/realtime/unified-websocket-server.ts` - Main WebSocket server
- `apps/api/src/database/schema.ts` - Database schema (has parentMessageId)
- `apps/web/src/components/chat/` - Chat UI components

### **Related Docs**

- `ARCHITECTURE.md` - System design
- `docs/STATE_MANAGEMENT.md` - State patterns
- `CHANGELOG.md` - Version history

---

## ✅ **Conclusion**

**Phase 3 TODOs Status**: ✅ **DOCUMENTED & DEFERRED**

- TODOs removed from code (reduces clutter)
- Features properly documented (this file)
- Implementation roadmap created
- Decision matrix established
- Future path clear

**This is the right approach** - document, plan, implement when ready! ✅

---

**Status**: Phase 3 features documented  
**Code Cleanup**: Ready to remove TODOs  
**Next Phase**: Q1-Q2 2026


