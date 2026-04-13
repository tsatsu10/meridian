/**
 * 🎯 Smart Profile Routes
 * 
 * API endpoints for enhanced profile features:
 * - Profile views & analytics
 * - Optimization suggestions
 * - User availability
 * - Frequent collaborators
 * - User statistics
 * - Badges
 * - Work history
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { auth } from "../middlewares/auth";
import {
  recordProfileView,
  getProfileViewers,
  getProfileViewStats,
  calculateCompletenessScore,
  generateOptimizationSuggestions,
  getProfileSuggestions,
  calculateUserStatistics,
  getUserStatistics,
} from "../services/profile-analytics-service";
import {
  getUserAvailability,
  updateUserAvailability,
  getCurrentLocalTime,
  isInWorkingHours,
} from "../services/user-availability-service";
import {
  calculateFrequentCollaborators,
  getFrequentCollaborators,
} from "../services/collaborators-service";
import {
  checkAndAwardBadges,
  getUserBadges,
  awardBadgeManually,
  toggleBadgeVisibility,
  BADGE_DEFINITIONS,
} from "../services/badges-service";
import {
  recordWorkHistoryEvent,
  getUserWorkHistory,
  getTenureMilestones,
  recordMajorContribution,
} from "../services/work-history-service";
import {
  getUserActiveProjects,
  getUserRecentTasks,
  getUserActivityFeed,
  getUserWorkload,
  getUserTeamCollaborations,
} from "../services/user-work-activity-service";
import logger from "../utils/logger";

const smartProfileRoutes = new Hono<{
  Variables: {
    userEmail: string;
    userId: string;
  };
}>();

// Apply authentication
smartProfileRoutes.use("*", auth);

// ========================================
// PROFILE VIEWS & ANALYTICS
// ========================================

// Record a profile view (auto-called when viewing profile)
smartProfileRoutes.post(
  "/:userId/view",
  zValidator(
    "json",
    z.object({
      source: z.string().optional(),
      sectionsViewed: z.array(z.string()).optional(),
      deviceType: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const viewerUserId = c.get("userId");
      const { userId } = c.req.param();
      const body = c.req.valid("json");

      const view = await recordProfileView({
        profileUserId: userId,
        viewerUserId,
        ...body,
      });

      return c.json({ success: true, data: view });
    } catch (error: any) {
      logger.error("Error recording profile view:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Get who viewed profile
smartProfileRoutes.get("/:userId/views", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow viewing own profile viewers
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const viewers = await getProfileViewers(userId, { limit, offset });

    return c.json({ success: true, data: viewers });
  } catch (error: any) {
    logger.error("Error getting profile viewers:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get profile view statistics
smartProfileRoutes.get("/:userId/views/stats", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow viewing own stats
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const stats = await getProfileViewStats(userId);

    return c.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error("Error getting profile view stats:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get profile insights
smartProfileRoutes.get("/:userId/insights", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow viewing own insights
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const [viewStats, statistics, suggestions] = await Promise.all([
      getProfileViewStats(userId),
      getUserStatistics(userId),
      getProfileSuggestions(userId),
    ]);

    return c.json({
      success: true,
      data: {
        views: viewStats,
        statistics,
        suggestions,
      },
    });
  } catch (error: any) {
    logger.error("Error getting profile insights:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// COMPLETENESS & OPTIMIZATION
// ========================================

// Get enhanced completeness score
smartProfileRoutes.get("/:userId/completeness", async (c) => {
  try {
    const { userId } = c.req.param();

    const score = await calculateCompletenessScore(userId);

    return c.json({ success: true, data: { score } });
  } catch (error: any) {
    logger.error("Error getting completeness score:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get optimization suggestions
smartProfileRoutes.get("/:userId/suggestions", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow viewing own suggestions
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Generate fresh suggestions
    const suggestions = await generateOptimizationSuggestions(userId);

    return c.json({ success: true, data: suggestions });
  } catch (error: any) {
    logger.error("Error getting suggestions:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Dismiss suggestion
smartProfileRoutes.post("/suggestions/:id/dismiss", async (c) => {
  try {
    const { id } = c.req.param();
    // Implementation for dismissing suggestions
    return c.json({ success: true, message: "Suggestion dismissed" });
  } catch (error: any) {
    logger.error("Error dismissing suggestion:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// AVAILABILITY
// ========================================

// Get user availability
smartProfileRoutes.get("/:userId/availability", async (c) => {
  try {
    const { userId } = c.req.param();

    const availability = await getUserAvailability(userId);
    const currentTime = getCurrentLocalTime(availability.timezone || "UTC");
    const inWorkingHours = isInWorkingHours(availability);

    return c.json({
      success: true,
      data: {
        ...availability,
        currentLocalTime: currentTime,
        inWorkingHours,
      },
    });
  } catch (error: any) {
    logger.error("Error getting availability:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Update own availability
smartProfileRoutes.put(
  "/availability",
  zValidator(
    "json",
    z.object({
      status: z.enum(["available", "away", "busy", "do_not_disturb", "offline"]).optional(),
      statusMessage: z.string().optional(),
      statusEmoji: z.string().optional(),
      autoStatus: z.boolean().optional(),
      manualStatusUntil: z.string().optional(),
      timezone: z.string().optional(),
      workingHoursStart: z.string().optional(),
      workingHoursEnd: z.string().optional(),
      workingDays: z.array(z.string()).optional(),
    })
  ),
  async (c) => {
    try {
      const userId = c.get("userId");
      const data = c.req.valid("json");

      const updated = await updateUserAvailability(userId, {
        ...data,
        manualStatusUntil: data.manualStatusUntil
          ? new Date(data.manualStatusUntil)
          : undefined,
      });

      return c.json({ success: true, data: updated });
    } catch (error: any) {
      logger.error("Error updating availability:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// COLLABORATORS
// ========================================

// Get frequent collaborators
smartProfileRoutes.get("/:userId/collaborators", async (c) => {
  try {
    const { userId } = c.req.param();
    const limit = parseInt(c.req.query("limit") || "5");

    const collaborators = await getFrequentCollaborators(userId, limit);

    return c.json({ success: true, data: collaborators });
  } catch (error: any) {
    logger.error("Error getting collaborators:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Recalculate collaborators (manual trigger)
smartProfileRoutes.post("/:userId/collaborators/recalculate", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow recalculating own collaborators
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    await calculateFrequentCollaborators(userId);

    return c.json({ success: true, message: "Collaborators recalculated" });
  } catch (error: any) {
    logger.error("Error recalculating collaborators:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// STATISTICS
// ========================================

// Get user statistics
smartProfileRoutes.get("/:userId/statistics", async (c) => {
  try {
    const { userId } = c.req.param();

    const stats = await getUserStatistics(userId);

    return c.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error("Error getting statistics:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Recalculate statistics
smartProfileRoutes.post("/:userId/statistics/recalculate", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow recalculating own stats
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const workspaceId = c.req.query("workspaceId");
    if (!workspaceId) {
      return c.json({ error: "workspaceId required" }, 400);
    }

    const stats = await calculateUserStatistics(userId, workspaceId);

    return c.json({ success: true, data: stats });
  } catch (error: any) {
    logger.error("Error recalculating statistics:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// BADGES
// ========================================

// Get user badges
smartProfileRoutes.get("/:userId/badges", async (c) => {
  try {
    const { userId } = c.req.param();

    const badges = await getUserBadges(userId);

    return c.json({ success: true, data: badges });
  } catch (error: any) {
    logger.error("Error getting badges:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Check and award badges
smartProfileRoutes.post("/:userId/badges/check", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow checking own badges
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const newBadges = await checkAndAwardBadges(userId);

    return c.json({
      success: true,
      data: newBadges,
      message: `Awarded ${newBadges.length} new badge(s)`,
    });
  } catch (error: any) {
    logger.error("Error checking badges:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Award badge manually (admin only)
smartProfileRoutes.post(
  "/badges/award",
  zValidator(
    "json",
    z.object({
      userId: z.string(),
      badgeType: z.string(),
    })
  ),
  async (c) => {
    try {
      const awardedBy = c.get("userId");
      const { userId, badgeType } = c.req.valid("json");

      // TODO: Check if user is admin

      const badge = await awardBadgeManually({ userId, badgeType, awardedBy });

      return c.json({ success: true, data: badge });
    } catch (error: any) {
      logger.error("Error awarding badge:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// Toggle badge visibility
smartProfileRoutes.put("/badges/:id/visibility", async (c) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");

    const badge = await toggleBadgeVisibility(id, userId);

    return c.json({ success: true, data: badge });
  } catch (error: any) {
    logger.error("Error toggling badge visibility:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get available badges
smartProfileRoutes.get("/badges/available", async (c) => {
  try {
    return c.json({
      success: true,
      data: BADGE_DEFINITIONS,
    });
  } catch (error: any) {
    logger.error("Error getting available badges:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// WORK HISTORY
// ========================================

// Get work history
smartProfileRoutes.get("/:userId/work-history", async (c) => {
  try {
    const { userId } = c.req.param();
    const workspaceId = c.req.query("workspaceId");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const history = await getUserWorkHistory(userId, workspaceId, {
      limit,
      offset,
    });

    return c.json({ success: true, data: history });
  } catch (error: any) {
    logger.error("Error getting work history:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get tenure milestones
smartProfileRoutes.get("/:userId/milestones", async (c) => {
  try {
    const { userId } = c.req.param();

    const stats = await getUserStatistics(userId);
    const daysInWorkspace = stats?.daysInWorkspace || 0;

    const milestones = getTenureMilestones(daysInWorkspace);

    return c.json({
      success: true,
      data: {
        milestones,
        daysInWorkspace,
      },
    });
  } catch (error: any) {
    logger.error("Error getting milestones:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Record major contribution (admin/manager)
smartProfileRoutes.post(
  "/:userId/contributions",
  zValidator(
    "json",
    z.object({
      title: z.string(),
      description: z.string().optional(),
      projectId: z.string(),
      type: z
        .enum(["project_lead", "key_feature", "problem_solver", "team_builder"])
        .optional(),
    })
  ),
  async (c) => {
    try {
      const { userId } = c.req.param();
      const workspaceId = c.req.query("workspaceId");
      const data = c.req.valid("json");

      if (!workspaceId) {
        return c.json({ error: "workspaceId required" }, 400);
      }

      // TODO: Check if user has permission to record contributions

      const contribution = await recordMajorContribution(userId, workspaceId, data);

      return c.json({ success: true, data: contribution });
    } catch (error: any) {
      logger.error("Error recording contribution:", error);
      return c.json({ error: error.message }, 500);
    }
  }
);

// ========================================
// WORK & ACTIVITY
// ========================================

// Get active projects
smartProfileRoutes.get("/:userId/active-projects", async (c) => {
  try {
    const { userId } = c.req.param();

    const projects = await getUserActiveProjects(userId);

    return c.json({ success: true, data: projects });
  } catch (error: any) {
    logger.error("Error getting active projects:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get recent tasks
smartProfileRoutes.get("/:userId/recent-tasks", async (c) => {
  try {
    const { userId } = c.req.param();

    const tasksData = await getUserRecentTasks(userId);

    return c.json({ success: true, data: tasksData });
  } catch (error: any) {
    logger.error("Error getting recent tasks:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get activity feed
smartProfileRoutes.get("/:userId/activity", async (c) => {
  try {
    const { userId } = c.req.param();
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");

    const activities = await getUserActivityFeed(userId, { limit, offset });

    return c.json({ success: true, data: activities });
  } catch (error: any) {
    logger.error("Error getting activity feed:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get current workload
smartProfileRoutes.get("/:userId/workload", async (c) => {
  try {
    const { userId } = c.req.param();

    const workload = await getUserWorkload(userId);

    return c.json({ success: true, data: workload });
  } catch (error: any) {
    logger.error("Error getting workload:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Get team collaborations
smartProfileRoutes.get("/:userId/teams", async (c) => {
  try {
    const { userId } = c.req.param();

    const teamsData = await getUserTeamCollaborations(userId);

    return c.json({ success: true, data: teamsData });
  } catch (error: any) {
    logger.error("Error getting team collaborations:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========================================
// COMBINED ANALYTICS
// ========================================

// Get complete analytics (all data)
smartProfileRoutes.get("/:userId/analytics", async (c) => {
  try {
    const { userId } = c.req.param();
    const currentUserId = c.get("userId");

    // Only allow viewing own analytics
    if (userId !== currentUserId) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const [
      viewStats,
      statistics,
      suggestions,
      completenessScore,
      collaborators,
      badges,
      availability,
    ] = await Promise.all([
      getProfileViewStats(userId),
      getUserStatistics(userId),
      getProfileSuggestions(userId),
      calculateCompletenessScore(userId),
      getFrequentCollaborators(userId, 5),
      getUserBadges(userId),
      getUserAvailability(userId),
    ]);

    return c.json({
      success: true,
      data: {
        views: viewStats,
        statistics,
        suggestions,
        completenessScore,
        collaborators,
        badges,
        availability: {
          ...availability,
          currentLocalTime: getCurrentLocalTime(availability.timezone || "UTC"),
          inWorkingHours: isInWorkingHours(availability),
        },
      },
    });
  } catch (error: any) {
    logger.error("Error getting analytics:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default smartProfileRoutes;

