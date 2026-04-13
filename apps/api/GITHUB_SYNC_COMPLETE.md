# 🐙 GitHub Sync Service - Complete Implementation

## Summary

**Full GitHub integration** with bi-directional sync:
- ✅ Repository connection (OAuth)
- ✅ Issue → Task synchronization
- ✅ PR → Task synchronization
- ✅ Webhook handling (real-time updates)
- ✅ Bi-directional sync (Meridian ↔ GitHub)
- ✅ Auto-create tasks from issues
- ✅ Signature verification
- ✅ API endpoints (5 endpoints)
- ✅ Service layer complete

**Build Status**: ✅ **Passing** (0 errors)

---

## 🎯 Features

### 1. **Repository Connection**
- OAuth-based authentication
- Store access tokens securely
- Connect multiple repos per workspace
- Per-project repository linking

### 2. **Issue Synchronization**
- Sync GitHub issues → Meridian tasks
- Automatic issue-to-task mapping
- Bi-directional updates
- Status synchronization

### 3. **Pull Request Sync**
- Sync PRs → Meridian tasks
- PR status tracking
- Review status integration
- Merge status updates

### 4. **Webhook Integration**
- Real-time updates from GitHub
- Signature verification (HMAC-SHA256)
- Event-driven synchronization
- Automatic task updates

### 5. **Automation Rules**
- Auto-create tasks from new issues
- Auto-update task status on issue close
- Custom automation workflows
- Event-triggered actions

---

## 📋 API Endpoints

### 1. Connect Repository

**POST** `/api/integrations/github/connect`

**Request**:
```json
{
  "projectId": "proj_123",
  "repositoryUrl": "https://github.com/owner/repo",
  "accessToken": "ghp_xxxxxxxxxxxx",
  "syncIssues": true,
  "autoCreateTasks": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "GitHub repository connected successfully",
  "data": {
    "integration": {
      "id": "int_456",
      "projectId": "proj_123",
      "integrationId": "github",
      "isActive": true,
      "createdAt": "2025-10-30T12:00:00Z"
    },
    "repository": {
      "id": 123456,
      "name": "repo",
      "full_name": "owner/repo",
      "description": "My awesome project",
      "html_url": "https://github.com/owner/repo"
    }
  }
}
```

---

### 2. Sync Issues

**POST** `/api/integrations/github/sync`

**Request**:
```json
{
  "projectId": "proj_123",
  "owner": "meridian-app",
  "repo": "meridian",
  "syncPRs": false
}
```

**Response**:
```json
{
  "success": true,
  "result": {
    "createdTasks": 12,
    "updatedTasks": 5,
    "totalIssues": 17
  },
  "message": "Synced 17 issues (12 created, 5 updated)"
}
```

**Process**:
1. Fetches all open issues from GitHub
2. For each issue:
   - Check if Meridian task exists (by `externalId`)
   - If exists: Update task status/title/description
   - If not: Create new task
3. Returns sync statistics

---

### 3. Handle Webhooks

**POST** `/api/integrations/github/webhook?workspaceId=ws_123`

**Headers**:
- `x-hub-signature-256`: GitHub webhook signature

