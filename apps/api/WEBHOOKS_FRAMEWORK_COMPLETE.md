# 🔗 Outbound Webhooks Framework - Complete Implementation

## Summary

**Production-grade outbound webhook system** for external integrations:
- ✅ HMAC-SHA256 signature signing
- ✅ Automatic retries with exponential backoff (1s, 5s, 15s)
- ✅ Delivery tracking & history
- ✅ Event-based triggering
- ✅ Webhook management API (8 endpoints)
- ✅ Service layer with retry logic
- ✅ Monitoring & logging integration

**Build Status**: ✅ **Passing** (0 errors)

---

## 🎯 Features

### 1. **Webhook Management**
- Create/update/delete webhooks
- Configure events to subscribe to
- Store webhook secrets securely
- Workspace & project scoping

### 2. **Secure Delivery**
- HMAC-SHA256 payload signing
- Signature verification
- 10-second timeout
- Error handling

### 3. **Retry Logic**
- Automatic retries (up to 3 attempts)
- Exponential backoff (1s → 5s → 15s)
- Delivery status tracking
- Manual retry capability

### 4. **Event System**
- Subscribe to specific events
- Wildcard event subscriptions
- Event filtering
- Custom event support

### 5. **Monitoring**
- Delivery success/failure tracking
- Response time monitoring
- Retry statistics
- Error logging

---

## 📋 API Endpoints

### 1. Create Webhook

**POST** `/api/webhooks`

**Request**:
```json
{
  "url": "https://myapp.com/webhooks/meridian",
  "events": ["task.created", "task.completed", "project.updated"],
  "secret": "my_webhook_secret_key",
  "workspaceId": "ws_123",
  "projectId": "proj_456",
  "description": "Send task updates to our internal system"
}
```

**Response**:
```json
{
  "success": true,
  "webhook": {
    "id": "webhook_1730304896_a1b2c3",
    "url": "https://myapp.com/webhooks/meridian",
    "events": ["task.created", "task.completed", "project.updated"],
    "workspaceId": "ws_123",
    "projectId": "proj_456",
    "isActive": true,
    "createdAt": "2025-10-30T12:00:00Z"
  },
  "message": "Webhook created successfully"
}
```

---

### 2. List Webhooks

**GET** `/api/webhooks?workspaceId=ws_123&projectId=proj_456`

**Response**:
```json
{
  "success": true,
  "webhooks": [
    {
      "id": "webhook_123",
      "url": "https://myapp.com/webhooks/meridian",
      "events": ["task.created", "task.completed"],
      "isActive": true,
      "createdAt": "2025-10-30T12:00:00Z",
      "lastDeliveryAt": "2025-10-30T15:30:00Z",
      "deliveryCount": 234,
      "failureCount": 2
    }
  ],
  "count": 1
}
```

---

### 3. Get Webhook Details

**GET** `/api/webhooks/:id`

**Response**:
```json
{
  "success": true,
  "webhook": {
    "id": "webhook_123",
    "url": "https://myapp.com/webhooks/meridian",
    "events": ["task.created", "task.completed"],
    "workspaceId": "ws_123",
    "projectId": "proj_456",
    "description": "Task updates integration",
    "isActive": true,
    "createdBy": "user_789",
    "createdAt": "2025-10-30T12:00:00Z"
  }
}
```

---

### 4. Update Webhook

**PATCH** `/api/webhooks/:id`

**Request**:
```json
{
  "url": "https://myapp.com/new-webhook-endpoint",
  "events": ["task.created", "task.updated", "task.completed"],
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook updated successfully"
}
```

---

### 5. Delete Webhook

**DELETE** `/api/webhooks/:id`

**Response**:
```json
{
  "success": true,
  "message": "Webhook deleted successfully"
}
```

---

### 6. Test Webhook

**POST** `/api/webhooks/:id/test`

