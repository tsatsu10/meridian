import { describe, expect, it, vi } from "vitest";
import { writeProxyErrorResponse } from "../proxy-error";

// Regression: the dev server's /api proxy had no error handler, so whenever the
// API wasn't accepting connections — which happens on every save, because
// apps/api runs under `tsx watch` and index.ts awaits initializeDatabase()
// before binding its port — Vite's default behaviour answered the browser with
// a bare `500 Internal Server Error` and a text/plain body. That is
// indistinguishable in the console from a genuine API fault, and cost a full
// debugging session chasing a server bug that did not exist.

function makeRes() {
  return {
    headersSent: false,
    writeHead: vi.fn(),
    end: vi.fn(),
    destroy: vi.fn(),
  };
}

describe("writeProxyErrorResponse", () => {
  it("answers 503, not 500, so a restarting upstream is not read as a server fault", () => {
    const res = makeRes();

    writeProxyErrorResponse({
      error: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
      requestUrl: "/api/users/me",
      target: "http://localhost:3005",
      res,
      log: () => {},
    });

    expect(res.writeHead).toHaveBeenCalledTimes(1);
    expect(res.writeHead.mock.calls[0][0]).toBe(503);
    expect(res.writeHead.mock.calls[0][1]).toMatchObject({
      "Content-Type": "application/json",
    });
  });

  it("names the unreachable target and the failing path in the body", () => {
    const res = makeRes();

    writeProxyErrorResponse({
      error: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
      requestUrl: "/api/users/me",
      target: "http://localhost:3005",
      res,
      log: () => {},
    });

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.error.statusCode).toBe(503);
    expect(body.error.code).toBe("DEV_PROXY_UPSTREAM_UNREACHABLE");
    expect(body.error.target).toBe("http://localhost:3005");
    expect(body.error.path).toBe("/api/users/me");
    expect(body.error.syscall).toBe("ECONNREFUSED");
    // The whole point is that the message explains itself without a debugging
    // session, so assert it actually says where to look.
    expect(body.error.message).toContain("http://localhost:3005");
    expect(body.error.message).toMatch(/restart|starting/i);
  });

  it("mirrors the API's { error: { message } } envelope so client error handling still reads it", () => {
    const res = makeRes();

    writeProxyErrorResponse({
      error: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
      requestUrl: "/api/templates",
      target: "http://localhost:3005",
      res,
      log: () => {},
    });

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(typeof body.error.message).toBe("string");
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it("logs one line to the dev terminal", () => {
    const res = makeRes();
    const log = vi.fn();

    writeProxyErrorResponse({
      error: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
      requestUrl: "/api/users/me",
      target: "http://localhost:3005",
      res,
      log,
    });

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toContain("/api/users/me");
    expect(log.mock.calls[0][0]).toContain("http://localhost:3005");
  });

  it("does not try to write a response once headers are already sent", () => {
    const res = { ...makeRes(), headersSent: true };

    writeProxyErrorResponse({
      error: { code: "ECONNRESET", message: "socket hang up" },
      requestUrl: "/api/users/me",
      target: "http://localhost:3005",
      res,
      log: () => {},
    });

    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.destroy).toHaveBeenCalledTimes(1);
  });

  it("destroys the socket instead of throwing when the error is on a raw upgrade socket", () => {
    // http-proxy hands the error handler a net.Socket, not a ServerResponse,
    // when a websocket upgrade fails — it has no writeHead.
    const socket = { destroy: vi.fn() };

    expect(() =>
      writeProxyErrorResponse({
        error: { code: "ECONNREFUSED", message: "connect ECONNREFUSED" },
        requestUrl: "/api/ws",
        target: "http://localhost:3005",
        res: socket,
        log: () => {},
      }),
    ).not.toThrow();

    expect(socket.destroy).toHaveBeenCalledTimes(1);
  });

  it("still responds when the error carries no code", () => {
    const res = makeRes();

    writeProxyErrorResponse({
      error: { message: "something opaque" },
      requestUrl: "/api/users/me",
      target: "http://localhost:3005",
      res,
      log: () => {},
    });

    const body = JSON.parse(res.end.mock.calls[0][0] as string);
    expect(body.error.statusCode).toBe(503);
    expect(body.error.syscall).toBeUndefined();
  });
});
