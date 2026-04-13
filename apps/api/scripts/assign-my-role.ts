/**
 * 🔐 Quick Role Assignment Script
 * Assigns workspace-manager role to a specific user
 * 
 * Usage: tsx scripts/assign-my-role.ts <user-email>
 */

import { createId } from "@paralleldrive/cuid2";
import { eq, and } from "drizzle-orm";
import { getDatabase } from "../src/database/connection";
import { 
  userTable, 
  roleAssignmentTable, 
  roleHistoryTable,
  workspaceTable
} from "../src/database/schema";

const db = getDatabase();

async function assignWorkspaceManagerRole(userEmail: string) {
  try {
    console.log(`\n🔍 Looking for user: ${userEmail}...`);

    // Get user
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, userEmail))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      console.log("\n💡 Tip: Make sure you're logged in first. Check your auth session.");
      return;
    }

    console.log(`✅ Found user: ${user.name || user.email}`);

    // Get or create a workspace
    let workspace = await db
      .select()
      .from(workspaceTable)
      .limit(1);

    let workspaceId: string;
    
    if (!workspace.length) {
      console.log("\n📦 No workspaces found. Creating demo workspace...");
      workspaceId = createId();
      await db.insert(workspaceTable).values({
        id: workspaceId,
        name: "My Workspace",
        description: "Personal workspace",
        ownerEmail: userEmail,
        createdAt: new Date(),
      });
      console.log("✅ Workspace created!");
    } else {
      workspaceId = workspace[0].id;
      console.log(`✅ Using workspace: ${workspace[0].name}`);
    }

    // Check if role already assigned
    const existingRole = await db
      .select()
      .from(roleAssignmentTable)
      .where(
        and(
          eq(roleAssignmentTable.userId, user.id),
          eq(roleAssignmentTable.role, "workspace-manager"),
          eq(roleAssignmentTable.isActive, true)
        )
      )
      .limit(1);

    if (existingRole.length > 0) {
      console.log("\n⏭️  You already have workspace-manager role!");
      console.log("✨ Try refreshing the page and accessing the role permissions again.");
      return;
    }

    // Assign workspace-manager role
    console.log("\n🔐 Assigning workspace-manager role...");
    
    const assignmentId = createId();
    await db.insert(roleAssignmentTable).values({
      id: assignmentId,
      userId: user.id,
      role: "workspace-manager",
      assignedBy: user.id,
      assignedAt: new Date(),
      isActive: true,
      workspaceId: workspaceId,
      reason: "Manual role assignment via script",
      notes: "Workspace-manager role assigned for full system access",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Record in history
    await db.insert(roleHistoryTable).values({
      id: createId(),
      userId: user.id,
      newRole: "workspace-manager",
      action: "assigned",
      changedBy: user.id,
      reason: "Manual assignment via assign-my-role script",
      workspaceId: workspaceId,
      ipAddress: "127.0.0.1",
      userAgent: "Role Assignment Script",
      sessionId: "script-assignment",
      changedAt: new Date(),
    });

    console.log("✅ Workspace-manager role assigned successfully!");
    console.log("\n🎉 You now have full access to:");
    console.log("   • Role & Permissions Management");
    console.log("   • Workspace Settings");
    console.log("   • User Management");
    console.log("   • All Administrative Functions");
    console.log("\n💡 Refresh the page and try accessing the role permissions again!");

  } catch (error) {
    console.error("\n❌ Error assigning role:", error);
    if (error instanceof Error) {
      console.error("Details:", error.message);
    }
  }
}

// Get email from command line or use default
const userEmail = process.argv[2];

if (!userEmail) {
  console.error("\n❌ Please provide your email address:");
  console.log("\nUsage: tsx scripts/assign-my-role.ts <your-email@example.com>");
  console.log("\nExample: tsx scripts/assign-my-role.ts admin@meridian.app");
  process.exit(1);
}

assignWorkspaceManagerRole(userEmail)
  .then(() => {
    console.log("\n✨ Done!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });

