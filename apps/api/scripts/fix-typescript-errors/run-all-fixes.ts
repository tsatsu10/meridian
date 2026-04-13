/**
 * 🚀 Run All TypeScript Fix Scripts
 * 
 * Executes all automated fix scripts in the recommended order
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const DRY_RUN = process.env.DRY_RUN === 'true';

async function runAllFixes() {
  console.log('🚀 Starting automated TypeScript error fixes...\n');
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be applied)' : '✅ LIVE (changes will be applied)'}\n`);
  console.log('─'.repeat(60));
  
  const scripts = [
    { name: 'Database Imports', file: 'fix-db-imports.ts', estimated: 500 },
    { name: 'Schema Names', file: 'fix-schema-names.ts', estimated: 800 },
    { name: 'Null Checks', file: 'fix-null-checks.ts', estimated: 1200 },
  ];
  
  let totalFixed = 0;
  
  for (const script of scripts) {
    console.log(`\n📦 Running: ${script.name}`);
    console.log(`   Expected fixes: ~${script.estimated} errors`);
    console.log('─'.repeat(60));
    
    try {
      const env = DRY_RUN ? { ...process.env, DRY_RUN: 'true' } : process.env;
      const { stdout, stderr } = await execAsync(
        `npx ts-node scripts/fix-typescript-errors/${script.file}`,
        { env }
      );
      
      console.log(stdout);
      if (stderr) console.error(stderr);
      
      totalFixed += script.estimated;
      
      console.log(`✅ Completed: ${script.name}`);
    } catch (error: any) {
      console.error(`❌ Error in ${script.name}:`, error.message);
      console.log(`⚠️  Continuing with next script...`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All Fix Scripts Completed!\n');
  console.log(`📊 Estimated errors fixed: ~${totalFixed}`);
  console.log(`📊 Remaining errors: ~${4189 - totalFixed}`);
  
  if (!DRY_RUN) {
    console.log(`\n✅ Changes have been applied to files.`);
    console.log(`📝 Review changes with: git diff`);
    console.log(`🧪 Test compilation: npx tsc --noEmit --skipLibCheck`);
    console.log(`💾 Commit changes: git commit -am "fix: automated TypeScript error fixes"`);
  } else {
    console.log(`\n💡 To apply changes, run: npm run fix:typescript`);
  }
}

runAllFixes().catch(console.error);





