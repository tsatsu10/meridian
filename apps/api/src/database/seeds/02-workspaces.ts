/**
 * 🏢 Phase 2: Workspaces, Teams & Departments Seed
 * 
 * Creates:
 * - Main workspace
 * - Workspace members (all users)
 * - 3 departments
 * - 5 teams with members
 * - Role assignments
 */

import { config } from "dotenv";
config();

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase, initializeDatabase } from "../connection";
import {
  workspaces,
  workspaceMembers,
  departments,
  teams,
  teamMembers,
  roleAssignment,
  users,
} from "../schema";
import logger from "../../utils/logger";
import { TEST_USERS } from "./01-users";
import { randomColor, randomElement } from "./seed-utils";

// ==========================================
// WORKSPACE DATA
// ==========================================

const WORKSPACE_DATA = {
  name: "Meridian Demo Workspace",
  description: "Full-featured demonstration workspace with all role types and features enabled",
  slug: "meridian-demo",
  settings: {
    allowGuestInvites: true,
    requireApprovalForNewMembers: false,
    enableTeamChat: true,
    enableFileSharing: true,
    enableTimeTracking: true,
    enableAdvancedAnalytics: true,
    enableAutomation: true,
    enableGamification: true,
  },
};

// ==========================================
// DEPARTMENTS DATA
// ==========================================

const DEPARTMENTS = [
  {
    name: "Engineering",
    description: "Software development and technical teams",
    headEmail: "department.head@meridian.app",
  },
  {
    name: "Product",
    description: "Product management and strategy",
    headEmail: "project.manager@meridian.app",
  },
  {
    name: "Design",
    description: "UI/UX design and creative services",
    headEmail: "team.lead@meridian.app",
  },
];

// ==========================================
// TEAMS DATA
// ==========================================

const TEAMS = [
  {
    name: "Backend Team",
    description: "API development and infrastructure",
    leadEmail: "team.lead@meridian.app",
    color: "#3b82f6",
    members: ["team.lead@meridian.app", "member@meridian.app", "admin@meridian.app"],
  },
  {
    name: "Frontend Team",
    description: "React and UI development",
    leadEmail: "team.lead@meridian.app",
    color: "#8b5cf6",
    members: ["team.lead@meridian.app", "member@meridian.app", "workspace.manager@meridian.app"],
  },
  {
    name: "Product Team",
    description: "Product management and roadmap",
    leadEmail: "project.manager@meridian.app",
    color: "#f59e0b",
    members: ["project.manager@meridian.app", "workspace.manager@meridian.app"],
  },
  {
    name: "Design Team",
    description: "UX/UI design and research",
    leadEmail: "team.lead@meridian.app",
    color: "#ec4899",
    members: ["team.lead@meridian.app", "member@meridian.app"],
  },
  {
    name: "QA Team",
    description: "Quality assurance and testing",
    leadEmail: "member@meridian.app",
    color: "#10b981",
    members: ["member@meridian.app", "admin@meridian.app"],
  },
];

// Role assignments for workspace
const WORKSPACE_ROLES = {
  "admin@meridian.app": "workspace-manager",
  "workspace.manager@meridian.app": "workspace-manager",
  "department.head@meridian.app": "department-head",
  "team.lead@meridian.app": "team-lead",
  "project.manager@meridian.app": "project-manager",
  "member@meridian.app": "member",
  "viewer@meridian.app": "project-viewer",
  "guest@meridian.app": "guest",
} as const;

// ==========================================
// MAIN SEED FUNCTION
// ==========================================

