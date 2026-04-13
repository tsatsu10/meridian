/**
 * 📊 Profile Analytics Service
 * 
 * Handles profile views tracking, analytics calculation,
 * optimization suggestions, and statistics management
 */

import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "../database/connection";
import {
  profileViews,
  profileSuggestions,
  profileSectionViews,
  userStatistics,
  users,
  userProfileTable,
  userSkill,
  userExperience,
  userEducation,
  tasks,
  projectMembers,
  teamMembers,
  kudos,
  messagesTable,
} from "../database/schema";
import { eq, and, desc, count, sql, gte, lte } from "drizzle-orm";
import logger from "../utils/logger";

/**
 * Record a profile view
 */
export async function recordProfileView(data: {
  profileUserId: string;
  viewerUserId?: string;
  source?: string;
  sectionsViewed?: string[];
  deviceType?: string;
}): Promise<any> {
  const db = getDatabase();

  try {
    const viewRecord = await db.insert(profileViews).values({
      id: createId(),
      profileUserId: data.profileUserId,
      viewerUserId: data.viewerUserId || null,
      source: data.source || 'direct',
      sectionsViewed: data.sectionsViewed || [],
      deviceType: data.deviceType || 'desktop',
      isAnonymous: !data.viewerUserId,
      viewedAt: new Date(),
    }).returning();

    // Increment view count in user_profile
    if (data.viewerUserId !== data.profileUserId) {
      await db.execute(sql`
        UPDATE user_profile
        SET view_count = COALESCE(view_count, 0) + 1
        WHERE user_id = ${data.profileUserId}
      `);
    }

    return viewRecord[0];
  } catch (error) {
    logger.error("Error recording profile view:", error);
    throw error;
  }
}

/**
 * Get profile viewers (who viewed this profile)
 */
export async function getProfileViewers(
  profileUserId: string,
  options?: { limit?: number; offset?: number }
): Promise<any[]> {
  const db = getDatabase();

  try {
    const viewers = await db
      .select({
        id: profileViews.id,
        viewedAt: profileViews.viewedAt,
        source: profileViews.source,
        duration: profileViews.duration,
        sectionsViewed: profileViews.sectionsViewed,
        deviceType: profileViews.deviceType,
        isAnonymous: profileViews.isAnonymous,
        // Viewer info
        viewerId: users.id,
        viewerName: users.name,
        viewerEmail: users.email,
        viewerAvatar: users.avatar,
        viewerJobTitle: userProfileTable.jobTitle,
        viewerCompany: userProfileTable.company,
      })
      .from(profileViews)
      .leftJoin(users, eq(profileViews.viewerUserId, users.id))
      .leftJoin(userProfileTable, eq(users.id, userProfileTable.userId))
      .where(eq(profileViews.profileUserId, profileUserId))
      .orderBy(desc(profileViews.viewedAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return viewers;
  } catch (error) {
    logger.error("Error getting profile viewers:", error);
    throw error;
  }
}

/**
 * Get profile view statistics
 */
export async function getProfileViewStats(profileUserId: string): Promise<any> {
  const db = getDatabase();

  try {
    // Total views
    const totalViews = await db
      .select({ count: count() })
      .from(profileViews)
      .where(eq(profileViews.profileUserId, profileUserId));

    // Unique viewers
    const uniqueViewers = await db
      .select({ count: sql`COUNT(DISTINCT ${profileViews.viewerUserId})` })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.profileUserId, profileUserId),
          sql`${profileViews.viewerUserId} IS NOT NULL`
        )
      );

    // Views this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const viewsThisWeek = await db
      .select({ count: count() })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.profileUserId, profileUserId),
          gte(profileViews.viewedAt, oneWeekAgo)
        )
      );

    // Views by source
    const viewsBySource = await db
      .select({
        source: profileViews.source,
        count: count(),
      })
      .from(profileViews)
      .where(eq(profileViews.profileUserId, profileUserId))
      .groupBy(profileViews.source);

    // Average time spent (from duration)
    const avgDuration = await db
      .select({ avg: sql`AVG(${profileViews.duration})` })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.profileUserId, profileUserId),
          sql`${profileViews.duration} > 0`
        )
      );

    return {
      totalViews: totalViews[0]?.count || 0,
      uniqueViewers: uniqueViewers[0]?.count || 0,
      viewsThisWeek: viewsThisWeek[0]?.count || 0,
      viewsBySource,
      averageDuration: avgDuration[0]?.avg || 0,
    };
  } catch (error) {
    logger.error("Error getting profile view stats:", error);
    throw error;
  }
}

/**
 * Calculate enhanced profile completeness score
 */
