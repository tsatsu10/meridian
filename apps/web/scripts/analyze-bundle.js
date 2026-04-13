/**
 * 📊 Bundle Size Analyzer
 * 
 * Analyzes Vite build output and generates bundle size report.
 * Run after building to identify large chunks and optimization opportunities.
 * 
 * Usage: node scripts/analyze-bundle.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DIST_DIR = join(__dirname, '../dist');
const REPORT_FILE = join(__dirname, '../bundle-report.json');

// Size thresholds (in KB)
const THRESHOLDS = {
  CRITICAL: 500,  // Critical - must investigate
  WARNING: 250,   // Warning - should optimize
  OK: 100,        // OK - monitor
};

function analyzeBundle() {
  console.log('📊 Analyzing bundle...\n');

  if (!existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Run `npm run build` first.');
    process.exit(1);
  }

  const results = {
    timestamp: new Date().toISOString(),
    totalSize: 0,
    files: [],
    chunks: {
      critical: [],
      warning: [],
      ok: [],
    },
    summary: {
      totalFiles: 0,
      largestFile: null,
      averageSize: 0,
    },
  };

  function getFiles(dir, fileList = []) {
    const files = readdirSync(dir);
    
    files.forEach(file => {
      const filePath = join(dir, file);
      const stat = statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.')) {
          getFiles(filePath, fileList);
        }
      } else if (file.endsWith('.js') || file.endsWith('.css')) {
        const size = stat.size;
        const sizeKB = (size / 1024).toFixed(2);
        const relativePath = filePath.replace(DIST_DIR, '').replace(/\\/g, '/');
        
        const fileData = {
          path: relativePath,
          size: size,
          sizeKB: parseFloat(sizeKB),
          type: file.endsWith('.js') ? 'JavaScript' : 'CSS',
        };
        
        results.totalSize += size;
        results.files.push(fileData);
        
        // Categorize by size
        if (fileData.sizeKB > THRESHOLDS.CRITICAL) {
          results.chunks.critical.push(fileData);
        } else if (fileData.sizeKB > THRESHOLDS.WARNING) {
          results.chunks.warning.push(fileData);
        } else {
          results.chunks.ok.push(fileData);
        }
        
        fileList.push(fileData);
      }
    });
    
    return fileList;
  }

  const allFiles = getFiles(DIST_DIR);
  
  // Calculate summary
  results.summary.totalFiles = allFiles.length;
  results.summary.averageSize = results.totalSize / allFiles.length;
  results.summary.largestFile = allFiles.reduce((prev, current) => 
    prev.size > current.size ? prev : current
  );

  // Save report
  writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));

  // Print report
  console.log('📦 Bundle Analysis Report\n');
  console.log(`Total Size: ${(results.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total Files: ${results.summary.totalFiles}`);
  console.log(`Average Size: ${(results.summary.averageSize / 1024).toFixed(2)} KB\n`);

  // Critical chunks
  if (results.chunks.critical.length > 0) {
    console.log(`🔴 CRITICAL (>${THRESHOLDS.CRITICAL}KB): ${results.chunks.critical.length} files`);
    results.chunks.critical.forEach(file => {
      console.log(`   ${file.path.substring(1)}: ${file.sizeKB} KB`);
    });
    console.log('');
  }

  // Warning chunks
  if (results.chunks.warning.length > 0) {
    console.log(`🟡 WARNING (${THRESHOLDS.OK}-${THRESHOLDS.CRITICAL}KB): ${results.chunks.warning.length} files`);
    results.chunks.warning.slice(0, 10).forEach(file => {
      console.log(`   ${file.path.substring(1)}: ${file.sizeKB} KB`);
    });
    if (results.chunks.warning.length > 10) {
      console.log(`   ... and ${results.chunks.warning.length - 10} more`);
    }
    console.log('');
  }

  console.log(`✅ OK (<${THRESHOLDS.OK}KB): ${results.chunks.ok.length} files\n`);

  // Largest files
  console.log('📊 Top 10 Largest Files:');
  allFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 10)
    .forEach((file, index) => {
      console.log(`${index + 1}. ${file.path.substring(1)}: ${file.sizeKB} KB`);
    });

  console.log(`\n📄 Full report saved to: bundle-report.json`);

  // Exit with error if critical files exist
  if (results.chunks.critical.length > 0) {
    console.log(`\n⚠️  WARNING: ${results.chunks.critical.length} file(s) exceed ${THRESHOLDS.CRITICAL}KB threshold!`);
    console.log('   Consider code splitting or optimization.');
    process.exit(1);
  }

  console.log('\n✅ Bundle analysis complete!');
}

// Run analysis
try {
  analyzeBundle();
} catch (error) {
  console.error('❌ Error analyzing bundle:', error);
  process.exit(1);
}


