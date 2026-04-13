import { getDatabase } from "../database/connection";
import { userTable, userPreferencesExtendedTable, notificationTable } from '../database/schema';
import emailService from '../services/email-service';
import logger from '../utils/logger';

async function main() {
  const db = getDatabase();
  // 1. Find all users with digestFrequency set
  const prefs = await db.select().from(userPreferencesExtendedTable);
  for (const pref of prefs) {
    let parsed: any = {};
    try {
      parsed = JSON.parse(pref.preferenceData);
    } catch (error) {
      logger.error('Failed to parse user preference data:', error);
      // Continue with empty object as default
    }
    const digestFrequency = parsed.digestFrequency;
    if (!digestFrequency || digestFrequency === 'immediate') continue;
    // 2. Find user email
    const user = await db.query.userTable.findFirst({ where: (u, { eq }) => eq(u.id, pref.userId) });
    if (!user) continue;
    // 3. Fetch undigested notifications
    const notifs = await db.select().from(notificationTable)
      .where((n, { eq, isNull, and }) => and(
        eq(n.userEmail, user.email),
        isNull(n.digestedAt),
        eq(n.isRead, false)
      ));
    if (!notifs.length) continue;
    // 4. Group by type
    const grouped: Record<string, typeof notifs> = {};
    for (const n of notifs) {
      grouped[n.type || 'other'] = grouped[n.type || 'other'] || [];
      grouped[n.type || 'other'].push(n);
    }
    // 5. Generate summary HTML
    let html = `<h2>Your ${digestFrequency} Meridian Notification Digest</h2>`;
    for (const type in grouped) {
      html += `<h3>${type.charAt(0).toUpperCase() + type.slice(1)} (${grouped[type].length})</h3><ul>`;
      for (const n of grouped[type]) {
        html += `<li><b>${n.title}</b>: ${n.content || ''} <small>(${new Date(n.createdAt).toLocaleString()})</small></li>`;
      }
      html += '</ul>';
    }
    // 6. Send email
    await emailService.sendNotificationEmail({
      to: user.email,
      subject: `Your ${digestFrequency} Meridian Notification Digest`,
      html,
      text: '',
    });
    // 7. Mark notifications as digested
    const now = new Date();
    for (const n of notifs) {
      await db.update(notificationTable).set({ digestedAt: now }).where((row, { eq }) => eq(row.id, n.id));
    }
    logger.info(`Digest sent to ${user.email} (${notifs.length} notifications)`);
  }
  process.exit(0);
}

main().catch(e => { logger.error(e); process.exit(1); }); 

