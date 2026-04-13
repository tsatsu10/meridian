import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { auth } from "../middlewares/auth";
import { appSettings } from "../config/settings";
import getProfile from "./controllers/get-profile";
import { getPublicProfile } from "./controllers/get-public-profile";
import updateProfile from "./controllers/update-profile";
import getExperience from "./controllers/get-experience";
import createExperience from "./controllers/create-experience";
import updateExperience from "./controllers/update-experience";
import deleteExperience from "./controllers/delete-experience";
import getEducation from "./controllers/get-education";
import createEducation from "./controllers/create-education";
import updateEducation from "./controllers/update-education";
import deleteEducation from "./controllers/delete-education";
import getSkills from "./controllers/get-skills";
import createSkill from "./controllers/create-skill";
import updateSkill from "./controllers/update-skill";
import deleteSkill from "./controllers/delete-skill";
import getConnections from "./controllers/get-connections";
import createConnection from "./controllers/create-connection";
import updateConnection from "./controllers/update-connection";
import deleteConnection from "./controllers/delete-connection";
import uploadProfilePicture from "./controllers/upload-profile-picture";
import logger from '../utils/logger';
// Note: Add proper auth middleware when available

// Validation schemas
const profileSchema = z.object({
  jobTitle: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  headline: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  isPublic: z.boolean().optional(),
  allowDirectMessages: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
});

const experienceSchema = z.object({
  title: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  location: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
  isCurrent: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  companyLogo: z.string().url().optional(),
  order: z.number().int().min(0).optional(),
});

const educationSchema = z.object({
  degree: z.string().min(1).max(100),
  fieldOfStudy: z.string().max(100).optional(),
  school: z.string().min(1).max(100),
  location: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  endDate: z.string().regex(/^\d{4}-\d{2}$/).optional().or(z.literal("")),
  isCurrent: z.boolean().optional(),
  grade: z.string().max(20).optional(),
  activities: z.array(z.string()).optional(),
  schoolLogo: z.string().url().optional(),
  order: z.number().int().min(0).optional(),
});

const skillSchema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum(["technical", "soft", "language", "tool", "other"]),
  level: z.number().int().min(1).max(5),
  yearsOfExperience: z.number().int().min(0).optional(),
  verified: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const connectionSchema = z.object({
  followingId: z.string(),
  note: z.string().max(200).optional(),
});

const profile = new Hono<{
  Variables: {
    userEmail: string;
    userId: string;
  };
}>();

// Apply authentication middleware to all routes (only in production mode)
const { isDemoMode } = appSettings;
if (!isDemoMode) {
  profile.use("*", auth);
}

