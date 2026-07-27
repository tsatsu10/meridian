-- scheduled_reports/report_executions were unused, unwired dead tables (no
-- code path ever wrote to them - the frontend was localStorage-only and the
-- old /api/reports routes were never called). Verified empty in every known
-- environment, so this rebuilds them with the columns the real feature
-- needs (workspace scoping, description/time/day-of-week/day-of-month,
-- sections) instead of an incremental ALTER across the many now-mismatched
-- column types (serial->text ids, integer->text createdBy).
DROP TABLE IF EXISTS "report_executions";
--> statement-breakpoint
DROP TABLE IF EXISTS "scheduled_reports";
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"report_type" text DEFAULT 'analytics' NOT NULL,
	"frequency" text NOT NULL,
	"time" text DEFAULT '09:00' NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"format" text NOT NULL,
	"recipients" jsonb NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filters" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp with time zone,
	"next_run_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_executions" (
	"id" text PRIMARY KEY NOT NULL,
	"report_id" text NOT NULL,
	"status" text NOT NULL,
	"file_url" text,
	"error" text,
	"execution_time" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_report_id_scheduled_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."scheduled_reports"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "report_executions_report_id_idx" ON "report_executions" USING btree ("report_id");
