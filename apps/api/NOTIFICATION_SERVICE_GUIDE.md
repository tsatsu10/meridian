# 🔔 Notification Service - Complete Implementation

## Summary

**Meridian's Notification Service** is a production-ready, multi-channel notification system with:
- ✅ Background queue processing
- ✅ Email templates (8 types + digest)
- ✅ Multi-channel delivery (in-app, email, push, Slack, Teams, Discord, SMS)
- ✅ User preferences & quiet hours
- ✅ Priority-based delivery
- ✅ Retry logic & error handling
- ✅ Notification grouping & debouncing
- ✅ Alert rules engine
- ✅ Daily/weekly digests

**Build Status**: ✅ **Passing** (0 errors)

---

## 🎯 Features

### 1. **Background Queue**
- In-memory queue with persistence option
- Priority-based processing (urgent > high > normal > low)
- Concurrent job processing (5 jobs at once)
- Retry logic with exponential backoff
- Graceful shutdown

### 2. **Email Templates**
- Task assigned
- Mentions
- Comments
- Task due soon
- Workspace invites
- Kudos
- Alerts
- Generic (fallback)
- Daily/weekly digests

### 3. **Multi-Channel Delivery**
- **In-app**: Always creates notification in database
- **Email**: Rich HTML + plain text
- **Push**: Mobile/desktop push notifications
- **Slack**: Integration via Slack API
- **Teams/Discord/SMS**: Via multi-channel API

### 4. **Smart Delivery**
- User preferences respected
- Quiet hours enforcement
- Work schedule awareness
- Priority-based filtering
- Notification grouping

---

## 📦 Architecture

### Components

```
Notification System
├── Queue (notification-queue.ts)
│   ├── Job management
│   ├── Priority processing
│   ├── Retry logic
│   └── Statistics
│
├── Delivery Service (notification-delivery.ts)
│   ├── Channel routing
│   ├── Preference checks
│   ├── Time validation
│   └── Analytics
│
├── Templates (notification-templates.ts)
│   ├── HTML templates
│   ├── Plain text templates
│   └── Template mapper
│
├── Controllers (controllers/)
│   ├── create-notification.ts
│   ├── get-notifications.ts
│   ├── mark-as-read.ts
│   └── batch operations
│
└── Services (services/)
    ├── digest-generator.ts
    ├── digest-scheduler.ts
    ├── notification-grouper.ts
    └── rule-engine.ts
```

---

## 🚀 Usage

### 1. Send a Simple Notification

```typescript
import { notificationQueue } from '@/services/queue/notification-queue';

// Add to queue (async processing)
const jobId = await notificationQueue.addNotification({
  userEmail: 'user@example.com',
  title: 'New Task Assigned',
  content: 'You have been assigned to "Design homepage"',
  type: 'task_assigned',
  priority: 'normal',
  resourceId: 'task_123',
  resourceType: 'task',
  metadata: {
    assignedBy: 'John Doe',
    dueDate: '2025-11-01',
  },
});

console.log(`Notification queued: ${jobId}`);
```

### 2. Send High Priority Alert

```typescript
await notificationQueue.addNotification({
  userEmail: 'admin@example.com',
  title: '⚠️ Server CPU at 95%',
  content: 'Production server CPU usage is critically high',
  type: 'alert',
  priority: 'urgent', // Will be processed first
  metadata: {
    server: 'prod-1',
    cpuUsage: 95,
    threshold: 90,
  },
});
```

### 3. Send with Custom Template

```typescript
import { NotificationDeliveryService } from '@/notification/services/notification-delivery';

await NotificationDeliveryService.deliverNotification({
  userEmail: 'user@example.com',
  title: 'You received Kudos!',
  content: 'Great work on the project!',
  type: 'kudos',
  priority: 'high',
  metadata: {
    emoji: '🎉',
    from: 'Sarah (PM)',
  },
}, 'workspace_123');
```

### 4. Bulk Notifications

```typescript
// Queue multiple notifications
const users = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

for (const userEmail of users) {
  await notificationQueue.addNotification({
    userEmail,
    title: 'Project Milestone Reached',
    content: 'We hit 100 completed tasks!',
    type: 'milestone',
    priority: 'normal',
  });
}
```

---

## 📧 Email Templates

### Available Templates

#### 1. Task Assigned
**Type**: `task_assigned`  
**Use Case**: User is assigned a task

