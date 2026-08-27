import { describe, expect, it } from "vitest";
import {
  DEFAULT_COLUMN_DEFS,
  planDefaultColumnBackfill,
} from "../default-columns";

type Row = Parameters<typeof planDefaultColumnBackfill>[0][number];

const custom = (id: string, name: string, position: number): Row => ({
  id,
  slug: name.toLowerCase(),
  name,
  color: "#6b7280",
  position,
  isDefault: false,
});

const defaultRow = (slug: string, position: number): Row => {
  const def = DEFAULT_COLUMN_DEFS.find((d) => d.slug === slug);
  if (!def) throw new Error(`no default def for ${slug}`);
  return {
    id: `row-${slug}`,
    slug: def.slug,
    name: def.name,
    color: def.color,
    position,
    isDefault: true,
  };
};

describe("planDefaultColumnBackfill", () => {
  it("synthesizes all three defaults for a project that has no columns at all", () => {
    const plan = planDefaultColumnBackfill([]);

    expect(plan.map((c) => c.slug)).toEqual(["todo", "in_progress", "done"]);
    expect(plan.map((c) => c.position)).toEqual([0, 1, 2]);
    expect(plan.every((c) => c.isNew)).toBe(true);
  });

  // The pre-backfill render order came from get-tasks.ts merging virtual
  // defaults (pinned at 0/1/2) with custom rows and stable-sorting by
  // position — ties resolving in the defaults' favour because they were
  // pushed into the array first. Backfilling must reproduce exactly that
  // order, otherwise columns visibly jump the first time someone adds one.
  it("preserves the order the board was already rendering, with defaults winning ties", () => {
    // Real data observed in the dev DB for "Q3 Product Launch".
    const rows = [custom("c-adding", "adding", 0), custom("c-test", "test", 2)];

    const plan = planDefaultColumnBackfill(rows);

    expect(plan.map((c) => c.slug)).toEqual([
      "todo",
      "adding",
      "in_progress",
      "done",
      "test",
    ]);
    expect(plan.map((c) => c.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it("assigns contiguous positions so visual index and stored position agree", () => {
    const rows = [
      custom("c-again", "again", 2),
      custom("c-testing", "testing", 4),
    ];

    const plan = planDefaultColumnBackfill(rows);

    expect(plan.map((c) => c.position)).toEqual([0, 1, 2, 3, 4]);
    expect(plan.map((c) => c.slug)).toEqual([
      "todo",
      "in_progress",
      "done",
      "again",
      "testing",
    ]);
  });

  it("keeps an already-backfilled project untouched, including interleaved custom columns", () => {
    const rows = [
      defaultRow("todo", 0),
      custom("c-mid", "Mid", 1),
      defaultRow("in_progress", 2),
      defaultRow("done", 3),
    ];

    const plan = planDefaultColumnBackfill(rows);

    expect(plan.map((c) => c.slug)).toEqual([
      "todo",
      "mid",
      "in_progress",
      "done",
    ]);
    expect(plan.map((c) => c.position)).toEqual([0, 1, 2, 3]);
    expect(plan.some((c) => c.isNew)).toBe(false);
  });

  it("restores a default column that was somehow deleted, at its canonical slot", () => {
    const rows = [defaultRow("todo", 0), defaultRow("done", 1)];

    const plan = planDefaultColumnBackfill(rows);

    expect(plan.map((c) => c.slug)).toEqual(["todo", "in_progress", "done"]);
    const inProgress = plan.find((c) => c.slug === "in_progress");
    expect(inProgress?.isNew).toBe(true);
  });
});
