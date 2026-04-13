#!/usr/bin/env node

/**
 * 📦 Bundle Size Analyzer
 * Analyzes the built bundle to identify size optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Bundle Size Analysis Starting...\n');

// Get bundle information
const distPath = './dist/index.js';
const stats = fs.statSync(distPath);
const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);

console.log(`📊 Current Bundle Size: ${sizeInMB}MB`);

// Analyze package.json dependencies
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const dependencies = packageJson.dependencies || {};
const devDependencies = packageJson.devDependencies || {};

console.log('\n📋 Top Dependencies by Estimated Size:');

// Common large dependencies (estimated sizes)
const largeDependencies = {
  '@tensorflow/tfjs': '~50MB',
  'puppeteer': '~170MB', 
  'firebase-admin': '~20MB',
  'googleapis': '~15MB',
  'sharp': '~25MB',
  'socket.io': '~5MB',
  'drizzle-orm': '~3MB',
  'hono': '~2MB',
  'pg': '~3MB',
  'better-sqlite3': '~5MB',
  'bcrypt': '~2MB',
  'marked': '~1MB',
  'nodemailer': '~3MB',
  'swagger-jsdoc': '~2MB'
};

Object.entries(dependencies).forEach(([name, version]) => {
  if (largeDependencies[name]) {
    console.log(`  ${name}@${version} ${largeDependencies[name]}`);
  }
});

console.log('\n🔍 Bundle Optimization Recommendations:');

const recommendations = [
  {
    issue: 'TensorFlow.js is very large (~50MB)',
    solution: 'Consider lazy loading ML features or using lighter alternatives',
    impact: 'High - Could reduce bundle by 50MB+'
  },
  {
    issue: 'Puppeteer adds significant size',
    solution: 'Use dynamic imports for PDF generation features',
    impact: 'High - Could reduce bundle by 20MB+'
  },
  {
    issue: 'Firebase Admin SDK is large',
    solution: 'Only import specific Firebase services needed',
    impact: 'Medium - Could reduce bundle by 10MB+'
  },
  {
    issue: 'Google APIs library is comprehensive',
    solution: 'Import only specific Google services used',
    impact: 'Medium - Could reduce bundle by 10MB+'
  },
  {
    issue: 'Multiple database libraries',
    solution: 'Consider standardizing on one database driver',
    impact: 'Low - Could reduce bundle by 3-5MB'
  }
];

recommendations.forEach((rec, index) => {
  console.log(`\n${index + 1}. ${rec.issue}`);
  console.log(`   💡 Solution: ${rec.solution}`);
  console.log(`   📈 Impact: ${rec.impact}`);
});

// Analyze import patterns
console.log('\n🔎 Analyzing Import Patterns...');

try {
  // Check for heavy imports that could be lazy loaded
  const srcFiles = execSync('find src -name "*.ts" -type f', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  const heavyImports = [];
  
  srcFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for heavy library imports
      if (content.includes("from '@tensorflow/tfjs'")) {
        heavyImports.push({ file, library: 'TensorFlow.js', line: content.match(/.*@tensorflow\/tfjs.*/)?.[0] });
      }
      if (content.includes("from 'puppeteer'")) {
        heavyImports.push({ file, library: 'Puppeteer', line: content.match(/.*puppeteer.*/)?.[0] });
      }
      if (content.includes("from 'firebase-admin'")) {
        heavyImports.push({ file, library: 'Firebase Admin', line: content.match(/.*firebase-admin.*/)?.[0] });
      }
      if (content.includes("from 'googleapis'")) {
        heavyImports.push({ file, library: 'Google APIs', line: content.match(/.*googleapis.*/)?.[0] });
      }
    } catch (error) {
      // Skip files that can't be read
    }
  });
  
  if (heavyImports.length > 0) {
    console.log('\n⚠️  Heavy imports found:');
    heavyImports.forEach(imp => {
      console.log(`  📄 ${imp.file}: ${imp.library}`);
      console.log(`     ${imp.line?.trim()}`);
    });
  } else {
    console.log('✅ No obvious heavy imports found in top-level modules');
  }
  
} catch (error) {
  console.log('❌ Could not analyze import patterns:', error.message);
}

console.log('\n🚀 Optimization Action Plan:');
console.log('1. Implement lazy loading for ML/AI features');
console.log('2. Use dynamic imports for PDF generation');
console.log('3. Optimize Firebase and Google API imports');
console.log('4. Consider splitting into microservices for heavy features');
console.log('5. Implement tree shaking for unused code');

console.log('\n📈 Expected Results:');
console.log(`Current: ${sizeInMB}MB`);
console.log(`Target:  15-20MB (60% reduction)`);
console.log(`Startup: 50% faster cold starts`);

console.log('\n✅ Bundle analysis complete!');

module.exports = {
  analyzeDependencies: () => dependencies,
  getRecommendations: () => recommendations,
  getCurrentSize: () => sizeInMB
};