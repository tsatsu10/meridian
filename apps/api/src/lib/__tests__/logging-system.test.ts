import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { loggingService, LogLevel, createLoggingMiddleware } from "../logging";
import { errorHandler } from "../errors";

describe("Logging System", () => {
  beforeEach(() => {
    loggingService.clearLogs();
    vi.clearAllMocks();
  });

  describe("Logging Service", () => {
    it("creates log entries", () => {
      const logEntry = loggingService.log({
        level: LogLevel.INFO,
        category: "TEST",
        message: "Test log message",
        context: { userId: "123" },
      });

      expect(logEntry.level).toBe(LogLevel.INFO);
      expect(logEntry.message).toBe("Test log message");
      expect(logEntry.context).toEqual({ userId: "123" });
      expect(logEntry.timestamp).toBeDefined();
    });

    it("retrieves log entries", () => {
      loggingService.log({
        level: LogLevel.INFO,
        category: "TEST",
        message: "Test log message",
      });

      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe("Test log message");
    });

    it("filters logs by level", () => {
      loggingService.log({
        level: LogLevel.INFO,
        category: "TEST",
        message: "Info message",
      });
      loggingService.log({
        level: LogLevel.ERROR,
        category: "TEST",
        message: "Error message",
      });

      const errorLogs = loggingService.getLogs(undefined, LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe("Error message");
    });

    it("filters logs by category", () => {
      loggingService.log({
        level: LogLevel.INFO,
        category: "AUTH",
        message: "Auth log",
      });
      loggingService.log({
        level: LogLevel.INFO,
        category: "API",
        message: "API log",
      });

      const authLogs = loggingService.getLogs(undefined, undefined, "AUTH");
      expect(authLogs).toHaveLength(1);
      expect(authLogs[0].message).toBe("Auth log");
    });

    it("limits retrieved logs to the most recent entries", () => {
      for (let i = 0; i < 10; i++) {
        loggingService.log({
          level: LogLevel.INFO,
          category: "TEST",
          message: `Log message ${i}`,
        });
      }

      const logs = loggingService.getLogs(3);
      expect(logs).toHaveLength(3);
      expect(logs[2].message).toBe("Log message 9");
    });

    it("clears stored logs", () => {
      loggingService.log({
        level: LogLevel.INFO,
        category: "TEST",
        message: "Test log message",
      });

      loggingService.clearLogs();
      expect(loggingService.getLogs()).toHaveLength(0);
    });

    it("caps in-memory logs at 1000 entries", () => {
      for (let i = 0; i < 1005; i++) {
        loggingService.log({
          level: LogLevel.INFO,
          category: "TEST",
          message: `Log message ${i}`,
        });
      }

      const logs = loggingService.getLogs();
      expect(logs).toHaveLength(1000);
      expect(logs[0].message).toBe("Log message 5");
    });
  });

  describe("Log Levels", () => {
    it.each([
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.VERBOSE,
    ])("logs %s messages", (level) => {
      const logEntry = loggingService.log({
        level,
        category: "TEST",
        message: `${level} message`,
      });

      expect(logEntry.level).toBe(level);
    });
  });

  describe("Logging Statistics", () => {
    it("aggregates counts by level and category", () => {
      loggingService.log({
        level: LogLevel.INFO,
        category: "AUTH",
        message: "Info message",
      });
      loggingService.log({
        level: LogLevel.ERROR,
        category: "API",
        message: "Error message",
      });
      loggingService.log({
        level: LogLevel.ERROR,
        category: "API",
        message: "Another error",
      });

      const stats = loggingService.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byLevel[LogLevel.INFO]).toBe(1);
      expect(stats.byLevel[LogLevel.ERROR]).toBe(2);
      expect(stats.byCategory.AUTH).toBe(1);
      expect(stats.byCategory.API).toBe(2);
    });
  });

  describe("Logging Middleware", () => {
    let app: Hono;

    beforeEach(() => {
      app = new Hono();
      app.onError(errorHandler());
    });

    it("logs request and completion entries", async () => {
      app.use("*", createLoggingMiddleware());
      app.get("/test", (c) => c.text("OK"));

      const response = await app.request("/test");
      expect(response.status).toBe(200);

      const apiLogs = loggingService.getLogs(undefined, undefined, "API");
      expect(apiLogs).toHaveLength(1);
      expect(apiLogs[0].message).toBe("GET /test");

      const perfLogs = loggingService.getLogs(
        undefined,
        undefined,
        "PERFORMANCE",
      );
      expect(perfLogs).toHaveLength(1);
      expect(perfLogs[0].message).toContain("GET /test completed in");
    });

    it("still logs request and completion entries when the handler throws", async () => {
      // Hono resolves handler errors via onError inside its dispatch, so
      // next() resolves normally here and the middleware's catch branch
      // never fires for handler exceptions — only the info/debug entries
      // are recorded for a failing request.
      app.use("*", createLoggingMiddleware());
      app.get("/error", () => {
        throw new Error("Test error");
      });

      const response = await app.request("/error");
      expect(response.status).toBe(500);

      const apiLogs = loggingService.getLogs(undefined, undefined, "API");
      expect(apiLogs).toHaveLength(1);
      expect(apiLogs[0].message).toBe("GET /error");

      const perfLogs = loggingService.getLogs(
        undefined,
        undefined,
        "PERFORMANCE",
      );
      expect(perfLogs).toHaveLength(1);
    });
  });
});
