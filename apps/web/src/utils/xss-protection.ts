/**
 * XSS Protection Utilities
 * Sanitizes user-generated content to prevent Cross-Site Scripting attacks
 *
 * Sanitization delegates to DOMPurify — the previous hand-rolled regex
 * strippers were bypassable (CodeQL js/bad-tag-filter,
 * js/incomplete-multi-character-sanitization, js/incomplete-url-scheme-check).
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param text - The text to escape
 * @returns Escaped text safe for HTML rendering
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitizes a string by removing potentially dangerous content
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input) return "";

  // Strip ALL markup; used for plain-text fields (search terms, titles).
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
}

/**
 * Sanitizes a URL to ensure it's safe
 * @param url - The URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return "";

  const trimmed = url.trim();
  const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

  // Positive validation via the URL parser instead of a scheme denylist —
  // regex checks miss embedded tabs/newlines the parser strips
  // (`java\tscript:`), so allowlist the parsed protocol.
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? trimmed : "";
  } catch {
    // No scheme — treat as an https address if it parses as one.
    try {
      new URL(`https://${trimmed}`);
      return `https://${trimmed}`;
    } catch {
      return "";
    }
  }
}

/**
 * Sanitizes user-generated HTML content
 * Allows basic formatting but removes dangerous elements
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "i",
      "em",
      "strong",
      "u",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "a",
    ],
    ALLOWED_ATTR: ["href", "rel", "target"],
  });
}

/**
 * Sanitizes object properties recursively
 * Useful for sanitizing entire API response objects
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 * @param email - Email to validate
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email) return "";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();

  return emailRegex.test(sanitized) ? sanitized : "";
}

/**
 * Sanitizes phone numbers
 * @param phone - Phone number to sanitize
 * @returns Sanitized phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone) return "";

  // Remove all non-digit characters except + (for international)
  return phone.replace(/[^\d+\s\-\(\)]/g, "").trim();
}
