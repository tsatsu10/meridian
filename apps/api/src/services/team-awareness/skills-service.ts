/**
 * Skills Service
 * Team member skills and expertise management
 * Phase 2 - Team Awareness Features
 */

import { getDatabase } from '../../database/connection';
import { userSkills } from '../../database/schema/team-awareness';
import { users } from '../../database/schema';
import { eq, desc, and, sql, inArray, like } from 'drizzle-orm';
import { Logger } from '../logging/logger';
import { CacheService, CacheTTL } from '../cache/cache-service';
import { createId } from '@paralleldrive/cuid2';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SkillCategory = 'frontend' | 'backend' | 'design' | 'management' | 'devops' | 'data' | 'mobile' | 'other';

export interface AddSkillParams {
  userId: string;
  workspaceId: string;
  skillName: string;
  skillCategory?: SkillCategory;
  proficiencyLevel: ProficiencyLevel;
  proficiencyScore: number; // 1-5
  yearsOfExperience?: number;
  isPublic?: boolean;
}

export interface EndorseSkillParams {
  skillId: string;
  endorserId: string;
  comment?: string;
}

export interface SkillFilters {
  workspaceId: string;
  userId?: string;
  skillName?: string;
  skillCategory?: SkillCategory;
  proficiencyLevel?: ProficiencyLevel;
  minProficiencyScore?: number;
  isVerified?: boolean;
  isPublic?: boolean;
}

/**
 * Skills Service
 */
export class SkillsService {
  private static getDb() {
    return getDatabase();
  }

