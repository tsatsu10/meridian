CREATE TABLE "achievement_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"rarity" text NOT NULL,
	"points" integer NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "celebration_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"trigger_user_id" text,
	"celebration_type" text NOT NULL,
	"reason" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"entity_type" text,
	"entity_id" text,
	"team_member_ids" jsonb DEFAULT '[]'::jsonb,
	"reactions" jsonb DEFAULT '{}'::jsonb,
	"was_displayed" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_challenges" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"challenge_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"difficulty" text NOT NULL,
	"target" integer NOT NULL,
	"points" integer NOT NULL,
	"valid_date" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true,
	"icon" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leaderboard_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"score_type" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"rank" integer,
	"period" text NOT NULL,
	"is_opted_in" boolean DEFAULT false,
	"is_anonymous" boolean DEFAULT false,
	"last_calculated" timestamp with time zone DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "progress_ring_data" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"tasks_target" integer DEFAULT 5 NOT NULL,
	"tasks_completed" integer DEFAULT 0,
	"tasks_progress" integer DEFAULT 0,
	"goals_target" integer DEFAULT 3 NOT NULL,
	"goals_updated" integer DEFAULT 0,
	"goals_progress" integer DEFAULT 0,
	"milestones_target" integer DEFAULT 2 NOT NULL,
	"milestones_completed" integer DEFAULT 0,
	"milestones_progress" integer DEFAULT 0,
	"all_rings_closed" boolean DEFAULT false,
	"closed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"achievement_id" text NOT NULL,
	"progress" integer DEFAULT 0,
	"target" integer,
	"is_unlocked" boolean DEFAULT false,
	"unlocked_at" timestamp with time zone,
	"notified" boolean DEFAULT false,
	"shared_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_challenge_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"progress" integer DEFAULT 0,
	"target" integer NOT NULL,
	"is_accepted" boolean DEFAULT true,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp with time zone,
	"points_earned" integer,
	"was_rerolled" boolean DEFAULT false,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"accepted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"streak_type" text NOT NULL,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_activity_date" timestamp with time zone,
	"streak_start_date" timestamp with time zone,
	"freezes_remaining" integer DEFAULT 0,
	"total_active_days" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "celebration_events" ADD CONSTRAINT "celebration_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "celebration_events" ADD CONSTRAINT "celebration_events_trigger_user_id_users_id_fk" FOREIGN KEY ("trigger_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_challenges" ADD CONSTRAINT "daily_challenges_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_scores" ADD CONSTRAINT "leaderboard_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_scores" ADD CONSTRAINT "leaderboard_scores_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_ring_data" ADD CONSTRAINT "progress_ring_data_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_challenge_progress" ADD CONSTRAINT "user_challenge_progress_challenge_id_daily_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."daily_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_achievements_category" ON "achievement_definitions" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_achievements_rarity" ON "achievement_definitions" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX "idx_celebrations_workspace" ON "celebration_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_celebrations_trigger_user" ON "celebration_events" USING btree ("trigger_user_id");--> statement-breakpoint
CREATE INDEX "idx_celebrations_created" ON "celebration_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_challenges_valid_date" ON "daily_challenges" USING btree ("valid_date");--> statement-breakpoint
CREATE INDEX "idx_challenges_workspace" ON "daily_challenges" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_workspace_period" ON "leaderboard_scores" USING btree ("workspace_id","period");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_rank" ON "leaderboard_scores" USING btree ("rank");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_user" ON "leaderboard_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_leaderboard_opted_in" ON "leaderboard_scores" USING btree ("is_opted_in");--> statement-breakpoint
CREATE INDEX "idx_progress_rings_user_date" ON "progress_ring_data" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_progress_rings_all_closed" ON "progress_ring_data" USING btree ("all_rings_closed");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_user" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_unlocked" ON "user_achievements" USING btree ("is_unlocked");--> statement-breakpoint
CREATE INDEX "idx_user_achievements_user_unlocked" ON "user_achievements" USING btree ("user_id","is_unlocked");--> statement-breakpoint
CREATE INDEX "idx_user_challenge_progress" ON "user_challenge_progress" USING btree ("user_id","challenge_id");--> statement-breakpoint
CREATE INDEX "idx_user_challenge_completed" ON "user_challenge_progress" USING btree ("is_completed");--> statement-breakpoint
CREATE INDEX "idx_streaks_user_type" ON "user_streaks" USING btree ("user_id","streak_type");--> statement-breakpoint
CREATE INDEX "idx_streaks_current" ON "user_streaks" USING btree ("current_streak");