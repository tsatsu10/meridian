import { request } from "@playwright/test";

const baseURL = "http://localhost:3005";

function assertOk(response, label) {
  if (!response.ok()) {
    throw new Error(`${label} failed: ${response.status()} ${response.statusText()}`);
  }
}

async function main() {
  const api = await request.newContext({ baseURL });
  const id = Date.now();
  const email = `chat-smoke-${id}@example.com`;
  const password = "E2E_Smoke_Secure_Pass_1!";
  const name = "Chat Smoke User";

  const signUp = await api.post("/api/users/sign-up", {
    data: { email, password, name },
  });
  assertOk(signUp, "sign-up");

  const me = await api.get("/api/users/me");
  assertOk(me, "session /users/me");

  const workspaceRes = await api.post("/api/workspaces", {
    data: { name: `Chat Smoke Workspace ${id}` },
  });
  assertOk(workspaceRes, "create workspace");
  const workspace = await workspaceRes.json();
  const workspaceId = workspace?.id || workspace?.workspace?.id;
  if (!workspaceId) {
    throw new Error("Workspace ID missing from response");
  }

  const createChannel = await api.post("/api/channel", {
    data: { workspaceId, name: `chat-smoke-${id}` },
  });
  assertOk(createChannel, "create channel");
  const channelData = await createChannel.json();
  const channelId = channelData?.channel?.id || channelData?.id;
  if (!channelId) {
    throw new Error("Channel ID missing from response");
  }

  const getMessagesBefore = await api.get(`/api/message/channel/${channelId}?limit=50`);
  assertOk(getMessagesBefore, "get channel messages (before)");

  const sendMessage = await api.post("/api/message/send", {
    data: {
      channelId,
      content: `chat smoke message ${id}`,
      messageType: "text",
    },
  });
  assertOk(sendMessage, "send message");

  const getMessagesAfter = await api.get(`/api/message/channel/${channelId}?limit=50`);
  assertOk(getMessagesAfter, "get channel messages (after)");

  const search = await api.get(
    `/api/search?q=${encodeURIComponent("chat smoke message")}&workspaceId=${encodeURIComponent(workspaceId)}&limit=10`,
  );
  assertOk(search, "search");
  const searchBody = await search.json();
  const hasMessageResult = Array.isArray(searchBody?.results)
    ? searchBody.results.some((r) => r?.type === "message" && r?.channelId === channelId)
    : false;

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: {
          signUp: true,
          session: true,
          createWorkspace: true,
          createChannel: true,
          fetchMessagesBefore: true,
          sendMessage: true,
          fetchMessagesAfter: true,
          search: true,
        },
        hasMessageResult,
        workspaceId,
        channelId,
      },
      null,
      2,
    ),
  );

  await api.dispose();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

