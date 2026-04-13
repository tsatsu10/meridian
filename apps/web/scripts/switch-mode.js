#!/usr/bin/env node

/**
 * Production Mode Switcher
 * Converts the application from test mocks to live production backend
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function updateEnvFile(filePath, updates) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm')
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${value}`)
      } else {
        content += `\n${key}=${value}`
      }
    }
    
    fs.writeFileSync(filePath, content)
    log(`✅ Updated ${filePath}`, colors.green)
  } catch (error) {
    log(`❌ Error updating ${filePath}: ${error.message}`, colors.red)
  }
}

function enableProductionMode() {
  log('\n🚀 Switching to Production Mode (Live Backend)', colors.bold + colors.blue)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue)
  
  // Update frontend environment
  const webEnvPath = path.join(__dirname, '../.env')
  updateEnvFile(webEnvPath, {
    'VITE_USE_MOCK_API': 'false',
    'VITE_DEBUG_MODE': 'false',
    'VITE_API_URL': 'http://localhost:3005',
    'VITE_WS_URL': 'ws://localhost:3005'
  })
  
  // Update API environment
  const apiEnvPath = path.join(__dirname, '../../api/.env')
  if (fs.existsSync(apiEnvPath)) {
    updateEnvFile(apiEnvPath, {
      'NODE_ENV': 'production',
      'DEMO_MODE': 'false',
      'LOG_LEVEL': 'info'
    })
  }
  
  log('\n📋 Production Mode Configuration:', colors.yellow)
  log('  • Mock API: DISABLED', colors.green)
  log('  • Live Backend: ENABLED', colors.green)
  log('  • WebSocket: LIVE CONNECTION', colors.green)
  log('  • Database: REAL DATA', colors.green)
  log('  • Authentication: LIVE AUTH', colors.green)
  log('  • Debug Mode: DISABLED', colors.green)
  
  log('\n🎯 Next Steps:', colors.yellow)
  log('  1. Start the API server: cd apps/api && npm start')
  log('  2. Start the web server: cd apps/web && npm run dev')
  log('  3. Access the app at: http://localhost:5173')
  
  log('\n✅ Production mode enabled successfully!', colors.bold + colors.green)
}

function enableTestMode() {
  log('\n🧪 Switching to Test Mode (Mock Backend)', colors.bold + colors.yellow)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.yellow)
  
  // Update frontend environment
  const webEnvPath = path.join(__dirname, '../.env')
  updateEnvFile(webEnvPath, {
    'VITE_USE_MOCK_API': 'true',
    'VITE_DEBUG_MODE': 'true',
    'VITE_API_URL': 'http://localhost:3005',
    'VITE_WS_URL': 'ws://localhost:3005'
  })
  
  // Update API environment
  const apiEnvPath = path.join(__dirname, '../../api/.env')
  if (fs.existsSync(apiEnvPath)) {
    updateEnvFile(apiEnvPath, {
      'NODE_ENV': 'development',
      'DEMO_MODE': 'true',
      'LOG_LEVEL': 'debug'
    })
  }
  
  log('\n📋 Test Mode Configuration:', colors.yellow)
  log('  • Mock API: ENABLED', colors.green)
  log('  • Live Backend: DISABLED', colors.red)
  log('  • WebSocket: MOCK CONNECTION', colors.yellow)
  log('  • Database: MOCK DATA', colors.yellow)
  log('  • Authentication: MOCK AUTH', colors.yellow)
  log('  • Debug Mode: ENABLED', colors.green)
  
  log('\n🎯 Next Steps:', colors.yellow)
  log('  1. Run tests: npm test')
  log('  2. Start dev server: npm run dev')
  
  log('\n✅ Test mode enabled successfully!', colors.bold + colors.green)
}

function showStatus() {
  log('\n📊 Current Configuration Status', colors.bold + colors.blue)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue)
  
  const webEnvPath = path.join(__dirname, '../.env')
  
  try {
    const content = fs.readFileSync(webEnvPath, 'utf8')
    const useMockApi = content.match(/VITE_USE_MOCK_API=(.+)/)?.[1] || 'not set'
    const debugMode = content.match(/VITE_DEBUG_MODE=(.+)/)?.[1] || 'not set'
    const apiUrl = content.match(/VITE_API_URL=(.+)/)?.[1] || 'not set'
    const wsUrl = content.match(/VITE_WS_URL=(.+)/)?.[1] || 'not set'
    
    log(`  Mock API: ${useMockApi}`, useMockApi === 'true' ? colors.yellow : colors.green)
    log(`  Debug Mode: ${debugMode}`, debugMode === 'true' ? colors.yellow : colors.green)
    log(`  API URL: ${apiUrl}`, colors.blue)
    log(`  WebSocket URL: ${wsUrl}`, colors.blue)
    
    if (useMockApi === 'false') {
      log('\n  Current Mode: 🚀 PRODUCTION (Live Backend)', colors.bold + colors.green)
    } else {
      log('\n  Current Mode: 🧪 TEST (Mock Backend)', colors.bold + colors.yellow)
    }
  } catch (error) {
    log(`❌ Error reading configuration: ${error.message}`, colors.red)
  }
}

function showHelp() {
  log('\n🛠️  Production Mode Switcher', colors.bold + colors.blue)
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue)
  log('\nUsage: node switch-mode.js [command]')
  log('\nCommands:')
  log('  production, prod, live    Switch to production mode (live backend)')
  log('  test, mock               Switch to test mode (mock backend)')
  log('  status, show             Show current configuration')
  log('  help, h                  Show this help message')
  log('\nExamples:')
  log('  node switch-mode.js production   # Enable live backend')
  log('  node switch-mode.js test          # Enable mock backend')
  log('  node switch-mode.js status        # Show current mode')
}

// Main execution
const command = process.argv[2]

switch (command) {
  case 'production':
  case 'prod':
  case 'live':
    enableProductionMode()
    break
  
  case 'test':
  case 'mock':
    enableTestMode()
    break
  
  case 'status':
  case 'show':
    showStatus()
    break
  
  case 'help':
  case 'h':
  case undefined:
    showHelp()
    break
  
  default:
    log(`❌ Unknown command: ${command}`, colors.red)
    showHelp()
    process.exit(1)
}