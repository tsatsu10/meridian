import { beforeEach, describe, expect, it } from "vitest";
import { getFrontendBaseUrl } from "../frontend-url";

function clearEnv(key: "FRONTEND_URL" | "APP_URL") {
  delete process.env[key];
}

describe("getFrontendBaseUrl", () => {
  beforeEach(() => {
    clearEnv("FRONTEND_URL");
    clearEnv("APP_URL");
  });

  it("prefers FRONTEND_URL", () => {
    process.env.FRONTEND_URL = "https://app.example.com";
    process.env.APP_URL = "http://localhost:5173";
    expect(getFrontendBaseUrl()).toBe("https://app.example.com");
  });

  it("falls back to APP_URL then 5174", () => {
    process.env.APP_URL = "http://legacy:5173";
    expect(getFrontendBaseUrl()).toBe("http://legacy:5173");
    clearEnv("APP_URL");
    expect(getFrontendBaseUrl()).toBe("http://localhost:5174");
  });

  it("strips trailing slashes", () => {
    process.env.FRONTEND_URL = "https://app.example.com/";
    expect(getFrontendBaseUrl()).toBe("https://app.example.com");
  });

  it("trims surrounding whitespace", () => {
    process.env.FRONTEND_URL = "  https://app.example.com  ";
    expect(getFrontendBaseUrl()).toBe("https://app.example.com");
  });
});
