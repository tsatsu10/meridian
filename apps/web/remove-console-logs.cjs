const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Starting console.log cleanup...\n');

// Find all console.log statements
const cmd = `grep -r "console\\.log" src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | grep -v "// console.log"`;

let output;
try {
  output = execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
} catch (error) {
  // grep returns exit code 1 when no matches found
  if (error.stdout) {
    output = error.stdout;
  } else {
    console.log('✅ No console.log statements found!');
    process.exit(0);
  }
}

const lines = output.trim().split('\n').filter(Boolean);
console.log(`📊 Found ${lines.length} console.log statements\n`);

// Group by file
const fileMap = new Map();
lines.forEach(line => {
  const match = line.match(/^([^:]+):(.+)$/);
  if (match) {
    const [, filePath, content] = match;
    if (!fileMap.has(filePath)) {
      fileMap.set(filePath, []);
    }
    fileMap.get(filePath).push(content.trim());
  }
});

console.log(`📁 Affected files: ${fileMap.size}\n`);

let totalRemoved = 0;
let filesModified = 0;

// Process each file
for (const [relPath, consoleLines] of fileMap.entries()) {
  const filePath = path.join(__dirname, relPath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Remove console.log statements (handle single and multi-line)
    // Pattern 1: Simple console.log(...)
    content = content.replace(/\s*console\.log\([^;]*\);?\s*/g, '');

    // Pattern 2: console.log with template literals (may span lines)
    content = content.replace(/\s*console\.log\(`[^`]*`\);?\s*/g, '');

    // Pattern 3: console.log with objects (may span lines)
    content = content.replace(/\s*console\.log\([^)]*\{[^}]*\}[^)]*\);?\s*/g, '');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      const removed = consoleLines.length;
      totalRemoved += removed;
      filesModified++;
      console.log(`✅ ${relPath}: Removed ${removed} console.log(s)`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${relPath}:`, error.message);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✨ Cleanup complete!`);
console.log(`📊 Files modified: ${filesModified}`);
console.log(`🧹 console.log statements removed: ${totalRemoved}`);
console.log('='.repeat(60));

// Verify cleanup
console.log('\n🔍 Verifying cleanup...');
try {
  const verifyOutput = execSync(cmd, { cwd: __dirname, encoding: 'utf8' });
  const remaining = verifyOutput.trim().split('\n').filter(Boolean).length;
  if (remaining > 0) {
    console.log(`⚠️  ${remaining} console.log statements still remain (may need manual review)`);
  } else {
    console.log('✅ All console.log statements removed!');
  }
} catch (error) {
  console.log('✅ All console.log statements removed!');
}
