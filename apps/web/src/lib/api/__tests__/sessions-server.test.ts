import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionsAPI } from "../sessions-server";

/**
 * The Security settings page had no session client at all: it rendered a
 * single hardcoded "current device" row synthesised from navigator.userAgent
 * and a timezone->city guess, always claimed "This is your only active
 * session", and shipped both "View All Sessions" and "End All Others" as
 * hardcoded disabled buttons — while a complete API existed at
 * /api/security/sessions/*. This client is what connects the two.
 */
describe("SessionsAPI", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends the session cookie when listing sessions", async () => {
    await SessionsAPI.listActive();

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.credentials).toBe("include");
  });

  it("requests the active-sessions endpoint", async () => {
    await SessionsAPI.listActive();

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("/security/sessions/active");
  });

  it("unwraps the { data } envelope the API returns", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: "s1", deviceName: "Chrome on Windows" }],
      }),
    });

    const sessions = await SessionsAPI.listActive();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].deviceName).toBe("Chrome on Windows");
  });

  it("returns an empty list rather than throwing when the response has no data", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    await expect(SessionsAPI.listActive()).resolves.toEqual([]);
  });

  it("throws on a failed list so the caller can surface it", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });

    await expect(SessionsAPI.listActive()).rejects.toThrow();
  });

  it("terminates one session by id with a POST", async () => {
    await SessionsAPI.terminate("abc123");

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(String(url)).toContain("/security/sessions/abc123/terminate");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });

  it("url-encodes the session id", async () => {
    await SessionsAPI.terminate("a/b?c");

    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("a%2Fb%3Fc");
  });

  it("terminates all other sessions", async () => {
    await SessionsAPI.terminateAllOthers();

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(String(url)).toContain("/security/sessions/terminate-all");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
  });

  it("throws when terminating fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Session not found" }),
    });

    await expect(SessionsAPI.terminate("nope")).rejects.toThrow();
  });
});
