#!/usr/bin/env node

/**
 * 🔒 SECURITY: API Console Log Removal Script
 * 
 * Removes console.log statements from API and replaces with logger
 * Production builds should not have console.log for security
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const BACKUP_DIR = path.join(__dirname, '../.console-log-backup');
const DRY_RUN = process.argv.includes('--dry-run');

// Stats
let stats = {
  filesScanned: 0,
  filesModified: 0,
  consolesReplaced: 0,
};

console.log('🔒 API Console Log Removal');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

// Create backup
if (!DRY_RUN && !fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('__tests__')) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function processFile(filePath) {
  stats.filesScanned++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if already uses logger
    if (content.includes('from "../utils/logger"') || content.includes('from "../../utils/logger"')) {
      return;
    }
    
    // Count console statements
    const consoleMatches = content.match(/console\.(log|info|debug)\s*\(/g);
    if (!consoleMatches) return;
    
    console.log(`📝 ${path.relative(SRC_DIR, filePath)}: ${consoleMatches.length} console statements`);
    
    // Backup
    if (!DRY_RUN) {
      const backupPath = path.join(BACKUP_DIR, path.relative(SRC_DIR, filePath));
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
      fs.writeFileSync(backupPath, originalContent, 'utf8');
    }
    
    // Add logger import
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0 && !content.includes('import logger')) {
      // Calculate relative path to logger
      const fileDir = path.dirname(filePath);
      const loggerPath = path.join(SRC_DIR, 'utils', 'logger.ts');
      let relativePath = path.relative(fileDir, loggerPath);
      relativePath = relativePath.replace(/\\/g, '/').replace('.ts', '');
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
      
      lines.splice(lastImportIndex + 1, 0, `import logger from "${relativePath}";`);
      content = lines.join('\n');
    }
    
    // Replace console statements
    let replaceCount = 0;
    
    // console.log → logger.debug
    content = content.replace(/console\.log\(/g, () => {
      replaceCount++;
      return 'logger.debug(';
    });
    
    // console.info → logger.info
    content = content.replace(/console\.info\(/g, () => {
      replaceCount++;
      return 'logger.info(';
    });
    
    // console.debug → logger.debug  
    content = content.replace(/console\.debug\(/g, () => {
      replaceCount++;
      return 'logger.debug(';
    });
    
    // Keep console.warn and console.error as they may be important
    
    if (replaceCount > 0) {
      stats.consolesReplaced += replaceCount;
      console.log(`  ✅ Replaced ${replaceCount} statements`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
        stats.filesModified++;
      }
    }
    
  } catch (error) {
    console.error(`❌ Error: ${filePath}`, error.message);
  }
}

// Main
try {
  const files = getAllFiles(SRC_DIR);
  console.log(`📊 Scanning ${files.length} files\n`);
  
  files.forEach(processFile);
  
  console.log('\n📊 Summary:');
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Files modified: ${stats.filesModified}`);
  console.log(`  Console statements replaced: ${stats.consolesReplaced}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No changes made');
    console.log('   Run without --dry-run to apply');
  } else {
    console.log('\n✅ Complete!');
    console.log(`📦 Backups: ${BACKUP_DIR}`);
  }
  
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}

