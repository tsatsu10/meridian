/**
 * 🏆 Badges Service
 * 
 * Manages user badges, auto-awards, and criteria checking
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import {
  userBadges,
  userStatistics,
  userProfileTable,
  userSkill,
  kudos,
  users,
} from "../database/schema";
import { eq, and, count, sql } from "drizzle-orm";
import logger from "../utils/logger";

// Badge definitions
export const BADGE_DEFINITIONS = [
  {
    type: "top_performer",
    name: "Top Performer",
    description: "Completed 100+ tasks",
    icon: "🏆",
    color: "#FFD700",
    rarity: "epic",
    criteria: { tasksCompleted: 100 },
  },
  {
    type: "early_adopter",
    name: "Early Adopter",
    description: "Joined within first 3 months of workspace creation",
    icon: "🚀",
    color: "#6366F1",
    rarity: "rare",
    criteria: { earlyAdopter: true },
  },
  {
    type: "helpful_teammate",
    name: "Helpful Teammate",
    description: "Received 50+ kudos",
    icon: "❤️",
    color: "#EF4444",
    rarity: "rare",
    criteria: { kudosReceived: 50 },
  },
  {
    type: "innovation_award",
    name: "Innovation Award",
    description: "Created innovative solutions",
    icon: "💡",
    color: "#F59E0B",
    rarity: "legendary",
    criteria: { manual: true }, // Manually awarded
  },
  {
    type: "customer_champion",
    name: "Customer Champion",
    description: "Excellent customer satisfaction scores",
    icon: "⭐",
    color: "#10B981",
    rarity: "epic",
    criteria: { manual: true },
  },
  {
    type: "quality_advocate",
    name: "Quality Advocate",
    description: "Maintained high quality standards",
    icon: "✨",
    color: "#8B5CF6",
    rarity: "rare",
    criteria: { manual: true },
  },
  {
    type: "skill_master",
    name: "Skill Master",
    description: "5+ skills at expert level or higher",
    icon: "🎯",
    color: "#EC4899",
    rarity: "epic",
    criteria: { expertSkills: 5 },
  },
  {
    type: "connector",
    name: "Connector",
    description: "100+ connections in network",
    icon: "🤝",
    color: "#3B82F6",
    rarity: "rare",
    criteria: { connections: 100 },
  },
  {
    type: "mentor",
    name: "Mentor",
    description: "Helped 10+ team members",
    icon: "👨‍🏫",
    color: "#14B8A6",
    rarity: "epic",
    criteria: { mentorships: 10 },
  },
  {
    type: "one_year",
    name: "1 Year Anniversary",
    description: "1 year in workspace",
    icon: "🎂",
    color: "#F472B6",
    rarity: "common",
    criteria: { tenure: 365 },
  },
  {
    type: "two_year",
    name: "2 Year Anniversary",
    description: "2 years in workspace",
    icon: "🎉",
    color: "#F472B6",
    rarity: "rare",
    criteria: { tenure: 730 },
  },
  {
    type: "profile_star",
    name: "Profile Star",
    description: "95%+ profile completeness",
    icon: "⭐",
    color: "#FBBF24",
    rarity: "common",
    criteria: { completeness: 95 },
  },
];

/**
 * Check and award badges based on user stats
 */
