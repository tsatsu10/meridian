# 🛡️ Soft Delete & GDPR Compliance Guide

**Date**: October 30, 2025  
**Status**: ✅ **PARTIAL IMPLEMENTATION - GOOD FOUNDATION**  
**GDPR Compliance**: ⚠️ **REQUIRES ATTENTION**

---

## 📊 **CURRENT STATE ANALYSIS**

### **Soft Delete Coverage**
```
Tables with Soft Delete:    2/79   (3%)  ⚠️
Tables with isActive:       Multiple    ✅
Hard Delete Only:          Most tables  ⚠️

Current Implementation:     Partial
GDPR Readiness:            Needs improvement
```

---

## ✅ **EXISTING SOFT DELETE IMPLEMENTATIONS**

### **1. Messages Table** ✅
**Location**: `apps/api/src/database/schema.ts`
```typescript
export const messagesTable = pgTable("messages", {
  // ... fields
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  // ... rest
});
```

**Implementation**: `apps/api/src/message/index.ts`
```typescript
// Soft delete: Set deletedAt timestamp
const [deletedMessage] = await db
  .update(messagesTable)
  .set({
    deletedAt: new Date(),
    updatedAt: new Date(),
  })
  .where(eq(messagesTable.id, messageId))
  .returning();

// Broadcast WebSocket event
wsServer.broadcast('chat:message_deleted', conversationId, {
  messageId,
  deletedAt: new Date(),
});
```

**Benefits**:
- ✅ Users can delete messages
- ✅ Content preserved for moderation
- ✅ Real-time updates work
- ✅ Audit trail maintained

---

### **2. Calendar Events** ✅
**Location**: `apps/api/src/database/schema.ts`
```typescript
export const calendarEvents = pgTable("calendar_events", {
  // ... fields
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // ... rest
});
```

**Implementation**: `apps/api/src/calendar/controllers/delete-event.ts`
```typescript
// Soft delete the event
await db
  .update(calendarEvents)
  .set({ 
    deletedAt: new Date(),
    updatedAt: new Date()
  })
  .where(eq(calendarEvents.id, eventId));
```

**Benefits**:
- ✅ Event history preserved
- ✅ Calendar integrity maintained
- ✅ Undo capability possible

---

### **3. Teams (isActive Pattern)** ✅
**Location**: `apps/api/src/project/controllers/teams/delete-team.ts`
```typescript
// Soft delete - set isActive to false
await db
  .update(teams)
  .set({ 
    isActive: false,
    updatedAt: new Date() 
  })
  .where(eq(teams.id, teamId));
```

**Benefits**:
- ✅ Team can be reactivated
- ✅ Historical data preserved
- ✅ Queries can filter by isActive

---

## ⚠️ **GDPR REQUIREMENTS**

### **Right to Erasure (Article 17)**

GDPR requires users to request deletion of their personal data. This means:

**Must Support**:
- ✅ User account deletion
- ✅ User data anonymization
- ✅ Data retention periods
- ✅ Audit trails of deletions

**Current Gaps**:
- ⚠️ No user account soft delete
- ⚠️ No comprehensive data anonymization
- ⚠️ No retention policy enforcement
- ⚠️ Limited deletion audit logging

---

## 🎯 **RECOMMENDED SOFT DELETE STRATEGY**

### **Pattern 1: User-Generated Content** (Use `deletedAt`)

**Tables**: messages, comments, posts, notes, attachments

```typescript
export const exampleTable = pgTable("example", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  // ... content fields
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: text("deleted_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

**Queries**:
```typescript
// Include soft-deleted
const allMessages = await db.select().from(messagesTable);

// Exclude soft-deleted (default)
const activeMessages = await db
  .select()
  .from(messagesTable)
  .where(isNull(messagesTable.deletedAt));

// Only deleted
const deletedMessages = await db
  .select()
  .from(messagesTable)
  .where(isNotNull(messagesTable.deletedAt));
