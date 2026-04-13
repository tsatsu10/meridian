/**
 * 🎭 Seed Users with Various Roles
 * 
 * Creates 5 test users with different roles across workspaces, projects, and teams
 * for testing RBAC functionality and permission systems.
 */

import { eq } from "drizzle-orm";
import { getDatabase } from "../connection";
import { 
  users, 
  workspaces, 
  workspaceMembers, 
  projects, 
  projectMembers,
  teams,
  teamMembers,
  tasks 
} from "../schema";
import bcrypt from "bcryptjs";
import logger from '../../utils/logger';

// 🎭 Test users with various roles
const testUsers = [
  {
    email: "admin@meridian.app",
    name: "Alice Admin",
    password: "password123",
    role: "admin" as const,
    description: "System Administrator - Full workspace control",
  },
  {
    email: "manager@meridian.app",
    name: "Mike Manager",
    password: "password123",
    role: "manager" as const,
    description: "Project Manager - Manages projects and teams",
  },
  {
    email: "lead@meridian.app",
    name: "Linda Lead",
    password: "password123",
    role: "member" as const, // Base role, will have team-lead role assignment
    description: "Team Lead - Manages team members and tasks",
  },
  {
    email: "member@meridian.app",
    name: "Mark Member",
    password: "password123",
    role: "member" as const,
    description: "Regular Member - Standard task management",
  },
  {
    email: "viewer@meridian.app",
    name: "Victor Viewer",
    password: "password123",
    role: "viewer" as const,
    description: "Project Viewer - Read-only access",
  },
];

// Workspace role mappings (from RBAC system)
const workspaceRoles = {
  "admin@meridian.app": "workspace-manager", // Full control
  "manager@meridian.app": "department-head", // Multi-project oversight
  "lead@meridian.app": "team-lead", // Team coordination
  "member@meridian.app": "member", // Standard access
  "viewer@meridian.app": "project-viewer", // Read-only
};

