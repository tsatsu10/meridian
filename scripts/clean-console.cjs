#!/usr/bin/env node

/**
 * Cross-platform script to replace console statements with proper logger
 * Works on Windows, Linux, and macOS
 * 
 * Usage: node scripts/clean-console.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_SRC_DIR = path.join(__dirname, '..', 'apps', 'api', 'src');
const LOGGER_IMPORT = "import logger from './utils/logger';";
const LOGGER_IMPORT_ALT = "import logger from '../utils/logger';";

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function findTsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and other excluded dirs
      if (!['node_modules', '.git', 'dist', 'build', '__tests__'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function hasLoggerImport(content) {
  return content.includes("import logger from") || 
         content.includes("from './utils/logger'") ||
         content.includes("from '../utils/logger'") ||
         content.includes("from '../../utils/logger'") ||
         content.includes("from '../../../utils/logger'") ||
         content.includes("from '../../../../utils/logger'");
}

function getRelativeLoggerImport(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(API_SRC_DIR, 'utils', 'logger.ts'));
  const depth = filePath.split(path.sep).length - API_SRC_DIR.split(path.sep).length - 1;
  
  if (depth === 0) return "import logger from './utils/logger';";
  if (depth === 1) return "import logger from '../utils/logger';";
  if (depth === 2) return "import logger from '../../utils/logger';";
  if (depth === 3) return "import logger from '../../../utils/logger';";
  if (depth >= 4) return "import logger from '../../../../utils/logger';";
  
  return "import logger from './utils/logger';";
}

function addLoggerImport(content, filePath) {
  // Find the last import statement
  const importRegex = /^import\s+.*?from\s+['"].*?['"];?$/gm;
  const matches = [...content.matchAll(importRegex)];
  
  if (matches.length === 0) {
    // No imports, add at the top after any file header comments
    const headerEnd = content.match(/^\/\*[\s\S]*?\*\//) || content.match(/^\/\/.*\n/);
    if (headerEnd) {
      const insertPos = headerEnd[0].length;
      return content.slice(0, insertPos) + '\n' + getRelativeLoggerImport(filePath) + '\n' + content.slice(insertPos);
    }
    return getRelativeLoggerImport(filePath) + '\n\n' + content;
  }
  
  // Find the last import and add logger import after it
  const lastMatch = matches[matches.length - 1];
  const insertPos = lastMatch.index + lastMatch[0].length;
  return content.slice(0, insertPos) + '\n' + getRelativeLoggerImport(filePath) + content.slice(insertPos);
}

function replaceConsoleStatements(content) {
  let modified = content;
  let changes = 0;
  
  // Replace console.log with logger.debug
  const logMatches = content.match(/console\.log\(/g);
  if (logMatches) {
    modified = modified.replace(/console\.log\(/g, 'logger.debug(');
    changes += logMatches.length;
  }
  
  // Replace console.error with logger.error
  const errorMatches = content.match(/console\.error\(/g);
  if (errorMatches) {
    modified = modified.replace(/console\.error\(/g, 'logger.error(');
    changes += errorMatches.length;
  }
  
  // Replace console.warn with logger.warn
  const warnMatches = content.match(/console\.warn\(/g);
  if (warnMatches) {
    modified = modified.replace(/console\.warn\(/g, 'logger.warn(');
    changes += warnMatches.length;
  }
  
  // Replace console.info with logger.info
  const infoMatches = content.match(/console\.info\(/g);
  if (infoMatches) {
    modified = modified.replace(/console\.info\(/g, 'logger.info(');
    changes += infoMatches.length;
  }
  
  return { content: modified, changes };
}

function processFile(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let content = originalContent;
    let totalChanges = 0;
    let addedImport = false;
    
    // Check if file has console statements
    const hasConsole = /console\.(log|error|warn|info)\(/.test(content);
    if (!hasConsole) {
      return { processed: false, changes: 0, addedImport: false };
    }
    
    // Replace console statements
    const { content: newContent, changes } = replaceConsoleStatements(content);
    content = newContent;
    totalChanges += changes;
    
    // Check if logger import exists
    if (!hasLoggerImport(content)) {
      content = addLoggerImport(content, filePath);
      addedImport = true;
    }
    
    // Only write if there were changes
    if (totalChanges > 0 || addedImport) {
      fs.writeFileSync(filePath, content, 'utf8');
      return { processed: true, changes: totalChanges, addedImport };
    }
    
    return { processed: false, changes: 0, addedImport: false };
  } catch (error) {
    log(`  ❌ Error processing ${filePath}: ${error.message}`, 'red');
    return { processed: false, changes: 0, addedImport: false, error: error.message };
  }
}

function main() {
  log('\n🧹 Starting console.log cleanup...', 'cyan');
  log(`📁 Scanning: ${API_SRC_DIR}\n`, 'blue');
  
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'apps', 'api', `src-backup-${timestamp}`);
  
  log('📦 Creating backup...', 'yellow');
  try {
    execSync(`cp -r "${API_SRC_DIR}" "${backupDir}"`, { stdio: 'ignore' });
    log(`✅ Backup created: ${backupDir}`, 'green');
  } catch (error) {
    // Try Windows copy command
    try {
      const winBackup = backupDir.replace(/\//g, '\\');
      execSync(`xcopy /E /I /Y "${API_SRC_DIR.replace(/\//g, '\\')}" "${winBackup}"`, { stdio: 'ignore' });
      log(`✅ Backup created: ${winBackup}`, 'green');
    } catch (winError) {
      log(`⚠️  Could not create backup automatically. Please backup manually before proceeding.`, 'yellow');
      log(`   Backup location suggested: ${backupDir}`, 'yellow');
    }
  }
  
  // Find all TypeScript files
  log('\n🔍 Finding TypeScript files...', 'cyan');
  const files = findTsFiles(API_SRC_DIR);
  log(`   Found ${files.length} TypeScript files`, 'blue');
  
  // Count before
  log('\n📊 Counting console statements before...', 'cyan');
  let beforeCount = { log: 0, error: 0, warn: 0, info: 0 };
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    beforeCount.log += (content.match(/console\.log\(/g) || []).length;
    beforeCount.error += (content.match(/console\.error\(/g) || []).length;
    beforeCount.warn += (content.match(/console\.warn\(/g) || []).length;
    beforeCount.info += (content.match(/console\.info\(/g) || []).length;
  });
  
  const totalBefore = beforeCount.log + beforeCount.error + beforeCount.warn + beforeCount.info;
  log(`   Before: ${beforeCount.log} console.log, ${beforeCount.error} console.error, ${beforeCount.warn} console.warn, ${beforeCount.info} console.info`, 'yellow');
  log(`   Total: ${totalBefore} console statements`, 'yellow');
  
  // Process files
  log('\n🔄 Processing files...', 'cyan');
  let processedFiles = 0;
  let totalReplaced = 0;
  let importsAdded = 0;
  const errors = [];
  
  files.forEach((file, index) => {
    const relativePath = path.relative(API_SRC_DIR, file);
    const result = processFile(file);
    
    if (result.processed) {
      processedFiles++;
      totalReplaced += result.changes;
      if (result.addedImport) importsAdded++;
      
      if ((index + 1) % 50 === 0) {
        log(`   Processed ${index + 1}/${files.length} files...`, 'blue');
      }
    }
    
    if (result.error) {
      errors.push({ file: relativePath, error: result.error });
    }
  });
  
  // Count after
  log('\n📊 Counting console statements after...', 'cyan');
  let afterCount = { log: 0, error: 0, warn: 0, info: 0 };
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    afterCount.log += (content.match(/console\.log\(/g) || []).length;
    afterCount.error += (content.match(/console\.error\(/g) || []).length;
    afterCount.warn += (content.match(/console\.warn\(/g) || []).length;
    afterCount.info += (content.match(/console\.info\(/g) || []).length;
  });
  
  const totalAfter = afterCount.log + afterCount.error + afterCount.warn + afterCount.info;
  log(`   After: ${afterCount.log} console.log, ${afterCount.error} console.error, ${afterCount.warn} console.warn, ${afterCount.info} console.info`, 'yellow');
  log(`   Total: ${totalAfter} console statements remaining`, 'yellow');
  
  // Summary
  log('\n✅ Cleanup complete!', 'green');
  log(`\n📊 Summary:`, 'cyan');
  log(`   Files processed: ${processedFiles}`, 'blue');
  log(`   Console statements replaced: ${totalReplaced}`, 'green');
  log(`   Logger imports added: ${importsAdded}`, 'green');
  log(`   Remaining console statements: ${totalAfter}`, totalAfter > 0 ? 'yellow' : 'green');
  
  if (errors.length > 0) {
    log(`\n⚠️  Errors encountered: ${errors.length}`, 'yellow');
    errors.forEach(({ file, error }) => {
      log(`   ${file}: ${error}`, 'red');
    });
  }
  
  log('\n⚠️  WARNING: Review changes before committing!', 'yellow');
  log('   Some console statements might be intentional (e.g., in tests)', 'yellow');
  log(`   Backup location: ${backupDir}`, 'blue');
  log('\n📝 Next steps:', 'cyan');
  log('   1. Review changes: git diff apps/api/src', 'blue');
  log('   2. Run tests: npm run test', 'blue');
  log('   3. Check TypeScript: npm run lint', 'blue');
  log('   4. Commit: git add . && git commit -m "refactor: replace console with logger"', 'blue');
  log('');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replaceConsoleStatements };


