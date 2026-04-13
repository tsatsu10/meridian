#!/usr/bin/env node

/**
 * 🔧 Console.log Replacement Script
 * 
 * Automatically replaces console.log statements with proper logger calls
 * throughout the codebase to improve logging consistency and eliminate noise.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const PATTERNS_TO_REPLACE = [
  // Standard console methods
  { pattern: /console\.log\(/g, replacement: 'logger.info(' },
  { pattern: /console\.error\(/g, replacement: 'logger.error(' },
  { pattern: /console\.warn\(/g, replacement: 'logger.warn(' },
  { pattern: /console\.info\(/g, replacement: 'logger.info(' },
  { pattern: /console\.debug\(/g, replacement: 'logger.debug(' },
];

// Files that should be excluded from replacement
const EXCLUDED_FILES = [
  'logger.ts', // The logger itself
  'replace-console-logs.js', // This script
];

// Categories based on file paths for better logging context
const FILE_CATEGORIES = {
  '/auth/': 'AUTH',
  '/database/': 'DATABASE', 
  '/api/': 'API',
  '/websocket/': 'WEBSOCKET',
  '/realtime/': 'WEBSOCKET',
  '/middleware/': 'API',
  '/controllers/': 'API',
  '/services/': 'SYSTEM',
  '/utils/': 'SYSTEM',
  '/scripts/': 'SYSTEM',
  '/analytics/': 'SYSTEM',
  '/automation/': 'SYSTEM',
  '/integrations/': 'API',
  '/notification/': 'SYSTEM',
  '/scalability/': 'PERFORMANCE',
  '/performance/': 'PERFORMANCE',
};

function determineCategory(filePath) {
  for (const [pathPattern, category] of Object.entries(FILE_CATEGORIES)) {
    if (filePath.includes(pathPattern)) {
      return category;
    }
  }
  return 'SYSTEM';
}

function addLoggerImport(content, filePath) {
  // Check if logger import already exists
  if (content.includes('import') && content.includes('logger')) {
    return content;
  }

  // Calculate relative path to logger
  const fileDir = path.dirname(filePath);
  const utilsPath = path.relative(fileDir, 'src/utils/logger');
  const importPath = utilsPath.replace(/\\/g, '/').replace('.ts', '');
  const importStatement = `import { logger } from '${importPath.startsWith('.') ? importPath : './' + importPath}';\n`;

  // Find the best place to add the import
  const lines = content.split('\n');
  let importInsertIndex = 0;

  // Look for existing imports
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ') || lines[i].startsWith('import{')) {
      importInsertIndex = i + 1;
    } else if (lines[i].trim() === '' && importInsertIndex > 0) {
      break;
    } else if (!lines[i].startsWith('//') && !lines[i].startsWith('/*') && lines[i].trim() !== '') {
      break;
    }
  }

  lines.splice(importInsertIndex, 0, importStatement);
  return lines.join('\n');
}

function replaceConsoleStatements(content, filePath) {
  let modified = content;
  let replacementCount = 0;

  const category = determineCategory(filePath);

  PATTERNS_TO_REPLACE.forEach(({ pattern, replacement }) => {
    const matches = modified.match(pattern);
    if (matches) {
      replacementCount += matches.length;
      
      // For logger methods that support categories, add the category
      if (replacement.includes('logger.')) {
        // Replace with category-aware logging
        modified = modified.replace(pattern, (match) => {
          const method = replacement.match(/logger\.(\w+)/)[1];
          if (['info', 'error', 'warn', 'debug'].includes(method)) {
            return `logger.${method}(`;
          }
          return replacement;
        });
      } else {
        modified = modified.replace(pattern, replacement);
      }
    }
  });

  return { content: modified, replacementCount };
}

async function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip files that don't contain console statements
    if (!content.includes('console.')) {
      return { processed: false, replacements: 0 };
    }

    const { content: modifiedContent, replacementCount } = replaceConsoleStatements(content, filePath);
    
    if (replacementCount > 0) {
      // Add logger import if needed
      const finalContent = addLoggerImport(modifiedContent, filePath);
      
      // Write the modified content back to the file
      fs.writeFileSync(filePath, finalContent, 'utf8');
      
      return { processed: true, replacements: replacementCount };
    }
    
    return { processed: false, replacements: 0 };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { processed: false, replacements: 0, error: error.message };
  }
}

async function main() {
  console.log('🔧 Starting console.log replacement process...\n');

  try {
    // Find all TypeScript files in src directory
    const files = glob.sync('src/**/*.ts', { cwd: process.cwd() });
    
    console.log(`Found ${files.length} TypeScript files to process\n`);

    let totalFiles = 0;
    let processedFiles = 0;
    let totalReplacements = 0;
    const errors = [];

    for (const file of files) {
      const relativePath = file;
      
      // Skip excluded files
      if (EXCLUDED_FILES.some(excluded => relativePath.includes(excluded))) {
        console.log(`⏭️  Skipping ${relativePath}`);
        continue;
      }

      totalFiles++;
      const result = await processFile(file);
      
      if (result.error) {
        errors.push({ file: relativePath, error: result.error });
        console.log(`❌ Error processing ${relativePath}: ${result.error}`);
      } else if (result.processed) {
        processedFiles++;
        totalReplacements += result.replacements;
        console.log(`✅ ${relativePath}: ${result.replacements} replacements`);
      } else {
        console.log(`⚪ ${relativePath}: no console statements found`);
      }
    }

    console.log('\n🎯 Replacement Summary:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📁 Total files scanned: ${totalFiles}`);
    console.log(`✅ Files processed: ${processedFiles}`);
    console.log(`🔄 Total replacements: ${totalReplacements}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Files with errors:');
      errors.forEach(({ file, error }) => {
        console.log(`   • ${file}: ${error}`);
      });
    }

    console.log('\n🚀 Console.log replacement completed!');
    console.log('📝 Next steps:');
    console.log('   1. Review the changes in your git diff');
    console.log('   2. Test the application to ensure logging works correctly');
    console.log('   3. Commit the changes if everything looks good');
    
  } catch (error) {
    console.error('❌ Fatal error during replacement process:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, processFile, replaceConsoleStatements };