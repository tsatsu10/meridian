import { describe, expect, it } from "vitest";
import { describeValidationFailure } from "../describe-validation-failure";

/**
 * Every schema rejection answered with the bare string "Validation failed",
 * while the specifics — which field, and why — sat unused in the error's
 * `details`. The client surfaces `error.message`, so users were told only that
 * something was wrong, never what.
 */
describe("describeValidationFailure", () => {
  it("names the field and the reason for a single problem", () => {
    expect(
      describeValidationFailure([{ field: "title", message: "Required" }]),
    ).toBe("Title: Required");
  });

  it("turns a camelCase field into words", () => {
    expect(
      describeValidationFailure([{ field: "dueDate", message: "Required" }]),
    ).toBe("Due date: Required");
  });

  it("flattens a nested path", () => {
    expect(
      describeValidationFailure([
        { field: "profile.emailAddress", message: "Invalid email" },
      ]),
    ).toBe("Profile email address: Invalid email");
  });

  it("lists the fields when several are wrong", () => {
    expect(
      describeValidationFailure([
        { field: "title", message: "Required" },
        { field: "dueDate", message: "Required" },
      ]),
    ).toBe("Some details need attention: Title, Due date");
  });

  it("falls back to a plain sentence when there are no details", () => {
    expect(describeValidationFailure([])).toBe(
      "Some of the information provided isn't valid.",
    );
  });

  it("falls back when details are missing entirely", () => {
    expect(describeValidationFailure(undefined)).toBe(
      "Some of the information provided isn't valid.",
    );
  });

  it("copes with a detail that has no field", () => {
    expect(describeValidationFailure([{ message: "Required" }])).toBe(
      "Required",
    );
  });

  it("copes with a detail that has no message", () => {
    expect(describeValidationFailure([{ field: "title" }])).toBe(
      "Title is not valid",
    );
  });

  it("does not repeat a field that appears twice", () => {
    expect(
      describeValidationFailure([
        { field: "title", message: "Required" },
        { field: "title", message: "Too short" },
      ]),
    ).toBe("Some details need attention: Title");
  });
});
