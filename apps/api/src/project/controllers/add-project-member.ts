import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { getDatabase } from "../../database/connection";
import { projectMemberTable, userTable, projectTable } from "../../database/schema";

interface AddMemberData {
  projectId: string;
  userEmail: string;
  role?: string;
  hoursPerWeek?: number;
  assignedBy?: string;
  notificationSettings?: Record<string, boolean>;
}

async function addProjectMember(data: AddMemberData) {
  const {
    projectId,
    userEmail,
    role = "member",
    hoursPerWeek = 40,
    assignedBy,
    notificationSettings,
  } = data;

  const db = getDatabase();
  // Check if project exists
  const [project] = await db
    .select()
    .from(projectTable)
    .where(eq(projectTable.id, projectId));

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  // Check if user exists
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, userEmail));

  if (!user) {
    throw new HTTPException(404, {
      message: "User not found",
    });
  }

  // Check if user is already a member
  const [existingMember] = await db
    .select()
    .from(projectMemberTable)
    .where(
      eq(projectMemberTable.projectId, projectId) &&
      eq(projectMemberTable.userEmail, userEmail)
    );

  if (existingMember) {
    throw new HTTPException(400, {
      message: "User is already a member of this project",
    });
  }

  // Add member to project
  const [newMember] = await db
    .insert(projectMemberTable)
    .values({
      projectId,
      userEmail,
      role,
      hoursPerWeek,
      assignedBy,
      notificationSettings: notificationSettings ? JSON.stringify(notificationSettings) : null,
      assignedAt: new Date(),
      isActive: true,
    })
    .returning();

  return newMember;
}

export default addProjectMember; 
