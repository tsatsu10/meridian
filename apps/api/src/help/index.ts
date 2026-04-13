// @epic-3.5-communication: Help & Documentation System
// Real content integration with CMS-like functionality

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDatabase } from "../database/connection";
import {
  helpArticles,
  helpFAQs,
  helpArticleViews,
  helpSearchQueries,
  helpArticleComments,
  users
} from "../database/schema";
import { eq, and, or, desc, asc, sql, like, ilike, isNull } from "drizzle-orm";
import { auth } from "../middlewares/auth";
import logger from '../utils/logger';

const helpRouter = new Hono();

// ============================================================================
// Validation Schemas
// ============================================================================

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  type: z.enum(['article', 'video', 'faq']).optional(),
  tags: z.string().optional(), // comma-separated
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
});

const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
});

const feedbackSchema = z.object({
  helpful: z.boolean(),
});

const trackViewSchema = z.object({
  timeSpent: z.number().optional(),
  completed: z.boolean().optional(),
});

// ============================================================================
// GET /help/articles - Search and filter articles
// ============================================================================
helpRouter.get(
  "/articles",
  zValidator("query", searchSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { q, category, difficulty, type, tags, limit, offset } = c.req.valid("query");

      let query = db
        .select({
          id: helpArticles.id,
          title: helpArticles.title,
          slug: helpArticles.slug,
          description: helpArticles.description,
          category: helpArticles.category,
          difficulty: helpArticles.difficulty,
          contentType: helpArticles.contentType,
          readTime: helpArticles.readTime,
          rating: helpArticles.rating,
          ratingCount: helpArticles.ratingCount,
          views: helpArticles.views,
          helpful: helpArticles.helpful,
          tags: helpArticles.tags,
          metadata: helpArticles.metadata,
          publishedAt: helpArticles.publishedAt,
          updatedAt: helpArticles.updatedAt,
        })
        .from(helpArticles)
        .where(eq(helpArticles.isPublished, true));

      // Apply filters
      const conditions = [eq(helpArticles.isPublished, true)];

      if (category) {
        conditions.push(eq(helpArticles.category, category as any));
      }

      if (difficulty) {
        conditions.push(eq(helpArticles.difficulty, difficulty as any));
      }

      if (type) {
        conditions.push(eq(helpArticles.contentType, type as any));
      }

      if (q) {
        // Full-text search across title, description, and content
        conditions.push(
          or(
            ilike(helpArticles.title, `%${q}%`),
            ilike(helpArticles.description, `%${q}%`),
            ilike(helpArticles.content, `%${q}%`)
          ) as any
        );
      }

      // Apply all conditions
      if (conditions.length > 1) {
        query = query.where(and(...conditions) as any) as any;
      }

      // Order by relevance (views + rating) and recency
      query = query
        .orderBy(desc(helpArticles.views), desc(helpArticles.publishedAt))
        .limit(limit)
        .offset(offset) as any;

      const articles = await query;

      // Track search query if provided
      if (q) {
        const user = c.get("user");
        await db.insert(helpSearchQueries).values({
          query: q,
          userId: user?.id || null,
          resultsCount: articles.length,
        }).catch(() => {
          // Non-critical, don't fail the request
        });
      }

      // Calculate average rating for display
      const articlesWithRating = articles.map((article: any) => ({
        ...article,
        rating: article.ratingCount > 0 ? article.rating / 10 : 0,
      }));

      return c.json({
        success: true,
        data: articlesWithRating,
        pagination: {
          limit,
          offset,
          total: articles.length,
        },
      });
    } catch (error) {
      logger.error("Error fetching articles:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch articles",
        },
        500
      );
    }
  }
);

// ============================================================================
// GET /help/articles/:slug - Get single article by slug
// ============================================================================
helpRouter.get(
  "/articles/:slug",
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { slug } = c.req.param();
      const user = c.get("user");

      const [article] = await db
        .select()
        .from(helpArticles)
        .where(
          and(
            eq(helpArticles.slug, slug),
            eq(helpArticles.isPublished, true)
          )
        )
        .limit(1);

      if (!article) {
        return c.json(
          {
            success: false,
            error: "Article not found",
          },
          404
        );
      }

      // Increment view count
      await db
        .update(helpArticles)
        .set({ views: sql`${helpArticles.views} + 1` })
        .where(eq(helpArticles.id, article.id));

      // Track view for analytics
      await db.insert(helpArticleViews).values({
        articleId: article.id,
        userId: user?.id || null,
        sessionId: c.req.header("x-session-id") || null,
      }).catch(() => {
        // Non-critical
      });

      // Calculate display rating
      const displayArticle = {
        ...article,
        rating: article.ratingCount > 0 ? article.rating / 10 : 0,
      };

      return c.json({
        success: true,
        data: displayArticle,
      });
    } catch (error) {
      logger.error("Error fetching article:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch article",
        },
        500
      );
    }
  }
);

