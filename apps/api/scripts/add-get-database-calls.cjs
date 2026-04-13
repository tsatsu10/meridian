#!/usr/bin/env node

/**
 * Add const db = getDatabase(); to functions that use db
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const TARGETS = [
  'goals/controllers',
  'gamification/controllers',
  'services',
  'profile/controllers'
];

let fixed = 0;

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if doesn't import getDatabase or doesn't use db.
    if (!content.includes('getDatabase') || !content.includes('db.')) {
      return;
    }
    
    // Skip if already has const db = getDatabase
    if (content.includes('const db = getDatabase()')) {
      return;
    }
    
    console.log(`Fixing: ${path.relative(SRC_DIR, filePath)}`);
    
    // Find export async function or export function
    const funcPattern = /(export\s+(?:async\s+)?function\s+\w+\([^)]*\)\s*\{[\s\n]*)((?:\/\/.*\n|\/\*[\s\S]*?\*\/\n)*\s*)(try\s*\{)/g;
    
    content = content.replace(funcPattern, (match, funcStart, comments, tryBlock) => {
      return `${funcStart}${comments}${tryBlock}\n    const db = getDatabase();`;
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    
  } catch (error) {
    console.error(`Error: ${filePath}:`, error.message);
  }
}

// Process target directories
TARGETS.forEach(target => {
  const targetDir = path.join(SRC_DIR, target);
  if (!fs.existsSync(targetDir)) return;
  
  const files = fs.readdirSync(targetDir, { recursive: true });
  files.forEach(file => {
    if (typeof file === 'string' && file.endsWith('.ts') && !file.includes('.test.')) {
      processFile(path.join(targetDir, file));
    }
  });
});

console.log(`\nFixed ${fixed} files`);