export async function seedUsersWithRoles() {
  const db = getDatabase();
  logger.debug("🌱 Seeding users with various roles...\n");

  try {
    // 1️⃣ CREATE USERS
    logger.debug("👥 Creating test users...");
    const createdUsers: any[] = [];

    for (const userData of testUsers) {
      // Check if user exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existing.length > 0) {
        logger.debug(`   ⏭️  User ${userData.email} already exists`);
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
          isEmailVerified: true,
          lastLoginAt: new Date(),
        })
        .returning();

      createdUsers.push(newUser);
      logger.debug(`   ✅ Created ${userData.name} (${userData.email}) - Role: ${userData.role}`);
    }

    // 2️⃣ CREATE TEST WORKSPACE
    logger.debug("\n🏢 Creating test workspace...");
    const adminUser = createdUsers.find(u => u.email === "admin@meridian.app");

    let workspace;
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.name, "Meridian Test Workspace"))
      .limit(1);

    if (existingWorkspace.length > 0) {
      workspace = existingWorkspace[0];
      logger.debug("   ⏭️  Workspace already exists");
    } else {
      [workspace] = await db
        .insert(workspaces)
        .values({
          name: "Meridian Test Workspace",
          description: "Test workspace with various user roles and permissions",
          ownerId: adminUser!.id,
          slug: "meridian-test",
          isActive: true,
        })
        .returning();
      logger.debug("   ✅ Created test workspace");
    }

    // 3️⃣ ADD USERS TO WORKSPACE
    logger.debug("\n👥 Adding users to workspace...");
    for (const user of createdUsers) {
      const workspaceRole = workspaceRoles[user.email as keyof typeof workspaceRoles];

      const existingMember = await db
        .select()
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, user.id))
        .where(eq(workspaceMembers.workspaceId, workspace.id))
        .limit(1);

      if (existingMember.length > 0) {
        logger.debug(`   ⏭️  ${user.name} already in workspace`);
        continue;
      }

      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        userEmail: user.email,
        role: user.role,
        status: 'active',
        permissions: [],
      });

      logger.debug(`   ✅ Added ${user.name} to workspace as ${workspaceRole}`);
    }

    // 4️⃣ CREATE TEST PROJECTS
    logger.debug("\n📂 Creating test projects...");
    const projectsData = [
      {
        name: "Mobile App Development",
        description: "iOS and Android app development project",
        ownerId: createdUsers.find(u => u.email === "manager@meridian.app")!.id,
      },
      {
        name: "Website Redesign",
        description: "Company website redesign and modernization",
        ownerId: createdUsers.find(u => u.email === "manager@meridian.app")!.id,
      },
      {
        name: "Marketing Campaign Q1",
        description: "Q1 marketing initiatives and campaigns",
        ownerId: createdUsers.find(u => u.email === "lead@meridian.app")!.id,
      },
    ];

    const createdProjects: any[] = [];
    for (const projectData of projectsData) {
      const existing = await db
        .select()
        .from(projects)
        .where(eq(projects.name, projectData.name))
        .where(eq(projects.workspaceId, workspace.id))
        .limit(1);

      if (existing.length > 0) {
        createdProjects.push(existing[0]);
        logger.debug(`   ⏭️  Project "${projectData.name}" already exists`);
        continue;
      }

      const [project] = await db
        .insert(projects)
        .values({
          ...projectData,
          workspaceId: workspace.id,
          slug: projectData.name.toLowerCase().replace(/\s+/g, '-'),
          status: 'active',
          progress: 0,
        })
        .returning();

      createdProjects.push(project);
      logger.debug(`   ✅ Created project "${projectData.name}"`);
    }

    // 5️⃣ ADD USERS TO PROJECTS
    logger.debug("\n👤 Adding users to projects...");
    const projectRoles = {
      "Mobile App Development": {
        "manager@meridian.app": "project-manager",
        "lead@meridian.app": "team-lead",
        "member@meridian.app": "member",
        "viewer@meridian.app": "project-viewer",
      },
      "Website Redesign": {
        "manager@meridian.app": "project-manager",
        "member@meridian.app": "member",
        "viewer@meridian.app": "project-viewer",
      },
      "Marketing Campaign Q1": {
        "lead@meridian.app": "team-lead",
        "member@meridian.app": "member",
      },
    };

    for (const project of createdProjects) {
      const roles = projectRoles[project.name as keyof typeof projectRoles];
      if (!roles) continue;

      for (const [email, role] of Object.entries(roles)) {
        const user = createdUsers.find(u => u.email === email);
        if (!user) continue;

        const existing = await db
          .select()
          .from(projectMembers)
          .where(eq(projectMembers.projectId, project.id))
          .where(eq(projectMembers.userId, user.id))
          .limit(1);

        if (existing.length > 0) {
          logger.debug(`   ⏭️  ${user.name} already in "${project.name}"`);
          continue;
        }

        await db.insert(projectMembers).values({
          projectId: project.id,
          userId: user.id,
          userEmail: user.email,
          role: user.role,
        });

        logger.debug(`   ✅ Added ${user.name} to "${project.name}" as ${role}`);
      }
    }

    // 6️⃣ CREATE TEAMS
    logger.debug("\n👥 Creating teams...");
    const teamsData = [
      {
        name: "Frontend Team",
        description: "Frontend development team",
        leadId: createdUsers.find(u => u.email === "lead@meridian.app")!.id,
        projectId: createdProjects[0].id, // Mobile App
      },
      {
        name: "Backend Team",
        description: "Backend development team",
        leadId: createdUsers.find(u => u.email === "lead@meridian.app")!.id,
        projectId: createdProjects[0].id, // Mobile App
      },
      {
        name: "Design Team",
        description: "UI/UX design team",
        leadId: createdUsers.find(u => u.email === "lead@meridian.app")!.id,
        projectId: createdProjects[1].id, // Website Redesign
      },
    ];

    const createdTeams: any[] = [];
    for (const teamData of teamsData) {
      const existing = await db
        .select()
        .from(teams)
        .where(eq(teams.name, teamData.name))
        .where(eq(teams.workspaceId, workspace.id))
        .limit(1);

      if (existing.length > 0) {
        createdTeams.push(existing[0]);
        logger.debug(`   ⏭️  Team "${teamData.name}" already exists`);
        continue;
      }

      const [team] = await db
        .insert(teams)
        .values({
          ...teamData,
          workspaceId: workspace.id,
        })
        .returning();

      createdTeams.push(team);
      logger.debug(`   ✅ Created team "${teamData.name}"`);
    }

    // 7️⃣ ADD MEMBERS TO TEAMS
    logger.debug("\n👤 Adding members to teams...");
    for (const team of createdTeams) {
      // Add team lead
      const leadUser = createdUsers.find(u => u.id === team.leadId);
      if (leadUser) {
        const existing = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id))
          .where(eq(teamMembers.userId, leadUser.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(teamMembers).values({
            teamId: team.id,
            userId: leadUser.id,
            userEmail: leadUser.email,
            role: 'lead',
          });
          logger.debug(`   ✅ Added ${leadUser.name} to "${team.name}" as lead`);
        }
      }

      // Add regular member
      const memberUser = createdUsers.find(u => u.email === "member@meridian.app");
      if (memberUser) {
        const existing = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id))
          .where(eq(teamMembers.userId, memberUser.id))
          .limit(1);

        if (existing.length === 0) {
          await db.insert(teamMembers).values({
            teamId: team.id,
            userId: memberUser.id,
            userEmail: memberUser.email,
            role: 'member',
          });
          logger.debug(`   ✅ Added ${memberUser.name} to "${team.name}" as member`);
        }
      }
    }

    // 8️⃣ CREATE SAMPLE TASKS
    logger.debug("\n📋 Creating sample tasks...");
    const tasksData = [
      {
        title: "Design mobile app mockups",
        description: "Create initial design mockups for mobile app",
        projectId: createdProjects[0].id,
        assigneeId: createdUsers.find(u => u.email === "member@meridian.app")!.id,
        assigneeEmail: "member@meridian.app",
        status: "todo" as const,
        priority: "high" as const,
      },
      {
        title: "Set up API infrastructure",
        description: "Initialize backend API structure",
        projectId: createdProjects[0].id,
        assigneeId: createdUsers.find(u => u.email === "member@meridian.app")!.id,
        assigneeEmail: "member@meridian.app",
        status: "in_progress" as const,
        priority: "high" as const,
      },
      {
        title: "Review website wireframes",
        description: "Review and approve new website wireframes",
        projectId: createdProjects[1].id,
        assigneeId: createdUsers.find(u => u.email === "manager@meridian.app")!.id,
        assigneeEmail: "manager@meridian.app",
        status: "todo" as const,
        priority: "medium" as const,
      },
    ];

    for (const taskData of tasksData) {
      const existing = await db
        .select()
        .from(tasks)
        .where(eq(tasks.title, taskData.title))
        .where(eq(tasks.projectId, taskData.projectId))
        .limit(1);

      if (existing.length > 0) {
        logger.debug(`   ⏭️  Task "${taskData.title}" already exists`);
        continue;
      }

      await db.insert(tasks).values({
        ...taskData,
        workspaceId: workspace.id,
        createdBy: adminUser!.id,
      });

      logger.debug(`   ✅ Created task "${taskData.title}"`);
    }

    // 9️⃣ SUMMARY
    logger.debug("\n📊 Seeding Summary:");
    logger.debug("═".repeat(60));
    logger.debug(`✅ Users created: ${createdUsers.length}`);
    logger.debug(`✅ Workspace created: 1`);
    logger.debug(`✅ Projects created: ${createdProjects.length}`);
    logger.debug(`✅ Teams created: ${createdTeams.length}`);
    logger.debug(`✅ Sample tasks created: ${tasksData.length}`);
    logger.debug("═".repeat(60));

    logger.debug("\n👥 Test User Credentials:");
    logger.debug("─".repeat(60));
    for (const user of testUsers) {
      const workspaceRole = workspaceRoles[user.email as keyof typeof workspaceRoles];
      logger.debug(`📧 ${user.email}`);
      logger.debug(`   Password: ${user.password}`);
      logger.debug(`   Role: ${workspaceRole}`);
      logger.debug(`   ${user.description}`);
      logger.debug("");
    }
    logger.debug("─".repeat(60));

    logger.debug("\n✨ Seeding completed successfully!\n");
    return {
      users: createdUsers,
      workspace,
      projects: createdProjects,
      teams: createdTeams,
    };
  } catch (error) {
    logger.error("❌ Error seeding users:", error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedUsersWithRoles()
    .then(() => {
      logger.debug("✅ Done!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("❌ Failed:", error);
      process.exit(1);
    });
}

export default seedUsersWithRoles;


