import { describe, expect, it } from "vitest";
import { isValidPhone } from "../phone";

describe("isValidPhone", () => {
  // Regression: the profile page's old regex was /^[\+]?[1-9][\d]{0,15}$/,
  // which required the first digit to be 1-9 and so rejected every national
  // format that starts with a trunk zero.
  it.each([
    ["020 7946 0018", "UK national, leading zero"],
    ["030 12345678", "German national, leading zero"],
    ["06 1234 5678", "Italian national, leading zero"],
  ])("accepts %s (%s)", (value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    "+1 (555) 123-4567",
    "+44 20 7946 0018",
    "555-123-4567",
    "555.123.4567",
  ])("accepts formatted number %s", (value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["not a phone", "letters"],
    ["12345", "too short"],
    ["1234567890123456", "16 digits, beyond E.164"],
    ["+", "just a plus"],
    ["+1-555-CALL-NOW", "letters mixed in"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});
