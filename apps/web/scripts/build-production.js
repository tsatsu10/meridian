#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Production Build Script for Meridian Web Frontend
 * 
 * This script:
 * 1. Validates production environment
 * 2. Optimizes build configuration
 * 3. Builds with production settings
 * 4. Analyzes bundle size
 * 5. Generates deployment assets
 */

class ProductionBuilder {
  constructor() {
    this.rootDir = process.cwd();
    this.distDir = path.join(this.rootDir, 'dist');
    this.envFile = path.join(this.rootDir, '.env.production');
    this.packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf-8'));
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
  }

  checkEnvironment() {
    this.log('Checking production environment...', 'info');
    
    // Check if .env.production exists
    if (!fs.existsSync(this.envFile)) {
      this.log('.env.production not found. Creating from template...', 'warning');
      const templateFile = path.join(this.rootDir, '.env.production.template');
      if (fs.existsSync(templateFile)) {
        fs.copyFileSync(templateFile, this.envFile);
        this.log('Created .env.production from template', 'success');
        this.log('Please update .env.production with your production values', 'warning');
      } else {
        this.log('No .env.production template found', 'error');
        throw new Error('Environment file missing');
      }
    }
    
    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
    if (majorVersion < 18) {
      this.log(`Node.js ${nodeVersion} detected. Node 18+ recommended for production`, 'warning');
    } else {
      this.log(`Node.js ${nodeVersion} - good for production`, 'success');
    }
    
    // Check dependencies
    try {
      execSync('npm list --depth=0 --production', { stdio: 'pipe' });
      this.log('Production dependencies verified', 'success');
    } catch (error) {
      this.log('Some production dependencies missing. Running npm install...', 'warning');
      execSync('npm install --production', { stdio: 'inherit' });
    }
  }

  cleanBuildDirectory() {
    this.log('Cleaning build directory...', 'info');
    if (fs.existsSync(this.distDir)) {
      fs.rmSync(this.distDir, { recursive: true, force: true });
    }
    this.log('Build directory cleaned', 'success');
  }

  validateStoreConsolidation() {
    this.log('Validating store consolidation...', 'info');
    
    const consolidatedStorePath = path.join(this.rootDir, 'src/store/consolidated');
    if (!fs.existsSync(consolidatedStorePath)) {
      throw new Error('Consolidated stores not found. Run store migration first.');
    }
    
    const expectedStores = ['ui.ts', 'tasks.ts', 'communication.ts', 'settings.ts', 'cache.ts', 'teams.ts'];
    const missingStores = expectedStores.filter(store => 
      !fs.existsSync(path.join(consolidatedStorePath, store))
    );
    
    if (missingStores.length > 0) {
      throw new Error(`Missing consolidated stores: ${missingStores.join(', ')}`);
    }
    
    this.log('Store consolidation validated', 'success');
  }

  optimizeBuildConfig() {
    this.log('Optimizing build configuration...', 'info');
    
    // Check if production Vite config exists
    const prodConfigPath = path.join(this.rootDir, 'vite.config.production.ts');
    if (fs.existsSync(prodConfigPath)) {
      this.log('Using production-optimized Vite configuration', 'success');
      return '--config vite.config.production.ts';
    } else {
      this.log('Using default Vite configuration', 'warning');
      return '';
    }
  }

  build() {
    this.log('Building for production...', 'info');
    
    const configFlag = this.optimizeBuildConfig();
    const buildCommand = `npm run build ${configFlag}`.trim();
    
    const startTime = Date.now();
    
    try {
      execSync(buildCommand, { 
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      });
      
      const buildTime = Date.now() - startTime;
      this.log(`Build completed in ${(buildTime / 1000).toFixed(2)}s`, 'success');
      
    } catch (error) {
      this.log('Build failed', 'error');
      throw error;
    }
  }

