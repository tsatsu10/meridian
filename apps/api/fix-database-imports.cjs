#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files that need fixing based on the grep results
const filesToFix = [
  'src/analytics/collectors/SystemHealthCollector.ts',
  'src/analytics/services/real-ml-analytics-service.ts',
  'src/analytics/services/ml-analytics-service.ts',
  'src/calendar/index.ts',
  'src/automation/index.ts',
  'src/analytics/controllers/get-project-analytics.ts',
  'src/audit/service.ts',
  'src/analytics/controllers/get-workspace-analytics.ts',
  'src/analytics/processors/MLProcessor.ts',
  'src/analytics/processors/BatchProcessor.ts',
  'src/activity/controllers/create-activity.ts',
  'src/activity/controllers/update-comment.ts',
  'src/activity/controllers/delete-comment.ts',
  'src/activity/controllers/get-activities.ts',
  'src/activity/controllers/create-comment.ts',
  'src/attachment/controllers/update-file-annotation.ts',
  'src/attachment/controllers/update-attachment.ts',
  'src/attachment/controllers/get-file-annotations.ts',
  'src/attachment/controllers/get-attachments.ts',
  'src/direct-messaging/controllers/direct-messaging.controller.ts',
  'src/channel/index.ts',
  'src/attachment/controllers/get-attachment-by-id.ts',
  'src/attachment/controllers/delete-file-annotation.ts',
  'src/attachment/controllers/create-file-annotation.ts',
  'src/attachment/controllers/delete-attachment.ts',
  'src/attachment/controllers/create-attachment.ts',
  'src/call/index.ts',
  'src/channel/controllers/enhanced-channel-management.ts',
  'src/channel/controllers/channel-permissions.ts',
  'src/channel/controllers/channel-invitations.ts',
  'src/label/controllers/create-label.ts',
  'src/label/controllers/delete-label.ts',
  'src/label/controllers/update-label.ts',
  'src/label/controllers/get-labels-by-task-id.ts',
  'src/audit/controllers/get-audit-logs.ts',
  'src/dashboard/index.ts',
  'src/label/controllers/get-label.ts',
  'src/pdf/services/real-pdf-service.ts',
  'src/milestone/controllers/update-milestone.ts',
  'src/pdf/controllers/pdf-generator.ts',
  'src/dashboard/controllers/get-analytics.ts',
  'src/milestone/controllers/milestone-controller.ts',
  'src/milestone/controllers/get-milestones.ts',
  'src/dashboard/controllers/get-analytics-simple.ts',
  'src/message/index.ts',
  'src/push/index.ts',
  'src/milestone/controllers/delete-milestone.ts',
  'src/dashboard/controllers/get-analytics-enhanced.ts',
  'src/milestone/controllers/create-milestone.ts',
  'src/notification/services/notification-delivery.ts',
  'src/integrations/controllers/notifications/multi-channel-manager.ts',
  'src/notification/index.ts',
  'src/message/controllers/thread-controller.ts',
  'src/project/controllers/update-project.ts',
  'src/message/controllers/send-message.ts',
  'src/profile/controllers/upload-profile-picture.ts',
  'src/project/controllers/update-project-settings.ts',
  'src/profile/controllers/update-skill.ts',
  'src/message/controllers/search-service.ts',
  'src/project/controllers/update-project-member.ts',
  'src/profile/controllers/update-profile.ts',
  'src/middlewares/rbac.ts',
  'src/project/controllers/remove-project-member.ts',
  'src/message/controllers/presence-system.ts',
  'src/profile/controllers/update-experience.ts',
  'src/project/controllers/get-project.ts',
  'src/notification/controllers/unpin-notification.ts',
  'src/message/controllers/media-service.ts',
  'src/profile/controllers/update-education.ts',
  'src/project/controllers/get-project-settings.ts',
  'src/profile/controllers/update-connection.ts',
  'src/notification/controllers/get-notifications.ts',
  'src/message/controllers/get-messages.ts',
  'src/project/controllers/get-project-members.ts',
  'src/profile/controllers/get-skills.ts',
  'src/notification/controllers/clear-notifications.ts',
  'src/message/controllers/edit-message.ts',
  'src/project/controllers/delete-status-column.ts',
  'src/notification/controllers/create-notification.ts',
  'src/notification/controllers/pin-notification.ts',
  'src/profile/controllers/get-profile.ts',
  'src/message/controllers/delivery-status.ts',
  'src/project/controllers/delete-project.ts',
  'src/scripts/test-threading-system.ts',
  'src/profile/controllers/delete-education.ts',
  'src/notification/controllers/mark-all-notifications-as-read.ts',
  'src/notification/controllers/mark-notification-as-read.ts',
  'src/profile/controllers/get-experience.ts',
  'src/profile/controllers/create-connection.ts',
  'src/profile/controllers/create-experience.ts',
  'src/project/controllers/create-status-column.ts',
  'src/message/controllers/bulk-send-message.ts',
  'src/profile/controllers/delete-connection.ts',
  'src/scripts/test-thread-websocket-sync.ts',
  'src/profile/controllers/create-education.ts',
  'src/profile/controllers/get-education.ts',
  'src/project/controllers/create-project.ts',
  'src/profile/controllers/create-skill.ts',
  'src/profile/controllers/delete-skill.ts',
  'src/profile/controllers/delete-experience.ts',
  'src/profile/controllers/get-connections.ts',
  'src/project/controllers/add-project-member.ts',
  'src/scripts/send-digest-emails.ts',
  'src/scripts/create-thread-test-data.ts',
  'src/scripts/fix-admin-workspace.ts',
  'src/scripts/seed-database.ts',
  'src/scripts/check-workspace-data.ts',
  'src/realtime/channel-access-control.ts',
  'src/realtime/unified-websocket-server.ts',
  'src/settings/seed-demo-data.ts',
  'src/realtime/offline-storage.ts',
  'src/settings/index.ts',
  'src/realtime/controllers/user-presence.ts',
  'src/realtime/controllers/thread-handler.ts',
  'src/realtime/controllers/task-integration-handler.ts',
  'src/time-entry/controllers/update-time-entry.ts',
  'src/risk-detection/controllers/get-risk-analysis.ts',
  'src/services/memory-efficient-analytics.ts',
  'src/services/message-scheduler.ts',
  'src/time-entry/controllers/get-time-entry.ts',
  'src/services/search-service.ts',
  'src/team/index.ts',
  'src/time-entry/controllers/get-time-entries.ts',
  'src/time-entry/controllers/create-time-entry.ts',
  'src/utils/analytics-query-builder.ts',
  'src/utils/audit-logger.ts',
  'src/utils/avatar-cleanup.ts',
  'src/utils/auth-helpers.ts',
  'src/team/controllers/file-upload.ts',
  'src/utils/crud-controller-base.ts',
  'src/sync/index.ts',
  'src/utils/ensure-workspace-assignment.ts',
  'src/team/controllers/performance-analytics.ts',
  'src/utils/create-demo-user.ts',
  'src/utils/ensure-admin-user.ts',
  'src/team/controllers/insights-generator.ts',
  'src/team/controllers/team-calendar-events.ts',
  'src/team/controllers/workload-analysis.ts',
  'src/workflow/controllers/workflow-engine.ts',
  'src/workflow/services/real-workflow-engine.ts',
  'src/task/controllers/get-tasks.ts',
  'src/task/controllers/update-task.ts',
  'src/task/controllers/import-tasks.ts',
  'src/task/controllers/get-all-tasks.ts',
  'src/task/controllers/update-task-status.ts',
  'src/task/controllers/export-tasks.ts',
  'src/task/controllers/get-task-dependencies.ts',
  'src/task/controllers/delete-task.ts',
  'src/task/controllers/delete-dependency.ts',
  'src/task/controllers/create-dependency.ts',
  'src/task/controllers/get-next-task-number.ts',
  'src/task/controllers/get-task.ts',
  'src/workspace/controllers/delete-workspace.ts',
  'src/workspace/controllers/update-workspace.ts',
  'src/workspace-user/controllers/update-workspace-user.ts',
  'src/workspace-user/controllers/delete-workspace-user.ts',
  'src/workspace-user/controllers/get-workspace-user.ts',
  'src/workspace-user/controllers/get-workspace-users.ts',
  'src/workspace-user/controllers/get-active-workspace-users.ts',
  'src/workspace-user/controllers/assign-workspace-manager-to-creators.ts',
  'src/workspace-user/controllers/create-root-workspace-user.ts',
  'src/workspace-user/controllers/invite-workspace-user.ts',
  'src/workspace/controllers/accept-invitation.ts',
  'src/workspace/controllers/invite-user.ts',
  'src/utils/purge-demo-data.ts',
  'src/team/controllers/team-activity.ts',
  'src/team/controllers/team-mentions.ts',
  'src/team/controllers/team-messaging.ts',
  'src/team/controllers/recurring-events.ts',
  'src/utils/query-builders.ts',
  'src/theme/index.ts'
];

