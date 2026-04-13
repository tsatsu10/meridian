import { describe, expect, it } from "vitest";
import { dedupeWorkspaceUsersForList } from "./dedupe-workspace-users";

describe("dedupeWorkspaceUsersForList", () => {
  it("merges rows with same normalized email when one has id and one does not", () => {
    const rows = [
      {
        id: "user-1",
        email: "a@example.com",
        status: "active",
        joinedAt: "2024-01-01",
      },
      {
        id: null,
        email: "a@example.com",
        status: "active",
        joinedAt: "2024-01-02",
      },
    ];
    const out = dedupeWorkspaceUsersForList(rows);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("user-1");
  });

  it("dedupes by email when ids differ only by join miss", () => {
    const rows = [
      { id: null, email: "b@example.com", status: "pending", joinedAt: null },
      { id: "u2", email: "b@example.com", status: "active", joinedAt: "2024-06-01" },
    ];
    const out = dedupeWorkspaceUsersForList(rows);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("u2");
  });
});
