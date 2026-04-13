-- Drop duplicate memberships: keep one row per (workspace_id, user_id).
-- Prefer active status, then most recent joined_at, then stable id.
DELETE FROM "workspace_members"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "workspace_id", "user_id"
        ORDER BY
          CASE WHEN "status" = 'active' THEN 0 ELSE 1 END,
          "joined_at" DESC NULLS LAST,
          "id"
      ) AS rn
    FROM "workspace_members"
  ) sub
  WHERE sub.rn > 1
);
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_workspace_members_workspace_user";
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");
