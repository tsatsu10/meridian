CREATE TABLE "backlog_themes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#6366f1',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "user_connection" DROP CONSTRAINT "user_connection_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_connection" DROP CONSTRAINT "user_connection_connected_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_connection" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_connection" ALTER COLUMN "connected_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_education" ALTER COLUMN "degree" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_education" ALTER COLUMN "start_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_education" ALTER COLUMN "end_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_experience" ALTER COLUMN "start_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_experience" ALTER COLUMN "end_date" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user_skill" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_skill" ALTER COLUMN "years_of_experience" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_archived" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "lead_id" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "color" text DEFAULT '#3B82F6';--> statement-breakpoint
ALTER TABLE "user_connection" ADD COLUMN "follower_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_connection" ADD COLUMN "following_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_education" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "user_education" ADD COLUMN "activities" text;--> statement-breakpoint
ALTER TABLE "user_education" ADD COLUMN "school_logo" text;--> statement-breakpoint
ALTER TABLE "user_education" ADD COLUMN "order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_experience" ADD COLUMN "achievements" text;--> statement-breakpoint
ALTER TABLE "user_experience" ADD COLUMN "company_logo" text;--> statement-breakpoint
ALTER TABLE "user_experience" ADD COLUMN "order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "headline" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "github_url" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "twitter_url" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "profile_picture" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "cover_image" text;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "is_public" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "allow_direct_messages" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "show_online_status" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "show_email" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "show_phone" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "email_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "profile_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "view_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "connection_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "endorsement_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "completeness_score" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "user_profile" ADD COLUMN "last_profile_update" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_skill" ADD COLUMN "level" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "user_skill" ADD COLUMN "verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user_skill" ADD COLUMN "order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "backlog_themes" ADD CONSTRAINT "backlog_themes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backlog_themes" ADD CONSTRAINT "backlog_themes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_lead_id_users_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_connection" ADD CONSTRAINT "user_connection_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_connection" ADD CONSTRAINT "user_connection_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;