// @epic-3.5-communication: Seed help content (articles and FAQs)
// Provides initial help documentation for users

import { getDatabase } from "../connection";
import { helpArticles, helpFAQs } from "../schema";
import logger from "../../utils/logger";
import { eq } from "drizzle-orm";

// Sample help articles with comprehensive content
const SAMPLE_ARTICLES = [
  {
    title: "Getting Started with Meridian Workspace",
    slug: "getting-started-with-meridian-workspace",
    description: "Complete guide to setting up your workspace, inviting team members, and configuring basic settings",
    content: `# Getting Started with Meridian Workspace

Welcome to Meridian! This guide will help you set up your workspace and get your team productive quickly.

## Creating Your Workspace

Your workspace is the foundation of your project management in Meridian. Here's how to get started:

1. **Navigate to the workspace creation page**
2. **Enter your workspace name** - Choose something memorable and relevant to your organization
3. **Set workspace preferences** - Configure timezone, default language, and notification settings
4. **Click "Create Workspace"**

## Inviting Team Members

Collaboration is key in Meridian. Here's how to invite your team:

### Step 1: Access Team Management
Navigate to **Settings** > **Team Management** from your dashboard.

### Step 2: Send Invitations
Click **"Invite Members"** and enter email addresses. You can invite multiple people at once by separating emails with commas.

### Step 3: Assign Roles
Meridian supports 11 different roles:
- **Workspace Manager**: Full control over workspace
- **Admin**: User and project management
- **Department Head**: Multi-project oversight
- **Project Manager**: Project-level authority
- **Team Lead**: Team coordination
- **Member**: Standard task management (default)
- **Project Viewer**: Read-only access
- **Guest**: Temporary limited access

### Step 4: Customize Invitation Message
Add a personal touch with a custom welcome message for new team members.

## Configuring Basic Settings

### Workspace Settings
- **Name & Description**: Keep your workspace info up to date
- **Logo**: Upload your company or team logo
- **Theme**: Choose between light, dark, or auto mode

### Notification Preferences
- **Email Notifications**: Control what triggers emails
- **Push Notifications**: Mobile and desktop alerts
- **In-App Notifications**: Dashboard notification center

### Integration Setup
Connect your favorite tools:
- Slack, Discord, Microsoft Teams
- GitHub, GitLab, Bitbucket
- Jira, Trello, Asana
- 50+ other integrations available

## Next Steps

Now that your workspace is set up:

1. ✅ Create your first project
2. ✅ Set up project templates
3. ✅ Configure team permissions
4. ✅ Integrate your tools
5. ✅ Start creating tasks!

Need help? Check out our other guides or contact support.`,
    category: "getting-started",
    difficulty: "beginner",
    contentType: "article",
    readTime: 5,
    rating: 48, // 4.8 * 10
    ratingCount: 142,
    views: 2563,
    helpful: 89,
    notHelpful: 4,
    tags: JSON.stringify(["setup", "basics", "workspace", "onboarding"]),
    metadata: JSON.stringify({}),
    isPublished: true,
    publishedAt: new Date("2024-01-15"),
  },
  {
    title: "Advanced Task Management & Workflows",
    slug: "advanced-task-management-workflows",
    description: "Master complex task hierarchies, dependencies, and automated workflow triggers",
    content: `# Advanced Task Management & Workflows

Take your project management to the next level with Meridian's advanced task features.

## Task Hierarchies & Subtasks

### Creating Task Trees
Break down complex work into manageable pieces:

\`\`\`
Epic Task
├── Feature A
│   ├── Subtask A1
│   ├── Subtask A2
│   └── Subtask A3
└── Feature B
    ├── Subtask B1
    └── Subtask B2
\`\`\`

### Best Practices
- Keep subtask depth to 3 levels maximum
- Use clear, action-oriented task names
- Assign realistic time estimates
- Set appropriate dependencies

## Task Dependencies

### Dependency Types
1. **Finish-to-Start**: Task B starts when Task A finishes
2. **Start-to-Start**: Both tasks start together
3. **Finish-to-Finish**: Tasks must finish together
4. **Start-to-Finish**: Task B finishes when Task A starts (rare)

### Setting Dependencies
1. Open task details
2. Click "Add Dependency"
3. Select the dependent task
4. Choose dependency type
5. Save changes

### Dependency Visualization
View your task dependencies on:
- **Gantt Chart**: Timeline view
- **Network Diagram**: Relationship map
- **Critical Path**: Identify bottlenecks

## Automated Workflows

### Workflow Triggers
Automate your processes with triggers:

- **Status Changes**: Auto-notify when tasks move columns
- **Assignment**: Alert assignees and update calendars
- **Due Dates**: Send reminders at configurable intervals
- **Completion**: Trigger follow-up tasks automatically

### Creating Automation Rules

\`\`\`javascript
// Example: Auto-assign tasks based on labels
if (task.labels.includes("frontend")) {
  task.assignee = "frontend-team-lead";
  task.notify = true;
}
\`\`\`

### Popular Automation Patterns
1. **Code Review**: Auto-create review tasks when dev work completes
2. **Testing**: Trigger QA tasks after code merge
3. **Deployment**: Auto-create deployment tasks on approval
4. **Notifications**: Alert stakeholders at key milestones

## Custom Fields

Add project-specific data to tasks:
- **Dropdowns**: Priority, severity, type
- **Numbers**: Story points, estimated hours
- **Dates**: Sprint start/end, release dates
- **Text**: Additional notes, external IDs

## Templates & Recurring Tasks

### Task Templates
Save time with reusable task structures:
1. Create a template task with subtasks
2. Save as template
3. Use "Create from Template" for new tasks

### Recurring Tasks
Perfect for regular activities:
- Daily standups
- Weekly reports
- Monthly reviews
- Quarterly planning

## Performance Tips

- Use bulk operations for multiple tasks
- Leverage keyboard shortcuts (press ? to see all)
- Create saved filters for quick access
- Use task templates to maintain consistency`,
    category: "features",
    difficulty: "advanced",
    contentType: "article",
    readTime: 12,
    rating: 49, // 4.9 * 10
    ratingCount: 87,
    views: 1823,
    helpful: 72,
    notHelpful: 3,
    tags: JSON.stringify(["tasks", "workflow", "automation", "dependencies"]),
    metadata: JSON.stringify({}),
    isPublished: true,
    publishedAt: new Date("2024-01-10"),
  },
  {
    title: "Team Collaboration & Role Management",
    slug: "team-collaboration-role-management",
    description: "Learn to optimize team collaboration with proper role assignments and permission management",
    content: `# Team Collaboration & Role Management

Effective collaboration starts with proper team structure and permissions.

## Understanding Meridian's Role System

Meridian uses a comprehensive 11-role hierarchy designed for flexibility:

### Role Hierarchy (High to Low)

1. **Workspace Manager (Owner)**
   - Complete workspace control
   - Billing and subscription management
   - Can assign/revoke any role
   - Delete workspace capability

2. **Admin**
   - User management and onboarding
   - Workspace settings and configuration
   - Project creation and oversight
   - Cannot delete workspace

3. **Department Head**
   - Department-wide project management
   - Cross-project resource allocation
   - Performance analytics across teams

4. **Project Manager**
   - Full control over assigned projects
   - Project planning and timeline management
   - Cross-team coordination
   - Budget and resource oversight

5. **Team Lead**
   - Team performance analytics
   - Resource allocation for team
   - Project coordination
   - Manage assigned team members

6. **Member (Default)**
   - Standard task management
   - Time tracking and reporting
   - File sharing and collaboration
   - Team communication

7. **Project Viewer**
   - Read-only access to assigned projects
   - Basic reporting and dashboard access
   - Comment abilities
   - Timeline visibility

8. **Guest**
   - Temporary access to specific tasks/projects
   - Limited commenting and viewing
   - Time-limited permissions
   - No user management access

### Choosing the Right Role

| Need | Recommended Role |
|------|------------------|
| Company owner | Workspace Manager |
| HR/Admin staff | Admin |
| Department leaders | Department Head |
| Project leaders | Project Manager |
| Team coordinators | Team Lead |
| Individual contributors | Member |
| Stakeholders | Project Viewer |
| External contractors | Guest |

## Permission Best Practices

### Principle of Least Privilege
- Start with minimal permissions
- Grant additional access as needed
- Regular permission audits
- Remove access when no longer needed

### Role Assignment Strategy
1. **Define organizational structure** first
2. **Map roles** to job functions
3. **Document** permission policies
4. **Train** users on their role capabilities
5. **Review** quarterly

## Team Collaboration Features

### @Mentions
Tag team members in comments and tasks:
- \`@username\` - Notify specific person
- \`@team\` - Notify entire team
- \`@channel\` - Notify channel members

### Real-Time Collaboration
- Live document editing
- Presence indicators (who's online)
- Real-time notifications
- Live cursor tracking in documents

### Communication Channels
- **Project Channels**: Project-specific discussions
- **Team Channels**: Team-wide communication
- **Direct Messages**: One-on-one conversations
- **Threads**: Organized topic discussions

### File Sharing
- Drag-and-drop uploads
- Version control
- Preview support for 40+ file types
- Commenting on files
- Share links with permissions

## Managing Large Teams

### Team Organization
- Use **departments** for company structure
- Create **teams** for project groups
- Assign **team leads** for coordination
- Use **channels** for communication

### Scaling Best Practices
- Establish naming conventions
- Create team onboarding guides
- Set up communication norms
- Use automation to reduce overhead

## Security & Compliance

### Audit Logging
Track all important actions:
- Role changes
- Permission modifications
- Data access
- Export activities

### 2FA & SSO
- Two-factor authentication
- Single Sign-On (SSO)
- SAML 2.0 support
- OAuth integrations

Need help with role setup? Contact your workspace administrator.`,
    category: "best-practices",
    difficulty: "intermediate",
    contentType: "article",
    readTime: 8,
    rating: 47, // 4.7 * 10
    ratingCount: 65,
    views: 1342,
    helpful: 56,
    notHelpful: 2,
    tags: JSON.stringify(["team", "collaboration", "permissions", "rbac"]),
    metadata: JSON.stringify({}),
    isPublished: true,
    publishedAt: new Date("2024-01-08"),
  },
  {
    title: "API Integration & Custom Workflows",
    slug: "api-integration-custom-workflows",
    description: "Connect Meridian with external tools using webhooks, API integrations, and custom automations",
    content: `# API Integration & Custom Workflows

Extend Meridian's functionality by integrating with your existing tools and workflows.

## REST API Overview

Meridian provides a comprehensive REST API for programmatic access to all features.

### API Basics

**Base URL**: \`https://api.meridian.app/v1\`

**Authentication**: API keys or OAuth 2.0

**Rate Limits**: 
- Standard: 100 requests/minute
- Premium: 1000 requests/minute
- Enterprise: Unlimited

### Quick Start Example

\`\`\`javascript
// Node.js example
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.meridian.app/v1',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

// Create a task
async function createTask() {
  const response = await client.post('/tasks', {
    title: 'New API Task',
    description: 'Created via API',
    projectId: 'proj_123',
    assignee: 'user@example.com'
  });
  
  logger.debug('Task created:', response.data);
}
\`\`\`

### Common API Operations

\`\`\`bash
# Get all tasks
GET /api/tasks?projectId=proj_123

# Create task
POST /api/tasks
{
  "title": "Task name",
  "description": "Task description"
}

# Update task
PUT /api/tasks/task_456
{
  "status": "in-progress"
}

# Delete task
DELETE /api/tasks/task_456
\`\`\`

## Webhooks

### What are Webhooks?
Webhooks send real-time HTTP notifications when events occur in your workspace.

### Available Events
- \`task.created\`
- \`task.updated\`
- \`task.completed\`
- \`project.created\`
- \`member.invited\`
- \`comment.added\`
- And 20+ more...

### Setting Up Webhooks

1. Go to **Settings** > **Integrations** > **Webhooks**
2. Click **"Create Webhook"**
3. Enter your endpoint URL
4. Select events to subscribe to
5. Save and test

### Webhook Payload Example

\`\`\`json
{
  "event": "task.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "task": {
      "id": "task_789",
      "title": "Implement feature",
      "status": "completed",
      "completedBy": "user@example.com",
      "completedAt": "2024-01-15T10:30:00Z"
    },
    "project": {
      "id": "proj_123",
      "name": "Q1 2024 Launch"
    }
  }
}
\`\`\`

### Webhook Security
- Verify webhook signatures
- Use HTTPS endpoints only
- Implement retry logic
- Monitor webhook logs

## Popular Integrations

### GitHub Integration
- Sync commits with tasks
- Link PRs to tasks
- Auto-update task status on merge
- Branch naming from task IDs

### Slack Integration
- Task notifications in channels
- Create tasks from Slack
- Update tasks via Slack commands
- Daily digest reports

### Jira Migration
- Import projects and tasks
- Map custom fields
- Preserve history and comments
- Maintain attachments

## Custom Automation Examples

### Auto-assign based on labels

\`\`\`javascript
// Webhook handler
app.post('/webhooks/meridian', (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'task.created') {
    const task = data.task;
    
    if (task.labels.includes('bug')) {
      // Auto-assign to bug triage team
      meridianAPI.updateTask(task.id, {
        assignee: 'bug-triage-lead@company.com',
        priority: 'high'
      });
    }
  }
  
  res.sendStatus(200);
});
\`\`\`

### Sync to Google Calendar

\`\`\`javascript
// Sync task due dates to calendar
async function syncToCalendar(task) {
  if (task.dueDate) {
    await googleCalendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: task.title,
        description: task.description,
        start: { dateTime: task.dueDate },
        end: { dateTime: task.dueDate }
      }
    });
  }
}
\`\`\`

## SDK & Libraries

Official libraries available for:
- JavaScript/Node.js
- Python
- Ruby
- PHP
- Go
- Java

Check our [GitHub organization](https://github.com/meridianhq) for the latest SDKs.

## Need Help?

- 📚 [Full API Documentation](https://docs.meridian.app/api)
- 💬 [Developer Community](https://community.meridian.app)
- 📧 Email: developers@meridian.app`,
    category: "integrations",
    difficulty: "advanced",
    contentType: "article",
    readTime: 15,
    rating: 46, // 4.6 * 10
    ratingCount: 53,
    views: 987,
    helpful: 41,
    notHelpful: 3,
    tags: JSON.stringify(["api", "webhooks", "automation", "integrations"]),
    metadata: JSON.stringify({}),
    isPublished: true,
    publishedAt: new Date("2024-01-05"),
  },
  {
    title: "Analytics & Performance Tracking",
    slug: "analytics-performance-tracking",
    description: "Understand your team's productivity with advanced analytics and performance metrics",
    content: `# Analytics & Performance Tracking

Data-driven insights to improve team productivity and project success.

## Dashboard Overview

The Meridian Analytics Dashboard provides real-time insights into:
- Task completion rates
- Team productivity metrics
- Project health indicators
- Time tracking analytics
- Resource utilization
- Burndown charts

## Key Metrics Explained

### Velocity
**What it measures**: Team's rate of completing work over time

**How to use it**:
- Track sprint-over-sprint improvements
- Forecast project completion dates
- Adjust workload planning
- Identify productivity trends

**Calculation**: Story points or tasks completed per sprint

### Cycle Time
**What it measures**: Time from task start to completion

**Why it matters**:
- Identify bottlenecks
- Improve process efficiency
- Set realistic expectations
- Compare across task types

**Goal**: Reduce and stabilize cycle time

### Lead Time
**What it measures**: Time from task creation to completion

**Use cases**:
- Customer request response time
- Feature delivery speed
- Planning accuracy
- Workflow optimization

### Throughput
**What it measures**: Number of tasks completed per time period

**Benefits**:
- Capacity planning
- Resource allocation
- Performance benchmarking
- Workload balancing

## Team Performance Analytics

### Individual Metrics
- Tasks completed
- Average cycle time
- Quality indicators
- Collaboration score
- Time utilization

### Team Metrics
- Collective velocity
- Team burndown
- Resource capacity
- Dependencies resolved
- Communication frequency

### Best Practices
- Use metrics to guide, not judge
- Focus on trends, not absolutes
- Combine multiple metrics
- Regular retrospectives
- Celebrate improvements

## Project Health Indicators

### Green (Healthy)
- On track for deadlines
- Tasks progressing normally
- No major blockers
- Team capacity available

### Yellow (At Risk)
- Some delays occurring
- Blockers present
- Resource constraints
- Scope concerns

### Red (Critical)
- Significant delays
- Multiple blockers
- Over-capacity
- Scope creep

## Custom Reports

### Report Builder
Create custom reports with:
1. **Select data source**: Tasks, time entries, projects
2. **Choose metrics**: Completion rate, time spent, etc.
3. **Add filters**: Date range, assignee, status
4. **Group by**: User, project, label, custom field
5. **Visualization**: Table, chart, graph

### Scheduled Reports
- Daily task summaries
- Weekly team reports
- Monthly executive dashboards
- Quarterly reviews

### Report Sharing
- Export to PDF, Excel, CSV
- Share via email
- Embed in external tools
- API access

## Time Tracking Analytics

### Time Allocation
See where time is spent:
- By project
- By task type
- By team member
- By time period

### Billable vs Non-Billable
- Track client work
- Internal projects
- Overhead activities
- Meeting time

### Time Estimates vs Actuals
- Improve estimation accuracy
- Identify consistent patterns
- Adjust future planning
- Training opportunities

## Burndown & Burnup Charts

### Sprint Burndown
Track remaining work per day:
- Ideal trend line
- Actual progress
- Scope changes
- Completion forecast

### Project Burnup
Show completed work over time:
- Total scope
- Work completed
- Scope additions
- Projected completion

## Real-Time Analytics

### Live Dashboard
Monitor current activity:
- Active users
- Tasks in progress
- Recent completions
- Upcoming deadlines

### Alerts & Notifications
Set up alerts for:
- Tasks overdue
- Projects at risk
- Resource over-allocation
- Budget threshold exceeded

## Advanced Features

### Comparative Analytics
- Compare sprints
- Team performance benchmarks
- Project type analysis
- Historical trends

### Predictive Analytics
- Completion date forecasts
- Resource need predictions
- Risk identification
- Capacity planning

### Custom Dashboards
Create role-specific views:
- Executive summaries
- Team leader dashboards
- Individual contributor views
- Client-facing reports

## Integration with BI Tools

Export data to:
- Power BI
- Tableau
- Google Data Studio
- Excel/Sheets

## Tips for Better Analytics

1. **Consistent data entry**: Accurate reporting requires good data
2. **Regular reviews**: Weekly metric reviews with team
3. **Actionable insights**: Use data to drive decisions
4. **Trend focus**: Look for patterns over time
5. **Context matters**: Numbers tell part of the story

## Privacy & Data Security

- Role-based analytics access
- Anonymized individual metrics
- GDPR compliant
- Data retention policies
- Export controls

Ready to dive deeper? Check out our [Advanced Analytics Guide](#).`,
    category: "features",
    difficulty: "intermediate",
    contentType: "article",
    readTime: 10,
    rating: 48, // 4.8 * 10
    ratingCount: 71,
    views: 1456,
    helpful: 63,
    notHelpful: 2,
    tags: JSON.stringify(["analytics", "metrics", "performance", "reports"]),
    metadata: JSON.stringify({}),
    isPublished: true,
    publishedAt: new Date("2024-01-12"),
  },
];