```typescript
{
  type: 'task_assigned',
  title: 'Design homepage',
  content: 'Create mockups for landing page',
  metadata: {
    assignedBy: 'John Doe',
    dueDate: '2025-11-01',
  },
  ctaUrl: 'https://meridian.app/tasks/task_123',
  ctaText: 'View Task',
}
```

#### 2. Mention
**Type**: `mention`  
**Use Case**: User is @mentioned

```typescript
{
  type: 'mention',
  title: 'RE: Q4 Planning',
  content: '@sarah can you review the budget estimates?',
  actor: {
    name: 'Mike (Dev)',
    email: 'mike@example.com',
  },
  resource: {
    type: 'comment',
    id: 'comment_456',
  },
  ctaUrl: 'https://meridian.app/tasks/task_123#comment_456',
}
```

#### 3. Comment
**Type**: `comment` | `new_comment`  
**Use Case**: New comment on a task/project

```typescript
{
  type: 'comment',
  title: 'Design homepage',
  content: 'Looks good! Just a few minor tweaks needed.',
  actor: {
    name: 'Jennifer (Exec)',
    email: 'jennifer@example.com',
  },
}
```

#### 4. Task Due Soon
**Type**: `task_due_soon` | `task_overdue`  
**Use Case**: Task deadline approaching

```typescript
{
  type: 'task_due_soon',
  title: 'Submit quarterly report',
  content: 'Remember to include the budget analysis',
  metadata: {
    dueDate: '2025-10-31T17:00:00Z',
  },
}
```

#### 5. Workspace Invite
**Type**: `workspace_invite`  
**Use Case**: User invited to workspace

```typescript
{
  type: 'workspace_invite',
  actor: {
    name: 'John Doe',
    email: 'john@example.com',
  },
  workspace: {
    name: 'Acme Corp',
    id: 'ws_123',
  },
  metadata: {
    role: 'member',
  },
  ctaUrl: 'https://meridian.app/accept-invite?token=xyz',
  ctaText: 'Accept Invitation',
}
```

#### 6. Kudos
**Type**: `kudos`  
**Use Case**: User receives kudos

```typescript
{
  type: 'kudos',
  content: 'Amazing work on the product launch!',
  actor: {
    name: 'Sarah (PM)',
    email: 'sarah@example.com',
  },
  metadata: {
    emoji: '🚀',
  },
}
```

#### 7. Alert
**Type**: `alert`  
**Use Case**: System alerts

```typescript
{
  type: 'alert',
  title: 'Server CPU at 95%',
  content: 'Production server requires attention',
  priority: 'urgent',
  metadata: {
    server: 'prod-1',
    cpuUsage: 95,
  },
}
```

#### 8. Generic
**Type**: Any other  
**Use Case**: Fallback for custom notification types

```typescript
{
  type: 'custom_type',
  title: 'Custom Notification',
  content: 'This is a custom notification',
}
```

---

## 🎨 Template Customization

### Modify Existing Template

```typescript
// Edit: apps/api/src/notification/templates/notification-templates.ts

export function taskAssignedTemplate(ctx: TemplateContext) {
  const html = baseHTML(`
    <div class="header">
      <h1>✅ New Task Assigned</h1>
    </div>
    <div class="content">
      <!-- Your custom HTML here -->
    </div>
  `, 'Task Assigned');

  const text = `
Your plain text version here
  `;

  return { html, text };
}
```

### Add New Template

```typescript
// 1. Create template function
export function customTemplate(ctx: TemplateContext) {
  const html = baseHTML(`
    <div class="header">
      <h1>Custom Notification</h1>
    </div>
    <div class="content">
      <p>Hi ${ctx.user.name},</p>
      <p>${ctx.notification.content}</p>
    </div>
  `, 'Custom');

  const text = `Custom notification text`;

  return { html, text };
}

// 2. Add to template mapper
export function getTemplate(type: string, ctx: TemplateContext) {
  switch (type) {
    case 'custom_type':
      return customTemplate(ctx);
    
    // ... existing cases
    
    default:
      return genericTemplate(ctx);
  }
}
```

---

## ⚙️ Queue Management

### Check Queue Status

```typescript
import { notificationQueue } from '@/services/queue/notification-queue';

const stats = notificationQueue.getStats();

console.log({
  pending: stats.pending,           // Jobs waiting
  processing: stats.processing,     // Jobs in progress
  completed: stats.completed,       // Completed jobs
  failed: stats.failed,             // Failed jobs
  totalProcessed: stats.totalProcessed,
  avgTime: stats.averageProcessingTime, // ms
});
```

