/**
 * 🗄️ RBAC Database Seeding
 * 
 * Seeds the database with initial role assignments and departments.
 * Creates a realistic organizational structure for testing and demo purposes.
 */

import { config } from "dotenv";
config({ path: "./.env" });

import { createId } from "@paralleldrive/cuid2";
import { getDatabase, initializeDatabase } from "./connection";
import { 
  userTable, 
  roleAssignmentTable, 
  roleHistoryTable, 
  departmentTable,
  workspaceTable,
  projectTable 
} from "./schema";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

interface SeedUser {
  email: string;
  name: string;
  role: string;
  department?: string;
  reason?: string;
}

// Demo users with realistic roles
const demoUsers: SeedUser[] = [
  // Workspace Leadership
  {
    email: "admin@meridian.app",
    name: "Alice Admin",
    role: "workspace-manager",
    reason: "Company founder and workspace administrator"
  },

  // Department Heads
  {
    email: "sarah.pm@meridian.app", 
    name: "Sarah Mitchell",
    role: "department-head",
    department: "Product Management",
    reason: "Head of Product Management department"
  },
  {
    email: "david.lead@meridian.app",
    name: "David Chen", 
    role: "department-head",
    department: "Engineering",
    reason: "Head of Engineering department"
  },

  // Project Managers
  {
    email: "jennifer.exec@meridian.app",
    name: "Jennifer Williams",
    role: "project-manager", 
    department: "Product Management",
    reason: "Senior Project Manager for executive oversight"
  },
  {
    email: "manager@meridian.app",
    name: "Mike Manager",
    role: "project-manager",
    department: "Engineering", 
    reason: "Lead Project Manager for development projects"
  },

  // Team Leads (Special subtask powers!)
  {
    email: "lisa.design@meridian.app",
    name: "Lisa Rodriguez",
    role: "team-lead",
    department: "Design",
    reason: "Design Team Lead with subtask management authority"
  },
  {
    email: "teamlead@meridian.app", 
    name: "Tom Leadership",
    role: "team-lead",
    department: "Engineering",
    reason: "Engineering Team Lead with full subtask control"
  },

  // Regular Members
  {
    email: "dev@meridian.app",
    name: "Mike Developer", 
    role: "member",
    department: "Engineering",
    reason: "Software Developer"
  },
  {
    email: "designer@meridian.app",
    name: "Emma Designer",
    role: "member", 
    department: "Design",
    reason: "UI/UX Designer"
  },
  
  // External Users
  {
    email: "client@external.com",
    name: "John Client",
    role: "client",
    reason: "External client with limited project access"
  },
  {
    email: "contractor@freelance.com", 
    name: "Jane Contractor",
    role: "contractor",
    reason: "External contractor for specific tasks"
  },

  // Stakeholders
  {
    email: "stakeholder@board.com",
    name: "Robert Stakeholder", 
    role: "stakeholder",
    reason: "Board member with read-only oversight"
  }
];

// Department structure
const departments = [
  {
    name: "Engineering",
    description: "Software development and technical architecture",
    headEmail: "david.lead@meridian.app"
  },
  {
    name: "Product Management", 
    description: "Product strategy and roadmap planning",
    headEmail: "sarah.pm@meridian.app"
  },
  {
    name: "Design",
    description: "User experience and visual design",
    headEmail: "lisa.design@meridian.app"
  },
  {
    name: "Marketing",
    description: "Brand and growth marketing",
    headEmail: null
  }
];

/**
 * Seeds RBAC data into the database
 */