// Sample FAQs
const SAMPLE_FAQS = [
  {
    question: "How do I invite team members with specific roles?",
    answer: "Navigate to **Settings** > **Team Management**, click **'Invite Members'**, enter email addresses, and select from our 11-role hierarchy including workspace-manager, project-manager, team-lead, and more. Each role has specific permissions tailored to their responsibilities. You can also customize permissions for individual users if needed.",
    category: "getting-started",
    helpful: 67,
    notHelpful: 2,
    tags: JSON.stringify(["invites", "roles", "permissions", "rbac"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 1,
    isPublished: true,
  },
  {
    question: "Can I integrate Meridian with development tools?",
    answer: "Yes! Meridian supports integrations with **GitHub, GitLab, Bitbucket** for version control, **Slack, Discord, Microsoft Teams** for communication, and **Jira, Trello, Asana** for project management migration. We offer 50+ integrations total. Use our REST API for custom integrations or set up webhooks for real-time synchronization. Check Settings > Integrations for the full list.",
    category: "integrations",
    helpful: 89,
    notHelpful: 1,
    tags: JSON.stringify(["integrations", "api", "webhooks", "github", "slack"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 2,
    isPublished: true,
  },
  {
    question: "How do project templates work?",
    answer: "Project templates let you **reuse successful project structures**. To create a template: Go to any project > Project Settings > Templates > 'Save as Template'. Define task hierarchies, assign default roles, set milestones, and configure workflows. When creating a new project, select 'Create from Template' to instantly set up the project structure, saving hours of setup time. Templates can include task dependencies, custom fields, and automation rules.",
    category: "features",
    helpful: 78,
    notHelpful: 3,
    tags: JSON.stringify(["templates", "projects", "automation"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 3,
    isPublished: true,
  },
  {
    question: "What's the difference between workspace and project permissions?",
    answer: "**Workspace permissions** control access to the entire workspace (workspace-manager, department-head, admin roles), while **project permissions** are specific to individual projects (project-manager, project-viewer roles). Users can have different roles across projects. For example, someone might be a Team Lead in Project A but just a Member in Project B. Workspace-level roles typically have broader access across all projects, while project-level roles are scoped to specific projects.",
    category: "best-practices",
    helpful: 92,
    notHelpful: 1,
    tags: JSON.stringify(["permissions", "rbac", "security", "roles"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 4,
    isPublished: true,
  },
  {
    question: "How do I track time on tasks?",
    answer: "Meridian offers **multiple time tracking methods**: \n\n1. **Manual Entry**: Open any task and click 'Add Time Entry', enter hours and description.\n2. **Timer**: Click the play button on a task to start a live timer. It runs in the background even if you navigate away.\n3. **Bulk Entry**: Use Settings > Time Tracking > Bulk Entry to log multiple entries at once.\n4. **Mobile App**: Track time on the go with our mobile apps.\n\nAll time entries sync across devices and appear in analytics reports. You can mark time as billable/non-billable for client work.",
    category: "features",
    helpful: 84,
    notHelpful: 2,
    tags: JSON.stringify(["time-tracking", "tasks", "productivity"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 5,
    isPublished: true,
  },
  {
    question: "Can I export my data?",
    answer: "Absolutely! Meridian provides **comprehensive export options**: \n\n- **Tasks**: Export to CSV, Excel, JSON\n- **Time Entries**: Detailed reports in multiple formats\n- **Projects**: Full project dumps including all tasks and comments\n- **Analytics**: Export charts and reports to PDF\n- **API Access**: Pull any data programmatically\n- **Backup**: Request full workspace backup (includes all data)\n\nGo to Settings > Data Export to access export tools. Premium users can schedule automatic exports to cloud storage.",
    category: "features",
    helpful: 73,
    notHelpful: 2,
    tags: JSON.stringify(["export", "data", "backup", "api"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 6,
    isPublished: true,
  },
  {
    question: "How do I set up task dependencies?",
    answer: "Task dependencies ensure work happens in the right order:\n\n1. Open the task you want to add a dependency to\n2. Click **'Add Dependency'** in the task details\n3. Search for and select the dependent task\n4. Choose dependency type:\n   - **Finish-to-Start** (most common): Can't start until prerequisite finishes\n   - **Start-to-Start**: Both tasks start together\n   - **Finish-to-Finish**: Must finish together\n5. Save the dependency\n\nView dependencies on the **Gantt Chart** or **Network Diagram**. Meridian automatically highlights the critical path to help identify bottlenecks.",
    category: "features",
    helpful: 88,
    notHelpful: 3,
    tags: JSON.stringify(["dependencies", "tasks", "workflow", "gantt"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 7,
    isPublished: true,
  },
  {
    question: "What are custom fields and how do I use them?",
    answer: "**Custom fields** let you add project-specific data to tasks beyond the standard fields:\n\n**Available Field Types**:\n- **Text**: Additional notes, external IDs, URLs\n- **Number**: Story points, estimated hours, budget\n- **Dropdown**: Priority levels, severity, type classifications\n- **Date**: Sprint dates, release dates, custom deadlines\n- **Checkbox**: Binary flags (needs review, client-approved, etc.)\n- **User**: Additional assignees, reviewers, stakeholders\n\n**To create custom fields**: \nProject Settings > Custom Fields > Add Field. Fields can be required or optional, and you can set default values. They appear in exports and reports.",
    category: "features",
    helpful: 79,
    notHelpful: 4,
    tags: JSON.stringify(["custom-fields", "tasks", "configuration"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 8,
    isPublished: true,
  },
  {
    question: "How secure is my data in Meridian?",
    answer: "Security is our top priority. Meridian implements **enterprise-grade security**:\n\n**Encryption**:\n- Data encrypted at rest (AES-256)\n- Data encrypted in transit (TLS 1.3)\n- End-to-end encryption for sensitive data\n\n**Access Control**:\n- Role-based access control (RBAC)\n- Two-factor authentication (2FA)\n- Single Sign-On (SSO) with SAML 2.0\n- IP whitelisting (Enterprise)\n\n**Compliance**:\n- SOC 2 Type II certified\n- GDPR compliant\n- HIPAA available (Enterprise)\n- Regular security audits\n\n**Infrastructure**:\n- AWS cloud hosting\n- Redundant backups\n- 99.9% uptime SLA\n- DDoS protection\n\nWe also provide audit logs, data retention policies, and export controls.",
    category: "troubleshooting",
    helpful: 96,
    notHelpful: 1,
    tags: JSON.stringify(["security", "encryption", "compliance", "privacy"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 9,
    isPublished: true,
  },
  {
    question: "Can I migrate from other project management tools?",
    answer: "Yes! Meridian provides **seamless migration tools** from:\n\n**Supported Platforms**:\n- **Jira**: Projects, issues, comments, attachments\n- **Trello**: Boards, lists, cards, checklists\n- **Asana**: Projects, tasks, subtasks, custom fields\n- **Monday.com**: Boards, items, updates\n- **ClickUp**: Spaces, folders, lists, tasks\n- **Excel/CSV**: Bulk task import\n\n**Migration Process**:\n1. Go to Settings > Import Data\n2. Select your current tool\n3. Authorize API access or upload export file\n4. Map fields (Meridian suggests mappings)\n5. Preview migration\n6. Start import\n\n**What's Preserved**:\n- Task hierarchy and relationships\n- Comments and history\n- Attachments\n- Custom fields\n- Assignees and dates\n\nMigration typically takes 10-30 minutes depending on data size. Premium support available for large migrations.",
    category: "getting-started",
    helpful: 82,
    notHelpful: 3,
    tags: JSON.stringify(["migration", "import", "jira", "trello", "asana"]),
    relatedArticleIds: JSON.stringify([]),
    displayOrder: 10,
    isPublished: true,
  },
];

/**
 * Seeds the help tables with sample articles and FAQs
 */
export async function seedHelpContent() {
  try {
    const db = getDatabase();
    
    logger.info("🌱 Starting help content seed...");

    // Check if we already have articles
    const existingArticles = await db.select().from(helpArticles).limit(1);
    
    if (existingArticles.length > 0) {
      logger.info("📚 Help articles already exist, skipping seed");
      return;
    }

    // Insert articles
    logger.info(`📝 Inserting ${SAMPLE_ARTICLES.length} help articles...`);
    await db.insert(helpArticles).values(SAMPLE_ARTICLES);
    logger.info(`✅ Inserted ${SAMPLE_ARTICLES.length} articles`);

    // Insert FAQs
    logger.info(`❓ Inserting ${SAMPLE_FAQS.length} FAQs...`);
    await db.insert(helpFAQs).values(SAMPLE_FAQS);
    logger.info(`✅ Inserted ${SAMPLE_FAQS.length} FAQs`);

    logger.info("🎉 Help content seed completed successfully!");
    
  } catch (error) {
    logger.error("❌ Error seeding help content:", error);
    throw error;
  }
}

/**
 * Clear all help content (useful for re-seeding)
 */
export async function clearHelpContent() {
  try {
    const db = getDatabase();
    
    logger.info("🗑️  Clearing help content...");
    
    await db.delete(helpArticles);
    await db.delete(helpFAQs);
    
    logger.info("✅ Help content cleared");
    
  } catch (error) {
    logger.error("❌ Error clearing help content:", error);
    throw error;
  }
}


