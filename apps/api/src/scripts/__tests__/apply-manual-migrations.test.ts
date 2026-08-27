import { describe, expect, it } from "vitest";
import { statementsOf } from "../apply-manual-migrations";

/**
 * Regression: the first version of this splitter cut the file on ";" and only
 * then discarded comment-only chunks. drizzle/manual/0001 has a prose header
 * containing a semicolon, so the header was split in two — the first half was
 * dropped as comments and the second half ("... the subfile is now wired into
 * drizzle.config.ts") was handed to Postgres, which answered
 * `syntax error at or near "the"`.
 */
describe("statementsOf", () => {
  it("keeps a plain statement", () => {
    expect(statementsOf("ALTER TABLE a ADD COLUMN b text;")).toEqual([
      "ALTER TABLE a ADD COLUMN b text",
    ]);
  });

  it("drops a comment-only header", () => {
    const sql = `-- explanation line one
-- explanation line two

CREATE INDEX i ON t (c);`;
    expect(statementsOf(sql)).toEqual(["CREATE INDEX i ON t (c)"]);
  });

  it("survives a semicolon inside a comment", () => {
    const sql = `-- Applied manually; the generator cannot run here.
ALTER TABLE users ADD COLUMN x text;`;
    expect(statementsOf(sql)).toEqual(["ALTER TABLE users ADD COLUMN x text"]);
  });

  it("strips a trailing comment from a statement line", () => {
    expect(statementsOf("ALTER TABLE a ADD COLUMN b text; -- why")).toEqual([
      "ALTER TABLE a ADD COLUMN b text",
    ]);
  });

  it("leaves a double dash inside a string literal alone", () => {
    const sql = "INSERT INTO t (c) VALUES ('a--b');";
    expect(statementsOf(sql)).toEqual(["INSERT INTO t (c) VALUES ('a--b')"]);
  });

  it("returns several statements in order", () => {
    const sql = `ALTER TABLE a ADD COLUMN one text;
ALTER TABLE a ADD COLUMN two text;`;
    expect(statementsOf(sql)).toEqual([
      "ALTER TABLE a ADD COLUMN one text",
      "ALTER TABLE a ADD COLUMN two text",
    ]);
  });

  it("returns nothing for a file that is only comments", () => {
    expect(statementsOf("-- nothing to do here\n-- really\n")).toEqual([]);
  });

  it("tolerates a missing trailing semicolon", () => {
    expect(statementsOf("ALTER TABLE a ADD COLUMN b text")).toEqual([
      "ALTER TABLE a ADD COLUMN b text",
    ]);
  });
});
