import { describe, expect, it } from "vitest";
import { userMessage } from "../user-message";

/**
 * Error copy across the app was a dead end: 112 toast.error calls said only
 * "Failed to <verb>", and 70 of those sat in a catch block holding an error
 * whose message explained exactly what went wrong — the server's reason was
 * caught and thrown away. This composes the two halves a user needs: what
 * happened, and what to do about it.
 */
describe("userMessage", () => {
  it("uses the server's explanation when there is one", () => {
    const message = userMessage(
      new Error("You don't have permission to edit this project"),
      "save that setting",
    );

    expect(message).toBe(
      "Couldn't save that setting. You don't have permission to edit this project.",
    );
  });

  it("does not double up terminal punctuation", () => {
    const message = userMessage(
      new Error("That project no longer exists."),
      "open the project",
    );

    expect(message).toBe(
      "Couldn't open the project. That project no longer exists.",
    );
    expect(message).not.toContain("..");
  });

  it("preserves acronyms in the server's wording", () => {
    // Lower-casing the reason to splice it after a dash would produce "sMTP".
    const message = userMessage(
      new Error("SMTP host is unreachable"),
      "send the test email",
    );

    expect(message).toContain("SMTP host is unreachable");
  });

  it("turns a network failure into connection guidance", () => {
    const message = userMessage(
      new TypeError("Failed to fetch"),
      "save your changes",
    );

    expect(message).toBe(
      "Couldn't save your changes — the server didn't respond. Check your connection and try again.",
    );
  });

  it("treats other network wordings the same way", () => {
    for (const raw of [
      "NetworkError when attempting to fetch resource",
      "Load failed",
      "The Internet connection appears to be offline.",
    ]) {
      expect(userMessage(new Error(raw), "save your changes")).toContain(
        "Check your connection",
      );
    }
  });

  it("hides raw HTTP status noise behind a plain retry", () => {
    for (const raw of [
      "Request failed with status 500",
      "Internal Server Error",
      "Unexpected token < in JSON at position 0",
      "500",
    ]) {
      expect(userMessage(new Error(raw), "load your tasks")).toBe(
        "Couldn't load your tasks. Something went wrong on our end — please try again.",
      );
    }
  });

  it("never shows a stringified object to a user", () => {
    const message = userMessage(
      { code: 500, detail: "boom" },
      "load your tasks",
    );

    expect(message).not.toContain("{");
    expect(message).toBe(
      "Couldn't load your tasks. Something went wrong on our end — please try again.",
    );
  });

  it("falls back cleanly on an empty or whitespace message", () => {
    expect(userMessage(new Error("   "), "load your tasks")).toBe(
      "Couldn't load your tasks. Something went wrong on our end — please try again.",
    );
  });

  it("accepts a plain string reason", () => {
    expect(userMessage("That name is already taken", "create the team")).toBe(
      "Couldn't create the team. That name is already taken.",
    );
  });

  it("does not repeat itself when the reason already names the action", () => {
    // Servers often answer with their own "Failed to ..." phrasing; echoing it
    // after our prefix reads as "Couldn't save. Failed to save."
    const message = userMessage(
      new Error("Failed to save the milestone"),
      "save the milestone",
    );

    expect(message).toBe("Couldn't save the milestone. Please try again.");
  });

  it("is usable without an action for standalone failures", () => {
    expect(userMessage(new Error("Your session has expired"))).toBe(
      "Your session has expired.",
    );
  });
});
