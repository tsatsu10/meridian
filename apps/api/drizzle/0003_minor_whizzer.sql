CREATE TABLE "project_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"profession" text NOT NULL,
	"industry" text NOT NULL,
	"category" text,
	"icon" text,
	"color" text DEFAULT '#6366f1',
	"estimated_duration" integer,
	"difficulty" text DEFAULT 'intermediate',
	"usage_count" integer DEFAULT 0,
	"rating" integer DEFAULT 0,
	"rating_count" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"is_public" boolean DEFAULT true,
	"is_official" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_dependencies" (
	"id" text PRIMARY KEY NOT NULL,
	"dependent_task_id" text NOT NULL,
	"required_task_id" text NOT NULL,
	"type" text DEFAULT 'blocks' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_subtasks" (
	"id" text PRIMARY KEY NOT NULL,
	"template_task_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"estimated_hours" integer,
	"suggested_assignee_role" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "template_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"template_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"priority" "priority" DEFAULT 'medium',
	"estimated_hours" integer,
	"suggested_assignee_role" text,
	"relative_start_day" integer,
	"relative_due_day" integer,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_dependencies" ADD CONSTRAINT "template_dependencies_dependent_task_id_template_tasks_id_fk" FOREIGN KEY ("dependent_task_id") REFERENCES "public"."template_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_dependencies" ADD CONSTRAINT "template_dependencies_required_task_id_template_tasks_id_fk" FOREIGN KEY ("required_task_id") REFERENCES "public"."template_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_subtasks" ADD CONSTRAINT "template_subtasks_template_task_id_template_tasks_id_fk" FOREIGN KEY ("template_task_id") REFERENCES "public"."template_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_tasks" ADD CONSTRAINT "template_tasks_template_id_project_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_templates"("id") ON DELETE cascade ON UPDATE no action;