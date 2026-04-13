#!/usr/bin/env node

/**
 * Fix Path Aliases in API
 * 
 * The API doesn't support @ path aliases like the frontend does
 * This script converts them to relative paths
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const DRY_RUN = process.argv.includes('--dry-run');

let stats = {
  filesScanned: 0,
  filesFixed: 0,
  aliasesReplaced: 0,
};

console.log('🔧 Fixing Path Aliases in API');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function getRelativePath(fromFile, toPath) {
  const fileDir = path.dirname(fromFile);
  
  // Convert @/ alias to relative path
  const targetPath = toPath.replace('@/', '');
  const fullTargetPath = path.join(SRC_DIR, targetPath);
  
  let relativePath = path.relative(fileDir, fullTargetPath);
  relativePath = relativePath.replace(/\\/g, '/');
  
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

function processFile(filePath) {
  stats.filesScanned++;
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let modified = false;
    
    // Find all @/ imports
    const aliasMatches = content.match(/from ["']@\/[^"']+["']/g);
    if (!aliasMatches) return;
    
    console.log(`📝 ${path.relative(SRC_DIR, filePath)}: ${aliasMatches.length} alias imports`);
    
    // Replace each @/ alias with relative path
    aliasMatches.forEach(match => {
      const aliasPath = match.match(/["'](@\/[^"']+)["']/)[1];
      const relativePath = getRelativePath(filePath, aliasPath);
      const newImport = match.replace(aliasPath, relativePath);
      
      content = content.replace(match, newImport);
      stats.aliasesReplaced++;
      modified = true;
    });
    
    if (modified) {
      console.log(`  ✅ Replaced ${aliasMatches.length} alias imports`);
      
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
        stats.filesFixed++;
      }
    }
    
  } catch (error) {
    console.error(`❌ Error: ${filePath}:`, error.message);
  }
}

// Main
try {
  const files = getAllFiles(SRC_DIR);
  console.log(`📊 Scanning ${files.length} files\n`);
  
  files.forEach(processFile);
  
  console.log('\n📊 Summary:');
  console.log(`  Files scanned: ${stats.filesScanned}`);
  console.log(`  Files fixed: ${stats.filesFixed}`);
  console.log(`  Aliases replaced: ${stats.aliasesReplaced}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No changes made');
  } else {
    console.log('\n✅ Path aliases fixed!');
  }
  
} catch (error) {
  console.error('❌ Fatal error:', error);
  process.exit(1);
}

