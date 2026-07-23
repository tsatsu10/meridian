import { describe, expect, it } from "vitest";
import { sortDateGroupsChronologically } from "../sort-date-groups";

describe("sortDateGroupsChronologically", () => {
  it("orders groups by their most recent notification, not by insertion order", () => {
    // Reproduces the live bug: pinned-first sorting puts a pinned item from
    // an older date ahead of newer unpinned items in the source array, so
    // building groups via plain-object insertion order yields headers like
    // "Yesterday, July 19, July 20, July 18" instead of a chronological list.
    const groups = [
      {
        title: "Yesterday",
        notifications: [{ createdAt: "2026-07-21T10:00:00Z" }],
      },
      {
        title: "July 19, 2026",
        notifications: [{ createdAt: "2026-07-19T10:00:00Z" }],
      },
      {
        title: "July 20, 2026",
        notifications: [{ createdAt: "2026-07-20T10:00:00Z" }],
      },
      {
        title: "July 18, 2026",
        notifications: [{ createdAt: "2026-07-18T10:00:00Z" }],
      },
    ];

    const sorted = sortDateGroupsChronologically(groups);

    expect(sorted.map((g) => g.title)).toEqual([
      "Yesterday",
      "July 20, 2026",
      "July 19, 2026",
      "July 18, 2026",
    ]);
  });

  it("uses each group's most recent notification when a group has multiple dates mixed in", () => {
    const groups = [
      {
        title: "Older",
        notifications: [
          { createdAt: "2026-07-01T10:00:00Z" },
          { createdAt: "2026-07-10T10:00:00Z" },
        ],
      },
      {
        title: "Newer",
        notifications: [{ createdAt: "2026-07-15T10:00:00Z" }],
      },
    ];

    const sorted = sortDateGroupsChronologically(groups);

    expect(sorted.map((g) => g.title)).toEqual(["Newer", "Older"]);
  });

  it("does not mutate the input array or its group objects", () => {
    const groups = [
      { title: "A", notifications: [{ createdAt: "2026-07-01T10:00:00Z" }] },
      { title: "B", notifications: [{ createdAt: "2026-07-15T10:00:00Z" }] },
    ];
    const original = [...groups];

    sortDateGroupsChronologically(groups);

    expect(groups).toEqual(original);
  });
});
