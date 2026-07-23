-- Creates the auth token tables defined in src/database/schema/email-verification.ts.
-- These tables were defined in code (and written to by the mounted email
-- verification / password reset endpoints) but never created in the database,
-- because drizzle.config.ts didn't include the schema subfile. Applied manually
-- (additive only) on 2026-07-10; the subfile is now wired into drizzle.config.ts.

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_email" text NOT NULL REFERENCES "users"("email") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "is_used" boolean NOT NULL DEFAULT false,
  "used_at" timestamp with time zone,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_email" text NOT NULL REFERENCES "users"("email") ON DELETE CASCADE,
  "token" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "is_used" boolean NOT NULL DEFAULT false,
  "used_at" timestamp with time zone,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "email_change_requests" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "old_email" text NOT NULL,
  "new_email" text NOT NULL,
  "old_email_token" text NOT NULL UNIQUE,
  "new_email_token" text NOT NULL UNIQUE,
  "old_email_verified" boolean NOT NULL DEFAULT false,
  "new_email_verified" boolean NOT NULL DEFAULT false,
  "is_completed" boolean NOT NULL DEFAULT false,
  "expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