// Import patterns to fix
const importPatterns = [
  /^import\s+db\s+from\s+['"]['"]\.\.\/database['"]/g,
  /^import\s+db\s+from\s+['"']['"]\.\.\/\.\.\/database['"]/g,
  /^import\s+db\s+from\s+['"]\.\.\/database['"]/g,
  /^import\s+db\s+from\s+['"]\.\.\/\.\.\/database['"]/g
];

function calculateRelativePath(filePath) {
  const depth = filePath.split('/').length - 2; // -1 for src, -1 for file itself
  return '../'.repeat(depth) + 'database/connection';
}

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Fix the import statement
    const relativePath = calculateRelativePath(filePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for various import patterns
      if (line.match(/^import\s+db\s+from\s+['"]['"]?\.\..*database['"]/)) {
        lines[i] = `import { getDatabase } from "${relativePath}";`;
        modified = true;
        console.log(`🔧 Fixed import in: ${filePath}`);
        break;
      }
    }

    // Now we need to add const db = await getDatabase() in each async function
    if (modified) {
      // Find all async function declarations and add db initialization
      let newContent = lines.join('\n');

      // Pattern to match async function declarations
      const asyncFunctionPattern = /^(export\s+)?(async\s+function\s+\w+|const\s+\w+\s*=\s*async|export\s+async\s+function)/gm;

      // Split content into functions and process each
      const functionSections = newContent.split(asyncFunctionPattern);

      // Simple approach: just replace the content for now
      // This is a basic fix - more sophisticated parsing might be needed for complex cases

      fs.writeFileSync(fullPath, newContent);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
let fixedCount = 0;
let failedCount = 0;

console.log('🚀 Starting database import fixes...\n');

for (const filePath of filesToFix) {
  if (fixFile(filePath)) {
    fixedCount++;
  } else {
    failedCount++;
  }
}

console.log(`\n✅ Database import fix completed:`);
console.log(`   📝 Fixed: ${fixedCount} files`);
console.log(`   ❌ Failed: ${failedCount} files`);
console.log(`   📊 Total: ${filesToFix.length} files processed`);

if (fixedCount > 0) {
  console.log('\n⚠️  Note: You still need to manually add `const db = await getDatabase();` at the start of each async function that uses `db`');
}