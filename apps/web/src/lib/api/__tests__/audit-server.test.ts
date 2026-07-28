import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuditAPI } from "../audit-server";

type FetchCall = (input: string, init?: RequestInit) => Promise<Response>;

function stubFetch(impl?: FetchCall) {
  const fetchMock = vi.fn<FetchCall>(
    impl ??
      (async () =>
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
        })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonOnce(body: unknown, status = 200): FetchCall {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("AuditAPI", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("sends credentials on every request", async () => {
    // Load-bearing: without this the calls 401 the moment VITE_API_URL points
    // at a different origin, which is what the production template configures.
    const fetchMock = stubFetch(
      jsonOnce({ success: true, data: [], pagination: { total: 0 } }),
    );
    await AuditAPI.listLogs("ws-1");

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.credentials).toBe("include");
  });

  it("scopes the request to the given workspace", async () => {
    const fetchMock = stubFetch(
      jsonOnce({ success: true, data: [], pagination: { total: 0 } }),
    );
    await AuditAPI.listLogs("ws-42");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/audit/ws-42/logs");
  });

  it("unwraps the log envelope into logs/total/hasMore", async () => {
    stubFetch(
      jsonOnce({
        success: true,
        data: [{ id: "a", action: "project_delete", severity: "critical" }],
        pagination: { total: 7, hasMore: true },
      }),
    );

    const page = await AuditAPI.listLogs("ws-1", { limit: 1 });
    expect(page.logs).toHaveLength(1);
    expect(page.total).toBe(7);
    expect(page.hasMore).toBe(true);
  });

  it("omits empty filter values from the query string", async () => {
    const fetchMock = stubFetch(
      jsonOnce({ success: true, data: [], pagination: { total: 0 } }),
    );
    await AuditAPI.listLogs("ws-1", {
      limit: 25,
      severity: undefined,
      action: "",
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("limit=25");
    expect(url).not.toContain("severity=");
    expect(url).not.toContain("action=");
  });

  it("passes the day range to security logs so it matches the stat cards", async () => {
    const fetchMock = stubFetch(jsonOnce({ success: true, data: [] }));
    await AuditAPI.listSecurityLogs("ws-1", 20, 7);

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("days=7");
  });

  it("throws with the server's message rather than a generic failure", async () => {
    // The old components swallowed errors entirely; the whole point of routing
    // through this client is that a failure is visible and explains itself.
    stubFetch(jsonOnce({ error: "Forbidden" }, 403));

    await expect(AuditAPI.getStats("ws-1")).rejects.toThrow(/forbidden/i);
  });

  it("throws on a 404 instead of resolving to an empty list", async () => {
    stubFetch(
      jsonOnce({ error: { message: "Route not found" } }, 404),
    );

    await expect(AuditAPI.listLogs("ws-1")).rejects.toThrow(/route not found/i);
  });

  it("returns the export as a blob and asks for the requested format", async () => {
    const fetchMock = stubFetch(
      async () =>
        new Response("timestamp,action\n", {
          status: 200,
          headers: { "Content-Type": "text/csv" },
        }),
    );

    const blob = await AuditAPI.exportLogs("ws-1", "csv", 30);
    // jsdom's Blob has no .text(), so assert on type and size rather than
    // contents — the point here is that the caller gets a downloadable blob
    // and that format/range reach the server.
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("format=csv");
    expect(url).toContain("days=30");
    expect(init?.credentials).toBe("include");
  });
});
