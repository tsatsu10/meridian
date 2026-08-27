/**
 * Shared phone-number validation.
 *
 * Two different rules used to live in two places: the profile page used
 * `/^[\+]?[1-9][\d]{0,15}$/`, which rejects any number whose national format
 * starts with a zero (UK "020 7946 0018", Germany "030 …", Italy "06 …", and
 * plenty of others), while settings-server.ts accepted almost anything. The
 * same input could therefore pass in one place and fail in the other.
 *
 * The rule here is deliberately permissive — enough to catch typos and junk,
 * without pretending to know every national format. Formatting characters
 * (spaces, dashes, parentheses, dots) are ignored.
 */

const SEPARATORS = /[\s\-().]/g;

/** Digits only, with an optional leading "+". */
const PHONE_SHAPE = /^\+?\d+$/;

// E.164 allows at most 15 digits; the shortest real numbers are around 4-6.
const MIN_DIGITS = 6;
const MAX_DIGITS = 15;

export function isValidPhone(value: string): boolean {
  const compact = value.replace(SEPARATORS, "");

  if (!PHONE_SHAPE.test(compact)) {
    return false;
  }

  const digitCount = compact.replace(/^\+/, "").length;
  return digitCount >= MIN_DIGITS && digitCount <= MAX_DIGITS;
}
