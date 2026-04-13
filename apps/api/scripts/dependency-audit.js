#!/usr/bin/env node

/**
 * 🔍 Dependency Security Auditing System
 * 
 * Comprehensive security analysis for dependency management issues:
 * - Large dependency tree
 * - Potential security vulnerabilities
 * - Outdated packages
 * - License compliance
 * - Bundle size analysis
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Meridian API Dependency Security Audit\n');

// Read package.json for analysis
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Configuration
const CRITICAL_PACKAGES = new Set([
  'bcrypt', 'better-sqlite3', 'hono', '@hono/node-server', 
  'drizzle-orm', 'jsonwebtoken', 'zod', 'sharp'
]);

const SECURITY_SENSITIVE_PACKAGES = new Set([
  'bcrypt', 'jsonwebtoken', 'crypto', 'uuid', 'sharp',
  'nodemailer', 'firebase-admin', 'google-auth-library'
]);

const NATIVE_DEPENDENCIES = new Set([
  'bcrypt', 'better-sqlite3', 'sharp', 'canvas', 'nodemailer', 
  'ws', 'bindings', 'node-addon-api', 'node-forge', 
  'prebuild-install', 'protobufjs'
]);

// Analysis functions
function analyzeDependencyTree() {
  console.log('📊 Dependency Tree Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  
  const totalDeps = Object.keys(dependencies).length;
  const totalDevDeps = Object.keys(devDependencies).length;
  const totalPackages = totalDeps + totalDevDeps;
  
  console.log(`📦 Total Dependencies: ${totalDeps}`);
  console.log(`🔧 Total Dev Dependencies: ${totalDevDeps}`);
  console.log(`📋 Total Packages: ${totalPackages}`);
  
  // Analyze package categories
  const categories = {
    critical: [],
    security: [],
    native: [],
    ui: [],
    utility: [],
    build: []
  };
  
  Object.keys(dependencies).forEach(pkg => {
    if (CRITICAL_PACKAGES.has(pkg)) categories.critical.push(pkg);
    if (SECURITY_SENSITIVE_PACKAGES.has(pkg)) categories.security.push(pkg);
    if (NATIVE_DEPENDENCIES.has(pkg)) categories.native.push(pkg);
    if (pkg.includes('hono') || pkg.includes('react') || pkg.includes('ui')) categories.ui.push(pkg);
    if (pkg.includes('util') || pkg.includes('helper') || pkg.includes('lodash')) categories.utility.push(pkg);
  });
  
  Object.keys(devDependencies).forEach(pkg => {
    if (pkg.includes('esbuild') || pkg.includes('typescript') || pkg.includes('tsx')) categories.build.push(pkg);
  });
  
  console.log('\\n🏷️  Package Categories:');
  console.log(`   🔴 Critical Packages: ${categories.critical.length} (${categories.critical.join(', ')})`);
  console.log(`   🛡️  Security-Sensitive: ${categories.security.length} (${categories.security.join(', ')})`);
  console.log(`   ⚙️  Native Dependencies: ${categories.native.length} (${categories.native.join(', ')})`);
  console.log(`   🎨 UI/Framework: ${categories.ui.length} (${categories.ui.join(', ')})`);
  console.log(`   🔧 Build Tools: ${categories.build.length} (${categories.build.join(', ')})`);
  
  return {
    totalPackages,
    categories,
    riskLevel: totalPackages > 50 ? 'HIGH' : totalPackages > 30 ? 'MEDIUM' : 'LOW'
  };
}

function analyzeSecurityVulnerabilities() {
  console.log('\\n🛡️  Security Vulnerability Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Run npm audit
    const auditResult = execSync('npm audit --json', { 
      cwd: path.dirname(packageJsonPath),
      encoding: 'utf8' 
    });
    
    const audit = JSON.parse(auditResult);
    
    console.log(`🚨 Vulnerabilities Found: ${audit.metadata.vulnerabilities.total}`);
    console.log(`   Critical: ${audit.metadata.vulnerabilities.critical || 0}`);
    console.log(`   High: ${audit.metadata.vulnerabilities.high || 0}`);
    console.log(`   Moderate: ${audit.metadata.vulnerabilities.moderate || 0}`);
    console.log(`   Low: ${audit.metadata.vulnerabilities.low || 0}`);
    
    if (audit.metadata.vulnerabilities.total > 0) {
      console.log('\\n📋 Vulnerability Details:');
      Object.entries(audit.advisories || {}).forEach(([id, advisory]) => {
        console.log(`   • ${advisory.title}`);
        console.log(`     Severity: ${advisory.severity.toUpperCase()}`);
        console.log(`     Package: ${advisory.module_name}`);
        console.log(`     Patched: ${advisory.patched_versions || 'No patch available'}`);
      });
    }
    
    return {
      total: audit.metadata.vulnerabilities.total,
      critical: audit.metadata.vulnerabilities.critical || 0,
      high: audit.metadata.vulnerabilities.high || 0,
      moderate: audit.metadata.vulnerabilities.moderate || 0,
      low: audit.metadata.vulnerabilities.low || 0
    };
    
  } catch (error) {
    console.log('⚠️  Could not run npm audit (this is expected if vulnerabilities exist)');
    
    // Parse error output for vulnerability info
    const errorOutput = error.stdout || error.message;
    if (errorOutput.includes('vulnerabilities')) {
      const vulnerabilityMatch = errorOutput.match(/(\\d+)\\s+\\w+\\s+severity/g);
      if (vulnerabilityMatch) {
        console.log('🚨 Vulnerabilities detected in error output:');
        vulnerabilityMatch.forEach(match => console.log(`   • ${match}`));
      }
    }
    
    return {
      total: 1, // Assume at least 1 vulnerability from error
      error: true
    };
  }
}

function analyzeOutdatedPackages() {
  console.log('\\n📦 Outdated Package Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const outdatedResult = execSync('npm outdated --json', { 
      cwd: path.dirname(packageJsonPath),
      encoding: 'utf8' 
    });
    
    const outdated = JSON.parse(outdatedResult);
    const outdatedPackages = Object.keys(outdated);
    
    console.log(`📋 Outdated Packages: ${outdatedPackages.length}`);
    
    if (outdatedPackages.length > 0) {
      console.log('\\n🔄 Update Recommendations:');
      
      const criticalOutdated = [];
      const securityOutdated = [];
      const minorOutdated = [];
      
      outdatedPackages.forEach(pkg => {
        const info = outdated[pkg];
        const currentVersion = info.current;
        const latestVersion = info.latest;
        
        if (CRITICAL_PACKAGES.has(pkg)) {
          criticalOutdated.push({ pkg, currentVersion, latestVersion });
        } else if (SECURITY_SENSITIVE_PACKAGES.has(pkg)) {
          securityOutdated.push({ pkg, currentVersion, latestVersion });
        } else {
          minorOutdated.push({ pkg, currentVersion, latestVersion });
        }
      });
      
      if (criticalOutdated.length > 0) {
        console.log('\\n   🔴 CRITICAL UPDATES (Update Immediately):');
        criticalOutdated.forEach(({ pkg, currentVersion, latestVersion }) => {
          console.log(`      ${pkg}: ${currentVersion} → ${latestVersion}`);
        });
      }
      
      if (securityOutdated.length > 0) {
        console.log('\\n   🛡️  SECURITY UPDATES (High Priority):');
        securityOutdated.forEach(({ pkg, currentVersion, latestVersion }) => {
          console.log(`      ${pkg}: ${currentVersion} → ${latestVersion}`);
        });
      }
      
      if (minorOutdated.length > 0) {
        console.log('\\n   📝 MINOR UPDATES (Normal Priority):');
        minorOutdated.slice(0, 10).forEach(({ pkg, currentVersion, latestVersion }) => {
          console.log(`      ${pkg}: ${currentVersion} → ${latestVersion}`);
        });
        if (minorOutdated.length > 10) {
          console.log(`      ... and ${minorOutdated.length - 10} more packages`);
        }
      }
    }
    
    return {
      total: outdatedPackages.length,
      critical: criticalOutdated?.length || 0,
      security: securityOutdated?.length || 0,
      minor: minorOutdated?.length || 0
    };
    
  } catch (error) {
    console.log('✅ All packages are up to date or npm outdated failed');
    return { total: 0 };
  }
}

function analyzeLicenseCompliance() {
  console.log('\\n📄 License Compliance Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Common license categories
  const licenseCategories = {
    permissive: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
    copyleft: ['GPL-2.0', 'GPL-3.0', 'LGPL-2.1', 'LGPL-3.0'],
    restrictive: ['AGPL-3.0', 'SSPL'],
    unknown: []
  };
  
  console.log('📋 License Analysis (Note: Detailed license scanning requires additional tools)');
  console.log('   This is a basic analysis. For production use, consider tools like:');
  console.log('   • license-checker');
  console.log('   • npm-license-crawler');
  console.log('   • FOSSA');
  console.log('   • WhiteSource');
  
  console.log('\\n🏷️  Common Licenses Expected:');
  console.log('   ✅ MIT (Most packages) - Permissive, commercial-friendly');
  console.log('   ✅ Apache-2.0 - Permissive with patent protection');
  console.log('   ✅ BSD-3-Clause - Permissive');
  console.log('   ⚠️  GPL-* - Copyleft, may require source disclosure');
  console.log('   ❌ AGPL-3.0 - Strong copyleft, may restrict SaaS use');
  
  return {
    analyzed: Object.keys(dependencies).length,
    recommendation: 'Run license-checker for detailed analysis'
  };
}

function analyzeBundleSize() {
  console.log('\\n📦 Bundle Size Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // Check if dist directory exists
    const distPath = path.join(path.dirname(packageJsonPath), 'dist');
    if (fs.existsSync(distPath)) {
      const files = fs.readdirSync(distPath);
      let totalSize = 0;
      
      files.forEach(file => {
        const filePath = path.join(distPath, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        console.log(`   📄 ${file}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      });
      
      console.log(`\\n📊 Total Bundle Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      
      const sizeCategory = totalSize > 100 * 1024 * 1024 ? 'LARGE' : 
                          totalSize > 50 * 1024 * 1024 ? 'MEDIUM' : 'SMALL';
      
      console.log(`📈 Bundle Size Category: ${sizeCategory}`);
      
      if (sizeCategory === 'LARGE') {
        console.log('\\n⚠️  Large bundle detected. Consider:');
        console.log('   • Tree shaking optimization');
        console.log('   • Code splitting');
        console.log('   • Dynamic imports');
        console.log('   • Bundle analysis tools');
      }
      
      return {
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        category: sizeCategory,
        files: files.length
      };
    } else {
      console.log('📋 No dist directory found. Run build first for bundle analysis.');
      return { error: 'No build found' };
    }
  } catch (error) {
    console.log('⚠️  Error analyzing bundle size:', error.message);
    return { error: error.message };
  }
}

function generateRecommendations(analyses) {
  console.log('\\n🎯 Security Recommendations');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const recommendations = [];
  
  // Dependency tree recommendations
  if (analyses.dependencyTree.riskLevel === 'HIGH') {
    recommendations.push({
      priority: 'HIGH',
      category: 'Dependency Management',
      issue: 'Large dependency tree detected',
      action: 'Review and remove unused dependencies',
      impact: 'Reduced attack surface, faster builds'
    });
  }
  
  // Security vulnerability recommendations
  if (analyses.vulnerabilities.total > 0) {
    if (analyses.vulnerabilities.critical > 0 || analyses.vulnerabilities.high > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Security',
        issue: `${analyses.vulnerabilities.critical + analyses.vulnerabilities.high} critical/high vulnerabilities`,
        action: 'Update vulnerable packages immediately',
        impact: 'Prevents security exploitation'
      });
    }
    
    if (analyses.vulnerabilities.moderate > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        issue: `${analyses.vulnerabilities.moderate} moderate vulnerabilities`,
        action: 'Schedule updates for moderate vulnerabilities',
        impact: 'Reduces security risk'
      });
    }
  }
  
  // Outdated package recommendations
  if (analyses.outdated.critical > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Maintenance',
      issue: `${analyses.outdated.critical} critical packages outdated`,
      action: 'Update critical packages immediately',
      impact: 'Security fixes, performance improvements'
    });
  }
  
  // Bundle size recommendations
  if (analyses.bundleSize.category === 'LARGE') {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Performance',
      issue: 'Large bundle size detected',
      action: 'Implement bundle optimization strategies',
      impact: 'Faster deployment, reduced memory usage'
    });
  }
  
  // General recommendations
  recommendations.push({
    priority: 'MEDIUM',
    category: 'Automation',
    issue: 'Manual dependency monitoring',
    action: 'Implement automated dependency scanning',
    impact: 'Proactive security monitoring'
  });
  
  recommendations.push({
    priority: 'LOW',
    category: 'Documentation',
    issue: 'Dependency documentation',
    action: 'Document dependency update procedures',
    impact: 'Improved maintenance processes'
  });
  
  // Sort by priority
  const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  console.log('\\n📋 Prioritized Action Items:');
  recommendations.forEach((rec, index) => {
    const priorityIcon = rec.priority === 'CRITICAL' ? '🚨' : 
                        rec.priority === 'HIGH' ? '⚠️' : 
                        rec.priority === 'MEDIUM' ? '💡' : '📝';
    
    console.log(`\\n   ${index + 1}. ${priorityIcon} ${rec.priority} - ${rec.category}`);
    console.log(`      Issue: ${rec.issue}`);
    console.log(`      Action: ${rec.action}`);
    console.log(`      Impact: ${rec.impact}`);
  });
  
  return recommendations;
}

function generateSecurityReport(analyses, recommendations) {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(path.dirname(packageJsonPath), 'DEPENDENCY_SECURITY_REPORT.md');
  
  const report = `# 🔍 Dependency Security Audit Report

Generated: ${timestamp}

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Dependencies | ${analyses.dependencyTree.totalPackages} | ${analyses.dependencyTree.riskLevel} RISK |
| Security Vulnerabilities | ${analyses.vulnerabilities.total} | ${analyses.vulnerabilities.total > 0 ? '⚠️ ATTENTION NEEDED' : '✅ CLEAN'} |
| Outdated Packages | ${analyses.outdated.total} | ${analyses.outdated.total > 10 ? '📈 HIGH' : '✅ MANAGEABLE'} |
| Bundle Size | ${analyses.bundleSize.totalSizeMB || 'N/A'} MB | ${analyses.bundleSize.category || 'N/A'} |

## Security Risk Assessment

### 🔴 Critical Issues (${recommendations.filter(r => r.priority === 'CRITICAL').length})
${recommendations.filter(r => r.priority === 'CRITICAL').map(r => `- ${r.issue}: ${r.action}`).join('\\n') || 'None'}

### ⚠️ High Priority Issues (${recommendations.filter(r => r.priority === 'HIGH').length})
${recommendations.filter(r => r.priority === 'HIGH').map(r => `- ${r.issue}: ${r.action}`).join('\\n') || 'None'}

### 💡 Medium Priority Issues (${recommendations.filter(r => r.priority === 'MEDIUM').length})
${recommendations.filter(r => r.priority === 'MEDIUM').map(r => `- ${r.issue}: ${r.action}`).join('\\n') || 'None'}

## Dependency Breakdown

- **Critical Packages**: ${analyses.dependencyTree.categories.critical.length}
- **Security-Sensitive**: ${analyses.dependencyTree.categories.security.length}
- **Native Dependencies**: ${analyses.dependencyTree.categories.native.length}

## Immediate Actions Required

1. **Security Updates**: Update packages with critical/high vulnerabilities
2. **Dependency Review**: Remove unused dependencies
3. **Monitoring Setup**: Implement automated dependency scanning
4. **Documentation**: Update dependency management procedures

## Next Security Audit: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}

---
*This report was generated by the Meridian Dependency Security Auditing System*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`\\n📄 Security report generated: ${reportPath}`);
}

// Main execution
async function runDependencyAudit() {
  try {
    const analyses = {
      dependencyTree: analyzeDependencyTree(),
      vulnerabilities: analyzeSecurityVulnerabilities(),
      outdated: analyzeOutdatedPackages(),
      licenses: analyzeLicenseCompliance(),
      bundleSize: analyzeBundleSize()
    };
    
    const recommendations = generateRecommendations(analyses);
    generateSecurityReport(analyses, recommendations);
    
    console.log('\\n✅ Dependency Security Audit Complete!');
    console.log('🎯 Key Findings:');
    console.log(`   • ${analyses.dependencyTree.totalPackages} total packages (${analyses.dependencyTree.riskLevel} risk)`);
    console.log(`   • ${analyses.vulnerabilities.total} security vulnerabilities`);
    console.log(`   • ${analyses.outdated.total} outdated packages`);
    console.log(`   • ${recommendations.filter(r => r.priority === 'CRITICAL' || r.priority === 'HIGH').length} high-priority actions needed`);
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  }
}

runDependencyAudit();