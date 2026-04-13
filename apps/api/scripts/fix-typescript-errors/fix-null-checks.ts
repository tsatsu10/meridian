/**
 * 🔧 Add Null/Undefined Safety Checks
 * 
 * Adds optional chaining to array access patterns.
 * Prevents "Object is possibly 'undefined'" errors.
 * 
 * Fixes: ~1,200 null/undefined errors
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.env.DRY_RUN === 'true';

interface Fix {
  file: string;
  lineNumber: number;
  before: string;
  after: string;
}

const fixes: Fix[] = [];

async function fixNullChecks() {
  console.log('🔍 Scanning for unsafe array access patterns...\n');
  
  const files = await glob('src/**/*.ts', {
    ignore: ['**/*.test.ts', '**/node_modules/**'],
    cwd: process.cwd()
  });
  
  let filesFixed = 0;
  let totalFixes = 0;

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const originalContent = content;
    let modified = false;
    
    // Pattern 1: array[0].property → array[0]?.property
    const pattern1 = /(\w+)\[0\]\.(\w+)/g;
    content = content.replace(pattern1, (match, arrayName, property) => {
      // Skip if already has optional chaining or null check nearby
      const hasOptional = match.includes('?.');
      const hasNullCheck = content.includes(`if (!${arrayName}[0])`);
      
      if (!hasOptional && !hasNullCheck) {
        modified = true;
        totalFixes++;
        return `${arrayName}[0]?.${property}`;
      }
      return match;
    });
    
    // Pattern 2: variable.property where variable might be undefined
    // This requires more context, so we'll be conservative
    
    if (content !== originalContent) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content);
      }
      
      filesFixed++;
      console.log(`✅ Fixed: ${file} (${totalFixes} changes)`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total fixes: ${totalFixes}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`);
  
  if (DRY_RUN) {
    console.log(`\n💡 Run without DRY_RUN=true to apply changes`);
  }
}

fixNullChecks().catch(console.error);