export async function checkAndAwardBadges(userId: string): Promise<any[]> {
  const db = getDatabase();

  try {
    const awardedBadges: any[] = [];

    // Get user statistics
    const [stats] = await db
      .select()
      .from(userStatistics)
      .where(eq(userStatistics.userId, userId));

    // Get profile data
    const [profile] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId));

    // Get skills count at expert level (4+)
    const expertSkills = await db
      .select({ count: count() })
      .from(userSkill)
      .where(and(eq(userSkill.userId, userId), sql`${userSkill.level} >= 4`));

    // Get kudos received count
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));

    const kudosReceivedCount = await db
      .select({ count: count() })
      .from(kudos)
      .where(eq(kudos.toUserEmail, user.email));

    // Check each badge
    for (const badgeDef of BADGE_DEFINITIONS) {
      // Skip manual badges
      if (badgeDef.criteria.manual) {
        continue;
      }

      // Check if already awarded
      const existing = await db
        .select()
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, userId),
            eq(userBadges.badgeType, badgeDef.type)
          )
        );

      if (existing.length > 0) {
        continue; // Already awarded
      }

      // Check criteria
      let shouldAward = false;
      const criteriaMet: any = {};

      if (badgeDef.criteria.tasksCompleted) {
        shouldAward =
          (stats?.tasksCompletedAllTime || 0) >= badgeDef.criteria.tasksCompleted;
        criteriaMet.tasksCompleted = stats?.tasksCompletedAllTime;
      }

      if (badgeDef.criteria.kudosReceived) {
        shouldAward = (kudosReceivedCount[0]?.count || 0) >= badgeDef.criteria.kudosReceived;
        criteriaMet.kudosReceived = kudosReceivedCount[0]?.count;
      }

      if (badgeDef.criteria.expertSkills) {
        shouldAward = (expertSkills[0]?.count || 0) >= badgeDef.criteria.expertSkills;
        criteriaMet.expertSkills = expertSkills[0]?.count;
      }

      if (badgeDef.criteria.completeness) {
        shouldAward =
          (profile?.completenessScore || 0) >= badgeDef.criteria.completeness;
        criteriaMet.completeness = profile?.completenessScore;
      }

      if (badgeDef.criteria.connections) {
        shouldAward =
          (profile?.connectionCount || 0) >= badgeDef.criteria.connections;
        criteriaMet.connections = profile?.connectionCount;
      }

      if (badgeDef.criteria.tenure) {
        shouldAward = (stats?.daysInWorkspace || 0) >= badgeDef.criteria.tenure;
        criteriaMet.tenure = stats?.daysInWorkspace;
      }

      // Award badge if criteria met
      if (shouldAward) {
        const badge = await db
          .insert(userBadges)
          .values({
            id: createId(),
            userId,
            badgeType: badgeDef.type,
            badgeName: badgeDef.name,
            badgeDescription: badgeDef.description,
            badgeIcon: badgeDef.icon,
            badgeColor: badgeDef.color,
            rarity: badgeDef.rarity,
            criteriaMet,
            isVisible: true,
            displayOrder: 0,
          })
          .returning();

        awardedBadges.push(badge[0]);

        logger.info(`Awarded badge ${badgeDef.name} to user ${userId}`);
      }
    }

    return awardedBadges;
  } catch (error) {
    logger.error("Error checking and awarding badges:", error);
    return [];
  }
}

/**
 * Get user badges
 */
export async function getUserBadges(userId: string): Promise<any[]> {
  const db = getDatabase();

  try {
    const badges = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.isVisible, true)))
      .orderBy(desc(userBadges.displayOrder), desc(userBadges.awardedAt));

    return badges;
  } catch (error) {
    logger.error("Error getting user badges:", error);
    return [];
  }
}

/**
 * Manually award badge (admin only)
 */
export async function awardBadgeManually(data: {
  userId: string;
  badgeType: string;
  awardedBy: string;
}): Promise<any> {
  const db = getDatabase();

  try {
    const badgeDef = BADGE_DEFINITIONS.find((b) => b.type === data.badgeType);

    if (!badgeDef) {
      throw new Error("Invalid badge type");
    }

    // Check if already awarded
    const existing = await db
      .select()
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, data.userId),
          eq(userBadges.badgeType, data.badgeType)
        )
      );

    if (existing.length > 0) {
      throw new Error("Badge already awarded");
    }

    const badge = await db
      .insert(userBadges)
      .values({
        id: createId(),
        userId: data.userId,
        badgeType: badgeDef.type,
        badgeName: badgeDef.name,
        badgeDescription: badgeDef.description,
        badgeIcon: badgeDef.icon,
        badgeColor: badgeDef.color,
        rarity: badgeDef.rarity,
        criteriaMet: { awardedBy: data.awardedBy, manual: true },
        isVisible: true,
      })
      .returning();

    return badge[0];
  } catch (error) {
    logger.error("Error awarding badge manually:", error);
    throw error;
  }
}

/**
 * Toggle badge visibility
 */
export async function toggleBadgeVisibility(
  badgeId: string,
  userId: string
): Promise<any> {
  const db = getDatabase();

  try {
    const [badge] = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.id, badgeId), eq(userBadges.userId, userId)));

    if (!badge) {
      throw new Error("Badge not found");
    }

    const updated = await db
      .update(userBadges)
      .set({ isVisible: !badge.isVisible })
      .where(eq(userBadges.id, badgeId))
      .returning();

    return updated[0];
  } catch (error) {
    logger.error("Error toggling badge visibility:", error);
    throw error;
  }
}

