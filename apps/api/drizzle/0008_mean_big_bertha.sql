CREATE TABLE "alert_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"name" text NOT NULL,
	"condition_type" text NOT NULL,
	"condition_config" jsonb NOT NULL,
	"notification_channels" jsonb DEFAULT '["in_app"]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"actor_id" text,
	"actor_email" text,
	"actor_type" text DEFAULT 'user',
	"workspace_id" text,
	"project_id" text,
	"old_values" text,
	"new_values" text,
	"changes" text,
	"ip_address" text,
	"user_agent" text,
	"session_id" text,
	"request_id" text,
	"severity" text DEFAULT 'info',
	"category" text,
	"description" text,
	"metadata" text,
	"retention_policy" text DEFAULT 'standard',
	"is_system_generated" boolean DEFAULT false,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"date" text
);
--> statement-breakpoint
CREATE TABLE "dashboard_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"workspace_id" text,
	"is_global" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"layout" jsonb NOT NULL,
	"widgets" jsonb NOT NULL,
	"grid_config" jsonb,
	"category" text,
	"tags" jsonb,
	"thumbnail" text,
	"usage_count" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dashboard_widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"component" text NOT NULL,
	"default_config" jsonb NOT NULL,
	"config_schema" jsonb,
	"data_source" text,
	"refresh_interval" integer,
	"default_size" jsonb,
	"min_size" jsonb,
	"max_size" jsonb,
	"thumbnail" text,
	"icon" text,
	"is_global" boolean DEFAULT false,
	"is_public" boolean DEFAULT false,
	"workspace_id" text,
	"usage_count" integer DEFAULT 0,
	"rating" numeric(3, 2),
	"tags" jsonb,
	"version" text DEFAULT '1.0.0',
	"is_active" boolean DEFAULT true,
	"is_premium" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "digest_metrics" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"tasks_completed" integer DEFAULT 0,
	"comments_received" integer DEFAULT 0,
	"mentions_count" integer DEFAULT 0,
	"kudos_received" integer DEFAULT 0,
	"content" jsonb,
	"email_sent" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_settings" (
	"user_email" text PRIMARY KEY NOT NULL,
	"daily_enabled" boolean DEFAULT true NOT NULL,
	"daily_time" text DEFAULT '09:00',
	"weekly_enabled" boolean DEFAULT true NOT NULL,
	"weekly_day" integer DEFAULT 1,
	"digest_sections" jsonb DEFAULT '["tasks","mentions","comments","kudos"]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"integration_type" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"channel_id" text,
	"channel_name" text,
	"webhook_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "kudos" (
	"id" text PRIMARY KEY NOT NULL,
	"from_user_email" text NOT NULL,
	"to_user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"message" text NOT NULL,
	"emoji" text,
	"category" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mood_analytics" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"mood_distribution" jsonb NOT NULL,
	"average_score" numeric(3, 2),
	"total_checkins" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mood_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"mood" text NOT NULL,
	"notes" text,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"user_email" text NOT NULL,
	"comment" text NOT NULL,
	"is_edited" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "note_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"content" text NOT NULL,
	"edited_by" text NOT NULL,
	"version_number" integer NOT NULL,
	"change_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_email" text NOT NULL,
	"role" text DEFAULT 'member',
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"assigned_at" timestamp with time zone DEFAULT now(),
	"assigned_by" text,
	"hours_per_week" integer,
	"is_active" boolean DEFAULT true,
	"notification_settings" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "project_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"created_by" text NOT NULL,
	"last_edited_by" text,
	"is_pinned" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"category" text NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activity_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"current_task_id" text,
	"current_project_id" text,
	"activity_type" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences_extended" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"preference_type" text NOT NULL,
	"preference_data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_email" text NOT NULL,
	"skill_name" text NOT NULL,
	"proficiency_level" integer NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"endorsed_by" jsonb DEFAULT '[]'::jsonb,
	"years_of_experience" integer,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_status" (
	"user_email" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"status_message" text,
	"emoji" text,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_widget_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"widget_id" text NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"dashboard_id" text,
	"position" jsonb NOT NULL,
	"size" jsonb NOT NULL,
	"config" jsonb,
	"filters" jsonb,
	"is_visible" boolean DEFAULT true,
	"is_pinned" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"export_id" text NOT NULL,
	"user_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"export_type" text NOT NULL,
	"format" text NOT NULL,
	"filters" jsonb,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0,
	"file_url" text,
	"file_size" integer,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_exports_export_id_unique" UNIQUE("export_id")
);
--> statement-breakpoint
CREATE TABLE "api_rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"endpoint" text,
	"limit" integer DEFAULT 1000 NOT NULL,
	"window" integer DEFAULT 3600 NOT NULL,
	"current_usage" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_usage_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"user_id" integer,
	"status_code" integer NOT NULL,
	"response_time" integer NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "automation_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"status" text NOT NULL,
	"triggered_by" text,
	"execution_time" integer,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_health" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"health_score" integer NOT NULL,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"satisfaction_score" integer DEFAULT 0 NOT NULL,
	"usage_score" integer DEFAULT 0 NOT NULL,
	"risk_level" text NOT NULL,
	"last_activity_at" timestamp,
	"notes" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_budget" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_actual" numeric(12, 2) DEFAULT '0' NOT NULL,
	"variance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"burn_rate" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cash_inflow" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cash_outflow" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_data_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"completed_by" integer,
	"notes" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "gdpr_data_retention_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"data_type" text NOT NULL,
	"retention_period" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdpr_user_consent" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"consent_type" text NOT NULL,
	"consented" boolean NOT NULL,
	"consented_at" timestamp,
	"revoked_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_financials" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"budget" numeric(12, 2) DEFAULT '0' NOT NULL,
	"actual_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"profit_margin" numeric(5, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_revenue" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"profit" numeric(12, 2) DEFAULT '0' NOT NULL,
	"billing_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"status" text NOT NULL,
	"file_url" text,
	"error" text,
	"execution_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"mrr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"arr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"new_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"churn_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"growth_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"alert_type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"risk_score" integer,
	"affected_task_count" integer DEFAULT 0,
	"metadata" jsonb,
	"resolved_at" timestamp,
	"resolved_by" text,
	"resolution_notes" text,
	"acknowledged_at" timestamp,
	"acknowledged_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roi_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"name" text NOT NULL,
	"investment" numeric(12, 2) NOT NULL,
	"returns" numeric(12, 2) NOT NULL,
	"roi" numeric(5, 2) NOT NULL,
	"period" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "satisfaction_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"survey_type" text NOT NULL,
	"user_id" integer,
	"customer_id" integer,
	"score" integer NOT NULL,
	"feedback" text,
	"category" text,
	"sent_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"report_type" text NOT NULL,
	"frequency" text NOT NULL,
	"format" text NOT NULL,
	"recipients" jsonb NOT NULL,
	"filters" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"severity" text NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_metrics_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_threats" integer DEFAULT 0 NOT NULL,
	"resolved_threats" integer DEFAULT 0 NOT NULL,
	"critical_alerts" integer DEFAULT 0 NOT NULL,
	"high_alerts" integer DEFAULT 0 NOT NULL,
	"medium_alerts" integer DEFAULT 0 NOT NULL,
	"low_alerts" integer DEFAULT 0 NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"enabled_at" timestamp,
	"method" text,
	"backup_codes" jsonb,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" integer NOT NULL,
	"device_info" text,
	"browser" text,
	"os" text,
	"ip_address" text,
	"location" text,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"invite_token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"accepted_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "workspace_invites_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"allow_guest_invites" boolean DEFAULT true NOT NULL,
	"require_approval_for_new_members" boolean DEFAULT false NOT NULL,
	"enable_team_chat" boolean DEFAULT true NOT NULL,
	"enable_file_sharing" boolean DEFAULT true NOT NULL,
	"enable_time_tracking" boolean DEFAULT true NOT NULL,
	"enable_project_templates" boolean DEFAULT true NOT NULL,
	"enable_advanced_analytics" boolean DEFAULT false NOT NULL,
	"enable_automation" boolean DEFAULT true NOT NULL,
	"enable_integrations" boolean DEFAULT true NOT NULL,
	"enable_notifications" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "permission_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"permission" text NOT NULL,
	"granted" boolean NOT NULL,
	"workspace_id" text,
	"project_id" text,
	"resource_type" text,
	"resource_id" text,
	"reason" text,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"workspace_id" text,
	"project_ids" json,
	"department_ids" json,
	"assigned_by" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"reason" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"role_id" text,
	"user_id" text,
	"assignment_id" text,
	"previous_value" json,
	"new_value" json,
	"reason" text,
	"changed_by" text NOT NULL,
	"workspace_id" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"permissions" json NOT NULL,
	"color" text DEFAULT '#3B82F6',
	"icon" text,
	"category" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"workspace_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"permissions" json,
	"base_role_id" text,
	"color" text DEFAULT '#3B82F6',
	"icon" text,
	"workspace_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"users_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text
);
--> statement-breakpoint
CREATE TABLE "file_activity_log" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"activity_details" json,
	"user_id" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"content" text NOT NULL,
	"position_x" integer,
	"position_y" integer,
	"page" integer,
	"user_id" text NOT NULL,
	"parent_comment_id" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"shared_with_user_id" text,
	"shared_with_email" text,
	"can_view" boolean DEFAULT true NOT NULL,
	"can_download" boolean DEFAULT true NOT NULL,
	"can_edit" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"share_token" text,
	"expires_at" timestamp with time zone,
	"password_protected" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"shared_by" text NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp with time zone,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_shares_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "file_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"version" integer NOT NULL,
	"file_name" text NOT NULL,
	"url" text NOT NULL,
	"size" integer NOT NULL,
	"change_description" text,
	"changed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"original_name" text NOT NULL,
	"file_id" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"extension" text,
	"storage_provider" text NOT NULL,
	"url" text NOT NULL,
	"thumbnail_url" text,
	"storage_key" text,
	"public_id" text,
	"virus_scan_status" text DEFAULT 'pending',
	"virus_scan_result" json,
	"scanned_at" timestamp with time zone,
	"uploaded_by" text NOT NULL,
	"workspace_id" text NOT NULL,
	"project_id" text,
	"task_id" text,
	"description" text,
	"tags" json,
	"metadata" json,
	"is_public" boolean DEFAULT false NOT NULL,
	"access_type" text DEFAULT 'workspace',
	"version" integer DEFAULT 1 NOT NULL,
	"parent_file_id" text,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