profile
  // Profile endpoints
  .get("/", async (c) => {
    try {
      logger.debug("🔍 GET /profile - Starting");
      const userId = c.get("userId");
      logger.debug("🔍 UserId from context:", userId);
      
      if (!userId) {
        logger.debug("❌ No userId in context");
        return c.json({ error: "User not authenticated" }, 401);
      }
      
      logger.debug("🔍 Calling getProfile with userId:", userId);
      const profile = await getProfile(userId);
      logger.debug("✅ Profile retrieved successfully");
      return c.json({ success: true, data: profile });
    } catch (error: any) {
      logger.error("❌ Error getting profile:", error);
      logger.error("❌ Error stack:", error.stack);
      return c.json({ error: error.message || "Failed to get profile" }, 500);
    }
  })
  
  // Public profile with goals and collaboration data
  .get("/:userId/public", getPublicProfile)
  
  .put("/", zValidator("json", profileSchema), async (c) => {
    const userId = c.get("userId");
    const profileData = c.req.valid("json");
    const profile = await updateProfile(userId, profileData);
    return c.json(profile);
  })
  
  // Profile picture upload
  .post("/picture", async (c) => {
    const userId = c.get("userId");
    const result = await uploadProfilePicture(c, userId);
    return c.json(result);
  })
  
  // Profile avatar upload (alias for /picture)
  .post("/avatar", async (c) => {
    const userId = c.get("userId");
    const result = await uploadProfilePicture(c, userId);
    return c.json(result);
  })
  
  // Experience endpoints
  .get("/experience", async (c) => {
    try {
      logger.debug("🔍 GET /profile/experience - Starting");
      const userId = c.get("userId");
      logger.debug("🔍 UserId from context:", userId, typeof userId);
      
      if (!userId) {
        logger.debug("❌ No userId in context");
        return c.json({ error: "User not authenticated" }, 401);
      }
      
      logger.debug("🔍 Calling getExperience with userId:", userId);
      const experiences = await getExperience(userId);
      logger.debug("✅ Experience retrieved successfully:", experiences.length, "items");
      return c.json({ success: true, data: experiences });
    } catch (error: any) {
      logger.error("❌ Error getting experience:", error);
      logger.error("❌ Error stack:", error.stack);
      logger.error("❌ Error name:", error.name);
      logger.error("❌ Error message:", error.message);
      return c.json({ error: error.message || "Failed to get experience" }, 500);
    }
  })
  
  .post("/experience", zValidator("json", experienceSchema), async (c) => {
    const userId = c.get("userId");
    const experienceData = c.req.valid("json");
    const experience = await createExperience(userId, experienceData);
    return c.json(experience);
  })
  
  .put("/experience/:id", zValidator("json", experienceSchema), async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const experienceData = c.req.valid("json");
    const experience = await updateExperience(userId, id, experienceData);
    return c.json(experience);
  })
  
  .delete("/experience/:id", async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const result = await deleteExperience(userId, id);
    return c.json(result);
  })
  
  // Education endpoints
  .get("/education", async (c) => {
    try {
      logger.debug("🔍 GET /profile/education - Starting");
      const userId = c.get("userId");
      logger.debug("🔍 UserId from context:", userId, typeof userId);
      
      if (!userId) {
        logger.debug("❌ No userId in context");
        return c.json({ error: "User not authenticated" }, 401);
      }
      
      logger.debug("🔍 Calling getEducation with userId:", userId);
      const education = await getEducation(userId);
      logger.debug("✅ Education retrieved successfully:", education.length, "items");
      return c.json({ success: true, data: education });
    } catch (error: any) {
      logger.error("❌ Error getting education:", error);
      logger.error("❌ Error stack:", error.stack);
      logger.error("❌ Error name:", error.name);
      logger.error("❌ Error message:", error.message);
      return c.json({ error: error.message || "Failed to get education" }, 500);
    }
  })
  
  .post("/education", zValidator("json", educationSchema), async (c) => {
    const userId = c.get("userId");
    const educationData = c.req.valid("json");
    const education = await createEducation(userId, educationData);
    return c.json(education);
  })
  
  .put("/education/:id", zValidator("json", educationSchema), async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const educationData = c.req.valid("json");
    const education = await updateEducation(userId, id, educationData);
    return c.json(education);
  })
  
  .delete("/education/:id", async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const result = await deleteEducation(userId, id);
    return c.json(result);
  })
  
  // Skills endpoints
  .get("/skills", async (c) => {
    try {
      logger.debug("🔍 GET /profile/skills - Starting");
      const userId = c.get("userId");
      logger.debug("🔍 UserId from context:", userId, typeof userId);
      
      if (!userId) {
        logger.debug("❌ No userId in context");
        return c.json({ error: "User not authenticated" }, 401);
      }
      
      logger.debug("🔍 Calling getSkills with userId:", userId);
      const skills = await getSkills(userId);
      logger.debug("✅ Skills retrieved successfully:", skills.length, "items");
      return c.json({ success: true, data: skills });
    } catch (error: any) {
      logger.error("❌ Error getting skills:", error);
      logger.error("❌ Error stack:", error.stack);
      logger.error("❌ Error name:", error.name);
      logger.error("❌ Error message:", error.message);
      return c.json({ error: error.message || "Failed to get skills" }, 500);
    }
  })
  
  .post("/skills", zValidator("json", skillSchema), async (c) => {
    const userId = c.get("userId");
    const skillData = c.req.valid("json");
    const skill = await createSkill(userId, skillData);
    return c.json(skill);
  })
  
  .put("/skills/:id", zValidator("json", skillSchema), async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const skillData = c.req.valid("json");
    const skill = await updateSkill(userId, id, skillData);
    return c.json(skill);
  })
  
  .delete("/skills/:id", async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const result = await deleteSkill(userId, id);
    return c.json(result);
  })
  
  // Connections endpoints
  .get("/connections", async (c) => {
    try {
      logger.debug("🔍 GET /profile/connections - Starting");
      const userId = c.get("userId");
      logger.debug("🔍 UserId from context:", userId, typeof userId);
      
      if (!userId) {
        logger.debug("❌ No userId in context");
        return c.json({ error: "User not authenticated" }, 401);
      }
      
      logger.debug("🔍 Calling getConnections with userId:", userId);
      const connections = await getConnections(userId);
      logger.debug("✅ Connections retrieved successfully:", connections.length, "items");
      return c.json({ success: true, data: connections });
    } catch (error: any) {
      logger.error("❌ Error getting connections:", error);
      logger.error("❌ Error stack:", error.stack);
      logger.error("❌ Error name:", error.name);
      logger.error("❌ Error message:", error.message);
      return c.json({ error: error.message || "Failed to get connections" }, 500);
    }
  })
  
  .post("/connections", zValidator("json", connectionSchema), async (c) => {
    const userId = c.get("userId");
    const connectionData = c.req.valid("json");
    const connection = await createConnection(userId, connectionData);
    return c.json(connection);
  })
  
  .put("/connections/:id", zValidator("json", z.object({
    status: z.enum(["pending", "accepted", "blocked"]),
    note: z.string().max(200).optional(),
  })), async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const connectionData = c.req.valid("json");
    const connection = await updateConnection(userId, id, connectionData);
    return c.json(connection);
  })
  
  .delete("/connections/:id", async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.param();
    const result = await deleteConnection(userId, id);
    return c.json(result);
  })
  
  // Parameterized routes - MUST BE LAST to avoid matching specific routes
  .get("/:userId", async (c) => {
    const { userId } = c.req.param();
    const profile = await getProfile(userId);
    return c.json(profile);
  })
  
  .get("/:userId/experience", async (c) => {
    const { userId } = c.req.param();
    const experience = await getExperience(userId);
    return c.json(experience);
  })
  
  .get("/:userId/education", async (c) => {
    const { userId } = c.req.param();
    const education = await getEducation(userId);
    return c.json(education);
  })
  
  .get("/:userId/skills", async (c) => {
    const { userId } = c.req.param();
    const skills = await getSkills(userId);
    return c.json(skills);
  })
  
  .get("/:userId/connections", async (c) => {
    const { userId } = c.req.param();
    const connections = await getConnections(userId);
    return c.json(connections);
  });

export default profile; 
