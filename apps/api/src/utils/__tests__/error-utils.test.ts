import { describe, it, expect } from "vitest";
import { statusCodeOf } from "../error-utils";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  CustomError,
} from "../../core/ErrorHandler";

describe("statusCodeOf", () => {
  it("returns the status a CustomError subclass carries", () => {
    expect(statusCodeOf(new ForbiddenError("nope"))).toBe(403);
    expect(statusCodeOf(new NotFoundError("Workspace", "abc"))).toBe(404);
    expect(statusCodeOf(new ValidationError("bad"))).toBe(400);
  });

  it("returns a custom status such as 501", () => {
    // The backup controllers throw 501 for operations that are not
    // implemented; routes must not flatten that back to 500.
    const notImplemented = new CustomError(
      "Backup creation is not available",
      "INTERNAL_ERROR",
      501,
    );
    expect(statusCodeOf(notImplemented)).toBe(501);
  });

  it("falls back to 500 for a plain Error", () => {
    // This is the behaviour every existing route already had, so adopting the
    // helper cannot change how untyped throws are reported.
    expect(statusCodeOf(new Error("boom"))).toBe(500);
  });

  it("falls back for non-Error throws", () => {
    expect(statusCodeOf("a string")).toBe(500);
    expect(statusCodeOf(null)).toBe(500);
    expect(statusCodeOf(undefined)).toBe(500);
    expect(statusCodeOf({ statusCode: 403 })).toBe(500);
  });

  it("ignores a statusCode outside the HTTP error range", () => {
    // Guards against an error object carrying something like `statusCode: 0`
    // or a success code, which Hono would reject at runtime.
    const withZero = Object.assign(new Error("x"), { statusCode: 0 });
    const withOk = Object.assign(new Error("x"), { statusCode: 200 });
    const withHuge = Object.assign(new Error("x"), { statusCode: 99999 });
    expect(statusCodeOf(withZero)).toBe(500);
    expect(statusCodeOf(withOk)).toBe(500);
    expect(statusCodeOf(withHuge)).toBe(500);
  });

  it("ignores a non-numeric statusCode", () => {
    const bad = Object.assign(new Error("x"), { statusCode: "403" });
    expect(statusCodeOf(bad)).toBe(500);
  });

  it("honours an explicit fallback", () => {
    expect(statusCodeOf(new Error("boom"), 503)).toBe(503);
  });
});
