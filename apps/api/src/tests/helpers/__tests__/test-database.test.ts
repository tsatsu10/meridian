/**
 * Tests for the shared mock database helper.
 *
 * The mock returns canned rows keyed on select() call order and ignores the
 * predicates entirely, so a query that forgot a `.where()` resolves to exactly
 * the same rows as a correct one. A missing `isActive` filter survived 24
 * commits and 5 reviews behind that blind spot.
 *
 * `__selectCalls` records what each chain was asked for so the omission can be
 * asserted. These tests pin that recording — and pin that adding it did not
 * change what the chain resolves to, since every existing suite depends on the
 * call-order behaviour.
 */

import { describe, expect, it } from "vitest";
import { createMockDb, resetMockDb } from "../test-database";

const eq = (column: string, value: unknown) => ({ column, value });

describe("createMockDb", () => {
  describe("__selectCalls", () => {
    it("records the predicate a filtered query was given", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "row-1" }]);

      await mockDb.select().from("roles").where(eq("isActive", true));

      expect(mockDb.__selectCalls[0].where).toEqual([
        { column: "isActive", value: true },
      ]);
    });

    it("leaves where empty for a query that forgot to filter", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "row-1" }]);

      // The unfiltered query resolves to the *same* rows as the filtered one
      // above — which is exactly why the rows cannot be used to detect this.
      const rows = await mockDb.select().from("roles");

      expect(rows).toEqual([{ id: "row-1" }]);
      expect(mockDb.__selectCalls[0].where).toEqual([]);
    });

    it("keeps a separate record per select() call, in call order", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "a" }], [{ id: "b" }]);

      await mockDb.select().from("roles").where(eq("workspaceId", "ws-1"));
      await mockDb.select().from("users").where(eq("email", "a@b.c"));

      expect(mockDb.__selectCalls).toHaveLength(2);
      expect(mockDb.__selectCalls[0].where).toEqual([
        { column: "workspaceId", value: "ws-1" },
      ]);
      expect(mockDb.__selectCalls[1].where).toEqual([
        { column: "email", value: "a@b.c" },
      ]);
    });

    it("records limit, orderBy and joins too", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([]);

      await mockDb
        .select()
        .from("assignments")
        .innerJoin("roles", eq("roleId", "id"))
        .where(eq("userEmail", "a@b.c"))
        .orderBy("createdAt")
        .limit(1);

      const [call] = mockDb.__selectCalls;
      expect(call.innerJoin).toHaveLength(2);
      expect(call.orderBy).toEqual(["createdAt"]);
      expect(call.limit).toEqual([1]);
    });

    it("is cleared by __setSelectResults and by resetMockDb", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "row-1" }]);
      await mockDb.select().from("roles").where(eq("isActive", true));
      expect(mockDb.__selectCalls).toHaveLength(1);

      mockDb.__setSelectResults([{ id: "row-2" }]);
      expect(mockDb.__selectCalls).toHaveLength(0);

      await mockDb.select().from("roles");
      expect(mockDb.__selectCalls).toHaveLength(1);

      resetMockDb(mockDb);
      expect(mockDb.__selectCalls).toHaveLength(0);
    });
  });

  describe("existing behaviour is unchanged", () => {
    it("still resolves select() results by call order", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "first" }], [{ id: "second" }]);

      const one = await mockDb.select().from("t").where(eq("x", 1));
      const two = await mockDb.select().from("t").where(eq("x", 2));

      expect(one).toEqual([{ id: "first" }]);
      expect(two).toEqual([{ id: "second" }]);
    });

    it("resolves to an empty array past the end of the queued results", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "only" }]);

      await mockDb.select().from("t");
      const beyond = await mockDb.select().from("t");

      expect(beyond).toEqual([]);
    });

    it("still returns the chain from each builder method", async () => {
      const mockDb = createMockDb();
      mockDb.__setSelectResults([{ id: "row" }]);

      const chain = mockDb.select();
      expect(chain.from("t")).toBe(chain);
      expect(chain.where(eq("a", 1))).toBe(chain);
      expect(chain.orderBy("a")).toBe(chain);
      expect(chain.limit(1)).toBe(chain);
      expect(chain.leftJoin("u", eq("a", "b"))).toBe(chain);
    });
  });
});