  /**
   * Proficiency level to score mapping
   */
  private static readonly PROFICIENCY_SCORES: Record<ProficiencyLevel, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 5,
  };

  /**
   * Add skill to user profile
   */
  static async addSkill(params: AddSkillParams) {
    try {
      const skillId = createId();

      const [newSkill] = await this.getDb()
        .insert(userSkills)
        .values({
          id: skillId,
          userId: params.userId,
          workspaceId: params.workspaceId,
          skillName: params.skillName,
          skillCategory: params.skillCategory,
          proficiencyLevel: params.proficiencyLevel,
          proficiencyScore: params.proficiencyScore,
          yearsOfExperience: params.yearsOfExperience,
          isPublic: params.isPublic ?? true,
          endorsements: [],
          endorsementCount: 0,
        })
        .returning();

      // Invalidate caches
      await CacheService.invalidatePattern(`skills:user:${params.userId}*`);
      await CacheService.invalidatePattern(`skills:workspace:${params.workspaceId}*`);

      Logger.business('Skill added', {
        userId: params.userId,
        skillName: params.skillName,
        proficiencyLevel: params.proficiencyLevel,
      });

      return newSkill;
    } catch (error) {
      Logger.error('Failed to add skill', error, params);
      throw error;
    }
  }

  /**
   * Get user skills
   */
  static async getUserSkills(userId: string, workspaceId: string) {
    const cacheKey = `skills:user:${userId}:${workspaceId}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const skills = await this.getDb()
          .select()
          .from(userSkills)
          .where(
            and(
              eq(userSkills.userId, userId),
              eq(userSkills.workspaceId, workspaceId)
            )
          )
          .orderBy(desc(userSkills.proficiencyScore), userSkills.skillName);

        return skills;
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Search skills with filters
   */
  static async searchSkills(filters: SkillFilters) {
    const cacheKey = `skills:search:${filters.workspaceId}:${JSON.stringify(filters)}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const conditions = [eq(userSkills.workspaceId, filters.workspaceId)];

        if (filters.userId) {
          conditions.push(eq(userSkills.userId, filters.userId));
        }

        if (filters.skillName) {
          conditions.push(like(userSkills.skillName, `%${filters.skillName}%`));
        }

        if (filters.skillCategory) {
          conditions.push(eq(userSkills.skillCategory, filters.skillCategory));
        }

        if (filters.proficiencyLevel) {
          conditions.push(eq(userSkills.proficiencyLevel, filters.proficiencyLevel));
        }

        if (filters.minProficiencyScore) {
          conditions.push(sql`${userSkills.proficiencyScore} >= ${filters.minProficiencyScore}`);
        }

        if (filters.isVerified !== undefined) {
          conditions.push(eq(userSkills.isVerified, filters.isVerified));
        }

        if (filters.isPublic !== undefined) {
          conditions.push(eq(userSkills.isPublic, filters.isPublic));
        }

        const skills = await this.getDb()
          .select({
            id: userSkills.id,
            userId: userSkills.userId,
            workspaceId: userSkills.workspaceId,
            skillName: userSkills.skillName,
            skillCategory: userSkills.skillCategory,
            proficiencyLevel: userSkills.proficiencyLevel,
            proficiencyScore: userSkills.proficiencyScore,
            yearsOfExperience: userSkills.yearsOfExperience,
            isVerified: userSkills.isVerified,
            verifiedBy: userSkills.verifiedBy,
            verifiedAt: userSkills.verifiedAt,
            endorsements: userSkills.endorsements,
            endorsementCount: userSkills.endorsementCount,
            isPublic: userSkills.isPublic,
            createdAt: userSkills.createdAt,
            updatedAt: userSkills.updatedAt,
            user: {
              id: users.id,
              username: users.name,
              email: users.email,
              avatarUrl: users.avatar,
            },
          })
          .from(userSkills)
          .leftJoin(users, eq(userSkills.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(userSkills.proficiencyScore), userSkills.skillName);

        return skills;
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Endorse skill
   */
  static async endorseSkill(params: EndorseSkillParams) {
    try {
      const [skill] = await this.getDb()
        .select()
        .from(userSkills)
        .where(eq(userSkills.id, params.skillId))
        .limit(1);

      if (!skill) {
        throw new Error('Skill not found');
      }

      const endorsements = (skill.endorsements as any[]) || [];

      // Check if already endorsed
      const existingIndex = endorsements.findIndex(
        (e: any) => e.userId === params.endorserId
      );

      if (existingIndex > -1) {
        // Update existing endorsement
        endorsements[existingIndex] = {
          userId: params.endorserId,
          comment: params.comment,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Add new endorsement
        endorsements.push({
          userId: params.endorserId,
          comment: params.comment,
          createdAt: new Date().toISOString(),
        });
      }

      await this.getDb()
        .update(userSkills)
        .set({
          endorsements,
          endorsementCount: endorsements.length,
          updatedAt: new Date(),
        })
        .where(eq(userSkills.id, params.skillId));

      // Invalidate caches
      await CacheService.invalidatePattern(`skills:user:${skill.userId}*`);
      await CacheService.invalidatePattern(`skills:workspace:${skill.workspaceId}*`);

      Logger.business('Skill endorsed', {
        skillId: params.skillId,
        endorserId: params.endorserId,
      });

      return endorsements;
    } catch (error) {
      Logger.error('Failed to endorse skill', error, params);
      throw error;
    }
  }

  /**
   * Verify skill (by manager/team lead)
   */
  static async verifySkill(skillId: string, verifierId: string) {
    try {
      const [skill] = await this.getDb()
        .select()
        .from(userSkills)
        .where(eq(userSkills.id, skillId))
        .limit(1);

      if (!skill) {
        throw new Error('Skill not found');
      }

      await this.getDb()
        .update(userSkills)
        .set({
          isVerified: true,
          verifiedBy: verifierId,
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSkills.id, skillId));

      // Invalidate caches
      await CacheService.invalidatePattern(`skills:user:${skill.userId}*`);
      await CacheService.invalidatePattern(`skills:workspace:${skill.workspaceId}*`);

      Logger.business('Skill verified', { skillId, verifierId });
    } catch (error) {
      Logger.error('Failed to verify skill', error, { skillId, verifierId });
      throw error;
    }
  }

  /**
   * Update skill
   */
  static async updateSkill(
    skillId: string,
    updates: Partial<{
      proficiencyLevel: ProficiencyLevel;
      proficiencyScore: number;
      yearsOfExperience: number;
      isPublic: boolean;
      skillCategory: SkillCategory;
    }>
  ) {
    try {
      const [skill] = await this.getDb()
        .select()
        .from(userSkills)
        .where(eq(userSkills.id, skillId))
        .limit(1);

      if (!skill) {
        throw new Error('Skill not found');
      }

      await this.getDb()
        .update(userSkills)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(userSkills.id, skillId));

      // Invalidate caches
      await CacheService.invalidatePattern(`skills:user:${skill.userId}*`);
      await CacheService.invalidatePattern(`skills:workspace:${skill.workspaceId}*`);

      Logger.info('Skill updated', { skillId, updates });
    } catch (error) {
      Logger.error('Failed to update skill', error, { skillId, updates });
      throw error;
    }
  }

  /**
   * Delete skill
   */
  static async deleteSkill(skillId: string, userId: string) {
    try {
      const [skill] = await this.getDb()
        .select()
        .from(userSkills)
        .where(eq(userSkills.id, skillId))
        .limit(1);

      if (!skill) {
        throw new Error('Skill not found');
      }

      // Only skill owner can delete
      if (skill.userId !== userId) {
        throw new Error('Only the skill owner can delete');
      }

      await this.getDb().delete(userSkills).where(eq(userSkills.id, skillId));

      // Invalidate caches
      await CacheService.invalidatePattern(`skills:user:${skill.userId}*`);
      await CacheService.invalidatePattern(`skills:workspace:${skill.workspaceId}*`);

      Logger.info('Skill deleted', { skillId, userId });
    } catch (error) {
      Logger.error('Failed to delete skill', error, { skillId, userId });
      throw error;
    }
  }

  /**
   * Get skill matrix (all skills in workspace)
   */
  static async getSkillMatrix(workspaceId: string) {
    const cacheKey = `skills:workspace:${workspaceId}:matrix`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const skills = await this.searchSkills({
          workspaceId,
          isPublic: true,
        });

        // Group by skill name
        const matrix: Record<string, any[]> = {};

        for (const skill of skills) {
          if (!matrix[skill.skillName]) {
            matrix[skill.skillName] = [];
          }
          matrix[skill.skillName].push(skill);
        }

        // Sort by proficiency
        for (const skillName in matrix) {
          matrix[skillName].sort((a, b) => b.proficiencyScore - a.proficiencyScore);
        }

        return matrix;
      },
      CacheTTL.LONG
    );
  }

  /**
   * Get most common skills
   */
  static async getPopularSkills(workspaceId: string, limit: number = 10) {
    const cacheKey = `skills:workspace:${workspaceId}:popular`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const popularSkills = await this.getDb()
          .select({
            skillName: userSkills.skillName,
            count: sql<number>`count(*)::int`,
            avgProficiency: sql<number>`AVG(${userSkills.proficiencyScore})::float`,
          })
          .from(userSkills)
          .where(eq(userSkills.workspaceId, workspaceId))
          .groupBy(userSkills.skillName)
          .orderBy(desc(sql`count(*)`))
          .limit(limit);

        return popularSkills;
      },
      CacheTTL.LONG
    );
  }

  /**
   * Find experts (users with advanced/expert level skills)
   */
  static async findExperts(workspaceId: string, skillName: string) {
    const cacheKey = `skills:experts:${workspaceId}:${skillName}`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const experts = await this.searchSkills({
          workspaceId,
          skillName,
          minProficiencyScore: 3, // Advanced or Expert
          isPublic: true,
        });

        return experts;
      },
      CacheTTL.MEDIUM
    );
  }

  /**
   * Get skill gaps (skills with low coverage)
   */
  static async getSkillGaps(workspaceId: string, threshold: number = 2) {
    const cacheKey = `skills:workspace:${workspaceId}:gaps`;

    return CacheService.getOrCompute(
      cacheKey,
      async () => {
        const skillCounts = await this.getDb()
          .select({
            skillName: userSkills.skillName,
            count: sql<number>`count(*)::int`,
            avgProficiency: sql<number>`AVG(${userSkills.proficiencyScore})::float`,
          })
          .from(userSkills)
          .where(eq(userSkills.workspaceId, workspaceId))
          .groupBy(userSkills.skillName);

        // Find skills with low coverage or low proficiency
        const gaps = skillCounts.filter(
          skill => skill.count < threshold || skill.avgProficiency < 2.5
        );

        return gaps;
      },
      CacheTTL.LONG
    );
  }
}

export default SkillsService;



