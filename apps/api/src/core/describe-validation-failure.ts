/**
 * Turns Zod issue details into a sentence a user can act on.
 *
 * Schema rejections used to be reported as the bare string "Validation failed",
 * with the useful part — which field, and why — left sitting in the error's
 * `details` array. The client shows `error.message`, so all a user learned was
 * that something, somewhere, was wrong.
 */

export type ValidationDetail = {
  field?: string;
  message?: string;
  code?: string;
};

const GENERIC = "Some of the information provided isn't valid.";

/** "profile.emailAddress" -> "Profile email address" */
function humanizeField(field: string): string {
  const words = field
    .split(".")
    .flatMap((segment) =>
      segment
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .split(" "),
    )
    .filter(Boolean)
    .map((word) => word.toLowerCase());

  const [first, ...rest] = words;
  if (!first) {
    return field;
  }

  const capitalized = first.charAt(0).toUpperCase() + first.slice(1);
  return rest.length > 0 ? `${capitalized} ${rest.join(" ")}` : capitalized;
}

export function describeValidationFailure(
  details: ValidationDetail[] | undefined,
): string {
  if (!details || details.length === 0) {
    return GENERIC;
  }

  // One problem: say exactly what it is.
  const [only] = details;
  if (details.length === 1 && only) {
    const label = only.field ? humanizeField(only.field) : null;

    if (label && only.message) {
      return `${label}: ${only.message}`;
    }
    if (only.message) {
      return only.message;
    }
    if (label) {
      return `${label} is not valid`;
    }
    return GENERIC;
  }

  // Several: listing every reason gets unreadable, so name the fields and let
  // the form show the per-field messages.
  const labels = [
    ...new Set(
      details
        .map((detail) => (detail.field ? humanizeField(detail.field) : null))
        .filter((label): label is string => Boolean(label)),
    ),
  ];

  if (labels.length === 0) {
    return GENERIC;
  }

  return `Some details need attention: ${labels.join(", ")}`;
}

export default describeValidationFailure;
