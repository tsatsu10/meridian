/**
 * 👥 Phase 1: Users & Authentication Seed
 * 
 * Creates:
 * - 8 users representing all role types
 * - User profiles with extended information
 * - User skills and experience
 * - Active sessions for some users
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  users,
  userProfile,
  userSkill,
  userExperience,
  userEducation,
  sessions,
} from "../schema";
import logger from "../../utils/logger";
import { randomInt, randomElement, randomBool, daysAgo } from "./seed-utils";

// ==========================================
// TEST USERS DATA
// ==========================================

export const TEST_USERS = [
  {
    email: "admin@meridian.app",
    name: "Alice Admin",
    password: "password123",
    role: "admin" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
    jobTitle: "System Administrator",
    bio: "Managing the Meridian platform and ensuring smooth operations for all users.",
  },
  {
    email: "workspace.manager@meridian.app",
    name: "Walter Manager",
    password: "password123",
    role: "workspace-manager" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Walter",
    jobTitle: "Workspace Owner",
    bio: "Leading the organization's digital transformation with Meridian.",
  },
  {
    email: "department.head@meridian.app",
    name: "Diana Head",
    password: "password123",
    role: "department-head" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana",
    jobTitle: "Engineering Director",
    bio: "Overseeing multiple engineering teams and driving technical excellence.",
  },
  {
    email: "team.lead@meridian.app",
    name: "Taylor Lead",
    password: "password123",
    role: "team-lead" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor",
    jobTitle: "Senior Team Lead",
    bio: "Coordinating cross-functional teams and ensuring delivery excellence.",
  },
  {
    email: "project.manager@meridian.app",
    name: "Paula Manager",
    password: "password123",
    role: "project-manager" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Paula",
    jobTitle: "Senior Project Manager",
    bio: "Managing complex projects and stakeholder relationships.",
  },
  {
    email: "member@meridian.app",
    name: "Mike Member",
    password: "password123",
    role: "member" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
    jobTitle: "Full Stack Developer",
    bio: "Building awesome features and shipping quality code every day.",
  },
  {
    email: "viewer@meridian.app",
    name: "Victor Viewer",
    password: "password123",
    role: "project-viewer" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Victor",
    jobTitle: "Product Stakeholder",
    bio: "Monitoring project progress and providing strategic feedback.",
  },
  {
    email: "guest@meridian.app",
    name: "Gary Guest",
    password: "password123",
    role: "guest" as const,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gary",
    jobTitle: "External Consultant",
    bio: "Providing temporary consulting services on specific projects.",
  },
];

// ==========================================
// SKILLS DATA
// ==========================================

const TECHNICAL_SKILLS = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Go", "Rust",
  "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "GCP",
  "GraphQL", "REST APIs", "WebSockets", "Git", "CI/CD", "Testing"
];

const SOFT_SKILLS = [
  "Leadership", "Communication", "Problem Solving", "Team Collaboration",
  "Project Management", "Agile Methodologies", "Mentoring", "Negotiation",
  "Strategic Planning", "Conflict Resolution"
];

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedUsers() {
  await initializeDatabase();
  const db = getDatabase();
  logger.info("🌱 Phase 1: Seeding users and authentication...\n");

  try {
    const createdUsers: any[] = [];

    // 1. CREATE USERS
    logger.info("👥 Creating test users...");
    
    for (const userData of TEST_USERS) {
      // Check if user exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`   ⏭️  ${userData.name} already exists`);
        createdUsers.push(existing[0]);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email,
          name: userData.name,
          password: hashedPassword,
          role: userData.role,
          avatar: userData.avatar,
          timezone: "America/New_York",
          language: "en",
          isEmailVerified: true,
          lastLoginAt: daysAgo(randomInt(0, 3)),
          lastSeen: daysAgo(randomInt(0, 1)),
        })
        .returning();

      createdUsers.push(newUser);
      logger.info(`   ✅ Created ${userData.name} (${userData.role})`);
    }

    // 2. CREATE USER PROFILES
    logger.info("\n📝 Creating user profiles...");
    
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i]!;
      const userData = TEST_USERS[i]!;

      const existing = await db
        .select()
        .from(userProfile)
        .where(eq(userProfile.userId, user.id))
        .limit(1);

      if (existing.length > 0) {
        logger.info(`   ⏭️  Profile for ${user.name} already exists`);
        continue;
      }

      await db.insert(userProfile).values({
        userId: user.id,
        bio: userData.bio,
        jobTitle: userData.jobTitle,
        headline: `${userData.jobTitle} at Meridian`,
        location: randomElement(["New York, NY", "San Francisco, CA", "Austin, TX", "Seattle, WA", "Remote"]),
        timezone: "America/New_York",
        language: "en",
        website: `https://${user.name.toLowerCase().replace(/\s/g, '')}.dev`,
        linkedinUrl: `https://linkedin.com/in/${user.name.toLowerCase().replace(/\s/g, '')}`,
        githubUrl: `https://github.com/${user.name.toLowerCase().replace(/\s/g, '')}`,
        profilePicture: userData.avatar,
        isPublic: true,
        allowDirectMessages: true,
        showOnlineStatus: true,
        emailVerified: true,
        completenessScore: randomInt(70, 100),
        viewCount: randomInt(10, 500),
        connectionCount: randomInt(5, 50),
        endorsementCount: randomInt(0, 25),
      });

      logger.info(`   ✅ Created profile for ${user.name}`);
    }

    // 3. CREATE USER SKILLS
    logger.info("\n🎯 Creating user skills...");
    
    for (const user of createdUsers) {
      // Technical skills (3-8 per user)
      const techSkillCount = randomInt(3, 8);
      const userTechSkills = randomElement(TECHNICAL_SKILLS.slice(0, techSkillCount));
      
      for (let i = 0; i < techSkillCount; i++) {
        const skillName = TECHNICAL_SKILLS[i]!;
        
        await db.insert(userSkill).values({
          userId: user.id,
          name: skillName,
          category: "technical",
          level: randomInt(2, 5),
          yearsOfExperience: randomInt(1, 10),
          endorsements: randomInt(0, 15),
          verified: randomBool(0.6),
          order: i,
        });
      }
      
      // Soft skills (2-4 per user)
      const softSkillCount = randomInt(2, 4);
      
      for (let i = 0; i < softSkillCount; i++) {
        const skillName = SOFT_SKILLS[i]!;
        
        await db.insert(userSkill).values({
          userId: user.id,
          name: skillName,
          category: "soft",
          level: randomInt(3, 5),
          yearsOfExperience: randomInt(2, 10),
          endorsements: randomInt(0, 20),
          verified: randomBool(0.7),
          order: techSkillCount + i,
        });
      }

      logger.info(`   ✅ Created ${techSkillCount + softSkillCount} skills for ${user.name}`);
    }

    // 4. CREATE USER EXPERIENCE
    logger.info("\n💼 Creating work experience...");
    
    for (const user of createdUsers) {
      // 1-3 previous experiences
      const expCount = randomInt(1, 3);
      
      for (let i = 0; i < expCount; i++) {
        const isCurrent = i === 0;
        const startYear = 2025 - (expCount - i) * 3;
        const endYear = isCurrent ? null : startYear + randomInt(1, 3);
        
        await db.insert(userExperience).values({
          userId: user.id,
          title: randomElement(["Software Engineer", "Senior Developer", "Tech Lead", "Product Manager", "Designer"]),
          company: randomElement(["TechCorp", "StartupXYZ", "BigTech Inc", "InnovateCo", "FutureSoft"]),
          location: randomElement(["New York, NY", "San Francisco, CA", "Remote"]),
          description: "Led development of key features and mentored junior team members.",
          startDate: `${startYear}-01`,
          endDate: endYear ? `${endYear}-12` : null,
          isCurrent,
          order: i,
        });
      }

      logger.info(`   ✅ Created ${expCount} experience entries for ${user.name}`);
    }

    // 5. CREATE USER EDUCATION
    logger.info("\n🎓 Creating education records...");
    
    for (const user of createdUsers) {
      await db.insert(userEducation).values({
        userId: user.id,
        degree: randomElement(["Bachelor's", "Master's", "PhD"]),
        fieldOfStudy: randomElement(["Computer Science", "Software Engineering", "Information Technology", "Business Administration"]),
        school: randomElement(["MIT", "Stanford", "UC Berkeley", "Carnegie Mellon", "Georgia Tech"]),
        location: randomElement(["Cambridge, MA", "Stanford, CA", "Berkeley, CA", "Pittsburgh, PA"]),
        description: "Focused on software engineering, algorithms, and system design.",
        startDate: "2015-09",
        endDate: "2019-05",
        isCurrent: false,
        grade: "3.8 GPA",
        order: 0,
      });

      logger.info(`   ✅ Created education for ${user.name}`);
    }

    // 6. CREATE ACTIVE SESSIONS (for some users)
    logger.info("\n🔐 Creating active sessions...");
    
    const activeUsers = createdUsers.slice(0, 4); // First 4 users have active sessions
    
    for (const user of activeUsers) {
      const sessionToken = createId();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      await db.insert(sessions).values({
        id: sessionToken,
        userId: user.id,
        expiresAt,
      });

      logger.info(`   ✅ Created session for ${user.name}`);
    }

    logger.info("\n✅ Phase 1 complete: Created users and authentication data");
    logger.info(`   👥 Users: ${createdUsers.length}`);
    logger.info(`   📝 Profiles: ${createdUsers.length}`);
    logger.info(`   🎯 Skills: ${createdUsers.length * 7} (avg)`);
    logger.info(`   💼 Experience: ${createdUsers.length * 2} (avg)`);
    logger.info(`   🎓 Education: ${createdUsers.length}`);
    logger.info(`   🔐 Sessions: ${activeUsers.length}`);

    return { users: createdUsers };

  } catch (error) {
    logger.error("❌ Error seeding users:", error);
    throw error;
  }
}

// Export for use in master seed
export default seedUsers;

// Run if executed directly
if (require.main === module) {
  seedUsers().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}

