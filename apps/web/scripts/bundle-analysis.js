#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Measures and reports bundle size for the Meridian web application
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DIST_DIR = path.join(__dirname, '../dist');
const ANALYSIS_FILE = path.join(__dirname, '../bundle-analysis.json');

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBundle() {
  console.log('🔍 Analyzing bundle size...\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  const analysis = {
    timestamp: new Date().toISOString(),
    totalSize: 0,
    files: [],
    categories: {
      javascript: { size: 0, files: [] },
      css: { size: 0, files: [] },
      assets: { size: 0, files: [] },
      other: { size: 0, files: [] }
    }
  };

  function scanDirectory(dir, relativePath = '') {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const relativeItemPath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        scanDirectory(fullPath, relativeItemPath);
      } else {
        const size = stats.size;
        const fileInfo = {
          path: relativeItemPath,
          size,
          formattedSize: formatBytes(size)
        };
        
        analysis.totalSize += size;
        analysis.files.push(fileInfo);
        
        // Categorize files
        const ext = path.extname(item).toLowerCase();
        if (ext === '.js' || ext === '.mjs') {
          analysis.categories.javascript.size += size;
          analysis.categories.javascript.files.push(fileInfo);
        } else if (ext === '.css') {
          analysis.categories.css.size += size;
          analysis.categories.css.files.push(fileInfo);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'].includes(ext)) {
          analysis.categories.assets.size += size;
          analysis.categories.assets.files.push(fileInfo);
        } else {
          analysis.categories.other.size += size;
          analysis.categories.other.files.push(fileInfo);
        }
      }
    }
  }

  scanDirectory(DIST_DIR);

  // Sort files by size (largest first)
  analysis.files.sort((a, b) => b.size - a.size);
  
  // Format category sizes
  Object.keys(analysis.categories).forEach(category => {
    analysis.categories[category].formattedSize = formatBytes(analysis.categories[category].size);
  });

  // Save analysis
  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analysis, null, 2));

  // Print results
  console.log('📊 Bundle Analysis Results:');
  console.log('============================');
  console.log(`📅 Timestamp: ${analysis.timestamp}`);
  console.log(`📦 Total Size: ${formatBytes(analysis.totalSize)}`);
  console.log('');
  
  console.log('📁 Categories:');
  Object.entries(analysis.categories).forEach(([category, data]) => {
    console.log(`  ${category.toUpperCase()}: ${data.formattedSize} (${data.files.length} files)`);
  });
  
  console.log('\n📋 Top 10 Largest Files:');
  analysis.files.slice(0, 10).forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.path}: ${file.formattedSize}`);
  });

  console.log(`\n💾 Analysis saved to: ${ANALYSIS_FILE}`);
  
  // Phase 1 target check
  const totalSizeMB = analysis.totalSize / (1024 * 1024);
  console.log(`\n🎯 Phase 1 Target Check:`);
  console.log(`   Current bundle size: ${totalSizeMB.toFixed(2)} MB`);
  console.log(`   Target: < 2MB (estimated)`);
  console.log(`   Status: ${totalSizeMB < 2 ? '✅ PASS' : '⚠️  NEEDS OPTIMIZATION'}`);
  
  return analysis;
}

// Run analysis if called directly
if (require.main === module) {
  analyzeBundle();
}

module.exports = { analyzeBundle, formatBytes }; 