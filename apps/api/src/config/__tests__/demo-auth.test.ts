import { describe, expect, it } from "vitest";
import {
  computeEnableDemoAuthBypass,
  demoAuthStartupViolation,
  isExplicitDevOrTestNodeEnv,
} from "../demo-auth";

describe("isExplicitDevOrTestNodeEnv", () => {
  it("accepts only explicit development and test", () => {
    expect(isExplicitDevOrTestNodeEnv("development")).toBe(true);
    expect(isExplicitDevOrTestNodeEnv("test")).toBe(true);
  });

  it("rejects unset, empty, production, and other values", () => {
    expect(isExplicitDevOrTestNodeEnv(undefined)).toBe(false);
    expect(isExplicitDevOrTestNodeEnv("")).toBe(false);
    expect(isExplicitDevOrTestNodeEnv("production")).toBe(false);
    expect(isExplicitDevOrTestNodeEnv("staging")).toBe(false);
  });
});

describe("computeEnableDemoAuthBypass", () => {
  it("enables only when both flags are true and NODE_ENV is explicit dev/test", () => {
    expect(
      computeEnableDemoAuthBypass({
        demoMode: true,
        allowDemoAuthBypass: true,
        nodeEnv: "development",
      }),
    ).toBe(true);
    expect(
      computeEnableDemoAuthBypass({
        demoMode: true,
        allowDemoAuthBypass: true,
        nodeEnv: "test",
      }),
    ).toBe(true);
  });

  it("stays off when NODE_ENV is unset even if both flags are true", () => {
    expect(
      computeEnableDemoAuthBypass({
        demoMode: true,
        allowDemoAuthBypass: true,
        nodeEnv: undefined,
      }),
    ).toBe(false);
  });

  it("stays off when either flag is false", () => {
    expect(
      computeEnableDemoAuthBypass({
        demoMode: true,
        allowDemoAuthBypass: false,
        nodeEnv: "development",
      }),
    ).toBe(false);
    expect(
      computeEnableDemoAuthBypass({
        demoMode: false,
        allowDemoAuthBypass: true,
        nodeEnv: "development",
      }),
    ).toBe(false);
  });
});

describe("demoAuthStartupViolation", () => {
  it("returns null for normal secured configs", () => {
    expect(
      demoAuthStartupViolation({
        demoMode: false,
        allowDemoAuthBypass: false,
        nodeEnv: undefined,
      }),
    ).toBeNull();
    expect(
      demoAuthStartupViolation({
        demoMode: true,
        allowDemoAuthBypass: true,
        nodeEnv: "development",
      }),
    ).toBeNull();
  });

  it("fatals when DEMO_MODE is set without explicit dev/test NODE_ENV", () => {
    expect(
      demoAuthStartupViolation({
        demoMode: true,
        allowDemoAuthBypass: false,
        nodeEnv: undefined,
      }),
    ).toMatch(/DEMO_MODE.*unset/);
    expect(
      demoAuthStartupViolation({
        demoMode: true,
        allowDemoAuthBypass: false,
        nodeEnv: "production",
      }),
    ).toMatch(/DEMO_MODE.*production/);
    expect(
      demoAuthStartupViolation({
        demoMode: true,
        allowDemoAuthBypass: true,
        nodeEnv: "staging",
      }),
    ).toMatch(/DEMO_MODE.*staging/);
  });

  it("fatals when ALLOW_DEMO_AUTH_BYPASS is set alone without explicit NODE_ENV", () => {
    expect(
      demoAuthStartupViolation({
        demoMode: false,
        allowDemoAuthBypass: true,
        nodeEnv: undefined,
      }),
    ).toMatch(/ALLOW_DEMO_AUTH_BYPASS.*unset/);
  });
});
