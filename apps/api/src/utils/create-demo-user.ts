import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcrypt";
import { getDatabase } from "../database/connection";
import { userTable, roleAssignmentTable, roleHistoryTable, workspaceTable } from "../database/schema";
import createSession from "../user/utils/create-session";
import generateSessionToken from "../user/utils/generate-session-token";
import { generateDemoName } from "./generate-demo-name";
import { eq } from "drizzle-orm";
import logger from '../utils/logger';

export async function createDemoUser() {
  const db = getDatabase();
  const demoId = createId();
  const demoName = generateDemoName();
  const demoEmail = `${demoName}-${demoId}@meridian.app`;

  const hashedPassword = await bcrypt.hash("demo", 10);

  // Create the user
  await db.insert(userTable).values({
    id: demoId,
    name: demoName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    email: demoEmail,
    password: hashedPassword,
  });

  // Get or create a demo workspace for role assignment
  let workspace = await db
    .select()
    .from(workspaceTable)
    .limit(1);

  let workspaceId: string;
  if (!workspace.length) {
    // Create a demo workspace if none exists
    workspaceId = createId();
    await db.insert(workspaceTable).values({
      id: workspaceId,
      name: "Meridian Demo Workspace",
      description: "Demo workspace for new users",
      ownerId: demoId,
      createdAt: new Date(),
    });
  } else {
    workspaceId = workspace[0]!.id;
  }

  // Determine role based on email pattern (similar to frontend logic)
  let userRole = "member";
  if (demoEmail.includes("admin") || demoEmail.includes("manager") || demoEmail.includes("owner")) {
    userRole = "workspace-manager";
  } else if (demoEmail.includes("head") || demoEmail.includes("director")) {
    userRole = "department-head";
  } else if (demoEmail.includes("pm") || demoEmail.includes("project")) {
    userRole = "project-manager";
  } else if (demoEmail.includes("lead") || demoEmail.includes("senior")) {
    userRole = "team-lead";
  }

  // Create a role assignment for the demo user
  const roleAssignmentId = createId();
  await db.insert(roleAssignmentTable).values({
    id: roleAssignmentId,
    userId: demoId,
    role: userRole,
    assignedAt: new Date(),
    isActive: true,
    workspaceId: workspaceId,
  });

  // Record in role history for audit trail
  await db.insert(roleHistoryTable).values({
    id: createId(),
    userId: demoId,
    role: userRole,
    action: "assigned",
    performedBy: demoId,
    reason: "Default role assignment for demo user",
    workspaceId: workspaceId,
    notes: "Automatic role assignment for demo account creation",
    metadata: {
      source: "create-demo-user",
      ipAddress: "127.0.0.1",
      userAgent: "Demo User Creation",
    },
  });

  const token = generateSessionToken();
  const demoSession = await createSession(token, demoId);

  logger.debug(`🛡️ Created demo user with ${userRole} role: ${demoEmail}`);

  return {
    id: demoId,
    name: demoName,
    email: demoEmail,
    session: token,
    expiresAt: demoSession.expiresAt,
  };
}