export async function seedWorkspaces() {
  const db = getDatabase();
  logger.info("🌱 Phase 2: Seeding workspaces, teams, and departments...\n");

  try {
    // Get all users
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      throw new Error("No users found. Run Phase 1 (users) first.");
    }

    const workspaceOwner = allUsers.find(u => u.email === "workspace.manager@meridian.app") || allUsers[0]!;

    // 1. CREATE WORKSPACE
    logger.info("🏢 Creating workspace...");
    
    let workspace;
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, WORKSPACE_DATA.slug))
      .limit(1);

    if (existingWorkspace.length > 0) {
      workspace = existingWorkspace[0];
      logger.info(`   ⏭️  Workspace already exists: ${workspace.name}`);
    } else {
      [workspace] = await db
        .insert(workspaces)
        .values({
          name: WORKSPACE_DATA.name,
          description: WORKSPACE_DATA.description,
          slug: WORKSPACE_DATA.slug,
          ownerId: workspaceOwner.id,
          logo: "https://api.dicebear.com/7.x/initials/svg?seed=Meridian",
          settings: WORKSPACE_DATA.settings,
          isActive: true,
        })
        .returning();

      logger.info(`   ✅ Created workspace: ${workspace.name}`);
    }

    // 2. ADD ALL USERS TO WORKSPACE
    logger.info("\n👥 Adding users to workspace...");
    
    for (const user of allUsers) {
      const existing = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspace.id),
            eq(workspaceMembers.userId, user.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        logger.info(`   ⏭️  ${user.name} already in workspace`);
        continue;
      }

      const userRole = WORKSPACE_ROLES[user.email as keyof typeof WORKSPACE_ROLES] || "member";

      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        userEmail: user.email,
        role: userRole as any,
        status: "active",
        permissions: [],
        joinedAt: new Date(),
        invitedBy: workspaceOwner.id,
      });

      logger.info(`   ✅ Added ${user.name} as ${userRole}`);
    }

    // 3. CREATE ROLE ASSIGNMENTS
    logger.info("\n🎭 Creating role assignments...");
    
    for (const user of allUsers) {
      const workspaceRole = WORKSPACE_ROLES[user.email as keyof typeof WORKSPACE_ROLES];
      
      if (!workspaceRole) continue;

      const existing = await db
        .select()
        .from(roleAssignment)
        .where(
          and(
            eq(roleAssignment.userId, user.id),
            eq(roleAssignment.workspaceId, workspace.id),
            eq(roleAssignment.isActive, true)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        logger.info(`   ⏭️  Role assignment exists for ${user.name}`);
        continue;
      }

      await db.insert(roleAssignment).values({
        userId: user.id,
        role: workspaceRole,
        workspaceId: workspace.id,
        isActive: true,
        assignedAt: new Date(),
      });

      logger.info(`   ✅ Assigned ${workspaceRole} to ${user.name}`);
    }

    // 4. CREATE DEPARTMENTS
    logger.info("\n🏢 Creating departments...");
    
    const createdDepartments: any[] = [];

    for (const deptData of DEPARTMENTS) {
      const existing = await db
        .select()
        .from(departments)
        .where(
          and(
            eq(departments.name, deptData.name),
            eq(departments.workspaceId, workspace.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        createdDepartments.push(existing[0]);
        logger.info(`   ⏭️  Department ${deptData.name} already exists`);
        continue;
      }

      const headUser = allUsers.find(u => u.email === deptData.headEmail);

      const [dept] = await db
        .insert(departments)
        .values({
          name: deptData.name,
          description: deptData.description,
          workspaceId: workspace.id,
          headId: headUser?.id,
          isActive: true,
        })
        .returning();

      createdDepartments.push(dept);
      logger.info(`   ✅ Created ${deptData.name} department`);
    }

    // 5. CREATE TEAMS
    logger.info("\n👥 Creating teams...");
    
    const createdTeams: any[] = [];

    for (const teamData of TEAMS) {
      const existing = await db
        .select()
        .from(teams)
        .where(
          and(
            eq(teams.name, teamData.name),
            eq(teams.workspaceId, workspace.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        createdTeams.push(existing[0]);
        logger.info(`   ⏭️  Team ${teamData.name} already exists`);
        continue;
      }

      const leadUser = allUsers.find(u => u.email === teamData.leadEmail);

      const [team] = await db
        .insert(teams)
        .values({
          name: teamData.name,
          description: teamData.description,
          workspaceId: workspace.id,
          leadId: leadUser?.id,
          createdBy: leadUser?.id,
          color: teamData.color,
          isActive: true,
          settings: {
            allowDirectMessages: true,
            enableNotifications: true,
          },
        })
        .returning();

      createdTeams.push(team);
      logger.info(`   ✅ Created team: ${teamData.name}`);

      // Add team members
      for (const memberEmail of teamData.members) {
        const memberUser = allUsers.find(u => u.email === memberEmail);
        
        if (!memberUser) continue;

        await db.insert(teamMembers).values({
          teamId: team.id,
          userId: memberUser.id,
          role: memberEmail === teamData.leadEmail ? "lead" : "member",
          joinedAt: new Date(),
          addedBy: leadUser?.id,
        });
      }

      logger.info(`   ✅ Added ${teamData.members.length} members to ${teamData.name}`);
    }

    logger.info("\n✅ Phase 2 complete: Created workspace organization");
    logger.info(`   🏢 Workspaces: 1`);
    logger.info(`   👥 Workspace Members: ${allUsers.length}`);
    logger.info(`   🏢 Departments: ${createdDepartments.length}`);
    logger.info(`   👥 Teams: ${createdTeams.length}`);
    logger.info(`   🎭 Role Assignments: ${allUsers.length}`);

    return { 
      workspace,
      users: allUsers,
      departments: createdDepartments,
      teams: createdTeams,
    };

  } catch (error) {
    logger.error("❌ Error seeding workspaces:", error);
    throw error;
  }
}

export default seedWorkspaces;
// Run if executed directly
if (require.main === module) {
  seedWorkspaces().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
