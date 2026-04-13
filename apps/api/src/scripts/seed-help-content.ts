// @epic-3.5-communication: Seed help content with real documentation
// Run this script to populate the help system with initial articles and FAQs

import { config } from "dotenv";
config({ path: ".env" });

import { initializeDatabase, getDatabase } from "../database/connection";
import { helpArticles, helpFAQs } from "../database/schema";
import logger from '../utils/logger';

const sampleArticles = [
  {
    title: "Getting Started with Meridian Workspace",
    slug: "getting-started-workspace",
    description: "Complete guide to setting up your workspace, inviting team members, and configuring basic settings",
    content: `# Getting Started with Meridian Workspace

Welcome to Meridian! This guide will walk you through setting up your first workspace and getting your team productive.

## Creating Your Workspace

1. **Sign Up/Login**: Start by creating your account or logging in
2. **Create Workspace**: Click "Create Workspace" from the dashboard
3. **Name Your Workspace**: Choose a descriptive name for your organization
4. **Invite Team Members**: Add team members by email address

## Workspace Settings

### Basic Configuration
- **Workspace Name**: The display name for your workspace
- **Logo**: Upload your company logo for branding
- **Time Zone**: Set your workspace's default time zone

### Team Management
- Invite members via email
- Assign roles: Admin, Manager, Member, Viewer
- Configure permissions per role

## Next Steps

- Create your first project
- Set up teams and departments
- Configure integrations
- Explore analytics dashboard

## Tips for Success

✓ Start with a clear workspace structure
✓ Invite key stakeholders early
✓ Set up notification preferences
✓ Create project templates for common workflows

Need help? Contact support@meridian.app
`,
    category: "getting-started",
    difficulty: "beginner",
    contentType: "article",
    readTime: 5,
    tags: ["setup", "basics", "workspace", "onboarding"],
    metadata: {},
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: "Advanced Task Management & Workflows",
    slug: "advanced-task-management",
    description: "Master complex task hierarchies, dependencies, and automated workflow triggers",
    content: `# Advanced Task Management & Workflows

Take your project management to the next level with advanced task features.

## Task Hierarchies

### Creating Sub-tasks
- Break down complex tasks into manageable pieces
- Nest up to 3 levels deep
- Track progress rollup automatically

### Task Dependencies
\`\`\`
Task A → Task B → Task C
  ↓
Task D
\`\`\`

Dependencies ensure tasks are completed in the right order.

## Workflow Automation

### Triggers
- Task status changes
- Due date approaching
- Assignment changes
- Custom field updates

### Actions
- Send notifications
- Update related tasks
- Create follow-up tasks
- Trigger webhooks

## Custom Fields

Add custom fields to tasks:
- Text fields
- Number fields
- Date pickers
- Dropdowns
- Checkboxes

## Bulk Operations

- Select multiple tasks
- Update status in bulk
- Assign to team members
- Set due dates
- Apply labels

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| \`c\` | Create task |
| \`e\` | Edit task |
| \`d\` | Set due date |
| \`a\` | Assign task |
| \`/\` | Quick search |

## Best Practices

1. Keep task descriptions clear and actionable
2. Set realistic due dates
3. Use labels for categorization
4. Review dependencies regularly
5. Archive completed tasks monthly

---

**Pro Tip**: Use templates for recurring workflows to save time!
`,
    category: "features",
    difficulty: "advanced",
    contentType: "article",
    readTime: 12,
    tags: ["tasks", "workflow", "automation", "dependencies"],
    metadata: {},
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: "Team Collaboration & Role Management",
    slug: "team-collaboration-roles",
    description: "Learn to optimize team collaboration with proper role assignments and permission management",
    content: `# Team Collaboration & Role Management

Effective team collaboration starts with proper role and permission management.

## Understanding Roles

### Workspace Roles
- **Admin**: Full control over workspace
- **Manager**: Manage projects and teams
- **Member**: Create and complete tasks
- **Viewer**: Read-only access

### Project Roles
- **Project Manager**: Project oversight
- **Team Lead**: Team coordination
- **Contributor**: Active participation
- **Observer**: Monitoring only

## Permission System

### Role-Based Access Control (RBAC)
Each role has specific permissions:

**Admin Can:**
- Manage workspace settings
- Invite/remove users
- Delete projects
- Access all data

**Manager Can:**
- Create projects
- Assign team members
- Configure workflows
- View analytics

**Member Can:**
- Create tasks
- Update task status
- Comment on tasks
- Upload attachments

**Viewer Can:**
- View projects
- View tasks
- Export data

## Team Structure

### Creating Teams
1. Navigate to Teams section
2. Click "Create Team"
3. Add team members
4. Assign team lead

### Department Organization
- Sales Team
- Development Team
- Design Team
- Marketing Team

## Collaboration Features

### Real-time Updates
- Live task updates
- Instant notifications
- Presence indicators

### Communication
- Task comments
- @mentions
- Direct messages
- Channel discussions

### File Sharing
- Attach files to tasks
- Version control
- Preview support
- Search by content

## Best Practices

✓ Assign roles based on responsibility
✓ Review permissions quarterly
✓ Use teams for cross-functional work
✓ Enable notifications for critical items
✓ Regular permission audits

## Security Considerations

- Minimum necessary access principle
- Regular access reviews
- Audit log monitoring
- Two-factor authentication
- Session management

---

Need custom roles? Contact us for Enterprise features!
`,
    category: "best-practices",
    difficulty: "intermediate",
    contentType: "article",
    readTime: 8,
    tags: ["team", "collaboration", "permissions", "rbac"],
    metadata: {},
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: "API Integration & Custom Workflows",
    slug: "api-integrations",
    description: "Connect Meridian with external tools using webhooks, API integrations, and custom automations",
    content: `# API Integration & Custom Workflows

Extend Meridian's functionality with powerful API integrations.

## REST API

### Authentication
\`\`\`bash
curl -X POST https://api.meridian.com/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"***"}'
\`\`\`

### Get Projects
\`\`\`bash
curl https://api.meridian.com/api/project \\
  -H "Authorization: Bearer YOUR_TOKEN"
\`\`\`

### Create Task
\`\`\`bash
curl -X POST https://api.meridian.com/api/task \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "New Task",
    "projectId": "proj_123",
    "assigneeId": "user_456"
  }'
\`\`\`

## Webhooks

### Setting Up Webhooks
1. Go to Settings > Integrations
2. Click "Add Webhook"
3. Enter your endpoint URL
4. Select events to subscribe

### Webhook Events
- \`task.created\`
- \`task.updated\`
- \`task.completed\`
- \`project.created\`
- \`comment.added\`

### Webhook Payload
\`\`\`json
{
  "event": "task.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "task_789",
    "title": "New Feature",
    "status": "todo",
    "projectId": "proj_123"
  }
}
\`\`\`

## Popular Integrations

### GitHub
- Sync commits with tasks
- Auto-close tasks from PRs
- Branch linking

### Slack
- Task notifications
- Status updates
- Create tasks from messages

### Jira
- Two-way sync
- Issue migration
- Status mapping

## Custom Automations

### Automation Rules
\`\`\`yaml
trigger:
  event: task.status.changed
  condition: status == "done"
actions:
  - notify:
      channel: "#completed-tasks"
  - create_task:
      title: "Review: {original.title}"
      assignee: "{original.creator}"
\`\`\`

## Rate Limits

- 100 requests/minute per token
- 1000 requests/hour per workspace
- Webhooks: 1000/day

## SDK Libraries

### JavaScript/TypeScript
\`\`\`bash
npm install @meridian/sdk
\`\`\`

### Python
\`\`\`bash
pip install meridian-sdk
\`\`\`

### Go
\`\`\`bash
go get github.com/meridian/sdk-go
\`\`\`

## Error Handling

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

**Documentation**: Full API docs at [api.meridian.com/docs](https://api.meridian.com/docs)
`,
    category: "integrations",
    difficulty: "advanced",
    contentType: "article",
    readTime: 15,
    tags: ["api", "webhooks", "automation", "integrations"],
    metadata: {},
    isPublished: true,
    publishedAt: new Date(),
  },
  {
    title: "Analytics & Performance Tracking",
    slug: "analytics-performance",
    description: "Understand your team's productivity with advanced analytics and performance metrics",
    content: `# Analytics & Performance Tracking

Data-driven insights to improve team productivity and project outcomes.

## Dashboard Overview

### Key Metrics
- **Velocity**: Tasks completed per sprint
- **Cycle Time**: Average time to complete tasks
- **Throughput**: Work items delivered
- **Lead Time**: Idea to delivery time

## Performance Reports

### Team Performance
- Individual productivity
- Team velocity trends
- Collaboration patterns
- Workload distribution

### Project Health
- On-time delivery rate
- Budget vs actual
- Risk indicators
- Quality metrics

## Custom Reports

### Report Builder
1. Select data source
2. Choose metrics
3. Add filters
4. Set time range
5. Create visualization

### Available Charts
- Line charts
- Bar charts
- Pie charts
- Heatmaps
- Gantt charts

## Real-time Analytics

### Live Dashboards
- Auto-refresh every 30 seconds
- WebSocket updates
- Drill-down capability
- Export functionality

## Predictive Analytics

### Forecasting
- Project completion dates
- Resource needs
- Budget overruns
- Risk likelihood

### Machine Learning Insights
- Task duration prediction
- Bottleneck detection
- Team capacity planning
- Automated recommendations

## Export & Sharing

### Export Formats
- PDF reports
- Excel/CSV
- PowerPoint slides
- API access

### Scheduled Reports
- Daily summaries
- Weekly digests
- Monthly reviews
- Quarterly business reviews

## Best Practices

1. **Set Baselines**: Establish metrics early
2. **Regular Review**: Weekly team retrospectives
3. **Actionable Insights**: Focus on improvements
4. **Transparency**: Share metrics with team
5. **Continuous Learning**: Iterate based on data

## Common Metrics

### Sprint Metrics
- Planned vs completed
- Story points delivered
- Sprint burndown
- Sprint velocity

### Quality Metrics
- Bug rate
- Rework percentage
- Customer satisfaction
- Code review time

### Efficiency Metrics
- Time in status
- Wait time
- Active work time
- Idle time

---

**Pro Tip**: Combine quantitative metrics with qualitative feedback for best results!
`,
    category: "features",
    difficulty: "intermediate",
    contentType: "article",
    readTime: 10,
    tags: ["analytics", "metrics", "performance", "reports"],
    metadata: {},
    isPublished: true,
    publishedAt: new Date(),
  },
];

