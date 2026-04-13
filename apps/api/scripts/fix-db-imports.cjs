#!/usr/bin/env node

/**
 * Fix db imports - change from importing { db } to using getDatabase()
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

let fixed = 0;

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

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file imports { db }
    if (!content.includes('import { db }') || !content.includes('database/connection')) {
      return;
    }
    
    console.log(`Fixing: ${path.relative(SRC_DIR, filePath)}`);
    
    // Step 1: Change import statement
    content = content.replace(
      /import \{ db \} from (["'].*database\/connection["']);/g,
      'import { getDatabase } from $1;'
    );
    
    // Step 2: Add const db = getDatabase(); at the start of functions that use db
    // This is a simple approach - add it if we see db. being used
    if (content.includes('db.')) {
      // Find functions/async functions
      const lines = content.split('\n');
      let inFunction = false;
      let functionIndent = 0;
      let addedGetDb = false;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect function start
        if ((line.includes('async function') || line.includes('function')) && line.includes('{')) {
          inFunction = true;
          functionIndent = line.search(/\S/);
          addedGetDb = false;
        }
        
        // Add const db = getDatabase(); after function start
        if (inFunction && !addedGetDb && line.trim() && !line.includes('import') && !line.includes('function')) {
          // Check if this function uses db
          const restOfFunction = lines.slice(i).join('\n');
          if (restOfFunction.includes('db.') && !restOfFunction.includes('const db =')) {
            lines.splice(i, 0, ' '.repeat(functionIndent + 2) + 'const db = getDatabase();');
            addedGetDb = true;
            i++; // Skip the line we just added
          }
        }
        
        // Detect function end
        if (inFunction && line.trim() === '}' && line.search(/\S/) === functionIndent) {
          inFunction = false;
        }
      }
      
      content = lines.join('\n');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    fixed++;
    
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
}

const files = getAllFiles(SRC_DIR);
console.log(`Scanning ${files.length} files...`);
files.forEach(fixFile);
console.log(`\nFixed ${fixed} files`);

