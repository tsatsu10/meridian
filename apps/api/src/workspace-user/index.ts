import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { subscribeToEvent } from "../events";
import createRootWorkspaceUser from "./controllers/create-root-workspace-user";
import deleteWorkspaceUser from "./controllers/delete-workspace-user";
import getActiveWorkspaceUsers from "./controllers/get-active-workspace-users";
import getWorkspaceUser from "./controllers/get-workspace-user";
import getWorkspaceUsers from "./controllers/get-workspace-users";
import inviteWorkspaceUser from "./controllers/invite-workspace-user";
import updateWorkspaceUser from "./controllers/update-workspace-user";
import changeUserRole from "./controllers/change-user-role";
import toggleUserStatus from "./controllers/toggle-user-status";
import resetUserPassword from "./controllers/reset-user-password";
import { changeMemberRole } from "./controllers/change-member-role";
import { removeMember } from "./controllers/remove-member";
import { getMemberActivity } from "./controllers/get-member-activity";
import { getOnlineUsers } from "../realtime/controllers/user-presence";

const workspaceUser = new Hono<{
  Variables: {
    userEmail: string;
  };
}>()
  .post(
    "/root",
    zValidator(
      "json",
      z.object({
        workspaceId: z.string(),
        userEmail: z.string(),
      }),
    ),
    async (c) => {
      const { workspaceId, userEmail } = c.req.valid("json");

      const workspaceUser = await createRootWorkspaceUser(
        workspaceId,
        userEmail,
      );

      return c.json(workspaceUser);
    },
  )
  .get(
    "/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");

      const workspaceUsers = await getWorkspaceUsers(workspaceId);

      return c.json(workspaceUsers);
    },
  )
  .get(
    "/:workspaceId/users",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");

      const workspaceUsers = await getWorkspaceUsers(workspaceId);

      return c.json(workspaceUsers);
    },
  )
  .delete(
    "/:workspaceId",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator("query", z.object({ userEmail: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const { userEmail } = c.req.valid("query");

      const deletedWorkspaceUser = await deleteWorkspaceUser(
        workspaceId,
        userEmail,
      );

      return c.json(deletedWorkspaceUser);
    },
  )
  .get(
    "/:workspaceId/active",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");

      const activeWorkspaceUsers = await getActiveWorkspaceUsers(workspaceId);

      return c.json(activeWorkspaceUsers);
    },
  )
  .get(
    "/:workspaceId/online",
    zValidator("param", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");

      const onlineUsers = await getOnlineUsers(workspaceId);

      return c.json(onlineUsers);
    },
  )
  .post(
    "/:workspaceId/invite",
    zValidator("param", z.object({ workspaceId: z.string() })),
    zValidator("json", z.object({ userEmail: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const { userEmail } = c.req.valid("json");
      const inviterEmail = c.get("userEmail");

      const workspaceUser = await inviteWorkspaceUser(workspaceId, userEmail, inviterEmail);

      return c.json(workspaceUser);
    },
  )
  .delete(
    "/:workspaceId/invite/:userEmail",
    zValidator(
      "param",
      z.object({ workspaceId: z.string(), userEmail: z.string() }),
    ),
    async (c) => {
      const { workspaceId, userEmail } = c.req.valid("param");

      const deletedWorkspaceUser = await deleteWorkspaceUser(
        workspaceId,
        userEmail,
      );

      return c.json(deletedWorkspaceUser);
    },
  )
  .get("/user/:id", zValidator("param", z.object({ id: z.string() })), async (c) => {
    const { id } = c.req.valid("param");

    const workspaceUser = await getWorkspaceUser(id);

    return c.json(workspaceUser);
  })
  .put(
    "/:userEmail",
    zValidator("param", z.object({ userEmail: z.string() })),
    zValidator("json", z.object({ status: z.string() })),
    async (c) => {
      const { userEmail } = c.req.valid("param");
      const { status } = c.req.valid("json");

      const updatedWorkspaceUser = await updateWorkspaceUser(userEmail, status);

      return c.json(updatedWorkspaceUser);
    },
  )
  // @epic-3.4-teams: Change user role (legacy - by email)
  .patch(
    "/:workspaceId/:userEmail/role",
    zValidator("param", z.object({ workspaceId: z.string(), userEmail: z.string() })),
    zValidator("json", z.object({ role: z.string() })),
    async (c) => {
      const { workspaceId, userEmail } = c.req.valid("param");
      const { role } = c.req.valid("json");

      const updatedUser = await changeUserRole(workspaceId, userEmail, role);

      return c.json(updatedUser);
    },
  )
  // @epic-3.4-teams: Change member role (new - by memberId)
  .patch(
    "/:workspaceId/members/:memberId/role",
    zValidator("param", z.object({ workspaceId: z.string(), memberId: z.string() })),
    zValidator("json", z.object({ role: z.string() })),
    changeMemberRole
  )
  // @epic-3.4-teams: Remove member (new - by memberId)
  .delete(
    "/:workspaceId/members/:memberId",
    zValidator("param", z.object({ workspaceId: z.string(), memberId: z.string() })),
    removeMember
  )
  // @epic-3.4-teams: Get member activity and performance data
  .get(
    "/:workspaceId/members/:memberId/activity",
    zValidator("param", z.object({ workspaceId: z.string(), memberId: z.string() })),
    getMemberActivity
  )
  // @epic-3.4-teams: Toggle user status
  .post(
    "/:workspaceId/:userEmail/toggle-status",
    zValidator("param", z.object({ workspaceId: z.string(), userEmail: z.string() })),
    async (c) => {
      const { workspaceId, userEmail } = c.req.valid("param");

      const updatedUser = await toggleUserStatus(workspaceId, userEmail);

      return c.json(updatedUser);
    },
  )
  // @epic-3.4-teams: Reset user password
  .post(
    "/:userEmail/reset-password",
    zValidator("param", z.object({ userEmail: z.string() })),
    async (c) => {
      const { userEmail } = c.req.valid("param");

      const result = await resetUserPassword(userEmail);

      return c.json(result);
    },
  );

subscribeToEvent("user.signed_up", async ({ email }: { email: string }) => {
  if (!email) {
    return;
  }

  await updateWorkspaceUser(email, "active");
});

subscribeToEvent(
  "workspace.created",
  async ({
    workspaceId,
    ownerEmail,
  }: { workspaceId: string; ownerEmail: string }) => {
    if (!workspaceId || !ownerEmail) {
      return;
    }

    await createRootWorkspaceUser(workspaceId, ownerEmail);
  },
);

export default workspaceUser;