CREATE TABLE "goal_key_results" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_value" numeric(10, 2) NOT NULL,
	"current_value" numeric(10, 2) DEFAULT '0',
	"unit" text NOT NULL,
	"due_date" timestamp with time zone,
	"status" text DEFAULT 'not_started' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goal_milestones" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp with time zone NOT NULL,
	"goal_ids" jsonb DEFAULT '[]'::jsonb,
	"task_ids" jsonb DEFAULT '[]'::jsonb,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"completed_at" timestamp with time zone,
	"stakeholders" jsonb DEFAULT '[]'::jsonb,
	"success_criteria" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "goal_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"goal_id" text,
	"key_result_id" text,
	"value" numeric(10, 2) NOT NULL,
	"previous_value" numeric(10, 2),
	"note" text,
	"recorded_by" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_reflections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"week_of" timestamp with time zone NOT NULL,
	"went_well" text,
	"could_improve" text,
	"learned" text,
	"grateful" text,
	"next_priority" text,
	"goal_id" text,
	"privacy" text DEFAULT 'private' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"timeframe" text NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"progress" integer DEFAULT 0,
	"privacy" text DEFAULT 'private' NOT NULL,
	"parent_goal_id" text,
	"priority" text DEFAULT 'medium',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "group_id" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_grouped" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "priority" text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_backup_codes" text;--> statement-breakpoint
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_templates" ADD CONSTRAINT "dashboard_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_templates" ADD CONSTRAINT "dashboard_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_metrics" ADD CONSTRAINT "digest_metrics_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_settings" ADD CONSTRAINT "digest_settings_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_from_user_email_users_email_fk" FOREIGN KEY ("from_user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_to_user_email_users_email_fk" FOREIGN KEY ("to_user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kudos" ADD CONSTRAINT "kudos_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_analytics" ADD CONSTRAINT "mood_analytics_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_checkins" ADD CONSTRAINT "mood_checkins_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_checkins" ADD CONSTRAINT "mood_checkins_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_note_id_project_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."project_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_comments" ADD CONSTRAINT "note_comments_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_note_id_project_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."project_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_versions" ADD CONSTRAINT "note_versions_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_last_edited_by_users_id_fk" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_settings" ADD CONSTRAINT "project_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD CONSTRAINT "user_activity_sessions_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD CONSTRAINT "user_activity_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD CONSTRAINT "user_activity_sessions_current_task_id_tasks_id_fk" FOREIGN KEY ("current_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_activity_sessions" ADD CONSTRAINT "user_activity_sessions_current_project_id_projects_id_fk" FOREIGN KEY ("current_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences_extended" ADD CONSTRAINT "user_preferences_extended_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_status" ADD CONSTRAINT "user_status_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_widget_instances" ADD CONSTRAINT "user_widget_instances_widget_id_dashboard_widgets_id_fk" FOREIGN KEY ("widget_id") REFERENCES "public"."dashboard_widgets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_widget_instances" ADD CONSTRAINT "user_widget_instances_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_widget_instances" ADD CONSTRAINT "user_widget_instances_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_overrides" ADD CONSTRAINT "permission_overrides_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_assignment_id_role_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."role_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_audit_log" ADD CONSTRAINT "role_audit_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_templates" ADD CONSTRAINT "role_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_base_role_id_roles_id_fk" FOREIGN KEY ("base_role_id") REFERENCES "public"."roles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_activity_log" ADD CONSTRAINT "file_activity_log_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_activity_log" ADD CONSTRAINT "file_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_comments" ADD CONSTRAINT "file_comments_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_with_user_id_users_id_fk" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_shares" ADD CONSTRAINT "file_shares_shared_by_users_id_fk" FOREIGN KEY ("shared_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_key_results" ADD CONSTRAINT "goal_key_results_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_milestones" ADD CONSTRAINT "goal_milestones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_key_result_id_goal_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."goal_key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_reflections" ADD CONSTRAINT "goal_reflections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_reflections" ADD CONSTRAINT "goal_reflections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_reflections" ADD CONSTRAINT "goal_reflections_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_goal_id_goals_id_fk" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_preferences_extended_user_preference_idx" ON "user_preferences_extended" USING btree ("user_id","preference_type");--> statement-breakpoint
CREATE INDEX "analytics_exports_export_id_idx" ON "analytics_exports" USING btree ("export_id");--> statement-breakpoint
CREATE INDEX "analytics_exports_user_id_idx" ON "analytics_exports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "analytics_exports_status_idx" ON "analytics_exports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "api_rate_limits_user_id_idx" ON "api_rate_limits" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_endpoint_idx" ON "api_usage_metrics" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "api_usage_timestamp_idx" ON "api_usage_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "automation_executions_rule_id_idx" ON "automation_executions" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "customer_health_customer_id_idx" ON "customer_health" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "financial_metrics_date_idx" ON "financial_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "gdpr_requests_user_id_idx" ON "gdpr_data_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gdpr_consent_user_id_idx" ON "gdpr_user_consent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_financials_project_id_idx" ON "project_financials" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_revenue_project_id_idx" ON "project_revenue" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_revenue_date_idx" ON "project_revenue" USING btree ("date");--> statement-breakpoint
CREATE INDEX "report_executions_report_id_idx" ON "report_executions" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "revenue_metrics_date_idx" ON "revenue_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "risk_alerts_workspace_id_idx" ON "risk_alerts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "risk_alerts_project_id_idx" ON "risk_alerts" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "risk_alerts_status_idx" ON "risk_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "risk_alerts_severity_idx" ON "risk_alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "risk_alerts_created_at_idx" ON "risk_alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "roi_metrics_project_id_idx" ON "roi_metrics" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "surveys_type_idx" ON "satisfaction_surveys" USING btree ("survey_type");--> statement-breakpoint
CREATE INDEX "surveys_user_id_idx" ON "satisfaction_surveys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "two_factor_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_session_id_idx" ON "user_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "workspace_invites_workspace_id_idx" ON "workspace_invites" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_invites_email_idx" ON "workspace_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "workspace_invites_invite_token_idx" ON "workspace_invites" USING btree ("invite_token");--> statement-breakpoint
CREATE INDEX "workspace_invites_status_idx" ON "workspace_invites" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workspace_settings_workspace_id_idx" ON "workspace_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_key_results_goal" ON "goal_key_results" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_key_results_status" ON "goal_key_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_key_results_due_date" ON "goal_key_results" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_milestones_due_date" ON "goal_milestones" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_milestones_user_status" ON "goal_milestones" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_milestones_workspace" ON "goal_milestones" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_milestones_priority" ON "goal_milestones" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_goal_progress_goal" ON "goal_progress" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "idx_goal_progress_key_result" ON "goal_progress" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_goal_progress_recorded_at" ON "goal_progress" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "idx_goal_progress_recorded_by" ON "goal_progress" USING btree ("recorded_by");--> statement-breakpoint
CREATE INDEX "idx_reflections_user_week" ON "goal_reflections" USING btree ("user_id","week_of");--> statement-breakpoint
CREATE INDEX "idx_reflections_workspace" ON "goal_reflections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_reflections_submitted" ON "goal_reflections" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "idx_goals_workspace_user" ON "goals" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_goals_status" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_goals_end_date" ON "goals" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_goals_type" ON "goals" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_goals_parent" ON "goals" USING btree ("parent_goal_id");--> statement-breakpoint
CREATE INDEX "idx_channel_membership_channel_id" ON "channel_membership" USING btree ("channel_id");--> statement-breakpoint
CREATE INDEX "idx_channel_membership_user_email" ON "channel_membership" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_channel_membership_user_id" ON "channel_membership" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_channel_membership_channel_user" ON "channel_membership" USING btree ("channel_id","user_email");--> statement-breakpoint
CREATE INDEX "idx_channel_workspace_id" ON "channel" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_channel_is_archived" ON "channel" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "idx_channel_created_by" ON "channel" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_email" ON "notifications" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_pinned" ON "notifications" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_archived" ON "notifications" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_projects_workspace_id" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_projects_status" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_projects_owner_id" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_projects_is_archived" ON "projects" USING btree ("is_archived");--> statement-breakpoint
CREATE INDEX "idx_projects_created_at" ON "projects" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_projects_workspace_status" ON "projects" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_id" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee_id" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_user_email" ON "tasks" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_tasks_due_date" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_created_at" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_project_status" ON "tasks" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee_status" ON "tasks" USING btree ("assignee_id","status");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_workspace_id" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_user_id" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_user_email" ON "workspace_members" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_role" ON "workspace_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_status" ON "workspace_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_workspace_members_workspace_user" ON "workspace_members" USING btree ("workspace_id","user_id");