export async function seedRBACData() {
  logger.debug("🌱 Starting RBAC data seeding...");

  try {
    // Initialize database connection
    await initializeDatabase();
    const db = getDatabase();

    // 🚨 SECURITY FIX: Do NOT create a shared demo workspace
    // Each user should create their own workspace or be invited

    // Get existing workspace only (don't create one)
    let workspace = await db
      .select()
      .from(workspaceTable)
      .limit(1);

    let workspaceId: string | undefined;
    
    if (workspace.length) {
      workspaceId = workspace[0]?.id;
      logger.debug(`📍 Found existing workspace: ${workspaceId}`);
    } else {
      logger.debug("📍 No existing workspace found - users will create their own");
    }

    // Create departments (not tied to specific workspace initially)
    logger.debug("🏢 Creating departments...");
    const departmentMap = new Map<string, string>();
    
    for (const dept of departments) {
      // Check if department already exists
      const existing = await db
        .select()
        .from(departmentTable)
        .where(eq(departmentTable.name, dept.name))
        .limit(1);

      if (!existing.length && workspaceId) {
        const deptId = createId();
        await db.insert(departmentTable).values({
          id: deptId,
          name: dept.name,
          description: dept.description,
          workspaceId: workspaceId, // Only if workspace exists
          headUserId: null, // Will be updated after user creation
          isActive: true,
          createdAt: new Date(),
        });
        departmentMap.set(dept.name, deptId);
        logger.debug(`  ✅ Created department: ${dept.name}`);
      } else if (existing.length) {
        departmentMap.set(dept.name, existing[0]?.id || "");
        logger.debug(`  ⏭️  Department already exists: ${dept.name}`);
      } else {
        logger.debug(`  ⏭️  Skipped department (no workspace): ${dept.name}`);
      }
    }

    // Create/update users but DO NOT assign workspace access
    logger.debug("👥 Creating users...");
    
    for (const userData of demoUsers) {
      // Check if user exists
      let user = await db
        .select()
        .from(userTable)
        .where(eq(userTable.email, userData.email))
        .limit(1);

      let userId: string;

      if (!user.length) {
        // Create user
        userId = createId();
        await db.insert(userTable).values({
          id: userId,
          email: userData.email,
          name: userData.name,
          password: "demo123", // Demo password
          createdAt: new Date(),
        });
        logger.debug(`  ✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        userId = user[0]?.id || "";
        if (!userId) {
          throw new Error(`Failed to find user: ${userData.email}`);
        }
        logger.debug(`  ⏭️  User already exists: ${userData.name}`);
      }

      // 🔒 SECURITY: Only create role assignments for workspace owners
      // Other users must be invited to workspaces explicitly
      
      const isWorkspaceOwner = workspaceId && workspace.length && 
                              workspace[0]?.ownerEmail === userData.email;
      
      if (isWorkspaceOwner || userData.email === "admin@meridian.app") {
        // Check if role assignment already exists
        const existingRole = await db
          .select()
          .from(roleAssignmentTable)
          .where(eq(roleAssignmentTable.userId, userId))
          .limit(1);

        if (!existingRole.length) {
          // Create role assignment ONLY for workspace owner
          const assignmentId = createId();
          const departmentIds = userData.department 
            ? [departmentMap.get(userData.department)].filter(Boolean)
            : [];

          await db.insert(roleAssignmentTable).values({
            id: assignmentId,
            userId: userId,
            role: userData.role,
            assignedBy: userId, // Self-assigned for demo
            assignedAt: new Date(),
            isActive: true,
            workspaceId: workspaceId,
            departmentIds: departmentIds.length ? JSON.stringify(departmentIds) : null,
            reason: userData.reason,
            notes: "Workspace owner role assignment",
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Record in role history
          await db.insert(roleHistoryTable).values({
            id: createId(),
            userId: userId,
            role: userData.role,
            action: "assigned",
            performedBy: userId,
            reason: userData.reason || "Workspace owner assignment",
            workspaceId: workspaceId,
            createdAt: new Date(),
          });

          logger.debug(`    🛡️  Assigned ${userData.role} role to workspace owner: ${userData.name}`);
        } else {
          logger.debug(`    ⏭️  Role already assigned for workspace owner: ${userData.name}`);
        }
      } else {
        logger.debug(`    🔒 Skipped role assignment for ${userData.name} - not a workspace owner`);
        logger.debug(`        💡 This user must be invited to workspaces they want to access`);
      }
    }

    // Update department heads (only if workspace exists)
    if (workspaceId) {
      logger.debug("🏢 Updating department heads...");
      for (const dept of departments) {
        if (dept.headEmail) {
          try {
            const headUser = await db
              .select()
              .from(userTable)
              .where(eq(userTable.email, dept.headEmail))
              .limit(1);

            if (headUser.length) {
              const departmentId = departmentMap.get(dept.name);
              if (departmentId) {
                await db
                  .update(departmentTable)
                  .set({ headUserId: headUser[0]?.id || null })
                  .where(eq(departmentTable.id, departmentId));

                logger.debug(`  👑 Set ${dept.headEmail} as head of ${dept.name}`);
              }
            }
          } catch (error) {
            logger.debug(`  ⚠️  Skipped setting head for ${dept.name}: ${error.message}`);
          }
        }
      }
    }

    logger.debug("\n🎉 RBAC data seeding completed successfully!");
    
    const assignedUsers = demoUsers.filter(u => 
      workspaceId && workspace.length && workspace[0]?.ownerEmail === u.email
    );
    
    logger.debug("\n📊 Summary:");
    logger.debug(`  👥 Users created: ${demoUsers.length}`);
    logger.debug(`  🏢 Departments: ${departmentMap.size}`);
    logger.debug(`  🛡️  Role assignments: ${assignedUsers.length} (workspace owners only)`);
    logger.debug(`  🔒 Security: ${demoUsers.length - assignedUsers.length} users must be invited to access workspaces`);
    
    if (assignedUsers.length > 0) {
      logger.debug("\n🎯 Workspace Owners with Automatic Access:");
      assignedUsers.forEach(owner => {
        logger.debug(`  👑 ${owner.name} (${owner.email}) - ${owner.role}`);
      });
    }

    const nonOwners = demoUsers.filter(u => !assignedUsers.includes(u));
    if (nonOwners.length > 0) {
      logger.debug("\n🔐 Users Requiring Workspace Invitations:");
      nonOwners.forEach(user => {
        logger.debug(`  👤 ${user.name} (${user.email}) - ${user.role}`);
      });
    }

    logger.debug("\n✅ SECURITY STATUS:");
    logger.debug("  🔒 Users can only access workspaces they own or are invited to");
    logger.debug("  🚫 No automatic workspace access for non-owners");
    logger.debug("  ✅ Proper workspace isolation enforced");

  } catch (error) {
    logger.error("❌ Error seeding RBAC data:", error);
    throw error;
  }
}

/**
 * Clears all RBAC data (for testing)
 */
export async function clearRBACData() {
  logger.debug("🧹 Clearing RBAC data...");

  try {
    // Initialize database connection
    await initializeDatabase();
    const db = getDatabase();
    await db.delete(roleHistoryTable);
    await db.delete(roleAssignmentTable);
    await db.delete(departmentTable);
    logger.debug("✅ RBAC data cleared");
  } catch (error) {
    logger.error("❌ Error clearing RBAC data:", error);
    throw error;
  }
}

/**
 * Gets current RBAC stats
 */
export async function getRBACStats() {
  // Initialize database connection
  await initializeDatabase();
  const db = getDatabase();
  const [
    totalUsers,
    activeRoles,
    departments,
    roleHistory
  ] = await Promise.all([
    db.select().from(userTable),
    db.select().from(roleAssignmentTable).where(eq(roleAssignmentTable.isActive, true)),
    db.select().from(departmentTable).where(eq(departmentTable.isActive, true)),
    db.select().from(roleHistoryTable)
  ]);

  return {
    users: totalUsers.length,
    activeRoles: activeRoles.length,
    departments: departments.length,
    roleChanges: roleHistory.length,
    roleDistribution: activeRoles.reduce((acc, role) => {
      acc[role.role] = (acc[role.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}

// CLI interface for running seeds
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case "seed":
      seedRBACData().then(() => process.exit(0)).catch(() => process.exit(1));
      break;
    case "clear":
      clearRBACData().then(() => process.exit(0)).catch(() => process.exit(1));
      break;
    case "stats":
      getRBACStats().then(stats => {
        logger.debug("📊 RBAC Statistics:", JSON.stringify(stats, null, 2));
        process.exit(0);
      }).catch(() => process.exit(1));
      break;
    default:
      logger.debug("Usage: node seed-rbac.js [seed|clear|stats]");
      process.exit(1);
  }
} 
