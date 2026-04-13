import { promises as fs } from 'fs';
import path from 'path';
import { logger } from "../../lib/logger";

interface MigrationIssue {
  file: string;
  line: number;
  issue: string;
  pattern: string;
}

interface VerificationResult {
  passed: boolean;
  issues: MigrationIssue[];
  summary: {
    totalFiles: number;
    filesWithIssues: number;
    totalIssues: number;
  };
}

// Patterns to look for that indicate old store usage
const problematicPatterns = [
  {
    pattern: /useAppSelector|useSelector/g,
    issue: 'Using Redux useAppSelector/useSelector instead of consolidated stores'
  },
  {
    pattern: /useAppDispatch|useDispatch/g,
    issue: 'Using Redux useAppDispatch/useDispatch instead of consolidated stores'
  },
  {
    pattern: /from\s+['"][^'"]*\/slices\/[^'"]*['"]/g,
    issue: 'Importing from old Redux slices instead of consolidated stores'
  },
  {
    pattern: /dispatch\s*\(\s*\w+\(/g,
    issue: 'Using Redux dispatch pattern instead of store methods'
  }
];

// Patterns that are acceptable (migration layer usage)
const acceptablePatterns = [
  /migration\/compatibility-layer/,
  /migration\/legacy-hooks/,
  /migration\/index/,
  /store\/index\.ts/, // Main store index is expected to have Redux imports
  /store\/slices\//,  // Slice files themselves are expected to have Redux
  /store\/hooks\//,   // Hook files that are being migrated
];

async function scanFile(filePath: string): Promise<MigrationIssue[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const issues: MigrationIssue[] = [];

    // Skip files that are part of the migration system
    if (acceptablePatterns.some(pattern => pattern.test(filePath))) {
      return issues;
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const { pattern, issue } of problematicPatterns) {
        const matches = line.match(pattern);
        if (matches) {
          issues.push({
            file: filePath,
            line: lineIndex + 1,
            issue,
            pattern: matches[0]
          });
        }
      }
    }

    return issues;
  } catch (error) {
    console.error(`Error scanning file ${filePath}:`, error);
    return [];
  }
}

async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .git directories
        if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          const subFiles = await scanDirectory(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
  }
  
  return files;
}

export async function verifyMigration(rootPath: string = 'apps/web/src'): Promise<VerificationResult> {
  logger.debug("🔍 Verifying store migration...");
  
  const allFiles = await scanDirectory(rootPath);
  const allIssues: MigrationIssue[] = [];
  
  logger.info("📂 Scanning ${allFiles.length} files...");
  
  for (const file of allFiles) {
    const issues = await scanFile(file);
    allIssues.push(...issues);
  }
  
  const filesWithIssues = [...new Set(allIssues.map(issue => issue.file))].length;
  
  const result: VerificationResult = {
    passed: allIssues.length === 0,
    issues: allIssues,
    summary: {
      totalFiles: allFiles.length,
      filesWithIssues,
      totalIssues: allIssues.length,
    }
  };
  
  // Print results
  logger.info("\n📊 Migration Verification Results:");
  logger.info("=====================================");
  
  if (result.passed) {
    logger.info("✅ All files have been migrated successfully!");
  } else {
    logger.error("❌ Found ${result.summary.totalIssues} issues in ${result.summary.filesWithIssues} files:");
    logger.info("Operation");
    
    // Group issues by file
    const issuesByFile = allIssues.reduce((acc, issue) => {
      if (!acc[issue.file]) {
        acc[issue.file] = [];
      }
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, MigrationIssue[]>);
    
    for (const [file, issues] of Object.entries(issuesByFile)) {
      logger.info("📄 ${path.relative(process.cwd(), file)}");
      for (const issue of issues) {
        logger.info("   Line ${issue.line}: ${issue.issue}");
        logger.info("   Pattern: ${issue.pattern}");
      }
      logger.info("Operation");
    }
  }
  
  logger.info("📈 Summary: ${result.summary.filesWithIssues}/${result.summary.totalFiles} files need migration");
  
  return result;
}

export async function generateMigrationReport(rootPath?: string): Promise<string> {
  const result = await verifyMigration(rootPath);
  
  let report = '# Store Migration Verification Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += '## Summary\n\n';
  report += `- **Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `- **Total Files Scanned**: ${result.summary.totalFiles}\n`;
  report += `- **Files with Issues**: ${result.summary.filesWithIssues}\n`;
  report += `- **Total Issues**: ${result.summary.totalIssues}\n\n`;
  
  if (!result.passed) {
    report += '## Issues Found\n\n';
    
    const issuesByFile = result.issues.reduce((acc, issue) => {
      if (!acc[issue.file]) {
        acc[issue.file] = [];
      }
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, MigrationIssue[]>);
    
    for (const [file, issues] of Object.entries(issuesByFile)) {
      report += `### ${path.relative(process.cwd(), file)}\n\n`;
      for (const issue of issues) {
        report += `- **Line ${issue.line}**: ${issue.issue}\n`;
        report += `  - Pattern: \`${issue.pattern}\`\n`;
      }
      report += '\n';
    }
  }
  
  report += '## Migration Guidelines\n\n';
  report += '1. Replace `useAppSelector` with consolidated store hooks\n';
  report += '2. Replace `useAppDispatch` with direct store method calls\n';
  report += '3. Update imports to use consolidated stores\n';
  report += '4. Use the migration compatibility layer during transition\n';
  report += '5. Test components thoroughly after migration\n\n';
  
  return report;
}

// CLI usage
if (require.main === module) {
  const rootPath = process.argv[2] || 'apps/web/src';
  
  verifyMigration(rootPath)
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}