// ============================================================================
// POST /help/articles/:id/rate - Rate an article
// ============================================================================
helpRouter.post(
  "/articles/:id/rate",
  zValidator("json", ratingSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { rating } = c.req.valid("json");

      const [article] = await db
        .select()
        .from(helpArticles)
        .where(eq(helpArticles.id, id))
        .limit(1);

      if (!article) {
        return c.json(
          {
            success: false,
            error: "Article not found",
          },
          404
        );
      }

      // Calculate new rating (rating is stored * 10 for precision)
      const currentTotal = article.rating * article.ratingCount;
      const newCount = article.ratingCount + 1;
      const newTotal = currentTotal + (rating * 10);
      const newAverage = Math.round(newTotal / newCount);

      await db
        .update(helpArticles)
        .set({
          rating: newAverage,
          ratingCount: newCount,
        })
        .where(eq(helpArticles.id, id));

      return c.json({
        success: true,
        data: {
          rating: newAverage / 10,
          ratingCount: newCount,
        },
      });
    } catch (error) {
      logger.error("Error rating article:", error);
      return c.json(
        {
          success: false,
          error: "Failed to rate article",
        },
        500
      );
    }
  }
);

// ============================================================================
// POST /help/articles/:id/feedback - Mark article as helpful/not helpful
// ============================================================================
helpRouter.post(
  "/articles/:id/feedback",
  zValidator("json", feedbackSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { helpful } = c.req.valid("json");

      const field = helpful ? "helpful" : "notHelpful";

      await db
        .update(helpArticles)
        .set({
          [field]: sql`${helpArticles[field]} + 1`,
        })
        .where(eq(helpArticles.id, id));

      return c.json({
        success: true,
        message: "Feedback recorded",
      });
    } catch (error) {
      logger.error("Error recording feedback:", error);
      return c.json(
        {
          success: false,
          error: "Failed to record feedback",
        },
        500
      );
    }
  }
);

// ============================================================================
// GET /help/faqs - Get all FAQs
// ============================================================================
helpRouter.get(
  "/faqs",
  zValidator("query", z.object({
    category: z.string().optional(),
    q: z.string().optional(),
  })),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { category, q } = c.req.valid("query");

      let query = db
        .select()
        .from(helpFAQs)
        .where(eq(helpFAQs.isPublished, true));

      const conditions = [eq(helpFAQs.isPublished, true)];

      if (category) {
        conditions.push(eq(helpFAQs.category, category));
      }

      if (q) {
        conditions.push(
          or(
            ilike(helpFAQs.question, `%${q}%`),
            ilike(helpFAQs.answer, `%${q}%`)
          ) as any
        );
      }

      if (conditions.length > 1) {
        query = query.where(and(...conditions) as any) as any;
      }

      const faqs = await query.orderBy(asc(helpFAQs.displayOrder), desc(helpFAQs.helpful));

      return c.json({
        success: true,
        data: faqs,
      });
    } catch (error) {
      logger.error("Error fetching FAQs:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch FAQs",
        },
        500
      );
    }
  }
);

// ============================================================================
// POST /help/faqs/:id/feedback - Mark FAQ as helpful
// ============================================================================
helpRouter.post(
  "/faqs/:id/feedback",
  zValidator("json", feedbackSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { helpful } = c.req.valid("json");

      const field = helpful ? "helpful" : "notHelpful";

      await db
        .update(helpFAQs)
        .set({
          [field]: sql`${helpFAQs[field]} + 1`,
        })
        .where(eq(helpFAQs.id, id));

      return c.json({
        success: true,
        message: "Feedback recorded",
      });
    } catch (error) {
      logger.error("Error recording FAQ feedback:", error);
      return c.json(
        {
          success: false,
          error: "Failed to record feedback",
        },
        500
      );
    }
  }
);

