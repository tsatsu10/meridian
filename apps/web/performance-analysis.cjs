#!/usr/bin/env node

/**
 * Frontend Performance Analysis Tool
 * Analyzes the codebase for performance bottlenecks without requiring a build
 */

const fs = require('fs');
const path = require('path');

const ANALYSIS_RULES = {
  // Bundle size concerns
  largeImports: {
    patterns: [
      /import.*from.*['"](@reactflow|react-flow-renderer)['"]/,
      /import.*from.*['"](@tensorflow|tensorflow)['"]/,
      /import.*from.*['"](@mui|@material-ui)['"]/,
      /import.*from.*['"]lodash['"]/,
      /import.*from.*['"]moment['"]/,
      /import.*from.*['"]antd['"]/,
      /import.*from.*['"]recharts['"]/,
      /import.*from.*['"]d3['"]/,
    ],
    severity: 'high',
    description: 'Large library imports that significantly increase bundle size'
  },

  // Performance anti-patterns
  performanceIssues: {
    patterns: [
      /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\)/g, // useEffect with empty deps
      /React\.createElement/g,
      /\.map\(.*?\.map\(/g, // Nested maps
      /console\.(log|info|debug|warn)/g, // Console logging in production
    ],
    severity: 'medium',
    description: 'Code patterns that may cause performance issues'
  },

  // Memory leaks
  memoryLeaks: {
    patterns: [
      /addEventListener.*(?!removeEventListener)/,
      /setInterval.*(?!clearInterval)/,
      /setTimeout.*(?!clearTimeout)/,
      /new.*Worker.*(?!terminate)/,
    ],
    severity: 'high',
    description: 'Potential memory leak patterns'
  },

  // Missing optimizations
  optimizationOpportunities: {
    patterns: [
      /import React/,
      /React\.memo\(/,
      /useCallback\(/,
      /useMemo\(/,
      /lazy\(/,
      /Suspense/,
    ],
    severity: 'low',
    description: 'Opportunities for React optimizations'
  }
};

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      files: 0,
      issues: [],
      summary: {
        high: 0,
        medium: 0,
        low: 0
      },
      recommendations: []
    };
  }

  analyzeFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);

      this.results.files++;

      // Check for each rule
      Object.entries(ANALYSIS_RULES).forEach(([ruleName, rule]) => {
        rule.patterns.forEach((pattern, index) => {
          const matches = content.match(pattern);
          if (matches) {
            this.results.issues.push({
              file: relativePath,
              rule: ruleName,
              severity: rule.severity,
              description: rule.description,
              matches: matches.length,
              pattern: pattern.toString(),
              line: this.findLineNumber(content, matches[0])
            });
            this.results.summary[rule.severity]++;
          }
        });
      });

      // File size analysis
      const stats = fs.statSync(filePath);
      if (stats.size > 50000) { // Files over 50KB
        this.results.issues.push({
          file: relativePath,
          rule: 'large-file',
          severity: 'medium',
          description: `Large file size: ${Math.round(stats.size / 1024)}KB`,
          size: stats.size
        });
        this.results.summary.medium++;
      }

    } catch (error) {
      console.warn(`Warning: Could not analyze ${filePath}: ${error.message}`);
    }
  }

  findLineNumber(content, match) {
    const lines = content.substring(0, content.indexOf(match)).split('\n');
    return lines.length;
  }

  scanDirectory(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
    try {
      const items = fs.readdirSync(dir);

      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          this.scanDirectory(fullPath, extensions);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          this.analyzeFile(fullPath);
        }
      });
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}: ${error.message}`);
    }
  }

  generateRecommendations() {
    const issues = this.results.issues;
    const recommendations = [];

    // Bundle size recommendations
    const largeImports = issues.filter(i => i.rule === 'largeImports');
    if (largeImports.length > 0) {
      recommendations.push({
        category: 'Bundle Size',
        priority: 'High',
        title: 'Replace large libraries with lighter alternatives',
        description: `Found ${largeImports.length} imports of large libraries. Consider:`,
        actions: [
          'Replace Lodash with native JS methods or Lodash-ES',
          'Use React Flow Lite instead of full React Flow',
          'Replace Moment.js with Day.js or date-fns',
          'Consider lazy loading for heavy components'
        ]
      });
    }

    // Performance patterns
    const perfIssues = issues.filter(i => i.rule === 'performanceIssues');
    if (perfIssues.length > 0) {
      recommendations.push({
        category: 'Performance',
        priority: 'Medium',
        title: 'Optimize React patterns',
        description: `Found ${perfIssues.length} potential performance issues. Consider:`,
        actions: [
          'Add proper dependency arrays to useEffect hooks',
          'Use React.memo for components that re-render frequently',
          'Implement useCallback and useMemo where appropriate',
          'Remove console.log statements in production builds'
        ]
      });
    }

    // Memory management
    const memoryIssues = issues.filter(i => i.rule === 'memoryLeaks');
    if (memoryIssues.length > 0) {
      recommendations.push({
        category: 'Memory Management',
        priority: 'High',
        title: 'Fix potential memory leaks',
        description: `Found ${memoryIssues.length} potential memory leak patterns. Consider:`,
        actions: [
          'Add cleanup functions in useEffect returns',
          'Clear intervals and timeouts',
          'Remove event listeners on component unmount',
          'Terminate web workers properly'
        ]
      });
    }

    // Code splitting opportunities
    const largeFiles = issues.filter(i => i.rule === 'large-file');
    if (largeFiles.length > 0) {
      recommendations.push({
        category: 'Code Splitting',
        priority: 'Medium',
        title: 'Implement code splitting for large files',
        description: `Found ${largeFiles.length} large files. Consider:`,
        actions: [
          'Split large components into smaller, focused components',
          'Implement lazy loading with React.lazy()',
          'Use dynamic imports for heavy features',
          'Move utility functions to separate modules'
        ]
      });
    }

    this.results.recommendations = recommendations;
  }

  printReport() {
    console.log('🚀 Frontend Performance Analysis Report');
    console.log('=====================================\n');

    console.log(`📊 Files analyzed: ${this.results.files}`);
    console.log(`🚨 Total issues found: ${this.results.issues.length}`);
    console.log(`   • High severity: ${this.results.summary.high}`);
    console.log(`   • Medium severity: ${this.results.summary.medium}`);
    console.log(`   • Low severity: ${this.results.summary.low}\n`);

    // Top issues by file
    const fileIssues = {};
    this.results.issues.forEach(issue => {
      if (!fileIssues[issue.file]) {
        fileIssues[issue.file] = [];
      }
      fileIssues[issue.file].push(issue);
    });

    const topFiles = Object.entries(fileIssues)
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 10);

    if (topFiles.length > 0) {
      console.log('📁 Files with most issues:');
      topFiles.forEach(([file, issues]) => {
        console.log(`   ${file}: ${issues.length} issues`);
      });
      console.log('');
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('💡 Performance Recommendations:');
      console.log('==============================\n');

      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.title}`);
        console.log(`   Category: ${rec.category}`);
        console.log(`   ${rec.description}`);
        rec.actions.forEach(action => {
          console.log(`   • ${action}`);
        });
        console.log('');
      });
    }

    // Detailed issues (top 20)
    if (this.results.issues.length > 0) {
      console.log('🔍 Detailed Issues (Top 20):');
      console.log('============================\n');

      const sortedIssues = this.results.issues
        .sort((a, b) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
        .slice(0, 20);

      sortedIssues.forEach((issue, index) => {
        const severity = issue.severity.toUpperCase();
        console.log(`${index + 1}. [${severity}] ${issue.file}:${issue.line || '?'}`);
        console.log(`   Rule: ${issue.rule}`);
        console.log(`   ${issue.description}`);
        if (issue.matches) {
          console.log(`   Matches: ${issue.matches}`);
        }
        console.log('');
      });
    }
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();

  console.log('🔍 Analyzing frontend performance...\n');

  // Analyze src directory
  const srcDir = path.join(__dirname, 'src');
  if (fs.existsSync(srcDir)) {
    analyzer.scanDirectory(srcDir);
    analyzer.generateRecommendations();
    analyzer.printReport();
  } else {
    console.error('❌ Source directory not found:', srcDir);
    process.exit(1);
  }
}

module.exports = PerformanceAnalyzer;