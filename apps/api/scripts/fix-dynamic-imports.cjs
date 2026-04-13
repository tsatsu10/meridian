#!/usr/bin/env node

/**
 * Fix Dynamic Imports - Add .js extensions
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILE = process.argv[2] || 'src/realtime/unified-websocket-server.ts';
const filePath = path.join(__dirname, '..', TARGET_FILE);

console.log(`🔧 Fixing dynamic imports in: ${TARGET_FILE}`);

try {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;
  
  // Pattern: await import('../some/path')
  // Should be: await import('../some/path.js')
  content = content.replace(
    /await import\((['"])(\.\.[^'"]+)(['"])\)/g,
    (match, quote1, path, quote2) => {
      if (!path.endsWith('.js') && !path.endsWith('.json')) {
        fixed++;
        return `await import(${quote1}${path}.js${quote2})`;
      }
      return match;
    }
  );
  
  // Pattern: import('../some/path')
  content = content.replace(
    /import\((['"])(\.\.[^'"]+)(['"])\)/g,
    (match, quote1, path, quote2) => {
      if (!path.endsWith('.js') && !path.endsWith('.json')) {
        fixed++;
        return `import(${quote1}${path}.js${quote2})`;
      }
      return match;
    }
  );
  
  if (fixed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${fixed} dynamic imports`);
  } else {
    console.log('✅ No fixes needed');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

