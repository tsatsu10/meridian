import type { Context } from "hono";

/**
 * Captures where a session came from, and turns a stored user agent back into
 * something displayable.
 *
 * The Security settings page needs this. Sessions used to record only
 * id/userId/expiresAt, so the sessions API returned device/IP as null and the
 * page invented a "current device" row client-side from navigator.userAgent
 * and a timezone->city lookup. Parsing happens here, on data the server
 * actually observed.
 */

export type RequestProvenance = {
  ipAddress: string | null;
  userAgent: string | null;
};

export type DeviceDescription = {
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  deviceName: string;
  browser: string | null;
  os: string | null;
};

export function getRequestProvenance(c: Context): RequestProvenance {
  // Behind a proxy the client is the leftmost hop; everything after it is
  // infrastructure. Both headers are client-supplied and only ever displayed
  // back to the session's own owner, never trusted for authorization.
  const forwardedFor = c.req.header("x-forwarded-for");
  const firstHop = forwardedFor?.split(",")[0]?.trim();
  const realIp = c.req.header("x-real-ip")?.trim();

  const ipAddress = firstHop || realIp || null;
  const userAgent = c.req.header("user-agent")?.trim() || null;

  return { ipAddress: ipAddress || null, userAgent };
}

export function describeUserAgent(
  userAgent: string | null | undefined,
): DeviceDescription {
  const unknown: DeviceDescription = {
    deviceType: "unknown",
    deviceName: "Unknown device",
    browser: null,
    os: null,
  };

  if (!userAgent) {
    return unknown;
  }

  // Order matters: Edge and Opera both carry "Chrome", and Chrome carries
  // "Safari".
  let browser: string | null = null;
  if (/\bEdg\//.test(userAgent)) {
    browser = "Edge";
  } else if (/\bOPR\/|\bOpera\//.test(userAgent)) {
    browser = "Opera";
  } else if (/\bFirefox\//.test(userAgent)) {
    browser = "Firefox";
  } else if (/\bChrome\//.test(userAgent)) {
    browser = "Chrome";
  } else if (/\bSafari\//.test(userAgent) && /\bVersion\//.test(userAgent)) {
    browser = "Safari";
  }

  let os: string | null = null;
  let deviceType: DeviceDescription["deviceType"] = "unknown";

  if (/\biPhone\b|\biPod\b/.test(userAgent)) {
    os = "iOS";
    deviceType = "mobile";
  } else if (/\biPad\b/.test(userAgent)) {
    os = "iOS";
    deviceType = "tablet";
  } else if (/\bAndroid\b/.test(userAgent)) {
    os = "Android";
    deviceType = /\bMobile\b/.test(userAgent) ? "mobile" : "tablet";
  } else if (/\bWindows NT\b/.test(userAgent)) {
    os = "Windows";
    deviceType = "desktop";
  } else if (/\bMac OS X\b|\bMacintosh\b/.test(userAgent)) {
    os = "macOS";
    deviceType = "desktop";
  } else if (/\bLinux\b|\bX11\b/.test(userAgent)) {
    os = "Linux";
    deviceType = "desktop";
  }

  if (!browser && !os) {
    return unknown;
  }

  const deviceName =
    browser && os ? `${browser} on ${os}` : (browser ?? os ?? "Unknown device");

  return { deviceType, deviceName, browser, os };
}