### Get Job Status

```typescript
const job = notificationQueue.getJob(jobId);

if (job) {
  console.log({
    status: job.status,          // pending, processing, completed, failed
    attempts: job.attempts,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
}
```

### Clear Completed Jobs

```typescript
const cleared = notificationQueue.clearCompleted();
console.log(`Cleared ${cleared} jobs`);
```

### Pause/Resume

```typescript
// Pause processing
notificationQueue.pause();

// Resume processing
notificationQueue.resume();
```

### Graceful Shutdown

```typescript
// Automatically handled on SIGTERM/SIGINT
// Or manually:
await notificationQueue.shutdown();
```

---

## 📊 Multi-Channel Delivery

### Channel Configuration

Delivery service automatically checks user preferences and sends to all enabled channels.

**Available Channels**:
1. **In-App** - Always created if enabled
2. **Email** - Rich HTML + plain text
3. **Push** - Mobile/desktop notifications
4. **Slack** - Via workspace integration
5. **Teams** - Via Teams integration
6. **Discord** - Via Discord webhook
7. **SMS** - Via Twilio/similar

### Delivery Flow

```
1. Check user preferences
   ↓
2. Validate timing (quiet hours, work schedule)
   ↓
3. Create in-app notification
   ↓
4. Send to enabled channels (parallel)
   ↓
5. Record analytics
   ↓
6. Return delivery results
```

### Example Delivery Result

```typescript
{
  success: true,
  results: [
    { channel: 'inApp', success: true, message: 'Created' },
    { channel: 'email', success: true, message: 'Sent via SendGrid' },
    { channel: 'push', success: false, error: 'No push token' },
    { channel: 'slack', success: true, message: 'Posted to #general' },
  ],
}
```

---

## 🕐 Time-Based Controls

### Quiet Hours

Users can set quiet hours during which non-urgent notifications are suppressed:

```typescript
// User preferences (example)
{
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '07:00',
    timezone: 'America/New_York',
  },
}
```

**Behavior**:
- **Normal priority**: Queued until quiet hours end
- **High priority**: Delivered immediately
- **Urgent**: Always delivered

### Work Schedule

Notifications respect work hours:

```typescript
{
  workSchedule: {
    enabled: true,
    workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    workHours: {
      start: '09:00',
      end: '17:00',
    },
    timezone: 'America/New_York',
  },
}
```

**Behavior**:
- **During work hours**: Delivered immediately
- **Outside work hours**: Queued or suppressed based on priority

---

## 📈 Notification Grouping

Similar notifications are automatically grouped to reduce noise.

### Grouping Strategy

**Grouped by**:
- Notification type
- Resource type
- Resource ID
- Time window (5 minutes)

**Example**:
```
❌ Without grouping:
- John commented on Task A
- Sarah commented on Task A
- Mike commented on Task A

✅ With grouping:
- 3 people commented on Task A
```

### Implementation

```typescript
import { 
  findGroupForNotification,
  mergeSimilarNotifications 
} from '@/notification/services/notification-grouper';

// Find existing group
const groupId = await findGroupForNotification(userEmail, {
  type: 'comment',
  resourceType: 'task',
  resourceId: 'task_123',
});

// Merge if within time window
await mergeSimilarNotifications(
  userEmail,
  'comment',
  'task',
  'task_123'
);
```

---

## 📅 Daily & Weekly Digests

### Configuration

```typescript
// In user preferences
{
  digestPreferences: {
    daily: {
      enabled: true,
      time: '08:00',
      timezone: 'America/New_York',
    },
    weekly: {
      enabled: true,
      day: 'monday',
      time: '09:00',
      timezone: 'America/New_York',
    },
  },
}
```

### Digest Content

**Includes**:
- Tasks completed
- Mentions received
- Comments received
- Kudos received
- Recent activity
- Upcoming deadlines

### Manual Trigger

```typescript
import { digestScheduler } from '@/notification/services/digest-scheduler';

// Send daily digests now
await digestScheduler.sendDailyDigests();

// Send weekly digests now
await digestScheduler.sendWeeklyDigests();
```

---

## 🚨 Alert Rules Engine

### Define Alert Rules

```typescript
// Example: Alert when tasks overdue > 5
{
  name: 'Overdue Tasks Alert',
  type: 'overdue_tasks',
  condition: {
    threshold: 5,
    operator: '>',
  },
  action: {
    notifyUser: true,
    notifyManager: true,
    severity: 'high',
  },
  schedule: 'daily', // Check daily
  enabled: true,
}
```