// ============================================================================
// POST /help/articles/:id/track-view - Track article view completion
// ============================================================================
helpRouter.post(
  "/articles/:id/track-view",
  zValidator("json", trackViewSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { timeSpent, completed } = c.req.valid("json");
      const user = c.get("user");
      const sessionId = c.req.header("x-session-id");

      // Find existing view record
      const conditions = [eq(helpArticleViews.articleId, id)];

      if (user?.id) {
        conditions.push(eq(helpArticleViews.userId, user.id));
      } else if (sessionId) {
        conditions.push(eq(helpArticleViews.sessionId, sessionId));
      }

      const [existingView] = await db
        .select()
        .from(helpArticleViews)
        .where(and(...conditions) as any)
        .limit(1);

      if (existingView) {
        // Update existing view
        await db
          .update(helpArticleViews)
          .set({
            timeSpent: timeSpent || existingView.timeSpent,
            completed: completed !== undefined ? completed : existingView.completed,
          })
          .where(eq(helpArticleViews.id, existingView.id));
      } else {
        // Create new view record
        await db.insert(helpArticleViews).values({
          articleId: id,
          userId: user?.id || null,
          sessionId: sessionId || null,
          timeSpent: timeSpent || 0,
          completed: completed || false,
        });
      }

      return c.json({
        success: true,
        message: "View tracked",
      });
    } catch (error) {
      logger.error("Error tracking view:", error);
      return c.json(
        {
          success: false,
          error: "Failed to track view",
        },
        500
      );
    }
  }
);

// ============================================================================
// GET /help/analytics - Get help content analytics (admin only)
// ============================================================================
helpRouter.get(
  "/analytics",
  auth,
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");

      // Check if user is admin
      if (user.role !== "admin") {
        return c.json(
          {
            success: false,
            error: "Unauthorized",
          },
          403
        );
      }

      // Get top articles by views
      const topArticles = await db
        .select({
          id: helpArticles.id,
          title: helpArticles.title,
          views: helpArticles.views,
          rating: helpArticles.rating,
          helpful: helpArticles.helpful,
        })
        .from(helpArticles)
        .where(eq(helpArticles.isPublished, true))
        .orderBy(desc(helpArticles.views))
        .limit(10);

      // Get recent searches
      const recentSearches = await db
        .select({
          query: helpSearchQueries.query,
          count: sql<number>`count(*)`.as('count'),
        })
        .from(helpSearchQueries)
        .groupBy(helpSearchQueries.query)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

      // Get searches with no results
      const failedSearches = await db
        .select({
          query: helpSearchQueries.query,
          searchedAt: helpSearchQueries.searchedAt,
        })
        .from(helpSearchQueries)
        .where(eq(helpSearchQueries.resultsCount, 0))
        .orderBy(desc(helpSearchQueries.searchedAt))
        .limit(50);

      return c.json({
        success: true,
        data: {
          topArticles,
          recentSearches,
          failedSearches,
        },
      });
    } catch (error) {
      logger.error("Error fetching analytics:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch analytics",
        },
        500
      );
    }
  }
);

// ============================================================================
// Comments Endpoints
// ============================================================================

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  parentId: z.string().optional(),
});

// GET /help/articles/:id/comments - Get comments for an article
helpRouter.get(
  "/articles/:id/comments",
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();

      const comments = await db
        .select({
          id: helpArticleComments.id,
          content: helpArticleComments.content,
          parentId: helpArticleComments.parentId,
          helpful: helpArticleComments.helpful,
          notHelpful: helpArticleComments.notHelpful,
          isEdited: helpArticleComments.isEdited,
          editedAt: helpArticleComments.editedAt,
          createdAt: helpArticleComments.createdAt,
          userId: helpArticleComments.userId,
          userName: users.name,
          userEmail: users.email,
          userAvatar: users.avatar,
        })
        .from(helpArticleComments)
        .leftJoin(users, eq(helpArticleComments.userId, users.id))
        .where(eq(helpArticleComments.articleId, id))
        .orderBy(desc(helpArticleComments.createdAt));

      // Organize comments into threads
      const commentMap = new Map();
      const rootComments: any[] = [];

      comments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      comments.forEach((comment) => {
        const commentNode = commentMap.get(comment.id);
        if (comment.parentId) {
          const parent = commentMap.get(comment.parentId);
          if (parent) {
            parent.replies.push(commentNode);
          }
        } else {
          rootComments.push(commentNode);
        }
      });

      return c.json({
        success: true,
        data: rootComments,
        total: comments.length,
      });
    } catch (error) {
      logger.error("Error fetching comments:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch comments",
        },
        500
      );
    }
  }
);

// POST /help/articles/:id/comments - Add a comment
helpRouter.post(
  "/articles/:id/comments",
  auth,
  zValidator("json", commentSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { content, parentId } = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json(
          {
            success: false,
            error: "Authentication required",
          },
          401
        );
      }

      const [comment] = await db
        .insert(helpArticleComments)
        .values({
          articleId: id,
          userId: user.id,
          content,
          parentId: parentId || null,
        })
        .returning();

      // Get user info
      const [userInfo] = await db
        .select({
          name: users.name,
          email: users.email,
          avatar: users.avatar,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      return c.json({
        success: true,
        data: {
          ...comment,
          userName: userInfo?.name,
          userEmail: userInfo?.email,
          userAvatar: userInfo?.avatar,
          replies: [],
        },
      });
    } catch (error) {
      logger.error("Error creating comment:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create comment",
        },
        500
      );
    }
  }
);

