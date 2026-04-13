#!/usr/bin/env node

/**
 * Vite WebSocket Connection Fix Script
 * 
 * This script diagnoses and fixes common Vite WebSocket connection issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Vite WebSocket Connection Diagnostic Tool\n');

function runCommand(command, description) {
  try {
    console.log(`⚡ ${description}`);
    const result = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`✅ Success: ${result.trim()}\n`);
    return result;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}\n`);
    return null;
  }
}

function checkPort(port) {
  try {
    const result = execSync(`netstat -an | findstr :${port}`, { encoding: 'utf-8' });
    return result.includes('LISTENING');
  } catch {
    return false;
  }
}

function main() {
  console.log('🔍 Step 1: Checking port availability...');
  
  if (checkPort(5173)) {
    console.log('✅ Port 5173 is available for Vite dev server\n');
  } else {
    console.log('❌ Port 5173 might be in use by another process\n');
    console.log('💡 Try killing the process or use a different port\n');
  }

  console.log('🔍 Step 2: Checking Node.js and npm versions...');
  runCommand('node --version', 'Node.js version');
  runCommand('npm --version', 'npm version');

  console.log('🔍 Step 3: Checking Vite installation...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const viteDep = packageJson.devDependencies?.vite || packageJson.dependencies?.vite;
    if (viteDep) {
      console.log(`✅ Vite version: ${viteDep}\n`);
    } else {
      console.log('❌ Vite not found in package.json\n');
    }
  } catch (error) {
    console.log('❌ Could not read package.json\n');
  }

  console.log('🔍 Step 4: Checking network configuration...');
  runCommand('ipconfig | findstr "IPv4"', 'Local IP addresses');

  console.log('🔧 Step 5: Attempting to fix common issues...');
  
  // Clear npm cache
  runCommand('npm cache clean --force', 'Clearing npm cache');
  
  // Clear Vite cache
  const viteCacheDir = path.join(__dirname, 'node_modules', '.vite');
  if (fs.existsSync(viteCacheDir)) {
    try {
      fs.rmSync(viteCacheDir, { recursive: true, force: true });
      console.log('✅ Cleared Vite cache\n');
    } catch (error) {
      console.log('❌ Could not clear Vite cache\n');
    }
  }

  console.log('🚀 Step 6: Suggested solutions...\n');
  
  console.log('💡 Solution 1: Restart Vite dev server');
  console.log('   npm run dev\n');
  
  console.log('💡 Solution 2: Use different port');
  console.log('   npm run dev -- --port 5174\n');
  
  console.log('💡 Solution 3: Clear browser cache and hard refresh');
  console.log('   Ctrl+Shift+R (or Cmd+Shift+R on Mac)\n');
  
  console.log('💡 Solution 4: Disable Windows Firewall temporarily');
  console.log('   Check if Windows Firewall is blocking WebSocket connections\n');
  
  console.log('💡 Solution 5: Check antivirus software');
  console.log('   Some antivirus programs block WebSocket connections\n');
  
  console.log('💡 Solution 6: Use localhost instead of 127.0.0.1');
  console.log('   Try accessing http://localhost:5173 instead of http://127.0.0.1:5173\n');

  console.log('🔧 Step 7: Alternative Vite configuration...');
  
  const alternativeConfig = `
// Alternative vite.config.ts for WebSocket issues
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: false,
    hmr: {
      overlay: false, // Disable error overlay if causing issues
      clientPort: 5173
    }
  }
})
  `;
  
  console.log('📝 Alternative vite.config.ts:\n');
  console.log(alternativeConfig);
  
  console.log('\n🎯 Most likely solutions:');
  console.log('1. Restart the Vite dev server');
  console.log('2. Clear browser cache and hard refresh');
  console.log('3. Check Windows Firewall settings');
  console.log('4. Try a different port if 5173 is problematic');
  
  console.log('\n✅ Diagnostic complete! Try the suggested solutions above.');
}

main();