  analyzeBundleSize() {
    this.log('Analyzing bundle size...', 'info');
    
    if (!fs.existsSync(this.distDir)) {
      throw new Error('Build directory not found. Run build first.');
    }
    
    const assetsDir = path.join(this.distDir, 'assets');
    if (!fs.existsSync(assetsDir)) {
      this.log('No assets directory found', 'warning');
      return;
    }
    
    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    const cssFiles = files.filter(file => file.endsWith('.css'));
    
    let totalJsSize = 0;
    let totalCssSize = 0;
    
    console.log('\n📊 Bundle Analysis:');
    console.log('==================');
    
    // Analyze JavaScript files
    console.log('\nJavaScript Chunks:');
    jsFiles
      .map(file => {
        const filePath = path.join(assetsDir, file);
        const size = fs.statSync(filePath).size;
        totalJsSize += size;
        return { name: file, size };
      })
      .sort((a, b) => b.size - a.size)
      .forEach(({ name, size }) => {
        console.log(`  ${name.padEnd(40)} ${this.formatBytes(size)}`);
      });
    
    // Analyze CSS files
    if (cssFiles.length > 0) {
      console.log('\nCSS Files:');
      cssFiles.forEach(file => {
        const filePath = path.join(assetsDir, file);
        const size = fs.statSync(filePath).size;
        totalCssSize += size;
        console.log(`  ${file.padEnd(40)} ${this.formatBytes(size)}`);
      });
    }
    
    console.log('\nSummary:');
    console.log(`  Total JavaScript: ${this.formatBytes(totalJsSize)}`);
    console.log(`  Total CSS: ${this.formatBytes(totalCssSize)}`);
    console.log(`  Total Assets: ${this.formatBytes(totalJsSize + totalCssSize)}`);
    console.log(`  Estimated Gzip: ${this.formatBytes((totalJsSize + totalCssSize) * 0.3)}`);
    
    // Bundle size warnings
    if (totalJsSize > 2 * 1024 * 1024) { // 2MB
      this.log('JavaScript bundle is large (>2MB). Consider code splitting.', 'warning');
    }
    
    if (totalJsSize + totalCssSize > 3 * 1024 * 1024) { // 3MB
      this.log('Total bundle size is large (>3MB). Optimization recommended.', 'warning');
    } else {
      this.log('Bundle size is acceptable for production', 'success');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  generateBuildInfo() {
    this.log('Generating build information...', 'info');
    
    const buildInfo = {
      version: this.packageJson.version,
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      env: 'production',
      commit: this.getGitCommit(),
      storesMigrated: true,
      features: {
        pwa: true,
        serviceWorker: true,
        consolidatedStores: true,
        codesplitting: true,
      }
    };
    
    const buildInfoPath = path.join(this.distDir, 'build-info.json');
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    
    this.log('Build information generated', 'success');
  }

  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  generateDeploymentFiles() {
    this.log('Generating deployment files...', 'info');
    
    // Generate .htaccess for Apache
    const htaccess = `# Meridian Production - Apache Configuration
RewriteEngine On

# Handle Angular and React Router
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$">
  ExpiresActive on
  ExpiresDefault "access plus 1 year"
  Header set Cache-Control "public, immutable"
</FilesMatch>

# Security headers
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"

# Gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>`;
    
    fs.writeFileSync(path.join(this.distDir, '.htaccess'), htaccess);
    
    // Generate _redirects for Netlify
    const redirects = `# Meridian Production - Netlify Configuration
/*    /index.html   200

# API proxy (if needed)
/api/*  https://api.yourapp.com/api/:splat  200`;
    
    fs.writeFileSync(path.join(this.distDir, '_redirects'), redirects);
    
    // Generate robots.txt
    const robots = `User-agent: *
Allow: /

Sitemap: https://yourapp.com/sitemap.xml`;
    
    fs.writeFileSync(path.join(this.distDir, 'robots.txt'), robots);
    
    this.log('Deployment files generated', 'success');
  }

  async run() {
    try {
      this.log('🚀 Meridian Production Build', 'info');
      this.log('========================', 'info');
      
      this.checkEnvironment();
      this.cleanBuildDirectory();
      this.validateStoreConsolidation();
      this.build();
      this.analyzeBundleSize();
      this.generateBuildInfo();
      this.generateDeploymentFiles();
      
      this.log('', 'info');
      this.log('🎉 Production build complete!', 'success');
      this.log('', 'info');
      this.log('Build output: ./dist', 'info');
      this.log('Deploy: Upload dist/ contents to your web server', 'info');
      this.log('', 'info');
      
    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.run();
}

module.exports = ProductionBuilder;