// PUT /help/comments/:id - Edit a comment
helpRouter.put(
  "/comments/:id",
  auth,
  zValidator("json", z.object({ content: z.string().min(1).max(5000) })),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { content } = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json(
          {
            success: false,
            error: "Authentication required",
          },
          401
        );
      }

      // Check ownership
      const [existingComment] = await db
        .select()
        .from(helpArticleComments)
        .where(eq(helpArticleComments.id, id))
        .limit(1);

      if (!existingComment) {
        return c.json(
          {
            success: false,
            error: "Comment not found",
          },
          404
        );
      }

      if (existingComment.userId !== user.id) {
        return c.json(
          {
            success: false,
            error: "Not authorized to edit this comment",
          },
          403
        );
      }

      const [updated] = await db
        .update(helpArticleComments)
        .set({
          content,
          isEdited: true,
          editedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(helpArticleComments.id, id))
        .returning();

      return c.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error("Error updating comment:", error);
      return c.json(
        {
          success: false,
          error: "Failed to update comment",
        },
        500
      );
    }
  }
);

// DELETE /help/comments/:id - Delete a comment
helpRouter.delete(
  "/comments/:id",
  auth,
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const user = c.get("user");

      if (!user) {
        return c.json(
          {
            success: false,
            error: "Authentication required",
          },
          401
        );
      }

      // Check ownership
      const [existingComment] = await db
        .select()
        .from(helpArticleComments)
        .where(eq(helpArticleComments.id, id))
        .limit(1);

      if (!existingComment) {
        return c.json(
          {
            success: false,
            error: "Comment not found",
          },
          404
        );
      }

      if (existingComment.userId !== user.id && user.role !== "admin") {
        return c.json(
          {
            success: false,
            error: "Not authorized to delete this comment",
          },
          403
        );
      }

      await db
        .delete(helpArticleComments)
        .where(eq(helpArticleComments.id, id));

      return c.json({
        success: true,
        message: "Comment deleted",
      });
    } catch (error) {
      logger.error("Error deleting comment:", error);
      return c.json(
        {
          success: false,
          error: "Failed to delete comment",
        },
        500
      );
    }
  }
);

// POST /help/comments/:id/feedback - Vote on comment helpfulness
helpRouter.post(
  "/comments/:id/feedback",
  zValidator("json", z.object({ helpful: z.boolean() })),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const { id } = c.req.param();
      const { helpful } = c.req.valid("json");

      const field = helpful ? "helpful" : "notHelpful";

      await db
        .update(helpArticleComments)
        .set({
          [field]: sql`${helpArticleComments[field]} + 1`,
        })
        .where(eq(helpArticleComments.id, id));

      return c.json({
        success: true,
        message: "Feedback recorded",
      });
    } catch (error) {
      logger.error("Error recording comment feedback:", error);
      return c.json(
        {
          success: false,
          error: "Failed to record feedback",
        },
        500
      );
    }
  }
);

// ============================================================================
// ADMIN ENDPOINTS - Article Management
// ============================================================================

// Validation schema for creating/updating articles
const articleSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  content: z.string().min(50, "Content must be at least 50 characters"),
  category: z.enum(['getting-started', 'features', 'integrations', 'troubleshooting', 'best-practices']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  contentType: z.enum(['article', 'video', 'faq']).default('article'),
  readTime: z.number().optional().default(5),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional().default({}),
  isPublished: z.boolean().optional().default(false),
});

// POST /help/admin/articles - Create new article
helpRouter.post(
  "/admin/articles",
  auth,
  zValidator("json", articleSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");
      if (!user) {
        return c.json({ success: false, error: "Authentication required" }, 401);
      }

      const data = c.req.valid("json");

      // Generate slug from title if not provided
      const slug = data.slug || data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if slug already exists
      const existing = await db
        .select()
        .from(helpArticles)
        .where(eq(helpArticles.slug, slug))
        .limit(1);

      if (existing.length > 0) {
        return c.json(
          { success: false, error: "An article with this slug already exists" },
          409
        );
      }

      const [article] = await db
        .insert(helpArticles)
        .values({
          ...data,
          slug,
          authorId: user.id,
          publishedAt: data.isPublished ? new Date() : null,
        })
        .returning();

      return c.json({
        success: true,
        data: article,
        message: "Article created successfully",
      });
    } catch (error) {
      logger.error("Error creating article:", error);
      return c.json(
        { success: false, error: "Failed to create article" },
        500
      );
    }
  }
);

