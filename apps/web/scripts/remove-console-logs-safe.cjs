#!/usr/bin/env node

/**
 * 🔒 SECURITY: Safe Console Log Removal Script
 * 
 * Removes or replaces console.log statements with the logger utility
 * to prevent sensitive data exposure in production builds.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const BACKUP_DIR = path.join(__dirname, '../.console-log-backup');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Statistics
let stats = {
  filesScanned: 0,
  filesModified: 0,
  consolesReplaced: 0,
  errors: 0,
};

console.log('🔒 Starting Safe Console Log Removal (Frontend)');
console.log(`📁 Source directory: ${SRC_DIR}`);
console.log(`🔄 Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will modify files)'}`);
console.log('---\n');

// Create backup directory
if (!DRY_RUN && !fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Get all TypeScript/TSX files
 */
function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.error(`Directory does not exist: ${dir}`);
    return fileList;
  }

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.test.') && !file.includes('__tests__')) {
        getAllFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  stats.filesScanned++;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip generated files
    if (content.includes('@ts-nocheck') || content.includes('This file is auto-generated')) {
      return;
    }

    // Count console statements
    const consoleMatches = content.match(/console\.(log|info|debug)\s*\(/g);
    if (!consoleMatches || consoleMatches.length === 0) {
      return;
    }

    const relativePath = path.relative(SRC_DIR, filePath);
    console.log(`📝 ${relativePath}: ${consoleMatches.length} console statements`);

    // Backup original
    if (!DRY_RUN) {
      const backupPath = path.join(BACKUP_DIR, relativePath);
      const backupDir = path.dirname(backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.writeFileSync(backupPath, originalContent, 'utf8');
    }

    // Check if logger is already imported
    const hasLoggerImport = content.includes('from "@/lib/logger"') || 
                            content.includes('from "@/utils/logger"') ||
                            content.includes('import { logger }');

    // Add logger import if needed
    if (!hasLoggerImport) {
      const lines = content.split('\n');
      let lastImportIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }

      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, 'import { logger } from "@/lib/logger";');
        content = lines.join('\n');
      }
    }

    // Replace console statements
    let replaceCount = 0;
    
    // Replace console.log with logger.debug (won't appear in production)
    content = content.replace(/console\.log\(/g, () => {
      replaceCount++;
      return 'logger.debug(';
    });
    
    // Replace console.info with logger.info
    content = content.replace(/console\.info\(/g, () => {
      replaceCount++;
      return 'logger.info(';
    });
    
    // Replace console.debug with logger.debug
    content = content.replace(/console\.debug\(/g, () => {
      replaceCount++;
      return 'logger.debug(';
    });
    
    // Leave console.warn and console.error alone (important for debugging)

    if (replaceCount > 0) {
      stats.consolesReplaced += replaceCount;
      console.log(`  ✅ Would replace ${replaceCount} console statements`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
        stats.filesModified++;
      }
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    stats.errors++;
  }
}

/**
 * Main execution
 */
function main() {
  try {
    const files = getAllFiles(SRC_DIR);
    console.log(`📊 Found ${files.length} TypeScript files to scan\n`);

    files.forEach(processFile);

    console.log('\n---');
    console.log('📊 Summary:');
    console.log(`  Files scanned: ${stats.filesScanned}`);
    console.log(`  Files modified: ${stats.filesModified}`);
    console.log(`  Console statements replaced: ${stats.consolesReplaced}`);
    console.log(`  Errors: ${stats.errors}`);

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN - No files were actually modified');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ Console log removal complete!');
      console.log(`📦 Backups saved to: ${BACKUP_DIR}`);
      console.log('\n🔍 Next steps:');
      console.log('  1. Run: npm run build');
      console.log('  2. Test the application');
      console.log('  3. If issues, restore from backup');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();

