#!/usr/bin/env node

/**
 * 🔧 Native Dependency Detection Script
 * 
 * Automatically detects native/binary dependencies that need to be externalized
 * during esbuild bundling to prevent build failures.
 */

const fs = require('fs');
const path = require('path');

// Known native dependencies that require externalization
const KNOWN_NATIVE_DEPS = new Set([
  'bcrypt', 
  'pg',
  'postgres',
  'sharp',
  'canvas',
  'node-gyp',
  'leveldown',
  'fsevents',
  'chokidar',
  'nodemailer',
  'argon2',
  'scrypt',
  'node-sass',
  'fibers',
  'deasync',
  'ref-napi',
  'ffi-napi',
  'grpc',
  '@grpc/grpc-js',
  'protobufjs',
  'node-rdkafka',
  'pg-native',
  'mysql',
  'mysql2',
  'oracledb',
  'tedious',
  'mongodb-client-encryption',
  'kerberos',
  'bson-ext',
  'hiredis',
  'ioredis',
  'redis',
  'websocket',
  'ws',
  'uws',
  'node-expat',
  'xml2js',
  'libxmljs',
  'node-libcurl',
  'node-forge',
  'ursa',
  'node-rsa',
  'keytar',
  'electron',
  'robotjs',
  'node-hid',
  'serialport',
  'usb',
  'bluetooth-hci-socket',
  'node-bluetooth',
  'node-printer',
  'node-thermal-printer',
  'phantomjs-prebuilt',
  'puppeteer',
  'playwright',
  'chromedriver',
  'geckodriver',
  'iedriver',
  'appium',
  'wdio-chromedriver-service',
  'node-notifier',
  'node-speaker',
  'node-record-lpcm16',
  'node-wav',
  'node-lame',
  'node-ffmpeg',
  'fluent-ffmpeg',
  'gm',
  'imagemagick',
  'node-imagemagick',
  'pdfkit',
  'hummus-recipe',
  'pdf2pic',
  'node-pdf',
  'node-zip',
  'yauzl',
  'yazl',
  'archiver',
  'tar',
  'node-7z',
  'node-rar',
  'node-stream-zip',
  'ftp',
  'ssh2',
  'node-sftp',
  'telnet-client',
  'ping',
  'tcpping',
  'raw-socket',
  'pcap',
  'cap',
  'node-pcap',
  'winreg',
  'registry-js',
  'ref',
  'ffi',
  'weak',
  'weak-napi',
  'bindings',
  'node-pre-gyp',
  'prebuild',
  'prebuild-install',
  'node-addon-api',
  'nan',
  'napi-macros',
  'node-api-headers'
]);

// File extensions that indicate native code
const NATIVE_FILE_EXTENSIONS = [
  '.node',
  '.dll',
  '.so',
  '.dylib',
  '.a',
  '.lib',
  '.gyp',
  '.gypi'
];

// Directory patterns that indicate native dependencies
const NATIVE_DIR_PATTERNS = [
  'build',
  'binding',
  'prebuilds',
  'bin',
  'lib',
  'deps',
  'src',
  'native'
];

/**
 * Load and parse package.json
 */
