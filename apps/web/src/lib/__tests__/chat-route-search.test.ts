import { describe, expect, it } from "vitest";
import { parseChatDashboardSearch } from "../chat-route-search";

describe("parseChatDashboardSearch", () => {
  it("parses string channel, message, and userId", () => {
    expect(
      parseChatDashboardSearch({
        channel: "ch_1",
        message: "msg_1",
        userId: "usr_1",
      }),
    ).toEqual({
      channel: "ch_1",
      message: "msg_1",
      userId: "usr_1",
    });
  });

  it("drops empty strings and non-strings", () => {
    expect(
      parseChatDashboardSearch({
        channel: "",
        message: "m",
        userId: 123 as unknown as string,
      }),
    ).toEqual({ message: "m" });
  });

  it("returns empty object for invalid input", () => {
    expect(parseChatDashboardSearch({ channel: ["x"] })).toEqual({});
  });

  it("preserves leading and trailing spaces when the value is not whitespace-only", () => {
    expect(
      parseChatDashboardSearch({
        channel: "  ch_1  ",
        message: "\tmsg\t",
      }),
    ).toEqual({
      channel: "  ch_1  ",
      message: "\tmsg\t",
    });
  });

  it("drops whitespace-only values", () => {
    expect(
      parseChatDashboardSearch({
        channel: "   ",
        message: "ok",
      }),
    ).toEqual({ message: "ok" });
  });
});