**Request**:
```json
{
  "testEvent": "webhook.test"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Test webhook sent",
  "delivery": {
    "status": "success",
    "testPayload": {
      "event": "webhook.test",
      "data": {
        "message": "This is a test webhook",
        "timestamp": "2025-10-30T12:00:00Z"
      }
    }
  }
}
```

---

### 7. Get Delivery History

**GET** `/api/webhooks/:id/deliveries?limit=50`

**Response**:
```json
{
  "success": true,
  "deliveries": [
    {
      "id": "delivery_456",
      "event": "task.created",
      "status": "success",
      "attempts": 1,
      "responseStatus": 200,
      "createdAt": "2025-10-30T15:30:00Z"
    },
    {
      "id": "delivery_457",
      "event": "task.completed",
      "status": "failed",
      "attempts": 3,
      "responseStatus": 500,
      "error": "Connection timeout",
      "createdAt": "2025-10-30T15:45:00Z"
    }
  ],
  "count": 2
}
```

---

### 8. Retry Failed Delivery

**POST** `/api/webhooks/:id/deliveries/:deliveryId/retry`

**Response**:
```json
{
  "success": true,
  "message": "Delivery retry initiated"
}
```

---

## 🔔 Available Events

### Task Events

- `task.created` - New task created
- `task.updated` - Task edited
- `task.assigned` - Task assigned to user
- `task.completed` - Task marked as done
- `task.deleted` - Task removed
- `task.commented` - Comment added to task

### Project Events

- `project.created` - New project
- `project.updated` - Project edited
- `project.completed` - Project finished
- `project.deleted` - Project removed
- `project.member_added` - User added to project

### User Events

- `user.created` - New user registered
- `user.updated` - Profile updated
- `user.role_changed` - Role assignment changed

### Workspace Events

- `workspace.created` - New workspace
- `workspace.member_added` - User invited
- `workspace.member_removed` - User removed

### Custom Events

- `custom.*` - Any custom event
- Use for business-specific workflows

---

## 📨 Webhook Payload Format

### Standard Payload Structure

```json
{
  "event": "task.created",
  "data": {
    "task": {
      "id": "task_123",
      "title": "Implement feature X",
      "description": "Add the new feature",
      "status": "todo",
      "priority": "high",
      "assigneeEmail": "mike@example.com",
      "projectId": "proj_456",
      "createdAt": "2025-10-30T12:00:00Z"
    },
    "project": {
      "id": "proj_456",
      "name": "Meridian Development"
    },
    "workspace": {
      "id": "ws_123",
      "name": "Meridian"
    },
    "triggeredBy": {
      "id": "user_789",
      "name": "Sarah PM",
      "email": "sarah@example.com"
    }
  },
  "timestamp": "2025-10-30T12:00:00.123Z",
  "webhookId": "webhook_abc123"
}
```

### Headers Sent

```
Content-Type: application/json
User-Agent: Meridian-Webhook/1.0
X-Meridian-Event: task.created
X-Meridian-Webhook-ID: webhook_abc123
X-Meridian-Timestamp: 2025-10-30T12:00:00.123Z
X-Meridian-Signature: sha256=abcdef123456... (if secret configured)
```

---

## 🔐 Signature Verification

### How Meridian Signs Webhooks

```typescript
// 1. Serialize payload
const payloadString = JSON.stringify(payload);

// 2. Create HMAC with secret
const hmac = crypto.createHmac('sha256', secret);

// 3. Generate signature
const signature = 'sha256=' + hmac.update(payloadString).digest('hex');

// 4. Send in X-Meridian-Signature header
```

### How to Verify (Receiver Side)

```typescript
// Node.js example
import crypto from 'crypto';

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');
  
  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// In webhook handler
app.post('/webhooks/meridian', (req, res) => {
  const signature = req.headers['x-meridian-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.MERIDIAN_WEBHOOK_SECRET;
  
  if (!verifyWebhook(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook
  console.log('Event:', req.body.event);
  console.log('Data:', req.body.data);
  
  res.json({ received: true });
});
```

---

## ⚡ Retry Logic

### Retry Strategy