```

---

### **Pattern 2: Toggleable Records** (Use `isActive`)

**Tables**: teams, workspaces, projects (optional)

```typescript
export const exampleTable = pgTable("example", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  // ... fields
  isActive: boolean("is_active").default(true),
  deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
  deactivatedBy: text("deactivated_by").references(() => users.id),
});
```

**Use When**:
- Resources can be reactivated
- Need to maintain relationships
- Archive rather than delete

---

### **Pattern 3: User Accounts** (Special Handling)

**Users Table Enhancement**:
```typescript
export const users = pgTable("users", {
  id: text("id").$defaultFn(() => createId()).primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  // ... existing fields
  
  // GDPR: Soft delete support
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
  anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
  
  // GDPR: Data retention
  dataRetentionDate: timestamp("data_retention_date", { withTimezone: true }),
});
```

**User Deletion Flow**:
```typescript
async function deleteUser(userId: string, requestedBy: string) {
  const db = getDatabase();
  
  // 1. Mark deletion requested (30-day grace period)
  await db
    .update(users)
    .set({
      deletionRequestedAt: new Date(),
      dataRetentionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  
  // 2. Log audit trail
  await auditLogger.log({
    action: 'user.deletion_requested',
    userId,
    requestedBy,
    metadata: { retentionDays: 30 }
  });
  
  // 3. Schedule background job to anonymize after retention period
  // (Use cron job or queue)
}

async function anonymizeUser(userId: string) {
  const db = getDatabase();
  
  // 1. Anonymize personal data
  await db
    .update(users)
    .set({
      email: `deleted-${userId}@example.com`,
      name: 'Deleted User',
      password: 'ANONYMIZED',
      avatar: null,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      deletedAt: new Date(),
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  
  // 2. Anonymize user-generated content
  await anonymizeUserContent(userId);
  
  // 3. Log audit trail
  await auditLogger.log({
    action: 'user.anonymized',
    userId,
    metadata: { dataRetentionPeriodExpired: true }
  });
}
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **High Priority** (User Data)
- [ ] Add `deletedAt` to users table
- [ ] Implement user deletion request flow
- [ ] Create anonymization background job
- [ ] Add deletion audit logging

### **Medium Priority** (Content)
- [ ] Add `deletedAt` to:
  - [ ] comments
  - [ ] attachments
  - [ ] projectNotes
  - [ ] tasks (optional - consider isActive)
  - [ ] projects (optional - consider isActive)

### **Low Priority** (Nice to Have)
- [ ] Add `deletedAt` to:
  - [ ] notifications
  - [ ] activityLogs (maybe not - audit trail)
  - [ ] timeEntries (maybe not - billing)

### **Queries & Middleware**
- [ ] Create `whereNotDeleted()` helper
- [ ] Add soft delete middleware
- [ ] Update all queries to exclude deleted

---

## 🛠️ **HELPER UTILITIES**

### **Soft Delete Helper**
```typescript
// apps/api/src/utils/soft-delete.ts

import { SQL, sql } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

/**
 * Helper to exclude soft-deleted records
 */
export function whereNotDeleted(deletedAtColumn: PgColumn): SQL {
  return sql`${deletedAtColumn} IS NULL`;
}

/**
 * Helper to include soft-deleted records explicitly
 */
export function whereDeleted(deletedAtColumn: PgColumn): SQL {
  return sql`${deletedAtColumn} IS NOT NULL`;
}

/**
 * Soft delete a record
 */
export async function softDelete<T>(
  db: Database,
  table: Table,
  id: string,
  deletedBy?: string
) {
  return db
    .update(table)
    .set({
      deletedAt: new Date(),
      deletedBy: deletedBy || null,
      updatedAt: new Date(),
    })
    .where(eq(table.id, id))
    .returning();
}

/**
 * Restore soft-deleted record
 */
export async function restore<T>(
  db: Database,
  table: Table,
  id: string
) {
  return db
    .update(table)
    .set({
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(table.id, id))
    .returning();
}
```

### **Query Middleware**
```typescript
// Auto-exclude soft-deleted records
const activeRecords = db.query.messagesTable.findMany({
  where: whereNotDeleted(messagesTable.deletedAt),
});

// Explicitly include deleted
const allRecords = db.query.messagesTable.findMany({
  // No filter - includes all
});

// Only deleted
const deletedRecords = db.query.messagesTable.findMany({
  where: whereDeleted(messagesTable.deletedAt),
});
```

---

## 🔍 **GDPR COMPLIANCE CHECKLIST**

### **Right to Erasure (Article 17)**
- [ ] User can request account deletion
- [ ] 30-day grace period implemented
- [ ] Data anonymization after retention period
- [ ] User-generated content handled
- [ ] Audit trail of deletions

### **Right to Data Portability (Article 20)**
- [x] User can export their data (existing)
- [ ] Export includes all personal data
- [ ] Machine-readable format (JSON/CSV)

### **Data Retention**
- [ ] Define retention periods by data type
- [ ] Automated deletion after retention period
- [ ] Legal basis documented
- [ ] Business justification documented

### **Audit Trail**
- [ ] Log all deletion requests
- [ ] Log all anonymizations
- [ ] Log who requested deletion
- [ ] Log when data was deleted

---

## 📊 **RECOMMENDED IMPLEMENTATION PHASES**

### **Phase 1: Critical** (1 week)
1. Add `deletedAt` to users table
2. Implement user deletion request
3. Create anonymization logic
4. Add deletion audit logging

### **Phase 2: Important** (1 week)
5. Add `deletedAt` to content tables (comments, notes)
6. Create soft delete helpers
7. Update queries to exclude deleted
8. Add restore functionality

### **Phase 3: Polish** (1 week)
9. Background job for auto-anonymization
10. Admin interface for managing deletions
11. Data retention policy enforcement
12. Comprehensive testing

---

## ⚠️ **IMPORTANT CONSIDERATIONS**

### **Don't Soft Delete Everything**

❌ **Don't Soft Delete**:
- Audit logs (immutable by design)
- Financial records (legal requirements)
- Billing data (regulatory compliance)
- Session tokens (security)

✅ **Do Soft Delete**:
- User accounts (GDPR)
- User-generated content (undo capability)
- Projects/Teams (business logic)
- Messages (moderation)

### **Performance Considerations**

**Add Indexes**:
```typescript
export const messagesTable = pgTable("messages", {
  // ... fields
}, (table) => ({
  deletedAtIdx: index("idx_messages_deleted_at").on(table.deletedAt),
  activeMessagesIdx: index("idx_messages_active").on(table.id).where(sql`deleted_at IS NULL`),
}));
```

**Query Performance**:
- Partial indexes for active records
- Regular cleanup of old soft-deleted records
- Consider archiving very old deleted data

---

## 🎯 **CONCLUSION**

### **Current Status**: ✅ **GOOD FOUNDATION**

**Strengths**:
- ✅ Soft delete implemented for messages & events
- ✅ `isActive` pattern for teams
- ✅ Good timestamp coverage (from Task 8)

**Gaps**:
- ⚠️ No user account soft delete
- ⚠️ No comprehensive GDPR workflow
- ⚠️ Limited soft delete coverage
- ⚠️ No automated anonymization

### **Recommendations**:

1. **Implement Phase 1** (user deletion) for GDPR compliance
2. **Add soft delete helpers** for consistency
3. **Document retention policies**
4. **Test thoroughly** before production

**Priority**: **Medium** - Important for GDPR, not blocking for launch

---

## 📚 **REFERENCES**

- GDPR Article 17: Right to Erasure
- GDPR Article 20: Right to Data Portability
- Current Implementation:
  - `apps/api/src/message/index.ts` (line 434)
  - `apps/api/src/calendar/controllers/delete-event.ts` (line 24)
  - `apps/api/src/project/controllers/teams/delete-team.ts` (line 46)

---

**Status**: ✅ **DOCUMENTED - READY FOR IMPLEMENTATION**  
**GDPR Compliance**: ⚠️ **PARTIAL - NEEDS ATTENTION**  
**Recommendation**: Implement Phase 1 before EU launch