export async function calculateCompletenessScore(userId: string): Promise<number> {
  const db = getDatabase();

  try {
    // Get all profile data
    const [profile] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const skills = await db
      .select()
      .from(userSkill)
      .where(eq(userSkill.userId, userId));

    const experience = await db
      .select()
      .from(userExperience)
      .where(eq(userExperience.userId, userId));

    const education = await db
      .select()
      .from(userEducation)
      .where(eq(userEducation.userId, userId));

    // Scoring weights
    let score = 0;
    const weights = {
      basicInfo: 20, // Name, email (required)
      profilePicture: 15,
      bio: 15,
      jobTitle: 10,
      location: 5,
      skills: 15,
      experience: 10,
      education: 5,
      socialLinks: 5,
    };

    // Basic info (always 20 since name/email required)
    score += weights.basicInfo;

    // Profile picture
    if (user?.avatar || profile?.profilePicture) {
      score += weights.profilePicture;
    }

    // Bio (quality check)
    if (profile?.bio) {
      const bioLength = profile.bio.length;
      if (bioLength >= 150) {
        score += weights.bio; // Full score for 150+ chars
      } else if (bioLength >= 50) {
        score += weights.bio * 0.7; // Partial score
      } else if (bioLength >= 20) {
        score += weights.bio * 0.4; // Minimal score
      }
    }

    // Job title
    if (profile?.jobTitle) {
      score += weights.jobTitle;
    }

    // Location
    if (profile?.location) {
      score += weights.location;
    }

    // Skills (at least 3 skills recommended)
    if (skills.length >= 5) {
      score += weights.skills;
    } else if (skills.length >= 3) {
      score += weights.skills * 0.7;
    } else if (skills.length >= 1) {
      score += weights.skills * 0.4;
    }

    // Experience (at least 1 entry)
    if (experience.length >= 2) {
      score += weights.experience;
    } else if (experience.length >= 1) {
      score += weights.experience * 0.7;
    }

    // Education (at least 1 entry)
    if (education.length >= 1) {
      score += weights.education;
    }

    // Social links (at least 2)
    const socialLinksCount = [
      profile?.linkedinUrl,
      profile?.githubUrl,
      profile?.twitterUrl,
      profile?.website,
    ].filter(Boolean).length;

    if (socialLinksCount >= 2) {
      score += weights.socialLinks;
    } else if (socialLinksCount >= 1) {
      score += weights.socialLinks * 0.5;
    }

    return Math.round(score);
  } catch (error) {
    logger.error("Error calculating completeness score:", error);
    return 0;
  }
}

/**
 * Generate optimization suggestions
 */
export async function generateOptimizationSuggestions(
  userId: string
): Promise<any[]> {
  const db = getDatabase();

  try {
    const suggestions: any[] = [];

    // Get profile data
    const [profile] = await db
      .select()
      .from(userProfileTable)
      .where(eq(userProfileTable.userId, userId));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const skills = await db
      .select()
      .from(userSkill)
      .where(eq(userSkill.userId, userId));

    const experience = await db
      .select()
      .from(userExperience)
      .where(eq(userExperience.userId, userId));

    const education = await db
      .select()
      .from(userEducation)
      .where(eq(userEducation.userId, userId));

    // Check for missing profile picture
    if (!user?.avatar && !profile?.profilePicture) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "picture",
        suggestionText: "Add a profile picture to increase visibility by 40%",
        priority: "high",
        impactScore: 90,
        isDismissed: false,
        isCompleted: false,
      });
    }

    // Check for bio quality
    if (!profile?.bio) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "bio",
        suggestionText: "Write a bio (recommended 150-200 words)",
        priority: "high",
        impactScore: 85,
        isDismissed: false,
        isCompleted: false,
      });
    } else if (profile.bio.length < 150) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "bio",
        suggestionText: `Expand your bio to at least 150 characters (currently ${profile.bio.length})`,
        priority: "medium",
        impactScore: 60,
        isDismissed: false,
        isCompleted: false,
      });
    }

    // Check for skills
    if (skills.length < 3) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "skill",
        suggestionText: `Add ${3 - skills.length} more skills to match top profiles in your role`,
        priority: "high",
        impactScore: 80,
        isDismissed: false,
        isCompleted: false,
      });
    }

    // Check for experience
    if (experience.length === 0) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "experience",
        suggestionText: "Add your work experience to build credibility",
        priority: "medium",
        impactScore: 70,
        isDismissed: false,
        isCompleted: false,
      });
    }

    // Check for social links
    const socialLinksCount = [
      profile?.linkedinUrl,
      profile?.githubUrl,
      profile?.twitterUrl,
      profile?.website,
    ].filter(Boolean).length;

    if (socialLinksCount === 0) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "bio",
        suggestionText: "Add at least one social media link (LinkedIn, GitHub, etc.)",
        priority: "low",
        impactScore: 40,
        isDismissed: false,
        isCompleted: false,
      });
    }

    // Check for skills endorsements
    const unendorsedSkills = skills.filter((s) => !s.endorsements || s.endorsements === 0);
    if (unendorsedSkills.length > 0) {
      suggestions.push({
        id: createId(),
        userId,
        suggestionType: "skill",
        suggestionText: `Get endorsements for your skills to appear in search results`,
        priority: "medium",
        impactScore: 65,
        isDismissed: false,
        isCompleted: false,
      });
    }

    // Save suggestions to database
    if (suggestions.length > 0) {
      // Delete old suggestions
      await db
        .delete(profileSuggestions)
        .where(eq(profileSuggestions.userId, userId));

      // Insert new suggestions
      await db.insert(profileSuggestions).values(suggestions);
    }

    return suggestions;
  } catch (error) {
    logger.error("Error generating optimization suggestions:", error);
    return [];
  }
}