**Attempts**: Up to 3  
**Delays**: 1s, 5s, 15s (exponential backoff)  
**Timeout**: 10 seconds per attempt  

### Retry Flow

```
Attempt 1:
  ↓ Failed (500 error)
Wait 1 second
  ↓
Attempt 2:
  ↓ Failed (timeout)
Wait 5 seconds
  ↓
Attempt 3:
  ↓ Failed (connection error)
  ↓
Mark as permanently failed
  ↓
Log error
  ↓
Send admin notification (optional)
```

### Success Criteria

**Success**: HTTP status 2xx (200-299)  
**Failure**: HTTP status 4xx, 5xx, or network error  
**Retry**: On any failure except 4xx (client errors)  

---

## 💡 Usage Examples

### Example 1: Setup Webhook for Task Updates

```typescript
// Create webhook
const response = await fetch('/api/webhooks', {
  method: 'POST',
  body: JSON.stringify({
    url: 'https://myapp.com/meridian-webhooks',
    events: ['task.created', 'task.updated', 'task.completed'],
    secret: 'my_secret_key_12345',
    workspaceId: 'ws_123',
  }),
});

const { webhook } = await response.json();
console.log('Webhook ID:', webhook.id);

// Now whenever tasks are created/updated/completed in workspace,
// Meridian will POST to https://myapp.com/meridian-webhooks
```

### Example 2: Trigger Webhook Programmatically

```typescript
import { WebhookService } from '@/services/webhooks/webhook-service';

// When task is created
app.post('/api/tasks', async (c) => {
  const task = await createTask(data);
  
  // Trigger webhooks
  const result = await WebhookService.triggerWebhook(
    task.workspaceId,
    'task.created',
    {
      task,
      project: await getProject(task.projectId),
      workspace: await getWorkspace(task.workspaceId),
      triggeredBy: c.get('user'),
    },
    task.projectId
  );
  
  winstonLog.info('Webhooks triggered', {
    event: 'task.created',
    triggered: result.triggered,
    successful: result.successful,
    failed: result.failed,
  });
  
  return c.json({ task });
});
```

### Example 3: Receive Webhook

```typescript
// Your external system
app.post('/webhooks/meridian', async (req, res) => {
  const signature = req.headers['x-meridian-signature'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.MERIDIAN_WEBHOOK_SECRET;
  
  // Verify signature
  if (!verifySignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'task.created':
      await handleNewTask(data.task);
      break;
      
    case 'task.completed':
      await handleCompletedTask(data.task);
      break;
      
    case 'project.updated':
      await handleProjectUpdate(data.project);
      break;
  }
  
  res.json({ received: true });
});
```

### Example 4: Test Webhook

```typescript
const testWebhook = async (webhookId: string) => {
  const response = await fetch(`/api/webhooks/${webhookId}/test`, {
    method: 'POST',
    body: JSON.stringify({
      testEvent: 'webhook.test',
    }),
  });
  
  const { delivery } = await response.json();
  
  if (delivery.status === 'success') {
    toast.success('Webhook test successful!');
  } else {
    toast.error('Webhook test failed - check endpoint');
  }
};
```

---

## 🔄 Event Triggering

### Automatic Triggering

```typescript
// In task creation controller
import { WebhookService } from '@/services/webhooks/webhook-service';

export const createTask = async (data) => {
  // Create task
  const task = await db.insert(tasks).values(data).returning();
  
  // Trigger webhooks (async, non-blocking)
  WebhookService.triggerWebhook(
    data.workspaceId,
    'task.created',
    {
      task,
      project: await getProject(data.projectId),
      createdBy: data.createdBy,
    },
    data.projectId
  ).catch(error => {
    // Log but don't fail the task creation
    winstonLog.error('Webhook trigger failed', { error });
  });
  
  return task;
};
```

### Manual Triggering

