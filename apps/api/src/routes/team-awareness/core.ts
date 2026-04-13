/**
 * Team Awareness API Routes
 * Activity tracking, status, kudos, mood, and skills
 * Phase 2 - Team Awareness Features
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ActivityTracker } from '../../services/team-awareness/activity-tracker';
import { UserStatusService } from '../../services/team-awareness/user-status-service';
import { KudosService } from '../../services/team-awareness/kudos-service';
import { MoodTrackerService } from '../../services/team-awareness/mood-tracker-service';
import { SkillsService } from '../../services/team-awareness/skills-service';
import { Logger } from '../../services/logging/logger';

const teamAwareness = new Hono();

// ========================================
// ACTIVITY TRACKING
// ========================================

/**
 * GET /api/team-awareness/activity
 * Get recent activities
 */
teamAwareness.get(
  '/activity',
  zValidator(
    'query',
    z.object({
      workspaceId: z.string(),
      userId: z.string().optional(),
      projectId: z.string().optional(),
      entityType: z.string().optional(),
      limit: z.string().optional().transform(Number),
      offset: z.string().optional().transform(Number),
    })
  ),
  async (c) => {
    try {
      const query = c.req.valid('query');
      
      const activities = await ActivityTracker.getActivities({
        workspaceId: query.workspaceId,
        userId: query.userId,
        projectId: query.projectId,
        entityType: query.entityType,
        limit: query.limit,
        offset: query.offset,
      });

      return c.json({ activities });
    } catch (error: any) {
      Logger.error('Get activities failed', error);
      return c.json({ error: 'Failed to get activities' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/activity/stats
 * Get activity statistics
 */
teamAwareness.get(
  '/activity/stats',
  zValidator(
    'query',
    z.object({
      workspaceId: z.string(),
      userId: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const { workspaceId, userId } = c.req.valid('query');
      
      const stats = await ActivityTracker.getActivityStats(workspaceId, userId);

      return c.json(stats);
    } catch (error: any) {
      Logger.error('Get activity stats failed', error);
      return c.json({ error: 'Failed to get activity stats' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/activity/top-users
 * Get most active users
 */
teamAwareness.get(
  '/activity/top-users',
  zValidator(
    'query',
    z.object({
      workspaceId: z.string(),
      limit: z.string().optional().transform(Number),
    })
  ),
  async (c) => {
    try {
      const { workspaceId, limit } = c.req.valid('query');
      
      const topUsers = await ActivityTracker.getMostActiveUsers(workspaceId, limit);

      return c.json({ topUsers });
    } catch (error: any) {
      Logger.error('Get top users failed', error);
      return c.json({ error: 'Failed to get top users' }, 500);
    }
  }
);

// ========================================
// USER STATUS
// ========================================

/**
 * PUT /api/team-awareness/status
 * Update user status
 */
teamAwareness.put(
  '/status',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      workspaceId: z.string(),
      status: z.enum(['online', 'away', 'busy', 'offline', 'in-meeting', 'focus']),
      statusMessage: z.string().optional(),
      statusEmoji: z.string().optional(),
      clearAt: z.string().optional().transform(d => d ? new Date(d) : undefined),
      currentProjectId: z.string().optional(),
      currentTaskId: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid('json');
      
      await UserStatusService.updateStatus(data);

      return c.json({ success: true });
    } catch (error: any) {
      Logger.error('Update status failed', error);
      return c.json({ error: 'Failed to update status' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/status/:userId
 * Get user status
 */
teamAwareness.get('/status/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const status = await UserStatusService.getUserStatus(userId, workspaceId);

    return c.json(status);
  } catch (error: any) {
    Logger.error('Get user status failed', error);
    return c.json({ error: 'Failed to get user status' }, 500);
  }
});

/**
 * GET /api/team-awareness/status/workspace/:workspaceId
 * Get all workspace statuses
 */
teamAwareness.get('/status/workspace/:workspaceId', async (c) => {
  try {
    const workspaceId = c.req.param('workspaceId');
    
    const statuses = await UserStatusService.getWorkspaceStatuses(workspaceId);

    return c.json({ statuses });
  } catch (error: any) {
    Logger.error('Get workspace statuses failed', error);
    return c.json({ error: 'Failed to get workspace statuses' }, 500);
  }
});

/**
 * POST /api/team-awareness/status/heartbeat
 * Update last seen
 */
teamAwareness.post(
  '/status/heartbeat',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      workspaceId: z.string(),
      currentProjectId: z.string().optional(),
      currentTaskId: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const { userId, workspaceId, currentProjectId, currentTaskId } = c.req.valid('json');
      
      await UserStatusService.heartbeat(userId, workspaceId, currentProjectId, currentTaskId);

      return c.json({ success: true });
    } catch (error: any) {
      Logger.error('Heartbeat failed', error);
      return c.json({ error: 'Heartbeat failed' }, 500);
    }
  }
);

// ========================================
// KUDOS
// ========================================

/**
 * POST /api/team-awareness/kudos
 * Give kudos
 */
teamAwareness.post(
  '/kudos',
  zValidator(
    'json',
    z.object({
      workspaceId: z.string(),
      projectId: z.string().optional(),
      giverId: z.string(),
      receiverId: z.string(),
      type: z.enum(['great-work', 'helpful', 'creative', 'teamwork', 'leadership', 'problem-solving']),
      message: z.string().min(1).max(500),
      relatedEntityType: z.enum(['task', 'project', 'sprint']).optional(),
      relatedEntityId: z.string().optional(),
      isPublic: z.boolean().optional(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid('json');
      
      const kudos = await KudosService.giveKudos(data);

      return c.json({ kudos }, 201);
    } catch (error: any) {
      Logger.error('Give kudos failed', error);
      return c.json({ error: 'Failed to give kudos' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/kudos
 * Get kudos
 */
teamAwareness.get(
  '/kudos',
  zValidator(
    'query',
    z.object({
      workspaceId: z.string(),
      userId: z.string().optional(),
      projectId: z.string().optional(),
      type: z.string().optional(),
      limit: z.string().optional().transform(Number),
    })
  ),
  async (c) => {
    try {
      const query = c.req.valid('query');
      
      const kudos = await KudosService.getKudos(query as any);

      return c.json({ kudos });
    } catch (error: any) {
      Logger.error('Get kudos failed', error);
      return c.json({ error: 'Failed to get kudos' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/kudos/received/:userId
 * Get received kudos
 */
teamAwareness.get('/kudos/received/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const workspaceId = c.req.query('workspaceId');
    const limit = Number(c.req.query('limit') || 20);

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const kudos = await KudosService.getReceivedKudos(userId, workspaceId, limit);

    return c.json({ kudos });
  } catch (error: any) {
    Logger.error('Get received kudos failed', error);
    return c.json({ error: 'Failed to get received kudos' }, 500);
  }
});

/**
 * GET /api/team-awareness/kudos/stats/:userId
 * Get kudos statistics
 */
teamAwareness.get('/kudos/stats/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const stats = await KudosService.getKudosStats(userId, workspaceId);

    return c.json(stats);
  } catch (error: any) {
    Logger.error('Get kudos stats failed', error);
    return c.json({ error: 'Failed to get kudos stats' }, 500);
    }
  }
);

/**
 * POST /api/team-awareness/kudos/:kudosId/react
 * Add reaction to kudos
 */
teamAwareness.post(
  '/kudos/:kudosId/react',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      emoji: z.string(),
    })
  ),
  async (c) => {
    try {
      const kudosId = c.req.param('kudosId');
      const { userId, emoji } = c.req.valid('json');
      
      const reactions = await KudosService.addReaction(kudosId, userId, emoji);

      return c.json({ reactions });
    } catch (error: any) {
      Logger.error('Add kudos reaction failed', error);
      return c.json({ error: 'Failed to add reaction' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/kudos/leaderboard
 * Get kudos leaderboard
 */
teamAwareness.get('/kudos/leaderboard', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const limit = Number(c.req.query('limit') || 10);

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const leaderboard = await KudosService.getTopReceivers(workspaceId, limit);

    return c.json({ leaderboard });
  } catch (error: any) {
    Logger.error('Get kudos leaderboard failed', error);
    return c.json({ error: 'Failed to get leaderboard' }, 500);
  }
});

// ========================================
// MOOD TRACKER
// ========================================

/**
 * POST /api/team-awareness/mood
 * Log mood
 */
teamAwareness.post(
  '/mood',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      workspaceId: z.string(),
      projectId: z.string().optional(),
      mood: z.enum(['great', 'good', 'okay', 'stressed', 'overwhelmed', 'frustrated']),
      moodScore: z.number().min(1).max(5),
      note: z.string().optional(),
      tags: z.array(z.string()).optional(),
      workloadLevel: z.enum(['light', 'balanced', 'heavy', 'overloaded']).optional(),
      isAnonymous: z.boolean().optional(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid('json');
      
      const mood = await MoodTrackerService.logMood(data);

      return c.json({ mood }, 201);
    } catch (error: any) {
      Logger.error('Log mood failed', error);
      return c.json({ error: 'Failed to log mood' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/mood/user/:userId
 * Get user mood history
 */
teamAwareness.get('/mood/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const workspaceId = c.req.query('workspaceId');
    const days = Number(c.req.query('days') || 30);

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const history = await MoodTrackerService.getUserMoodHistory(userId, workspaceId, days);

    return c.json({ history });
  } catch (error: any) {
    Logger.error('Get mood history failed', error);
    return c.json({ error: 'Failed to get mood history' }, 500);
  }
});

/**
 * GET /api/team-awareness/mood/stats
 * Get workspace mood statistics
 */
teamAwareness.get('/mood/stats', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const days = Number(c.req.query('days') || 7);

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const stats = await MoodTrackerService.getWorkspaceMoodStats(workspaceId, days);

    return c.json(stats);
  } catch (error: any) {
    Logger.error('Get mood stats failed', error);
    return c.json({ error: 'Failed to get mood stats' }, 500);
  }
});

/**
 * GET /api/team-awareness/mood/trend
 * Get mood trend
 */
teamAwareness.get('/mood/trend', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const days = Number(c.req.query('days') || 30);

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const trend = await MoodTrackerService.getMoodTrend(workspaceId, days);

    return c.json({ trend });
  } catch (error: any) {
    Logger.error('Get mood trend failed', error);
    return c.json({ error: 'Failed to get mood trend' }, 500);
  }
});

/**
 * GET /api/team-awareness/mood/morale
 * Get team morale indicator
 */
teamAwareness.get('/mood/morale', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const morale = await MoodTrackerService.getTeamMoraleIndicator(workspaceId);

    return c.json(morale);
  } catch (error: any) {
    Logger.error('Get team morale failed', error);
    return c.json({ error: 'Failed to get team morale' }, 500);
  }
});

// ========================================
// SKILLS
// ========================================

/**
 * POST /api/team-awareness/skills
 * Add skill
 */
teamAwareness.post(
  '/skills',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      workspaceId: z.string(),
      skillName: z.string().min(1).max(100),
      skillCategory: z.enum(['frontend', 'backend', 'design', 'management', 'devops', 'data', 'mobile', 'other']).optional(),
      proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      proficiencyScore: z.number().min(1).max(5),
      yearsOfExperience: z.number().optional(),
      isPublic: z.boolean().optional(),
    })
  ),
  async (c) => {
    try {
      const data = c.req.valid('json');
      
      const skill = await SkillsService.addSkill(data);

      return c.json({ skill }, 201);
    } catch (error: any) {
      Logger.error('Add skill failed', error);
      return c.json({ error: 'Failed to add skill' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/skills/user/:userId
 * Get user skills
 */
teamAwareness.get('/skills/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const skills = await SkillsService.getUserSkills(userId, workspaceId);

    return c.json({ skills });
  } catch (error: any) {
    Logger.error('Get user skills failed', error);
    return c.json({ error: 'Failed to get user skills' }, 500);
  }
});

/**
 * GET /api/team-awareness/skills/search
 * Search skills
 */
teamAwareness.get(
  '/skills/search',
  zValidator(
    'query',
    z.object({
      workspaceId: z.string(),
      skillName: z.string().optional(),
      skillCategory: z.string().optional(),
      proficiencyLevel: z.string().optional(),
      minProficiencyScore: z.string().optional().transform(Number),
    })
  ),
  async (c) => {
    try {
      const filters = c.req.valid('query');
      
      const skills = await SkillsService.searchSkills(filters as any);

      return c.json({ skills });
    } catch (error: any) {
      Logger.error('Search skills failed', error);
      return c.json({ error: 'Failed to search skills' }, 500);
    }
  }
);

/**
 * POST /api/team-awareness/skills/:skillId/endorse
 * Endorse skill
 */
teamAwareness.post(
  '/skills/:skillId/endorse',
  zValidator(
    'json',
    z.object({
      endorserId: z.string(),
      comment: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const skillId = c.req.param('skillId');
      const data = c.req.valid('json');
      
      const endorsements = await SkillsService.endorseSkill({
        skillId,
        ...data,
      });

      return c.json({ endorsements });
    } catch (error: any) {
      Logger.error('Endorse skill failed', error);
      return c.json({ error: 'Failed to endorse skill' }, 500);
    }
  }
);

/**
 * POST /api/team-awareness/skills/:skillId/verify
 * Verify skill
 */
teamAwareness.post(
  '/skills/:skillId/verify',
  zValidator(
    'json',
    z.object({
      verifierId: z.string(),
    })
  ),
  async (c) => {
    try {
      const skillId = c.req.param('skillId');
      const { verifierId } = c.req.valid('json');
      
      await SkillsService.verifySkill(skillId, verifierId);

      return c.json({ success: true });
    } catch (error: any) {
      Logger.error('Verify skill failed', error);
      return c.json({ error: 'Failed to verify skill' }, 500);
    }
  }
);

/**
 * GET /api/team-awareness/skills/matrix
 * Get skill matrix
 */
teamAwareness.get('/skills/matrix', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const matrix = await SkillsService.getSkillMatrix(workspaceId);

    return c.json({ matrix });
  } catch (error: any) {
    Logger.error('Get skill matrix failed', error);
    return c.json({ error: 'Failed to get skill matrix' }, 500);
  }
});

/**
 * GET /api/team-awareness/skills/popular
 * Get popular skills
 */
teamAwareness.get('/skills/popular', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const limit = Number(c.req.query('limit') || 10);

    if (!workspaceId) {
      return c.json({ error: 'workspaceId is required' }, 400);
    }

    const popularSkills = await SkillsService.getPopularSkills(workspaceId, limit);

    return c.json({ popularSkills });
  } catch (error: any) {
    Logger.error('Get popular skills failed', error);
    return c.json({ error: 'Failed to get popular skills' }, 500);
  }
});

/**
 * GET /api/team-awareness/skills/experts
 * Find skill experts
 */
teamAwareness.get('/skills/experts', async (c) => {
  try {
    const workspaceId = c.req.query('workspaceId');
    const skillName = c.req.query('skillName');

    if (!workspaceId || !skillName) {
      return c.json({ error: 'workspaceId and skillName are required' }, 400);
    }

    const experts = await SkillsService.findExperts(workspaceId, skillName);

    return c.json({ experts });
  } catch (error: any) {
    Logger.error('Find experts failed', error);
    return c.json({ error: 'Failed to find experts' }, 500);
  }
});

export default teamAwareness;


