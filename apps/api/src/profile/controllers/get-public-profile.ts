/**
 * 👥 Get Public Profile Controller
 *
 * GET /api/profile/:userId/public
 * Public profile: goals, kudos, teams, projects (gamification fields are empty stubs).
 */

import { Context } from "hono";
import { getDatabase } from "../../database/connection";
import {
  users,
  userProfileTable,
  goals,
  projects,
  teams,
  teamMembers,
  projectMembers,
  kudos,
} from "../../database/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import logger from '../../utils/logger';

export async function getPublicProfile(c: Context) {
  try {
    const db = getDatabase();
    const currentUserId = c.get('userId');
    const targetUserId = c.req.param('userId');

    if (!currentUserId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!targetUserId) {
      return c.json({ error: "User id required" }, 400);
    }
    
    // Get user basic info with profile
    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        role: users.role,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        
        // Profile data
        jobTitle: userProfileTable.jobTitle,
        company: userProfileTable.company,
        industry: userProfileTable.industry,
        bio: userProfileTable.bio,
        headline: userProfileTable.headline,
        location: userProfileTable.location,
        timezone: userProfileTable.timezone,
        profilePicture: userProfileTable.profilePicture,
        coverImage: userProfileTable.coverImage,
        linkedinUrl: userProfileTable.linkedinUrl,
        githubUrl: userProfileTable.githubUrl,
        twitterUrl: userProfileTable.twitterUrl,
        website: userProfileTable.website,
        
        // Privacy settings
        isPublic: userProfileTable.isPublic,
        showEmail: userProfileTable.showEmail,
        showPhone: userProfileTable.showPhone,
        phone: userProfileTable.phone,
      })
      .from(users)
      .leftJoin(userProfileTable, eq(users.id, userProfileTable.userId))
      .where(eq(users.id, targetUserId))
      .limit(1);
    
    const user = userResult[0];
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    // Check if viewing own profile
    const isOwnProfile = currentUserId === targetUserId;
    
    // Get goals (respect privacy)
    const goalsWhere = isOwnProfile
      ? and(
          eq(goals.userId, targetUserId),
          eq(goals.status, 'active')
        )
      : and(
          eq(goals.userId, targetUserId),
          eq(goals.status, 'active'),
          inArray(goals.privacy, ['team', 'organization'])
        );
    
    const userGoals = await db.query.goals.findMany({
      where: goalsWhere,
      with: {
        keyResults: true,
      },
      orderBy: [desc(goals.createdAt)],
      limit: 5, // Show top 5 active goals
    });
    
    // Count completed goals
    const completedGoalsCount = await db.select({ count: count() })
      .from(goals)
      .where(and(
        eq(goals.userId, targetUserId),
        eq(goals.status, 'completed')
      ));
    
    const completedCount = Number(completedGoalsCount[0]?.count) || 0;
    const goalsStats = {
      active: userGoals.length,
      completed: completedCount,
      completionRate:
        completedCount > 0
          ? Math.round((completedCount / (userGoals.length + completedCount)) * 100)
          : 0,
    };

    const achievements: unknown[] = [];
    const achievementStats = {
      totalUnlocked: 0,
      totalPoints: 0,
      byRarity: {
        legendary: 0,
        epic: 0,
        rare: 0,
        common: 0,
      },
      recentUnlocks: [] as unknown[],
    };

    const streaksData = {
      current: {} as Record<string, number>,
      longest: 0,
      totalActiveDays: 0,
    };

    // Get kudos stats (with error handling)
    let kudosReceivedCount = 0;
    let kudosGivenCount = 0;
    let recentKudos: any[] = [];
    
    try {
      // Note: kudos table uses fromUserEmail/toUserEmail (email-based, not ID-based)
      // First get user email for queries
      const targetUserEmail = user.email;

      const kudosReceived = await db.select({ count: count() })
        .from(kudos)
        .where(eq(kudos.toUserEmail, targetUserEmail));
      kudosReceivedCount = Number(kudosReceived[0]?.count) || 0;

      const kudosGiven = await db.select({ count: count() })
        .from(kudos)
        .where(eq(kudos.fromUserEmail, targetUserEmail));
      kudosGivenCount = Number(kudosGiven[0]?.count) || 0;

      // Get recent kudos without relational query (to avoid relation errors)
      const recentKudosRaw = await db.select()
        .from(kudos)
        .where(eq(kudos.toUserEmail, targetUserEmail))
        .orderBy(desc(kudos.createdAt))
        .limit(5);

      recentKudos = recentKudosRaw;
    } catch (error) {
      logger.warn('Failed to fetch kudos for public profile:', error);
      logger.error('Kudos error details:', error);
    }
    
    // Get teams (with error handling)
    let userTeams: any[] = [];
    try {
      // First get team memberships
      const memberships = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, targetUserId));
      
      if (memberships.length > 0) {
        const teamIds = memberships.map(m => m.teamId);
        const teamsData = await db.select()
          .from(teams)
          .where(sql`${teams.id} IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})`);
        
        const teamMap = new Map(teamsData.map(t => [t.id, t.name]));
        
        userTeams = memberships.map(m => ({
          id: m.teamId,
          name: teamMap.get(m.teamId) || 'Unknown Team',
          role: m.role,
        }));
      }
    } catch (error) {
      logger.warn('Failed to fetch teams for public profile:', error);
    }
    
    // Get projects (with error handling)
    let userProjects: any[] = [];
    try {
      // First get project memberships
      const memberships = await db.select()
        .from(projectMembers)
        .where(eq(projectMembers.userEmail, user.email))
        .limit(5);
      
      if (memberships.length > 0) {
        const projectIds = memberships.map(m => m.projectId);
        const projectsData = await db.select()
          .from(projects)
          .where(sql`${projects.id} IN (${sql.join(projectIds.map(id => sql`${id}`), sql`, `)})`);
        
        const projectMap = new Map(projectsData.map(p => [p.id, p.name]));
        
        userProjects = memberships.map(m => ({
          id: m.projectId,
          name: projectMap.get(m.projectId) || 'Unknown Project',
          role: m.role,
        }));
      }
    } catch (error) {
      logger.warn('Failed to fetch projects for public profile:', error);
    }
    
    // Build response with privacy filtering
    const profileData = {
      user: {
        id: user.id,
        name: user.name,
        email: isOwnProfile || user.showEmail ? user.email : null,
        avatar: user.avatar || user.profilePicture,
        jobTitle: user.jobTitle,
        company: user.company,
        industry: user.industry,
        bio: user.bio,
        headline: user.headline,
        location: user.location,
        timezone: user.timezone,
        coverImage: user.coverImage,
        linkedinUrl: user.linkedinUrl,
        githubUrl: user.githubUrl,
        twitterUrl: user.twitterUrl,
        website: user.website,
        phone: isOwnProfile || user.showPhone ? user.phone : null,
        joinedAt: user.createdAt,
        lastSeen: user.lastLoginAt,
      },
      
      goals: {
        active: userGoals,
        stats: goalsStats,
      },
      
      achievements: {
        unlocked: achievements,
        stats: achievementStats,
      },
      
      streaks: streaksData,

      leaderboard: null,
      
      kudos: {
        received: kudosReceivedCount,
        given: kudosGivenCount,
        recent: recentKudos,
      },
      
      teams: userTeams.map(tm => ({
        id: tm.id,
        name: tm.name,
        role: tm.role,
      })),

      projects: userProjects.map(pm => ({
        id: pm.id,
        name: pm.name,
        role: pm.role,
      })),
      
      isOwnProfile,
    };
    
    // Increment profile view count (if not own profile)
    if (!isOwnProfile) {
      try {
        // Get current view count first
        const currentProfile = await db.query.userProfileTable.findFirst({
          where: eq(userProfileTable.userId, targetUserId),
          columns: { viewCount: true },
        });
        
        if (currentProfile) {
          await db.update(userProfileTable)
            .set({
              viewCount: (currentProfile.viewCount || 0) + 1,
            })
            .where(eq(userProfileTable.userId, targetUserId));
        }
      } catch (error) {
        // Don't fail the whole request if view count increment fails
        logger.warn('Failed to increment profile view count:', error);
      }
    }
    
    return c.json({
      success: true,
      data: profileData,
    });
    
  } catch (error) {
    logger.error("Get public profile error:", error);
    return c.json({
      error: "Failed to fetch profile",
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    }, 500);
  }
}