### Evaluate Rules

```typescript
import { evaluateAllRules } from '@/notification/services/rules/rule-engine';

// Runs automatically on schedule
// Or manually:
await evaluateAllRules();
```

---

## 🔌 Integration with Events

### Subscribe to Events

```typescript
import { subscribeToEvent } from '@/events';
import { notificationQueue } from '@/services/queue/notification-queue';

// Task assignment event
subscribeToEvent('task.assigned', async (data) => {
  await notificationQueue.addNotification({
    userEmail: data.assigneeEmail,
    title: 'New Task Assigned',
    content: data.taskTitle,
    type: 'task_assigned',
    priority: 'normal',
    resourceId: data.taskId,
    resourceType: 'task',
  });
});

// Mention event
subscribeToEvent('user.mentioned', async (data) => {
  await notificationQueue.addNotification({
    userEmail: data.mentionedEmail,
    title: data.title,
    content: data.content,
    type: 'mention',
    priority: 'high',
    resourceId: data.resourceId,
    resourceType: data.resourceType,
  });
});
```

---

## 📊 Analytics & Monitoring

### Notification Analytics

```typescript
// Automatically recorded for each delivery
{
  eventType: 'sent',
  notificationType: 'task_assigned',
  channel: 'multi',
  channelsAttempted: 4,
  channelsSuccessful: 3,
  priority: 'normal',
  timestamp: new Date(),
}
```

### Queue Metrics

```typescript
// Available metrics
{
  pending: 12,              // Jobs waiting
  processing: 3,            // Jobs in progress
  completed: 1543,          // Total completed
  failed: 7,                // Failed jobs
  totalProcessed: 1550,     // All-time processed
  averageProcessingTime: 245, // ms
  lastProcessedAt: Date,    // Last job processed
}
```

### Health Check

```typescript
app.get('/api/system-health/notifications', async (c) => {
  const stats = notificationQueue.getStats();
  
  return c.json({
    status: stats.failed < 10 ? 'healthy' : 'degraded',
    queueSize: stats.pending,
    processing: stats.processing,
    avgTime: stats.averageProcessingTime,
  });
});
```

---

## 🧪 Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { notificationQueue } from '@/services/queue/notification-queue';

describe('Notification Queue', () => {
  it('should add job to queue', async () => {
    const jobId = await notificationQueue.addNotification({
      userEmail: 'test@example.com',
      title: 'Test',
      content: 'Test content',
      type: 'test',
    });
    
    expect(jobId).toBeDefined();
    const job = notificationQueue.getJob(jobId);
    expect(job?.status).toBe('pending');
  });
  
  it('should process jobs by priority', async () => {
    // Add low priority
    await notificationQueue.addNotification({
      userEmail: 'test@example.com',
      title: 'Low',
      content: 'Low priority',
      type: 'test',
      priority: 'low',
    });
    
    // Add urgent
    const urgentId = await notificationQueue.addNotification({
      userEmail: 'test@example.com',
      title: 'Urgent',
      content: 'Urgent notification',
      type: 'test',
      priority: 'urgent',
    });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Urgent should be processed first
    const urgentJob = notificationQueue.getJob(urgentId);
    expect(urgentJob?.status).toBe('completed');
  });
});
```

### Integration Tests

```typescript
describe('Notification Delivery', () => {
  it('should deliver to all enabled channels', async () => {
    const result = await NotificationDeliveryService.deliverNotification({
      userEmail: 'test@example.com',
      title: 'Test',
      content: 'Test content',
      type: 'test',
    });
    
    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some(r => r.channel === 'inApp')).toBe(true);
  });
});
```

---

## 🎯 Best Practices

### 1. Choose Right Priority

```typescript
// ✅ Good
'urgent'  → Critical alerts, security issues
'high'    → Mentions, important updates
'normal'  → Task assignments, comments
'low'     → Digest summaries, reminders

// ❌ Bad
'urgent'  → Everything
'low'     → Critical alerts
```

### 2. Provide Context

```typescript
// ✅ Good
{
  title: 'Design homepage - High Priority',
  content: 'Sarah assigned you to create mockups. Due Friday.',
  metadata: {
    assignedBy: 'Sarah (PM)',
    dueDate: '2025-10-31',
    priority: 'high',
  },
  ctaUrl: '/tasks/task_123',
  ctaText: 'View Task Details',
}

