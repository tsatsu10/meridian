CREATE TABLE "read_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "caption" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "message_id" text;--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "channel_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reactions" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_seen" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "read_receipts" ADD CONSTRAINT "read_receipts_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_channel_id_channel_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channel"("id") ON DELETE cascade ON UPDATE no action;