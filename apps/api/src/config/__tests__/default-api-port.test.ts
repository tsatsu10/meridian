import { describe, it, expect } from "vitest";
import { DEFAULT_API_PORT } from "../default-api-port";

describe("default-api-port", () => {
  it("matches documented local dev port (web proxy + VITE defaults)", () => {
    expect(DEFAULT_API_PORT).toBe(3005);
  });
});