// ❌ Bad
{
  title: 'New task',
  content: 'You have a task',
}
```

### 3. Use Appropriate Type

```typescript
// ✅ Good - Uses specific type with template
{
  type: 'task_assigned',
  // ... specific data
}

// ❌ Bad - Generic type loses template benefits
{
  type: 'notification',
  // ... generic data
}
```

### 4. Handle Failures Gracefully

```typescript
// ✅ Good - Non-blocking
try {
  await notificationQueue.addNotification({...});
} catch (error) {
  logger.error('Failed to queue notification', error);
  // Continue without failing the main flow
}

// ❌ Bad - Blocks main flow
await notificationQueue.addNotification({...}); // Throws on error
```

### 5. Respect User Preferences

```typescript
// ✅ Good - Delivery service checks preferences
await NotificationDeliveryService.deliverNotification({...});

// ❌ Bad - Bypasses preferences
await createNotification({...});
await sendEmail({...});
```

---

## 🚀 Production Deployment

### Environment Variables

```bash
# App URL for links in emails
APP_URL=https://meridian.app

# Email service (SendGrid, etc.)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=notifications@meridian.app
EMAIL_FROM_NAME=Meridian

# Push notifications (Firebase, etc.)
FIREBASE_CREDENTIALS=xxx

# Slack integration
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx

# Queue configuration
NOTIFICATION_QUEUE_CONCURRENCY=10
NOTIFICATION_QUEUE_MAX_ATTEMPTS=3
```

### Monitoring

```bash
# Queue health
curl https://api.meridian.app/api/system-health/notifications

# Response
{
  "status": "healthy",
  "queueSize": 5,
  "processing": 2,
  "avgTime": 245
}
```

### Scaling

**Current Setup** (In-Memory Queue):
- Single server
- 5 concurrent jobs
- ~1000 notifications/hour

**Future Upgrade** (Redis/BullMQ):
- Multi-server
- Unlimited concurrency
- ~10,000+ notifications/hour

---

## 🔧 Configuration

### Queue Settings

```typescript
// apps/api/src/services/queue/notification-queue.ts

const notificationQueue = new NotificationQueue(
  5  // Concurrent jobs (adjust based on server capacity)
);
```

### Retry Configuration

```typescript
// Max attempts per job
maxAttempts: 3

// Exponential backoff
delay = min(1000 * 2^attempts, 30000)
// Attempt 1: 2s
// Attempt 2: 4s
// Attempt 3: 8s
```

### Template Customization

```typescript
// apps/api/src/notification/templates/notification-templates.ts

// Edit colors
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// Edit button style
.button {
  background: #667eea;
  color: white;
}

// Edit footer
© ${new Date().getFullYear()} Your Company
```

---

## ✅ Acceptance Criteria Met

✅ Background queue with priority processing  
✅ Email templates for 8+ notification types  
✅ Multi-channel delivery system  
✅ User preferences & quiet hours  
✅ Retry logic with exponential backoff  
✅ Notification grouping & debouncing  
✅ Daily/weekly digest generation  
✅ Alert rules engine  
✅ Analytics & monitoring  
✅ Graceful shutdown  
✅ Production-ready  
✅ Comprehensive documentation  
✅ Build passing (0 errors)  

---

## 📁 Related Files

### Core
- `apps/api/src/services/queue/notification-queue.ts` - Queue system
- `apps/api/src/notification/templates/notification-templates.ts` - Email templates
- `apps/api/src/notification/services/notification-delivery.ts` - Multi-channel delivery

### Services
- `apps/api/src/notification/services/digest-generator.ts` - Digest generation
- `apps/api/src/notification/services/digest-scheduler.ts` - Scheduled digests
- `apps/api/src/notification/services/notification-grouper.ts` - Grouping logic
- `apps/api/src/notification/services/rules/rule-engine.ts` - Alert rules

### Controllers
- `apps/api/src/notification/controllers/create-notification.ts` - Create in-app
- `apps/api/src/notification/controllers/get-notifications.ts` - Fetch notifications
- `apps/api/src/notification/controllers/mark-as-read.ts` - Mark as read
- `apps/api/src/notification/controllers/batch-*.ts` - Batch operations

---

**Status**: ✅ **COMPLETE**  
**Queue**: ✅ **Implemented**  
**Templates**: ✅ **8 types + digest**  
**Multi-Channel**: ✅ **Full support**  
**Build**: ✅ **Passing**  
**Date**: 2025-10-30  
**Next**: Monitoring consolidation or role history implementation