function loadPackageJson(packagePath) {
  try {
    const content = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load package.json from ${packagePath}:`, error.message);
    return null;
  }
}

/**
 * Check if a package has native binary files
 */
function hasNativeBinaries(packagePath) {
  try {
    // First check for direct native files
    const files = fs.readdirSync(packagePath, { withFileTypes: true });
    
    // Look for .node files specifically (most reliable indicator)
    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.node')) {
        return true;
      }
    }
    
    // Check for build/binding directories that contain .node files
    const nativeDirs = ['build', 'binding', 'prebuilds', 'bin'];
    for (const dirName of nativeDirs) {
      const dirPath = path.join(packagePath, dirName);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        if (hasNodeFilesRecursive(dirPath, 2)) { // Max depth 2
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Recursively check for .node files with depth limit
 */
function hasNodeFilesRecursive(dirPath, maxDepth) {
  if (maxDepth <= 0) return false;
  
  try {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      
      if (file.isFile() && file.name.endsWith('.node')) {
        return true;
      } else if (file.isDirectory() && maxDepth > 1) {
        if (hasNodeFilesRecursive(fullPath, maxDepth - 1)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if package.json indicates native dependencies
 */
function hasNativeIndicators(packageJson) {
  if (!packageJson) return false;
  
  // Check for native build scripts (be more specific)
  const scripts = packageJson.scripts || {};
  const scriptValues = Object.values(scripts).join(' ');
  
  const nativeScriptIndicators = [
    'node-gyp rebuild',
    'node-gyp configure',
    'prebuild --download',
    'binding.gyp',
    'npm rebuild'
  ];
  
  if (nativeScriptIndicators.some(indicator => scriptValues.includes(indicator))) {
    return true;
  }
  
  // Check dependencies for native build tools (more restrictive)
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies
  };
  
  const nativeDepIndicators = [
    'node-gyp',
    'prebuild-install',
    'node-pre-gyp',
    'bindings',
    'nan',
    'node-addon-api'
  ];
  
  // Only count if these are direct dependencies (not just in devDeps)
  const directDeps = { ...packageJson.dependencies };
  if (nativeDepIndicators.some(indicator => indicator in directDeps)) {
    return true;
  }
  
  // Check for gypfile or binding.gyp
  const hasGypFile = packageJson.gypfile !== undefined;
  
  return hasGypFile;
}

/**
 * Detect native dependencies in node_modules
 */
function detectNativeDependencies(projectPath = process.cwd()) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const nodeModulesPath = path.join(projectPath, 'node_modules');
  
  const mainPackageJson = loadPackageJson(packageJsonPath);
  if (!mainPackageJson) {
    console.error('Could not load main package.json');
    return [];
  }
  
  const allDependencies = {
    ...mainPackageJson.dependencies,
    ...mainPackageJson.devDependencies,
    ...mainPackageJson.peerDependencies,
    ...mainPackageJson.optionalDependencies
  };
  
  const nativeDeps = [];
  
  console.log('🔍 Scanning dependencies for native packages...\n');
  
  // Get list of all installed packages (including indirect dependencies)
  const installedPackages = fs.existsSync(nodeModulesPath) 
    ? fs.readdirSync(nodeModulesPath).filter(name => !name.startsWith('.'))
    : [];
  
  // Combine direct dependencies with installed packages that are known natives
  const packagesToCheck = new Set([
    ...Object.keys(allDependencies),
    ...installedPackages.filter(pkg => KNOWN_NATIVE_DEPS.has(pkg))
  ]);
  
  // Check each dependency
  Array.from(packagesToCheck).forEach(depName => {
    const depPath = path.join(nodeModulesPath, depName);
    
    // Skip if package doesn't exist (might be optional)
    if (!fs.existsSync(depPath)) {
      return;
    }
    
    let isNative = false;
    let reason = '';
    
    // Check against known native dependencies
    if (KNOWN_NATIVE_DEPS.has(depName)) {
      isNative = true;
      reason = 'Known native dependency';
    }
    
    // Check for native binaries
    if (!isNative && hasNativeBinaries(depPath)) {
      isNative = true;
      reason = 'Contains native binaries';
    }
    
    // Check package.json for native indicators
    if (!isNative) {
      const depPackageJson = loadPackageJson(path.join(depPath, 'package.json'));
      if (hasNativeIndicators(depPackageJson)) {
        isNative = true;
        reason = 'Package.json indicates native build';
      }
    }
    
    if (isNative) {
      nativeDeps.push({
        name: depName,
        version: allDependencies[depName] || 'indirect dependency',
        reason,
        path: depPath
      });
      
      console.log(`📦 ${depName} (${reason})`);
    }
  });
  
  return nativeDeps;
}

/**
 * Generate esbuild external flags
 */
function generateExternalFlags(nativeDeps) {
  return nativeDeps.map(dep => `--external:${dep.name}`).join(' ');
}

/**
 * Update package.json build script with detected dependencies
 */
function updateBuildScript(projectPath, nativeDeps) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  const packageJson = loadPackageJson(packageJsonPath);
  
  if (!packageJson || !packageJson.scripts) {
    console.error('Could not update build script - package.json or scripts section not found');
    return false;
  }
  
  const externalFlags = generateExternalFlags(nativeDeps);
  
  // Update build script
  const currentBuildScript = packageJson.scripts.build || '';
  const baseBuildScript = 'esbuild src/index.ts --bundle --platform=node --outdir=dist --format=cjs';
  
  const newBuildScript = `${baseBuildScript} ${externalFlags}`;
  
  packageJson.scripts.build = newBuildScript;
  
  // Add info script for reference
  const depInfo = nativeDeps.map(dep => `${dep.name} (${dep.reason.toLowerCase()})`).join(', ');
  packageJson.scripts['build:info'] = `echo 'External dependencies: ${depInfo}'`;
  
  try {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    return true;
  } catch (error) {
    console.error('Failed to update package.json:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  // Parse arguments properly
  const args = process.argv.slice(2);
  const updateFlag = args.includes('--update');
  const projectPath = args.find(arg => !arg.startsWith('--')) || process.cwd();
  
  console.log('🔧 Native Dependency Detection for ESBuild\n');
  console.log(`Project path: ${projectPath}\n`);
  
  const nativeDeps = detectNativeDependencies(projectPath);
  
  console.log('\n📋 Detection Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (nativeDeps.length === 0) {
    console.log('✅ No native dependencies detected');
    console.log('💡 Standard esbuild bundling should work without external flags');
    return;
  }
  
  console.log(`🔍 Found ${nativeDeps.length} native dependencies:`);
  nativeDeps.forEach((dep, index) => {
    console.log(`   ${index + 1}. ${dep.name}@${dep.version}`);
    console.log(`      Reason: ${dep.reason}`);
  });
  
  console.log('\n🛠️  Recommended ESBuild Configuration:');
  const externalFlags = generateExternalFlags(nativeDeps);
  console.log(`   ${externalFlags}`);
  
  console.log('\n📝 Complete Build Command:');
  console.log(`   esbuild src/index.ts --bundle --platform=node --outdir=dist --format=cjs ${externalFlags}`);
  
  // Ask if user wants to update package.json
  console.log('\n🔄 Update package.json build script? (Run with --update flag)');
  
  if (updateFlag) {
    console.log('\n📝 Updating package.json...');
    const success = updateBuildScript(projectPath, nativeDeps);
    
    if (success) {
      console.log('✅ Successfully updated package.json build script');
      console.log('💡 Run "npm run build" to test the new configuration');
    } else {
      console.log('❌ Failed to update package.json');
    }
  }
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Test the build with: npm run build');
  console.log('   2. Verify externalized dependencies are available at runtime');
  console.log('   3. Add any additional native dependencies as needed');
  console.log('   4. Consider creating a pre-build hook for automatic detection');
}

// Export for programmatic use
module.exports = {
  detectNativeDependencies,
  generateExternalFlags,
  updateBuildScript,
  hasNativeBinaries,
  hasNativeIndicators,
  KNOWN_NATIVE_DEPS
};

// Run if called directly
if (require.main === module) {
  main();
}