const sampleFAQs = [
  {
    question: "How do I invite team members with specific roles?",
    answer: `Navigate to **Settings > Team Management**, click "Invite Members", enter email addresses, and select from our role hierarchy including workspace-manager, project-manager, team-lead, and more. Each role has specific permissions tailored to their responsibilities.

You can also:
- Bulk invite from CSV
- Set default role for domain
- Send custom invitation messages
- Track invitation status`,
    category: "Team Management",
    tags: ["invites", "roles", "permissions", "rbac"],
    relatedArticleIds: [],
    displayOrder: 1,
  },
  {
    question: "Can I integrate Meridian with development tools?",
    answer: `Yes! Meridian supports integrations with:
- **Version Control**: GitHub, GitLab, Bitbucket
- **Communication**: Slack, Discord, Microsoft Teams
- **Project Management**: Jira, Asana, Trello
- **CI/CD**: Jenkins, CircleCI, GitHub Actions

Use our **REST API** for custom integrations or set up **webhooks** for real-time synchronization.

Access integrations at **Settings > Integrations**.`,
    category: "Integrations",
    tags: ["integrations", "api", "webhooks", "github", "slack"],
    relatedArticleIds: [],
    displayOrder: 2,
  },
  {
    question: "How do project templates work?",
    answer: `Create reusable project templates from any project:

1. Open an existing project
2. Go to **Project Settings > Templates**
3. Click "Save as Template"
4. Define template structure
5. Set default roles and assignments

Templates include:
- Task hierarchies and dependencies
- Timeline and milestones
- Team assignments
- Custom fields
- Workflow automations

Apply templates when creating new projects to save time!`,
    category: "Projects",
    tags: ["templates", "projects", "automation"],
    relatedArticleIds: [],
    displayOrder: 3,
  },
  {
    question: "What's the difference between workspace and project permissions?",
    answer: `**Workspace Permissions** control access to the entire workspace:
- workspace-manager: Full workspace control
- department-head: Department-level access
- workspace-viewer: Read-only workspace access

**Project Permissions** are specific to individual projects:
- project-manager: Project oversight
- project-contributor: Active participation
- project-viewer: Project read access

**Key Difference**: Users can have different roles across projects. For example, someone might be a project-manager on Project A and a project-viewer on Project B.

Workspace roles typically grant broader access, while project roles are granular.`,
    category: "Permissions",
    tags: ["permissions", "rbac", "security", "roles"],
    relatedArticleIds: [],
    displayOrder: 4,
  },
  {
    question: "How do I export project data?",
    answer: `Export data in multiple formats:

**From Dashboard**:
1. Navigate to project
2. Click "Export" button
3. Choose format (CSV, Excel, PDF, JSON)
4. Select data range
5. Download file

**Via API**:
Use our REST API endpoints for programmatic exports.

**Scheduled Exports**:
Set up automated exports in **Settings > Exports** for regular backups.

**What's included**:
- Tasks and sub-tasks
- Comments and attachments
- Time tracking data
- Team assignments
- Activity history`,
    category: "Data Management",
    tags: ["export", "backup", "data", "csv"],
    relatedArticleIds: [],
    displayOrder: 5,
  },
  {
    question: "What security features does Meridian offer?",
    answer: `Meridian provides enterprise-grade security:

**Authentication**:
- Two-factor authentication (2FA)
- SSO with SAML 2.0
- OAuth integration
- Session management

**Data Protection**:
- End-to-end encryption
- Data encryption at rest
- Secure data transmission (TLS 1.3)
- Regular security audits

**Access Control**:
- Role-based permissions (RBAC)
- IP whitelisting
- Audit logs
- Activity monitoring

**Compliance**:
- SOC 2 Type II certified
- GDPR compliant
- HIPAA available (Enterprise)
- Regular penetration testing

**Backup & Recovery**:
- Daily automated backups
- Point-in-time recovery
- 99.9% uptime SLA`,
    category: "Security",
    tags: ["security", "encryption", "compliance", "2fa"],
    relatedArticleIds: [],
    displayOrder: 6,
  },
];

async function seedHelpContent() {
  logger.debug("🗄️  Initializing database...");
  await initializeDatabase();
  
  const db = getDatabase();
  try {
    logger.debug("🌱 Seeding help articles...");

    // Insert articles
    for (const article of sampleArticles) {
      try {
        await db.insert(helpArticles).values(article);
        logger.debug(`✓ Created article: ${article.title}`);
      } catch (error) {
        logger.debug(`⚠ Article already exists: ${article.title}`);
      }
    }

    logger.debug("\n🌱 Seeding FAQs...");

    // Insert FAQs
    for (const faq of sampleFAQs) {
      try {
        await db.insert(helpFAQs).values(faq);
        logger.debug(`✓ Created FAQ: ${faq.question}`);
      } catch (error) {
        logger.debug(`⚠ FAQ already exists: ${faq.question}`);
      }
    }

    logger.debug("\n✅ Help content seeding completed!");
    logger.debug("\nAccess help content at:");
    logger.debug("- GET /api/help/articles");
    logger.debug("- GET /api/help/faqs");

  } catch (error) {
    logger.error("❌ Error seeding help content:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedHelpContent()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error(error);
      process.exit(1);
    });
}

export { seedHelpContent };

