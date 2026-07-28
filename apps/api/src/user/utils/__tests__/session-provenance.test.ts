import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { describeUserAgent, getRequestProvenance } from "../session-provenance";

/**
 * Regression: the sessions table stored only id/userId/expiresAt, so
 * GET /api/security/sessions/active could only ever return
 * device/browser/os/ipAddress as null and the Security settings page
 * fabricated a "current device" row from navigator.userAgent plus a
 * timezone->city guess instead. These helpers capture the real thing at
 * sign-in.
 */

const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const FIREFOX_LINUX =
  "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
const EDGE_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";

async function provenanceFor(headers: Record<string, string>) {
  const app = new Hono();
  let captured: ReturnType<typeof getRequestProvenance> | undefined;
  app.get("/", (c) => {
    captured = getRequestProvenance(c);
    return c.json({});
  });
  await app.request("/", { headers });
  return captured as ReturnType<typeof getRequestProvenance>;
}

describe("getRequestProvenance", () => {
  it("reads the user agent from the request", async () => {
    const p = await provenanceFor({ "user-agent": CHROME_WINDOWS });
    expect(p.userAgent).toBe(CHROME_WINDOWS);
  });

  it("prefers the first hop of x-forwarded-for", async () => {
    // Behind a proxy the client IP is the leftmost entry; the rest are proxies.
    const p = await provenanceFor({
      "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178",
    });
    expect(p.ipAddress).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", async () => {
    const p = await provenanceFor({ "x-real-ip": "198.51.100.4" });
    expect(p.ipAddress).toBe("198.51.100.4");
  });

  it("returns null rather than a bogus IP when no header is present", async () => {
    const p = await provenanceFor({});
    expect(p.ipAddress).toBeNull();
  });

  it("ignores an empty x-forwarded-for", async () => {
    const p = await provenanceFor({ "x-forwarded-for": "   " });
    expect(p.ipAddress).toBeNull();
  });

  it("returns null for a missing user agent instead of an empty string", async () => {
    const p = await provenanceFor({});
    expect(p.userAgent).toBeNull();
  });
});

describe("describeUserAgent", () => {
  it("identifies Chrome on Windows desktop", () => {
    expect(describeUserAgent(CHROME_WINDOWS)).toEqual({
      deviceType: "desktop",
      deviceName: "Chrome on Windows",
      browser: "Chrome",
      os: "Windows",
    });
  });

  it("identifies Safari on iPhone as mobile", () => {
    const d = describeUserAgent(SAFARI_IPHONE);
    expect(d.browser).toBe("Safari");
    expect(d.os).toBe("iOS");
    expect(d.deviceType).toBe("mobile");
  });

  it("identifies Firefox on Linux", () => {
    const d = describeUserAgent(FIREFOX_LINUX);
    expect(d.browser).toBe("Firefox");
    expect(d.os).toBe("Linux");
  });

  it("does not mistake Edge for Chrome", () => {
    expect(describeUserAgent(EDGE_WINDOWS).browser).toBe("Edge");
  });

  it("reports unknown for a missing user agent rather than inventing one", () => {
    expect(describeUserAgent(null)).toEqual({
      deviceType: "unknown",
      deviceName: "Unknown device",
      browser: null,
      os: null,
    });
  });

  it("reports unknown for an unrecognisable user agent", () => {
    const d = describeUserAgent("curl/8.4.0");
    expect(d.browser).toBeNull();
    expect(d.os).toBeNull();
    expect(d.deviceName).toBe("Unknown device");
  });
});
