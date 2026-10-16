/**
 * Demo-auth gating — pure helpers so tests can assert without loading the
 * settings singleton (which reads process.env at import time).
 *
 * Bypass requires an *explicit* NODE_ENV of development or test. An unset
 * NODE_ENV must not fall through to "development" for this check, or a
 * misconfigured deploy with DEMO_MODE + ALLOW_DEMO_AUTH_BYPASS and no
 * NODE_ENV would skip authentication.
 */

export type DemoAuthEnvInput = {
  demoMode: boolean;
  allowDemoAuthBypass: boolean;
  /** Raw process.env.NODE_ENV — do not pass a defaulted value. */
  nodeEnv: string | undefined;
};

/** True only when NODE_ENV is explicitly development or test. */
export function isExplicitDevOrTestNodeEnv(
  nodeEnv: string | undefined,
): boolean {
  return nodeEnv === "development" || nodeEnv === "test";
}

/**
 * Whether the app may skip session auth and impersonate the admin user.
 * All three conditions required; NODE_ENV must be set (not defaulted).
 */
export function computeEnableDemoAuthBypass(input: DemoAuthEnvInput): boolean {
  return (
    input.demoMode &&
    input.allowDemoAuthBypass &&
    isExplicitDevOrTestNodeEnv(input.nodeEnv)
  );
}

/**
 * Fatal when demo flags are on outside explicit development/test.
 * Covers production, staging, empty string, and unset NODE_ENV.
 */
export function demoAuthStartupViolation(
  input: DemoAuthEnvInput,
): string | null {
  if (!input.demoMode && !input.allowDemoAuthBypass) {
    return null;
  }
  if (isExplicitDevOrTestNodeEnv(input.nodeEnv)) {
    return null;
  }
  const envLabel =
    input.nodeEnv === undefined || input.nodeEnv === ""
      ? "unset"
      : input.nodeEnv;
  if (input.demoMode) {
    return `DEMO_MODE cannot be enabled when NODE_ENV is ${envLabel} (requires explicit development or test)`;
  }
  return `ALLOW_DEMO_AUTH_BYPASS cannot be enabled when NODE_ENV is ${envLabel} (requires explicit development or test)`;
}