/**
 * Get profile suggestions
 */
export async function getProfileSuggestions(
  userId: string,
  options?: { includeCompleted?: boolean; includeDismissed?: boolean }
): Promise<any[]> {
  const db = getDatabase();

  try {
    let query = db.select().from(profileSuggestions).where(eq(profileSuggestions.userId, userId));

    // Filter based on options
    const conditions = [eq(profileSuggestions.userId, userId)];

    if (!options?.includeCompleted) {
      conditions.push(eq(profileSuggestions.isCompleted, false));
    }

    if (!options?.includeDismissed) {
      conditions.push(eq(profileSuggestions.isDismissed, false));
    }

    const suggestions = await db
      .select()
      .from(profileSuggestions)
      .where(and(...conditions))
      .orderBy(desc(profileSuggestions.priority), desc(profileSuggestions.impactScore));

    return suggestions;
  } catch (error) {
    logger.error("Error getting profile suggestions:", error);
    return [];
  }
}

/**
 * Calculate user statistics
 */
export async function calculateUserStatistics(userId: string, workspaceId: string): Promise<any> {
  const db = getDatabase();

  try {
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Task stats
    const tasksCompletedWeek = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, oneWeekAgo)
        )
      );

    const tasksCompletedMonth = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, oneMonthAgo)
        )
      );

    const tasksCompletedAllTime = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, "done")));

    const tasksOverdue = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.assigneeId, userId),
          sql`${tasks.status} != 'done'`,
          lte(tasks.dueDate, now)
        )
      );

    // Project stats
    const projectsActive = await db
      .select({ count: count() })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.userEmail, userId), // Using userId for now
          eq(projectMembers.isActive, true)
        )
      );

    // Team stats
    const teamsCount = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));

    const teamsLeadCount = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.role, "lead")));

    // Communication stats (messages sent)
    const messagesSent = await db
      .select({ count: count() })
      .from(messagesTable)
      .where(eq(messagesTable.senderEmail, userId)); // Using userId for now

    // Create or update statistics
    const stats = {
      id: createId(),
      userId,
      tasksCompletedWeek: tasksCompletedWeek[0]?.count || 0,
      tasksCompletedMonth: tasksCompletedMonth[0]?.count || 0,
      tasksCompletedAllTime: tasksCompletedAllTime[0]?.count || 0,
      tasksOverdue: tasksOverdue[0]?.count || 0,
      projectsActive: projectsActive[0]?.count || 0,
      teamsCount: teamsCount[0]?.count || 0,
      teamsLeadCount: teamsLeadCount[0]?.count || 0,
      messagesSent: messagesSent[0]?.count || 0,
      lastCalculated: now,
    };

    // Try to update first, if not exists, insert
    const existingStats = await db
      .select()
      .from(userStatistics)
      .where(eq(userStatistics.userId, userId));

    if (existingStats.length > 0) {
      await db
        .update(userStatistics)
        .set(stats)
        .where(eq(userStatistics.userId, userId));
    } else {
      await db.insert(userStatistics).values(stats);
    }

    return stats;
  } catch (error) {
    logger.error("Error calculating user statistics:", error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(userId: string): Promise<any> {
  const db = getDatabase();

  try {
    const [stats] = await db
      .select()
      .from(userStatistics)
      .where(eq(userStatistics.userId, userId));

    return stats || null;
  } catch (error) {
    logger.error("Error getting user statistics:", error);
    return null;
  }
}