```typescript
// Trigger custom event
await WebhookService.triggerWebhook(
  'ws_123',
  'custom.sprint_started',
  {
    sprint: {
      id: 'sprint_456',
      name: 'Sprint 12',
      startDate: '2025-11-01',
      endDate: '2025-11-15',
    },
    tasks: sprintTasks,
  }
);
```

---

## 🎨 Webhook Dashboard UI

### Management Interface

```typescript
const WebhookManagement = () => {
  const [webhooks, setWebhooks] = useState([]);
  
  return (
    <div>
      <h2>Outbound Webhooks</h2>
      
      <Button onClick={() => setShowCreate(true)}>
        Create Webhook
      </Button>
      
      <Table>
        <thead>
          <tr>
            <th>URL</th>
            <th>Events</th>
            <th>Status</th>
            <th>Deliveries</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map(webhook => (
            <tr key={webhook.id}>
              <td>{webhook.url}</td>
              <td>
                {webhook.events.map(e => (
                  <Badge key={e}>{e}</Badge>
                ))}
              </td>
              <td>
                <Badge variant={webhook.isActive ? 'success' : 'gray'}>
                  {webhook.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </td>
              <td>
                <span>{webhook.deliveryCount} sent</span>
                {webhook.failureCount > 0 && (
                  <span className="text-red-500">
                    , {webhook.failureCount} failed
                  </span>
                )}
              </td>
              <td>
                <Button size="sm" onClick={() => testWebhook(webhook.id)}>
                  Test
                </Button>
                <Button size="sm" variant="ghost" onClick={() => editWebhook(webhook)}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteWebhook(webhook.id)}>
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};
```

### Delivery History

```typescript
const DeliveryHistory = ({ webhookId }: { webhookId: string }) => {
  const { data } = useQuery(['webhook-deliveries', webhookId], () =>
    fetch(`/api/webhooks/${webhookId}/deliveries?limit=100`)
      .then(res => res.json())
  );
  
  return (
    <div>
      <h3>Delivery History</h3>
      
      <ul>
        {data?.deliveries.map(delivery => (
          <li key={delivery.id} className="p-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <Badge>{delivery.event}</Badge>
                <span className="ml-2 text-sm text-gray-500">
                  {formatRelativeTime(delivery.createdAt)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {delivery.status === 'success' ? (
                  <Badge variant="success">
                    ✓ {delivery.responseStatus}
                  </Badge>
                ) : (
                  <>
                    <Badge variant="destructive">
                      ✗ Failed after {delivery.attempts} attempts
                    </Badge>
                    <Button size="sm" onClick={() => retryDelivery(delivery.id)}>
                      Retry
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {delivery.error && (
              <div className="mt-2 text-sm text-red-600">
                Error: {delivery.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## 🧪 Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { WebhookService } from '@/services/webhooks/webhook-service';

describe('Webhook Service', () => {
  it('should generate valid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test_secret';
    
    const signature = WebhookService.generateSignature(payload, secret);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
  
  it('should verify signature correctly', () => {
    const payload = '{"test":"data"}';
    const secret = 'test_secret';
    
    const signature = WebhookService.generateSignature(payload, secret);
    const isValid = WebhookService.verifySignature(payload, signature, secret);
    
    expect(isValid).toBe(true);
  });
  
  it('should retry on failure', async () => {
    const sendSpy = vi.spyOn(WebhookService as any, 'sendWebhook')
      .mockResolvedValueOnce({ success: false, error: 'Timeout' })
      .mockResolvedValueOnce({ success: false, error: 'Timeout' })
      .mockResolvedValueOnce({ success: true, status: 200 });
    
    const delivery = await WebhookService.deliverWebhook(
      {
        id: 'webhook_test',
        url: 'https://test.com',
        events: ['test'],
        isActive: true,
        workspaceId: 'ws_test',
      },
      'test.event',
      { message: 'test' }
    );
    
    expect(delivery.attempts).toBe(3);
    expect(delivery.status).toBe('success');
  });
});
```

---

## 📊 Monitoring & Analytics

### Webhook Metrics

