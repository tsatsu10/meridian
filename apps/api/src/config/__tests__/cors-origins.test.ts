import { describe, expect, it } from "vitest";
import {
  mergeAllowedCorsOrigins,
  parseCorsOriginsEnv,
  resolveCorsOrigin,
} from "../cors-origins";

describe("cors-origins", () => {
  it("parses CORS_ORIGINS with surrounding whitespace", () => {
    expect(
      parseCorsOriginsEnv(
        " https://staging.example.com , https://preview.example.com ",
      ),
    ).toEqual(["https://staging.example.com", "https://preview.example.com"]);
  });

  it("strips trailing slashes from CORS_ORIGINS entries", () => {
    expect(parseCorsOriginsEnv("https://staging.example.com/")).toEqual([
      "https://staging.example.com",
    ]);
  });

  it("matches request origins against trailing-slash FRONTEND_URL", () => {
    expect(
      resolveCorsOrigin("https://app.example.com", {
        frontendUrl: "https://app.example.com/",
        nodeEnv: "production",
      }),
    ).toBe("https://app.example.com");
  });

  it("denies localhost substring lookalikes", () => {
    expect(
      resolveCorsOrigin("https://evil-localhost.com", {
        nodeEnv: "development",
      }),
    ).toBeUndefined();
  });

  it("denies unknown localhost ports in production", () => {
    expect(
      resolveCorsOrigin("http://localhost:9999", {
        nodeEnv: "production",
      }),
    ).toBeUndefined();
  });

  it("merges defaults with CORS_ORIGINS and FRONTEND_URL", () => {
    const allowed = mergeAllowedCorsOrigins({
      corsOrigins: ["https://staging.example.com"],
      frontendUrl: "https://app.example.com",
    });
    expect(allowed).toContain("http://localhost:5174");
    expect(allowed).toContain("https://staging.example.com");
    expect(allowed).toContain("https://app.example.com");
  });

  it("allows an origin listed via corsOrigins", () => {
    expect(
      resolveCorsOrigin("https://staging.example.com", {
        corsOrigins: ["https://staging.example.com"],
        nodeEnv: "production",
      }),
    ).toBe("https://staging.example.com");
  });

  it("denies unknown origins in production", () => {
    expect(
      resolveCorsOrigin("https://evil.example.com", {
        nodeEnv: "production",
      }),
    ).toBeUndefined();
  });

  it("allows any localhost origin outside production", () => {
    expect(
      resolveCorsOrigin("http://localhost:9999", {
        nodeEnv: "development",
      }),
    ).toBe("http://localhost:9999");
  });
});
