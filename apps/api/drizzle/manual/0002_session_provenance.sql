-- Adds session provenance columns and users.password_updated_at.
--
-- The Security settings page had no real data to show. "sessions" held only
-- id/user_id/expires_at, so:
--   * GET /api/security/sessions/active returned device/IP/activity as nulls,
--   * the UI gave up and fabricated a single "current device" row from
--     navigator.userAgent plus a timezone->city guess, and
--   * the "Device Tracking" toggle had nothing to track.
-- users.password_updated_at exists because the page's "Strong Password" score
-- component had no server-side signal, so it scored whatever was typed into
-- the (unsubmitted) change-password form instead of the account.
--
-- Additive only: every column is nullable or defaulted, so existing sessions
-- keep working and simply report unknown provenance. Applied manually on
-- 2026-07-27 for the same reason as 0001 — `drizzle-kit generate` cannot run
-- non-interactively here (it stops on a pre-existing enum rename prompt).

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "last_activity" timestamp with time zone DEFAULT now();

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "ip_address" text;

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "user_agent" text;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_updated_at" timestamp with time zone;

-- Listing a user's own sessions is the hot path for the Security page.
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" ("user_id");