```typescript
// Track deliveries
monitoringService.increment('webhooks.delivered', 1, {
  event: 'task.created',
  status: 'success',
});

// Track failures
monitoringService.increment('webhooks.failed', 1, {
  event: 'task.created',
  attempt: 3,
});

// Track timing
monitoringService.timing('webhook.delivery.duration', 245, {
  event: 'task.created',
});
```

### Dashboard Metrics

```
Total Webhooks:      23
Active Webhooks:     19
Total Deliveries:    1,543
Successful:          1,498 (97%)
Failed:              45 (3%)
Avg Delivery Time:   245ms
```

---

## 🎯 Use Cases

### Use Case 1: Slack Notifications

**Setup**:
```json
{
  "url": "https://hooks.slack.com/services/T00/B00/XXX",
  "events": ["task.completed", "project.completed"],
  "workspaceId": "ws_123"
}
```

**Payload Transformation**:
```typescript
// Webhook receiver transforms Meridian payload to Slack format
const slackMessage = {
  text: `Task completed: ${webhook.data.task.title}`,
  attachments: [{
    color: 'good',
    fields: [
      { title: 'Project', value: webhook.data.project.name },
      { title: 'Completed by', value: webhook.data.triggeredBy.name },
    ],
  }],
};

await postToSlack(slackMessage);
```

---

### Use Case 2: CRM Integration

**Setup**:
```json
{
  "url": "https://api.salesforce.com/webhooks/meridian",
  "events": ["project.created", "project.completed"],
  "secret": "salesforce_webhook_secret",
  "workspaceId": "ws_123"
}
```

**Workflow**:
1. Project created in Meridian
2. Webhook sent to Salesforce
3. Salesforce creates opportunity
4. Salesforce sends confirmation back

---

### Use Case 3: Analytics Platform

**Setup**:
```json
{
  "url": "https://analytics.mycompany.com/events",
  "events": ["task.*", "user.*", "project.*"],  // All events
  "workspaceId": "ws_123"
}
```

**Usage**:
- Track product usage
- Measure team productivity
- Generate custom reports
- Real-time dashboards

---

## ✅ Acceptance Criteria Met

✅ Webhook creation and management  
✅ HMAC-SHA256 signature signing  
✅ Automatic retries with exponential backoff  
✅ Delivery tracking and history  
✅ Event-based triggering  
✅ Webhook testing endpoint  
✅ Manual retry capability  
✅ Success/failure monitoring  
✅ Error logging with Winston  
✅ Metrics collection  
✅ API endpoints (8 endpoints)  
✅ Service layer complete  
✅ Build passing (0 errors)  
✅ Production-ready  

---

## 📁 Related Files

### Core
- `apps/api/src/services/webhooks/webhook-service.ts` - Webhook delivery service
- `apps/api/src/modules/webhooks/index.ts` - Webhook management API

### Integration
- `apps/api/src/index.ts` - Route mounting (line 332)
- `apps/api/src/utils/winston-logger.ts` - Logging
- `apps/api/src/services/monitoring/monitoring-service.ts` - Metrics

---

## 🔮 Future Enhancements

- [ ] Webhook payload templates
- [ ] Conditional webhooks (filters)
- [ ] Webhook rate limiting
- [ ] Webhook batching (multiple events in one payload)
- [ ] Webhook transformations (customize payload)
- [ ] Webhook replay (resend past events)
- [ ] Delivery SLA monitoring
- [ ] Webhook marketplace (pre-built integrations)
- [ ] Webhook debugging tools
- [ ] Webhook analytics dashboard

---

**Status**: ✅ **COMPLETE**  
**Service**: ✅ **Implemented**  
**API Endpoints**: ✅ **8 endpoints**  
**Retry Logic**: ✅ **Exponential backoff**  
**Signing**: ✅ **HMAC-SHA256**  
**Build**: ✅ **Passing**  
**Progress**: 17/27 tasks (63%)  
**Date**: 2025-10-30  
**Next**: API keys management (completes all API features!)