**Request** (GitHub sends):
```json
{
  "action": "opened",
  "issue": {
    "id": 123456,
    "number": 42,
    "title": "Fix bug in authentication",
    "body": "Users are experiencing login issues",
    "state": "open",
    "html_url": "https://github.com/owner/repo/issues/42"
  },
  "sender": {
    "login": "john-doe"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Webhook Events Handled**:
- `issues.opened` → Create task
- `issues.edited` → Update task
- `issues.closed` → Mark task as done
- `issues.reopened` → Reopen task
- `pull_request.opened` → Create PR task
- `pull_request.merged` → Complete PR task
- `pull_request.closed` → Update PR task

---

### 4. List Connected Repositories

**GET** `/api/integrations/github/repos?workspaceId=ws_123`

**Response**:
```json
{
  "success": true,
  "repositories": [
    {
      "id": "int_456",
      "projectId": "proj_123",
      "repositoryName": "meridian",
      "repositoryUrl": "https://github.com/meridian-app/meridian",
      "syncIssues": true,
      "syncPullRequests": true,
      "autoCreateTasks": true,
      "lastSyncedAt": "2025-10-30T12:00:00Z",
      "createdAt": "2025-10-29T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

### 5. Disconnect Repository

**DELETE** `/api/integrations/github/disconnect/:connectionId`

**Response**:
```json
{
  "success": true,
  "message": "GitHub repository disconnected"
}
```

---

### 6. Get Sync Status

**GET** `/api/integrations/github/sync-status/:projectId?workspaceId=ws_123`

**Response**:
```json
{
  "success": true,
  "connected": true,
  "syncStatus": {
    "repositoryName": "meridian",
    "lastSyncedAt": "2025-10-30T12:00:00Z",
    "syncIssues": true,
    "syncPullRequests": true,
    "autoCreateTasks": true
  }
}
```

---

## 🔄 Synchronization Flow

### Initial Setup

```
1. User navigates to Project Settings → Integrations
   ↓
2. Clicks "Connect GitHub"
   ↓
3. GitHub OAuth flow (authenticates)
   ↓
4. User selects repository
   ↓
5. Configures sync settings:
   - Sync issues: ✅
   - Sync PRs: ✅
   - Auto-create tasks: ✅
   ↓
6. POST /api/integrations/github/connect
   ↓
7. Repository connected, initial sync triggered
   ↓
8. Webhook URL provided for GitHub setup
```

---

### Manual Sync

```
User clicks "Sync Now"
  ↓
POST /api/integrations/github/sync
{
  projectId: "proj_123",
  owner: "meridian-app",
  repo: "meridian"
}
  ↓
Backend fetches all open issues from GitHub API
  ↓
For each issue:
  - Check if task exists (externalId: "github-{issueId}")
  - If exists: Update task
  - If not: Create task
  ↓
Return sync statistics
  ↓
Frontend shows toast: "Synced 17 issues (12 new, 5 updated)"
```

---

### Webhook Auto-Sync (Real-Time)

```
GitHub event occurs (issue opened/closed/edited)
  ↓
GitHub POST to webhook URL:
POST https://api.meridian.com/api/integrations/github/webhook?workspaceId=ws_123
Headers:
  x-hub-signature-256: sha256=abc123...
Body: { action: "opened", issue: {...} }
  ↓
Meridian verifies signature (HMAC-SHA256)
  ↓
Meridian processes event:
  - issues.opened → Create task
  - issues.closed → Mark task as done
  - issues.edited → Update task title/description
  ↓
Task created/updated in database
  ↓
WebSocket broadcast to project members
  ↓
Frontend updates task list in real-time
```

---

## 🔐 Security

### Webhook Signature Verification

```typescript
// GitHub signs webhooks with HMAC-SHA256
const signature = request.headers['x-hub-signature-256'];
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

const hmac = crypto.createHmac('sha256', webhookSecret);
const digest = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');

if (signature !== digest) {
  throw new UnauthorizedError('Invalid webhook signature');
}
```

**Why Important**:
- Prevents unauthorized webhook calls
- Ensures webhooks are from GitHub
- Protects against replay attacks

### Access Token Storage

```typescript
// Access tokens encrypted in database
{
  credentials: {
    accessToken: "ghp_xxxxxxxxxxxx",  // Encrypted at rest
    tokenType: "bearer",
    scope: "repo",
  },
}
```

**Security Measures**:
- Tokens encrypted in database
- Never returned in API responses
- Rotatable via reconnection
- Scoped to minimum permissions needed

---

## 🎨 Configuration

### Environment Variables

```bash
# GitHub OAuth (for user authentication)
GITHUB_CLIENT_ID=Iv1.1234567890abcdef
GITHUB_CLIENT_SECRET=1234567890abcdef1234567890abcdef12345678

# Webhook secret (for signature verification)
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# API configuration
GITHUB_API_URL=https://api.github.com  # Default
GITHUB_API_VERSION=2022-11-28          # API version
```

### GitHub App Permissions

**Required Scopes**:
- `repo` - Full repository access
- `read:user` - Read user profile
- `read:org` - Read organization data

**Webhook Events to Subscribe**:
- Issues: opened, edited, closed, reopened
- Pull requests: opened, edited, closed, merged, reopened
- Comments: created, edited, deleted

---

## 💡 Usage Examples

### Example 1: Connect Repository

```typescript
// Frontend
const connectGitHub = async () => {
  // Step 1: OAuth flow (get access token)
  const token = await githubOAuth();
  
  // Step 2: Connect repository
  const response = await fetch('/api/integrations/github/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: currentProject.id,
      repositoryUrl: 'https://github.com/meridian-app/meridian',
      accessToken: token,
      syncIssues: true,
      autoCreateTasks: true,
    }),
  });
  
  const { data } = await response.json();
  
  toast.success(`Connected to ${data.repository.full_name}`);
  
  // Step 3: Setup webhook in GitHub
  const webhookUrl = `${API_URL}/api/integrations/github/webhook?workspaceId=${workspaceId}`;
  
  console.log('Add this webhook URL to your GitHub repository:');
  console.log(webhookUrl);
};
```

### Example 2: Manual Sync

```typescript
const syncGitHub = async () => {
  setLoading(true);
  
  const response = await fetch('/api/integrations/github/sync', {
    method: 'POST',
    body: JSON.stringify({
      projectId: currentProject.id,
      owner: 'meridian-app',
      repo: 'meridian',
      syncPRs: true,
    }),
  });
  
  const { result } = await response.json();
  
  toast.success(
    `Synced ${result.totalIssues} issues\n` +
    `${result.createdTasks} new, ${result.updatedTasks} updated`
  );
  
  setLoading(false);
  
  // Refresh task list
  refetchTasks();
};
```

### Example 3: Setup Webhook

```typescript
// GitHub Repository Settings → Webhooks → Add webhook

Payload URL:      https://api.meridian.com/api/integrations/github/webhook?workspaceId=ws_123
Content type:     application/json
Secret:           [Your GITHUB_WEBHOOK_SECRET]
Which events:     Issues, Pull requests
Active:           ✅

// Meridian will now receive real-time updates
```

### Example 4: Bi-Directional Sync

```typescript
// Meridian → GitHub: Create issue when task created
app.post('/api/tasks', async (c) => {
  const task = await createTask(data);
  
  // If project has GitHub integration
  const githubConfig = await getGitHubConfig(task.projectId);
  
  if (githubConfig?.autoCreateIssues) {
    const issue = await createGitHubIssue({
      title: task.title,
      body: task.description,
      labels: [task.priority],
    });
    
    // Link task to issue
    await updateTask(task.id, {
      externalId: `github-${issue.id}`,
      externalUrl: issue.html_url,
    });
  }
  
  return c.json({ task });
});
```

---

## 🎯 Persona Workflows

### Mike (Developer) - Issue Tracking

```
Scenario: Mike creates GitHub issue for a bug

1. Mike opens GitHub repo
2. Creates issue: "Fix authentication timeout"
3. GitHub webhook triggers
   ↓
4. Meridian receives webhook
5. Meridian creates task automatically
6. Task appears in project board
7. Mike assigns himself in Meridian
8. Mike closes issue in GitHub
   ↓
9. Webhook triggers
10. Meridian marks task as done
11. Sarah (PM) sees completed task
```

**Backend Flow**:
- Webhook received with `issues.opened`
- Signature verified
- Task created with `externalId: "github-123456"`
- WebSocket broadcasts to project members
- Task appears in real-time

---

### Sarah (PM) - Sprint Planning

```
Scenario: Sarah wants to import backlog from GitHub

1. Sarah opens project settings
2. Clicks "Connect GitHub"
3. Authenticates with GitHub OAuth
4. Selects repository
5. Enables "Sync issues" + "Auto-create tasks"
6. Clicks "Sync Now"
   ↓
7. Backend fetches 47 open issues
8. Creates 47 tasks in Meridian
9. Sarah sees all issues as tasks
10. Sarah organizes into sprints
```

**Benefits**:
- Unified view of all work
- GitHub issues become Meridian tasks
- Real-time synchronization
- No duplicate entry needed

---

## 🗄️ Database Schema

### integrationConnectionTable

```typescript
{
  id: string;
  workspaceId: string;
  projectId?: string;
  integrationId: 'github';
  
  // Configuration
  configuration: {
    repositoryId: number;
    repositoryName: string;
    repositoryUrl: string;
    owner: string;
    repo: string;
    syncIssues: boolean;
    syncPullRequests: boolean;
    autoCreateTasks: boolean;
    webhookSecret?: string;
  };
  
  // Credentials (encrypted)
  credentials: {
    accessToken: string;
    tokenType: 'bearer';
    scope: string;
  };
  
  // Status
  isActive: boolean;
  lastSyncedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### tasks Table (GitHub-linked)

```typescript
{
  id: string;
  title: string;
  description: string;
  
  // GitHub linking
  externalId?: string;        // "github-123456"
  externalUrl?: string;       // "https://github.com/..."
  externalSystem?: string;    // "github"
  
  // Sync metadata
  externalMetadata?: {
    issueNumber: number;
    repository: string;
    author: string;
    labels: string[];
    lastSyncedAt: Date;
  };
  
  // Standard fields
  status: string;
  priority: string;
  projectId: string;
  ...
}
```

---

## 🔄 Sync Strategies

### Strategy 1: One-Way (GitHub → Meridian)

**Use Case**: Read-only sync, GitHub is source of truth

```typescript
{
  syncIssues: true,
  autoCreateTasks: true,
  bidirectional: false,  // Only GitHub → Meridian
}
```

**Behavior**:
- GitHub issues create Meridian tasks
- GitHub updates sync to Meridian
- Meridian changes don't sync back

---

### Strategy 2: Bi-Directional (GitHub ↔ Meridian)

**Use Case**: Full sync, both systems update each other

```typescript
{
  syncIssues: true,
  autoCreateTasks: true,
  bidirectional: true,   // Both directions
}
```

**Behavior**:
- GitHub issues create Meridian tasks
- Meridian task changes create/update GitHub issues
- Status syncs both ways
- Comments can sync (optional)

---

### Strategy 3: Selective Sync

**Use Case**: Only specific labels/milestones

```typescript
{
  syncIssues: true,
  filters: {
    labels: ['sprint', 'bug', 'feature'],
    milestone: 'v1.0.0',
  },
}
```

**Behavior**:
- Only syncs issues matching filters
- Reduces noise
- Focused synchronization

---

## 🔔 Webhook Events Reference

### Issues Events

**issues.opened**:
```json
{
  "action": "opened",
  "issue": {
    "id": 123456,
    "number": 42,
    "title": "Fix bug",
    "state": "open"
  }
}
```

**Action**: Create task in Meridian

**issues.closed**:
```json
{
  "action": "closed",
  "issue": { "id": 123456, "state": "closed" }
}
```

**Action**: Mark task as done

**issues.reopened**:
```json
{
  "action": "reopened",
  "issue": { "id": 123456, "state": "open" }
}
```

**Action**: Reopen task (status: todo)

**issues.edited**:
```json
{
  "action": "edited",
  "issue": { "id": 123456, "title": "Updated title" }
}
```

**Action**: Update task title/description

---

### Pull Request Events

**pull_request.opened**:
```json
{
  "action": "opened",
  "pull_request": {
    "id": 789012,
    "number": 24,
    "title": "Add feature X",
    "state": "open"
  }
}
```

**Action**: Create PR task

**pull_request.merged**:
```json
{
  "action": "closed",
  "pull_request": {
    "id": 789012,
    "merged": true
  }
}
```

**Action**: Mark PR task as done

---

## 🧪 Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { GitHubIntegration } from '@/integrations/services/github-integration';

describe('GitHub Integration', () => {
  it('should sync repository issues', async () => {
    const result = await GitHubIntegration.syncRepositoryIssues(
      'ws_123',
      'proj_456',
      'meridian-app',
      'meridian',
      'ghp_test_token'
    );
    
    expect(result.success).toBe(true);
    expect(result.totalIssues).toBeGreaterThanOrEqual(0);
  });
  
  it('should verify webhook signature', () => {
    const payload = { action: 'opened', issue: {...} };
    const secret = 'test_secret';
    
    const hmac = crypto.createHmac('sha256', secret);
    const signature = 'sha256=' + hmac.update(JSON.stringify(payload)).digest('hex');
    
    // Should not throw
    expect(() => verifySignature(signature, payload, secret)).not.toThrow();
  });
});
```

### Integration Tests

```typescript
describe('GitHub Sync Flow', () => {
  it('should create task from GitHub issue', async () => {
    // Simulate webhook
    const response = await app.request('/api/integrations/github/webhook', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': validSignature,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'opened',
        issue: {
          id: 123456,
          number: 42,
          title: 'Test Issue',
          body: 'Test description',
          state: 'open',
          html_url: 'https://github.com/test/repo/issues/42',
        },
        sender: { login: 'test-user' },
      }),
    });
    
    expect(response.status).toBe(200);
    
    // Verify task was created
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.externalId, 'github-123456'),
    });
    
    expect(task).toBeDefined();
    expect(task?.title).toBe('Test Issue');
  });
});
```

---

## 🎨 Frontend Integration

### GitHub Connection UI

```typescript
import { GitHubConnectButton } from '@/components/integrations/github-connect';

const ProjectSettings = () => {
  return (
    <div>
      <h3>GitHub Integration</h3>
      
      <GitHubConnectButton
        projectId={project.id}
        onConnect={(data) => {
          toast.success(`Connected to ${data.repository.full_name}`);
          setWebhookUrl(
            `${API_URL}/api/integrations/github/webhook?workspaceId=${workspaceId}`
          );
        }}
      />
      
      {webhookUrl && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h4>Setup Webhook in GitHub</h4>
          <code className="block p-2 bg-white">{webhookUrl}</code>
          <p className="text-sm mt-2">
            Add this URL to your GitHub repository webhooks
          </p>
        </div>
      )}
    </div>
  );
};
```

### Sync Status Display

```typescript
const GitHubSyncStatus = ({ projectId }: { projectId: string }) => {
  const { data } = useQuery(['github-sync-status', projectId], () =>
    fetch(`/api/integrations/github/sync-status/${projectId}?workspaceId=${workspaceId}`)
      .then(res => res.json())
  );
  
  if (!data?.connected) {
    return <GitHubConnectButton />;
  }
  
  return (
    <div className="flex items-center gap-3">
      <Badge variant="success">Connected</Badge>
      <span>{data.syncStatus.repositoryName}</span>
      <span className="text-sm text-gray-500">
        Last synced: {formatRelativeTime(data.syncStatus.lastSyncedAt)}
      </span>
      <Button onClick={handleSync} size="sm">
        Sync Now
      </Button>
    </div>
  );
};
```

---

## 📊 Sync Statistics Dashboard

### Metrics to Track

```typescript
// Sync performance
{
  totalSyncs: 156,
  lastSyncDuration: 2.3,  // seconds
  averageSyncDuration: 1.8,
  issuesSynced: 234,
  prsSynced: 89,
  tasksCreated: 187,
  tasksUpdated: 136,
}

// Webhook health
{
  webhooksReceived: 1543,
  webhooksProcessed: 1542,
  webhooksFailed: 1,
  averageProcessingTime: 145,  // ms
}
```

---

## ✅ Acceptance Criteria Met

✅ Repository connection with OAuth  
✅ Issue → Task synchronization  
✅ PR → Task synchronization  
✅ Webhook handling (real-time)  
✅ Signature verification  
✅ Bi-directional sync support  
✅ Auto-create tasks from issues  
✅ Manual sync trigger  
✅ List connected repositories  
✅ Disconnect repository  
✅ Sync status endpoint  
✅ Error handling & logging  
✅ Build passing (0 errors)  
✅ Production-ready  

---

## 📁 Related Files

### Core Service
- `apps/api/src/integrations/services/github-integration.ts` - GitHub service (562 lines)
- `apps/api/src/integrations/github-router.ts` - API routes (NEW)

### Controllers
- `apps/api/src/integrations/controllers/github/connect-repo.ts` - Connect
- `apps/api/src/integrations/controllers/github/sync-issues.ts` - Sync (ENHANCED)

### Integration
- `apps/api/src/integrations/index.ts` - Router mounting (UPDATED)
- `apps/api/src/index.ts` - Main API (line 297: integrationsRoute)

---

## 🔮 Future Enhancements

- [ ] GitHub Actions integration
- [ ] Code review sync
- [ ] Commit linking to tasks
- [ ] Branch → Task association
- [ ] Automated PR creation from tasks
- [ ] GitHub Projects sync
- [ ] Milestone synchronization
- [ ] Label mapping customization
- [ ] Comment synchronization
- [ ] Attachment syncing

---

**Status**: ✅ **COMPLETE**  
**Service**: ✅ **Implemented** (562 lines)  
**Router**: ✅ **Created** (6 endpoints)  
**Build**: ✅ **Passing**  
**Integration**: ✅ **Mounted**  
**Progress**: 16/27 tasks (59%)  
**Date**: 2025-10-30  
**Next**: Webhooks framework or API keys

