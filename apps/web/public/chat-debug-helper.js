/**
 * 🔧 Chat Debug Helper
 * 
 * Paste this into browser console while on /dashboard/chat
 * to inspect chat state and test functionality
 * 
 * Usage:
 *   ChatDebug.status()        - Show current chat state
 *   ChatDebug.conversations() - List all conversations
 *   ChatDebug.messages()      - Show messages in current chat
 *   ChatDebug.send("text")    - Send a test message
 *   ChatDebug.simulate()      - Simulate activity
 */

window.ChatDebug = {
  
  /**
   * Show current chat state
   */
  status() {
    console.log('📊 Chat Page Status Check');
    console.log('═══════════════════════════════════════');
    
    // Check if page is loaded
    const chatPage = document.querySelector('[class*="chat"]');
    console.log('✅ Chat page element:', chatPage ? 'Found' : '❌ Not found');
    
    // Check sidebar
    const sidebar = document.querySelector('[class*="sidebar"]') || 
                   document.querySelector('[class*="conversation"]');
    console.log('✅ Sidebar:', sidebar ? 'Present' : '❌ Missing');
    
    // Check main area
    const mainArea = document.querySelector('[class*="main"]') ||
                    document.querySelector('[class*="message"]');
    console.log('✅ Main area:', mainArea ? 'Present' : '❌ Missing');
    
    // Check for React Query DevTools data
    const queryCache = window.__REACT_QUERY_DEVTOOLS_CACHE__;
    if (queryCache) {
      console.log('✅ React Query cache found');
    }
    
    console.log('═══════════════════════════════════════\n');
  },
  
  /**
   * List all conversations from React Query cache
   */
  conversations() {
    console.log('💬 Conversations List');
    console.log('═══════════════════════════════════════');
    
    try {
      // Try to access React Query cache
      const queryClient = window.__REACT_QUERY_DEVTOOLS_CACHE__;
      if (!queryClient) {
        console.log('⚠️  React Query cache not accessible');
        console.log('   Try: Check Network tab for API calls');
        return;
      }
      
      console.log('Found React Query cache - inspect manually');
      console.log('Look for keys containing "conversations" or "channels"');
    } catch (error) {
      console.log('❌ Error accessing cache:', error.message);
    }
    
    // Check DOM for conversation items
    const convItems = document.querySelectorAll('[class*="conversation"]');
    console.log(`\n📋 Found ${convItems.length} conversation elements in DOM`);
    
    console.log('═══════════════════════════════════════\n');
  },
  
  /**
   * Show messages in current chat
   */
  messages() {
    console.log('✉️  Current Messages');
    console.log('═══════════════════════════════════════');
    
    const messageElements = document.querySelectorAll('[class*="message"]');
    console.log(`📝 Found ${messageElements.length} message elements`);
    
    // Try to find message text content
    messageElements.forEach((el, i) => {
      const text = el.textContent?.substring(0, 50);
      if (text && text.length > 5) {
        console.log(`  ${i + 1}. ${text}...`);
      }
    });
    
    console.log('═══════════════════════════════════════\n');
  },
  
  /**
   * Send a test message
   */
  send(text = 'Debug test message') {
    console.log(`📤 Attempting to send: "${text}"`);
    
    // Try to find input field
    const input = document.querySelector('input[type="text"]') ||
                 document.querySelector('textarea');
    
    if (!input) {
      console.log('❌ Input field not found');
      return;
    }
    
    // Set value
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Try to find send button
    const sendButton = document.querySelector('button[type="submit"]') ||
                      Array.from(document.querySelectorAll('button'))
                        .find(btn => btn.textContent?.includes('Send'));
    
    if (!sendButton) {
      console.log('❌ Send button not found');
      console.log('   Try pressing Enter key instead');
      return;
    }
    
    sendButton.click();
    console.log('✅ Message sent!');
  },
  
  /**
   * Simulate user activity
   */
  simulate() {
    console.log('🎭 Simulating user activity...\n');
    
    setTimeout(() => {
      console.log('1️⃣  Opening sidebar...');
      const sidebarBtn = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Conversation'));
      sidebarBtn?.click();
    }, 500);
    
    setTimeout(() => {
      console.log('2️⃣  Clicking first conversation...');
      const firstConv = document.querySelector('[role="button"]');
      firstConv?.click();
    }, 1500);
    
    setTimeout(() => {
      console.log('3️⃣  Sending test message...');
      this.send('Automated test message from ChatDebug');
    }, 3000);
    
    setTimeout(() => {
      console.log('✅ Simulation complete!\n');
    }, 4000);
  },
  
  /**
   * Check API endpoints
   */
  async checkAPI() {
    console.log('🌐 Testing API Endpoints');
    console.log('═══════════════════════════════════════');
    
    const API_URL = 'http://localhost:3000';
    const endpoints = [
      { url: '/api/direct-messaging/conversations?workspaceId=test', name: 'Conversations' },
      { url: '/api/channel/test', name: 'Channels' },
      { url: '/api/message/channel/demo-channel-1', name: 'Messages' },
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(API_URL + endpoint.url, {
          credentials: 'include'
        });
        
        const status = response.ok ? '✅' : '❌';
        console.log(`${status} ${endpoint.name}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   └─ Data:`, Object.keys(data));
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: ${error.message}`);
      }
    }
    
    console.log('═══════════════════════════════════════\n');
  },
  
  /**
   * Show help
   */
  help() {
    console.log('🔧 Chat Debug Helper - Available Commands');
    console.log('═══════════════════════════════════════');
    console.log('ChatDebug.status()        - Show current state');
    console.log('ChatDebug.conversations() - List conversations');
    console.log('ChatDebug.messages()      - Show messages');
    console.log('ChatDebug.send("text")    - Send test message');
    console.log('ChatDebug.simulate()      - Auto test flow');
    console.log('ChatDebug.checkAPI()      - Test API endpoints');
    console.log('ChatDebug.help()          - Show this help');
    console.log('═══════════════════════════════════════\n');
    console.log('💡 Tip: Open DevTools → Console, then run ChatDebug.status()');
  }
};

// Auto-display help on load
console.log('%c🔧 Chat Debug Helper Loaded!', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
console.log('Type ChatDebug.help() to see available commands\n');

// Expose globally for easy access
if (typeof window !== 'undefined') {
  window.ChatDebug = ChatDebug;
}

