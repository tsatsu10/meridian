/**
 * 🔧 Fix Schema Table Name Inconsistencies
 * 
 * Standardizes table names across the codebase.
 * Replaces old naming patterns with consistent names.
 * 
 * Fixes: ~800 "has no exported member" errors
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.env.DRY_RUN === 'true';

// Table name mappings (oldName → newName)
const TABLE_NAME_MAPPINGS: Record<string, string> = {
  'workspaceInvitationTable': 'workspaceInvites',
  'workspaceSettingsTable': 'workspaceSettings',
  'userTable': 'users',
  'taskTable': 'tasks',
  'projectTable': 'projects',
  'workspaceTable': 'workspaces',
  'teamTable': 'teams',
  'activityTable': 'activities',
  'timeEntryTable': 'timeEntries',
  'labelTable': 'label',
  'milestoneTable': 'milestone',
  'roleAssignmentTable': 'roleAssignment',
  'roleHistoryTable': 'roleHistory',
  'statusColumnTable': 'statusColumns',
  'projectMemberTable': 'projectMembers',
  'workspaceMemberTable': 'workspaceMembers',
  'teamMemberTable': 'teamMembers',
  'attachmentTable': 'attachments',
  'commentTable': 'comments',
  'notificationTable': 'notifications',
  'channelTable': 'channels',
  'directMessageTable': 'directMessages',
  'kudosTable': 'kudos',
  'moodTable': 'mood',
  // Keep these as-is (already correct in exports)
  'messagesTable': 'messagesTable',
  'userProfileTable': 'userProfileTable',
  'userExperienceTable': 'userExperienceTable',
  'userEducationTable': 'userEducationTable',
  'userSkillTable': 'userSkillTable',
};

interface FixResult {
  file: string;
  replacements: Array<{ from: string; to: string; count: number }>;
}

const results: FixResult[] = [];

async function fixSchemaNames() {
  console.log('🔍 Scanning for schema name inconsistencies...\n');
  
  const files = await glob('src/**/*.ts', {
    ignore: ['**/node_modules/**'],
    cwd: process.cwd()
  });
  
  let filesFixed = 0;
  let totalReplacements = 0;

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    const fileReplacements: FixResult['replacements'] = [];
    
    for (const [oldName, newName] of Object.entries(TABLE_NAME_MAPPINGS)) {
      if (content.includes(oldName)) {
        const regex = new RegExp(`\\b${oldName}\\b`, 'g');
        const matches = content.match(regex);
        const count = matches ? matches.length : 0;
        
        if (count > 0) {
          content = content.replace(regex, newName);
          fileReplacements.push({ from: oldName, to: newName, count });
          totalReplacements += count;
        }
      }
    }
    
    if (content !== originalContent) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content);
      }
      
      filesFixed++;
      results.push({ file, replacements: fileReplacements });
      
      console.log(`✅ Fixed: ${file}`);
      fileReplacements.forEach(r => {
        console.log(`   - ${r.from} → ${r.to} (${r.count} occurrences)`);
      });
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`);
  
  if (DRY_RUN) {
    console.log(`\n💡 Run without DRY_RUN=true to apply changes`);
  }
  
  // Save results
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts/fix-typescript-errors/schema-names-changes.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\n📝 Change log saved to: schema-names-changes.json`);
}

fixSchemaNames().catch(console.error);