// PUT /help/admin/articles/:id - Update article
helpRouter.put(
  "/admin/articles/:id",
  auth,
  zValidator("json", articleSchema.partial()),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");
      if (!user) {
        return c.json({ success: false, error: "Authentication required" }, 401);
      }

      const { id } = c.req.param();
      const data = c.req.valid("json");

      // Check if article exists
      const [existing] = await db
        .select()
        .from(helpArticles)
        .where(eq(helpArticles.id, id))
        .limit(1);

      if (!existing) {
        return c.json({ success: false, error: "Article not found" }, 404);
      }

      // Update slug if title changed
      if (data.title && !data.slug) {
        data.slug = data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      // Set publishedAt if publishing for first time
      if (data.isPublished && !existing.publishedAt) {
        (data as any).publishedAt = new Date();
      }

      const [updated] = await db
        .update(helpArticles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(helpArticles.id, id))
        .returning();

      return c.json({
        success: true,
        data: updated,
        message: "Article updated successfully",
      });
    } catch (error) {
      logger.error("Error updating article:", error);
      return c.json(
        { success: false, error: "Failed to update article" },
        500
      );
    }
  }
);

// DELETE /help/admin/articles/:id - Delete article
helpRouter.delete(
  "/admin/articles/:id",
  auth,
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");
      if (!user) {
        return c.json({ success: false, error: "Authentication required" }, 401);
      }

      const { id } = c.req.param();

      const [deleted] = await db
        .delete(helpArticles)
        .where(eq(helpArticles.id, id))
        .returning();

      if (!deleted) {
        return c.json({ success: false, error: "Article not found" }, 404);
      }

      return c.json({
        success: true,
        message: "Article deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting article:", error);
      return c.json(
        { success: false, error: "Failed to delete article" },
        500
      );
    }
  }
);

// ============================================================================
// ADMIN ENDPOINTS - FAQ Management
// ============================================================================

const faqSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  answer: z.string().min(10, "Answer must be at least 10 characters"),
  category: z.enum(['getting-started', 'features', 'integrations', 'troubleshooting', 'best-practices']),
  order: z.number().optional().default(0),
});

// POST /help/admin/faqs - Create new FAQ
helpRouter.post(
  "/admin/faqs",
  auth,
  zValidator("json", faqSchema),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");
      if (!user) {
        return c.json({ success: false, error: "Authentication required" }, 401);
      }

      const data = c.req.valid("json");

      const [faq] = await db
        .insert(helpFAQs)
        .values(data)
        .returning();

      return c.json({
        success: true,
        data: faq,
        message: "FAQ created successfully",
      });
    } catch (error) {
      logger.error("Error creating FAQ:", error);
      return c.json(
        { success: false, error: "Failed to create FAQ" },
        500
      );
    }
  }
);

// PUT /help/admin/faqs/:id - Update FAQ
helpRouter.put(
  "/admin/faqs/:id",
  auth,
  zValidator("json", faqSchema.partial()),
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");
      if (!user) {
        return c.json({ success: false, error: "Authentication required" }, 401);
      }

      const { id } = c.req.param();
      const data = c.req.valid("json");

      const [updated] = await db
        .update(helpFAQs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(helpFAQs.id, id))
        .returning();

      if (!updated) {
        return c.json({ success: false, error: "FAQ not found" }, 404);
      }

      return c.json({
        success: true,
        data: updated,
        message: "FAQ updated successfully",
      });
    } catch (error) {
      logger.error("Error updating FAQ:", error);
      return c.json(
        { success: false, error: "Failed to update FAQ" },
        500
      );
    }
  }
);

// DELETE /help/admin/faqs/:id - Delete FAQ
helpRouter.delete(
  "/admin/faqs/:id",
  auth,
  async (c) => {
    try {
      const db = getDatabase(); // FIX: Initialize database connection
      const user = c.get("user");
      if (!user) {
        return c.json({ success: false, error: "Authentication required" }, 401);
      }

      const { id } = c.req.param();

      const [deleted] = await db
        .delete(helpFAQs)
        .where(eq(helpFAQs.id, id))
        .returning();

      if (!deleted) {
        return c.json({ success: false, error: "FAQ not found" }, 404);
      }

      return c.json({
        success: true,
        message: "FAQ deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting FAQ:", error);
      return c.json(
        { success: false, error: "Failed to delete FAQ" },
        500
      );
    }
  }
);

export default helpRouter;

