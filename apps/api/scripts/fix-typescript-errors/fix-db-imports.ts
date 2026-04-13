/**
 * 🔧 Fix Missing Database Imports
 * 
 * Adds getDatabase import and initialization to files using db
 * without importing it.
 * 
 * Fixes: ~500 "Cannot find name 'db'" errors
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.env.DRY_RUN === 'true';

interface FileChange {
  file: string;
  before: number;
  after: number;
  changes: string[];
}

const changes: FileChange[] = [];

async function fixDbImports() {
  console.log('🔍 Scanning for files with missing db imports...\n');
  
  const files = await glob('src/**/*.ts', { 
    ignore: ['**/*.test.ts', '**/node_modules/**'],
    cwd: process.cwd()
  });
  
  let filesFixed = 0;
  let totalChanges = 0;

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Check if file uses db but doesn't import or declare it
    const usesDb = /\bdb\.(query|insert|select|update|delete|execute)\b/.test(content);
    const hasImport = /import\s+{\s*getDatabase\s*}|import.*getDatabase/.test(content);
    const hasDeclare = /const\s+db\s*=\s*getDatabase\(\)/.test(content);
    
    if (usesDb && !hasImport && !hasDeclare) {
      const fileChanges: string[] = [];
      
      // Add import at the top with other imports
      const importStatement = `import { getDatabase } from "../database/connection";\n`;
      
      // Find where to insert (after last import or at start)
      const lastImportMatch = content.match(/^import .* from .*['"'];?\s*$/gm);
      
      if (lastImportMatch && lastImportMatch.length > 0) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertPosition = lastImportIndex + lastImport.length + 1;
        
        content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
        fileChanges.push('Added getDatabase import');
      } else {
        // No imports, add at start after comments
        const firstCodeLine = content.search(/^[^\/\n]/m);
        if (firstCodeLine !== -1) {
          content = content.slice(0, firstCodeLine) + importStatement + '\n' + content.slice(firstCodeLine);
          fileChanges.push('Added getDatabase import at start');
        }
      }
      
      // Add db initialization in async functions that use it
      const asyncFunctionRegex = /async\s+(function\s+\w+|(?:const|let)\s+\w+\s*=\s*async\s*(?:function)?\s*\([^)]*\))\s*(?::\s*[^{]+)?\s*\{/g;
      
      content = content.replace(asyncFunctionRegex, (match) => {
        // Check if this function already has const db =
        const functionEndIndex = content.indexOf(match) + match.length;
        const next100Chars = content.slice(functionEndIndex, functionEndIndex + 200);
        
        if (!/const\s+db\s*=/.test(next100Chars)) {
          fileChanges.push('Added db initialization');
          return match + '\n  const db = getDatabase();';
        }
        return match;
      });
      
      if (content !== originalContent) {
        if (!DRY_RUN) {
          fs.writeFileSync(filePath, content);
        }
        
        filesFixed++;
        totalChanges += fileChanges.length;
        
        changes.push({
          file,
          before: originalContent.length,
          after: content.length,
          changes: fileChanges
        });
        
        console.log(`✅ Fixed: ${file}`);
        fileChanges.forEach(change => console.log(`   - ${change}`));
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files scanned: ${files.length}`);
  console.log(`   Files fixed: ${filesFixed}`);
  console.log(`   Total changes: ${totalChanges}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`);
  
  if (DRY_RUN) {
    console.log(`\n💡 Run without DRY_RUN=true to apply changes`);
  }
  
  // Save change log
  fs.writeFileSync(
    path.join(process.cwd(), 'scripts/fix-typescript-errors/db-imports-changes.json'),
    JSON.stringify(changes, null, 2)
  );
}

fixDbImports().catch(console.error);





