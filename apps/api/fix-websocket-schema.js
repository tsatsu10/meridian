/**
 * Migration script to fix unified-websocket-server.ts schema issues
 * Fixes all references from old schema to new schema
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/realtime/unified-websocket-server.ts');

console.log('🔧 Reading file...');
let content = fs.readFileSync(filePath, 'utf8');
let changeCount = 0;

// Pattern 1: Fix conversation.channelId → conversation.id
console.log('📝 Fixing conversation.channelId references...');
const channelIdPattern = /conversation\.channelId/g;
const matches1 = content.match(channelIdPattern);
if (matches1) {
  content = content.replace(channelIdPattern, 'conversation.id');
  changeCount += matches1.length;
  console.log(`   ✅ Fixed ${matches1.length} occurrences`);
}

// Pattern 2: Fix existingConversation.channelId → existingConversation.id
console.log('📝 Fixing existingConversation.channelId references...');
const existingChannelIdPattern = /existingConversation\.channelId/g;
const matches2 = content.match(existingChannelIdPattern);
if (matches2) {
  content = content.replace(existingChannelIdPattern, 'existingConversation.id');
  changeCount += matches2.length;
  console.log(`   ✅ Fixed ${matches2.length} occurrences`);
}

// Pattern 3: Fix directMessageConversations.channelId → directMessageConversations.id
console.log('📝 Fixing directMessageConversations.channelId references...');
const dmChannelIdPattern = /directMessageConversations\.channelId/g;
const matches3 = content.match(dmChannelIdPattern);
if (matches3) {
  content = content.replace(dmChannelIdPattern, 'directMessageConversations.id');
  changeCount += matches3.length;
  console.log(`   ✅ Fixed ${matches3.length} occurrences`);
}

// Pattern 4: Fix directMessageConversations.user1Email → directMessageConversations.participant1Id
console.log('📝 Fixing user1Email references...');
const user1EmailPattern = /directMessageConversations\.user1Email/g;
const matches4 = content.match(user1EmailPattern);
if (matches4) {
  content = content.replace(user1EmailPattern, 'directMessageConversations.participant1Id');
  changeCount += matches4.length;
  console.log(`   ✅ Fixed ${matches4.length} occurrences`);
}

// Pattern 5: Fix directMessageConversations.user2Email → directMessageConversations.participant2Id
console.log('📝 Fixing user2Email references...');
const user2EmailPattern = /directMessageConversations\.user2Email/g;
const matches5 = content.match(user2EmailPattern);
if (matches5) {
  content = content.replace(user2EmailPattern, 'directMessageConversations.participant2Id');
  changeCount += matches5.length;
  console.log(`   ✅ Fixed ${matches5.length} occurrences`);
}

// Pattern 6: Fix messageTable.channelId → messageTable.conversationId  
console.log('📝 Fixing messageTable.channelId references...');
const msgChannelIdPattern = /messageTable\.channelId/g;
const matches6 = content.match(msgChannelIdPattern);
if (matches6) {
  content = content.replace(msgChannelIdPattern, 'messageTable.conversationId');
  changeCount += matches6.length;
  console.log(`   ✅ Fixed ${matches6.length} occurrences`);
}

// Pattern 7: Fix where eq(messageTable references
console.log('📝 Fixing eq(messageTable references...');
const eqMsgPattern = /eq\(messageTable\.channelId,\s*conversation\.channelId\)/g;
const matches7 = content.match(eqMsgPattern);
if (matches7) {
  content = content.replace(eqMsgPattern, 'eq(messageTable.conversationId, conversation.id)');
  changeCount += matches7.length;
  console.log(`   ✅ Fixed ${matches7.length} occurrences`);
}

// Write back
console.log(`\n💾 Writing changes back to file...`);
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✨ Migration complete!`);
console.log(`   Total changes: ${changeCount}`);
console.log(`   File updated: ${filePath}`);



