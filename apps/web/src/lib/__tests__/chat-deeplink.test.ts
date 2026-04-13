import { describe, expect, it } from "vitest";
import { buildChatDeeplink } from "../chat-deeplink";

describe("buildChatDeeplink", () => {
  it("builds chat channel/message deeplink", () => {
    expect(
      buildChatDeeplink({ channelId: "ch_1", messageId: "msg_1" }),
    ).toBe("/dashboard/chat?channel=ch_1&message=msg_1");
  });

  it("builds message-only deeplink", () => {
    expect(buildChatDeeplink({ messageId: "msg_1" })).toBe(
      "/dashboard/chat?message=msg_1",
    );
  });

  it("falls back to chat root when empty", () => {
    expect(buildChatDeeplink({})).toBe("/dashboard/chat");
  });
});

