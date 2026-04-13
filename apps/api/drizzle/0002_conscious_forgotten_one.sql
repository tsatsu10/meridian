CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'general' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"category" text NOT NULL,
	"severity" integer DEFAULT 1,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "health_history" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"score" integer NOT NULL,
	"status" text NOT NULL,
	"completion_rate" integer,
	"timeline_health" integer,
	"task_health" integer,
	"resource_allocation" integer,
	"risk_level" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text NOT NULL,
	"category" text NOT NULL,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"estimated_impact" integer,
	"is_resolved" boolean DEFAULT false,
	"resolved_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"mentioned_user_id" text NOT NULL,
	"read_at" timestamp with time zone,
	"mentioned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mentions_enabled" boolean DEFAULT true NOT NULL,
	"direct_messages_enabled" boolean DEFAULT true NOT NULL,
	"conversation_updates_enabled" boolean DEFAULT false NOT NULL,
	"activity_enabled" boolean DEFAULT true NOT NULL,
	"daily_digest_enabled" boolean DEFAULT true NOT NULL,
	"notification_frequency" text DEFAULT 'instant' NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "project_health" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"score" integer DEFAULT 50 NOT NULL,
	"status" text DEFAULT 'good' NOT NULL,
	"trend" text DEFAULT 'stable' NOT NULL,
	"completion_rate" integer DEFAULT 0,
	"timeline_health" integer DEFAULT 0,
	"task_health" integer DEFAULT 0,
	"resource_allocation" integer DEFAULT 0,
	"risk_level" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"cached_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"reacted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entries" DROP CONSTRAINT "time_entries_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "user_email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_alerts" ADD CONSTRAINT "health_alerts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_history" ADD CONSTRAINT "health_history_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_recommendations" ADD CONSTRAINT "health_recommendations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_mentioned_user_id_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_health" ADD CONSTRAINT "project_health_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" DROP COLUMN "user_id";--> statement-breakpoint
CREATE INDEX "mentions_user_idx" ON "mentions" ("mentioned_user_id");--> statement-breakpoint
CREATE INDEX "mentions_message_idx" ON "mentions" ("message_id");--> statement-breakpoint
CREATE INDEX "reactions_message_idx" ON "reactions" ("message_id");--> statement-breakpoint
CREATE INDEX "reactions_user_idx" ON "reactions" ("user_id");--> statement-breakpoint
CREATE INDEX "notification_pref_user_idx" ON "notification_preferences" ("user_id");--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "user_message_emoji_unique" UNIQUE("message_id", "user_id", "emoji");