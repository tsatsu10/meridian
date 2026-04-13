#!/usr/bin/env node

/**
 * 🧹 Console.log Cleanup Script
 *
 * Automatically removes or replaces unsafe console.log statements
 * with secure logging alternatives.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SAFE_PATTERNS = [
  // These console.log patterns are allowed to remain
  /console\.log.*in development/i,
  /console\.log.*dev.*only/i,
  /console\.log.*debug.*only/i,
  /console\.log.*test/i,
];

const SENSITIVE_PATTERNS = [
  // These patterns indicate sensitive data
  /password/i,
  /token/i,
  /session/i,
  /secret/i,
  /key/i,
  /auth/i,
  /credential/i,
];

function findTSFiles(dir) {
  const files = [];

  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    if (line.includes('console.log')) {
      const isSafe = SAFE_PATTERNS.some(pattern => pattern.test(line));
      const hasSensitiveData = SENSITIVE_PATTERNS.some(pattern => pattern.test(line));

      if (!isSafe) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          severity: hasSensitiveData ? 'CRITICAL' : 'WARNING',
          reason: hasSensitiveData ? 'Contains sensitive data' : 'Production logging'
        });
      }
    }
  });

  return issues;
}

function cleanupFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file already imports logger
  const hasLoggerImport = content.includes('from "@/lib/logger"') ||
                         content.includes('from "../../lib/logger"') ||
                         content.includes('from "../lib/logger"');

  // Add logger import if needed and file has console.log
  if (!hasLoggerImport && content.includes('console.log')) {
    // Determine correct import path
    const relativePath = path.relative(path.dirname(filePath), path.join(__dirname, '../apps/web/src/lib/logger'));
    const importPath = relativePath.replace(/\\/g, '/').replace('.ts', '');

    // Find the last import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, `import { logger } from "${importPath}";`);
      content = lines.join('\n');
      modified = true;
    }
  }

  // Replace unsafe console.log statements
  const replacements = [
    {
      pattern: /console\.log\s*\(\s*['"`]([^'"`]*error[^'"`]*|[^'"`]*failed[^'"`]*|[^'"`]*❌[^'"`]*)[^)]*\)/gi,
      replacement: 'logger.error($1)'
    },
    {
      pattern: /console\.log\s*\(\s*['"`]([^'"`]*warn[^'"`]*|[^'"`]*⚠️[^'"`]*)[^)]*\)/gi,
      replacement: 'logger.warn($1)'
    },
    {
      pattern: /console\.log\s*\(\s*['"`]([^'"`]*debug[^'"`]*|[^'"`]*🔍[^'"`]*)[^)]*\)/gi,
      replacement: 'logger.debug($1)'
    },
    {
      pattern: /console\.log\s*\(\s*['"`]([^'"`]*)[^)]*\)/g,
      replacement: 'logger.info($1)'
    }
  ];

  for (const { pattern, replacement } of replacements) {
    const newContent = content.replace(pattern, (match, ...args) => {
      // Don't replace if it matches safe patterns
      const isSafe = SAFE_PATTERNS.some(safePattern => safePattern.test(match));
      if (isSafe) return match;

      modified = true;
      return replacement.replace('$1', `"${args[0] || 'Operation'}"`);
    });
    content = newContent;
  }

  // Remove remaining standalone console.log statements
  content = content.replace(/^\s*console\.log\s*\([^)]*\);\s*$/gm, (match) => {
    const isSafe = SAFE_PATTERNS.some(pattern => pattern.test(match));
    if (isSafe) return match;

    modified = true;
    return ''; // Remove the line
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function main() {
  console.log('🧹 Starting console.log cleanup...\n');

  const webSrc = path.join(__dirname, '../apps/web/src');
  const apiSrc = path.join(__dirname, '../apps/api/src');

  const allFiles = [
    ...findTSFiles(webSrc),
    ...findTSFiles(apiSrc)
  ];

  let totalIssues = 0;
  let totalCritical = 0;
  let filesModified = 0;

  for (const filePath of allFiles) {
    const issues = analyzeFile(filePath);

    if (issues.length > 0) {
      console.log(`\n📄 ${path.relative(__dirname, filePath)}`);

      issues.forEach(issue => {
        const severity = issue.severity === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`  ${severity} Line ${issue.line}: ${issue.content}`);
        console.log(`     Reason: ${issue.reason}`);

        if (issue.severity === 'CRITICAL') {
          totalCritical++;
        }
        totalIssues++;
      });

      // Automatically clean up the file
      if (cleanupFile(filePath)) {
        console.log(`  ✅ File cleaned up automatically`);
        filesModified++;
      }
    }
  }

  console.log(`\n📊 Cleanup Summary:`);
  console.log(`  Total issues found: ${totalIssues}`);
  console.log(`  Critical issues: ${totalCritical}`);
  console.log(`  Files modified: ${filesModified}`);
  console.log(`  Files scanned: ${allFiles.length}`);

  if (totalCritical > 0) {
    console.log(`\n🔴 CRITICAL: ${totalCritical} console.log statements contained sensitive data!`);
    console.log(`These have been automatically cleaned up.`);
  }

  if (filesModified > 0) {
    console.log(`\n✅ Cleanup completed! ${filesModified} files were modified.`);
    console.log(`Please review the changes and test the application.`);
  } else {
    console.log(`\n✅ No issues found or all issues were already clean.`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findTSFiles, analyzeFile, cleanupFile };