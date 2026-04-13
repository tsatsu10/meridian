#!/usr/bin/env node

/**
 * Bundle Optimizer Script
 * Analyzes and optimizes bundle size to meet Phase 1 targets
 * Target: <500KB initial bundle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DIST_DIR = path.join(__dirname, '../dist');
const PACKAGE_JSON = path.join(__dirname, '../package.json');
const OPTIMIZATION_REPORT = path.join(__dirname, '../bundle-optimization-report.json');

function analyzeBundleSize() {
  console.log('🔍 Analyzing bundle for optimization...\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  const files = [];
  const totalSize = { size: 0, gzipped: 0 };

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
        const gzippedSize = estimateGzippedSize(size);
        
        files.push({
          path: relativeItemPath,
          size,
          gzippedSize,
          formattedSize: formatBytes(size),
          formattedGzipped: formatBytes(gzippedSize)
        });
        
        totalSize.size += size;
        totalSize.gzipped += gzippedSize;
      }
    }
  }

  scanDirectory(DIST_DIR);

  // Sort by size (largest first)
  files.sort((a, b) => b.size - a.size);

  return { files, totalSize };
}

function estimateGzippedSize(size) {
  // Rough estimation: JS files compress ~70%, CSS ~80%, others ~50%
  return Math.round(size * 0.7);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeDependencies() {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Heavy dependencies that could be optimized
  const heavyDeps = [
    '@react-three/fiber',
    '@react-three/drei',
    'three',
    'framer-motion',
    'recharts',
    '@tiptap/react',
    '@tiptap/starter-kit',
    'socket.io-client',
    'react-dnd',
    'react-dnd-html5-backend'
  ];

  const foundHeavyDeps = heavyDeps.filter(dep => dependencies[dep]);
  
  return { dependencies, foundHeavyDeps };
}

function generateOptimizationPlan(bundleAnalysis, depsAnalysis) {
  const { files, totalSize } = bundleAnalysis;
  const { foundHeavyDeps } = depsAnalysis;
  
  const targetSize = 500 * 1024; // 500KB
  const currentSize = totalSize.size;
  const reductionNeeded = currentSize - targetSize;
  const reductionPercentage = (reductionNeeded / currentSize) * 100;

  const optimizationPlan = {
    currentState: {
      totalSize: formatBytes(currentSize),
      gzippedSize: formatBytes(totalSize.gzipped),
      targetSize: formatBytes(targetSize),
      reductionNeeded: formatBytes(reductionNeeded),
      reductionPercentage: reductionPercentage.toFixed(1) + '%'
    },
    largestFiles: files.slice(0, 10).map(file => ({
      path: file.path,
      size: file.formattedSize,
      gzipped: file.formattedGzipped,
      percentage: ((file.size / currentSize) * 100).toFixed(1) + '%'
    })),
    heavyDependencies: foundHeavyDeps,
    optimizationStrategies: [
      {
        strategy: 'Remove Heavy Dependencies',
        description: 'Replace or lazy-load heavy dependencies',
        dependencies: foundHeavyDeps,
        estimatedReduction: '60-80% of bundle size'
      },
      {
        strategy: 'Code Splitting',
        description: 'Implement route-based code splitting',
        estimatedReduction: '40-60% initial load'
      },
      {
        strategy: 'Tree Shaking',
        description: 'Remove unused code from dependencies',
        estimatedReduction: '20-30% of bundle size'
      },
      {
        strategy: 'Import Optimization',
        description: 'Use specific imports instead of full packages',
        estimatedReduction: '15-25% of bundle size'
      },
      {
        strategy: 'Asset Optimization',
        description: 'Optimize images, fonts, and other assets',
        estimatedReduction: '10-20% of bundle size'
      }
    ],
    immediateActions: [
      'Remove @react-three/fiber and @react-three/drei (if not used)',
      'Lazy load framer-motion animations',
      'Replace recharts with lighter charting library',
      'Optimize TipTap editor imports',
      'Implement better code splitting for routes'
    ]
  };

  return optimizationPlan;
}

function main() {
  console.log('🚀 Bundle Optimizer - Phase 1 Target: <500KB\n');

  // Analyze current bundle
  const bundleAnalysis = analyzeBundleSize();
  const depsAnalysis = analyzeDependencies();
  const optimizationPlan = generateOptimizationPlan(bundleAnalysis, depsAnalysis);

  // Save optimization report
  fs.writeFileSync(OPTIMIZATION_REPORT, JSON.stringify(optimizationPlan, null, 2));

  // Console output
  console.log('📊 Current Bundle Analysis:');
  console.log('============================');
  console.log(`📦 Total Size: ${optimizationPlan.currentState.totalSize}`);
  console.log(`🗜️  Gzipped Size: ${optimizationPlan.currentState.gzippedSize}`);
  console.log(`🎯 Target Size: ${optimizationPlan.currentState.targetSize}`);
  console.log(`📉 Reduction Needed: ${optimizationPlan.currentState.reductionNeeded} (${optimizationPlan.currentState.reductionPercentage})\n`);

  console.log('📋 Largest Files:');
  console.log('=================');
  optimizationPlan.largestFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${file.path}: ${file.size} (${file.gzipped} gzipped) - ${file.percentage}`);
  });

  console.log('\n⚠️  Heavy Dependencies Found:');
  console.log('============================');
  optimizationPlan.heavyDependencies.forEach(dep => {
    console.log(`• ${dep}`);
  });

  console.log('\n🚀 Optimization Strategies:');
  console.log('===========================');
  optimizationPlan.optimizationStrategies.forEach((strategy, index) => {
    console.log(`${index + 1}. ${strategy.strategy}: ${strategy.description}`);
    console.log(`   Estimated Reduction: ${strategy.estimatedReduction}`);
  });

  console.log('\n⚡ Immediate Actions:');
  console.log('=====================');
  optimizationPlan.immediateActions.forEach((action, index) => {
    console.log(`${index + 1}. ${action}`);
  });

  console.log('\n✅ Optimization report saved to:', OPTIMIZATION_REPORT);

  // Check if target is achievable
  const isAchievable = optimizationPlan.currentState.reductionPercentage < 90;
  
  console.log('\n🎯 Target Achievement:');
  console.log('=====================');
  console.log(`Bundle Size Target: ${isAchievable ? '✅ ACHIEVABLE' : '❌ CHALLENGING'}`);
  console.log(`Current: ${optimizationPlan.currentState.totalSize} | Target: ${optimizationPlan.currentState.targetSize}`);
  
  if (isAchievable) {
    console.log('\n💡 With the optimization strategies above, the 500KB target is achievable!');
  } else {
    console.log('\n⚠️  The 500KB target is challenging. Consider:');
    console.log('   • Removing heavy 3D libraries');
    console.log('   • Using lighter alternatives');
    console.log('   • Implementing progressive loading');
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { analyzeBundleSize, analyzeDependencies, generateOptimizationPlan }; 