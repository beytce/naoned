CREATE TABLE "family_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"family" text NOT NULL,
	"account_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reports" (
	"message_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "message_reports_message_id_reporter_id_pk" PRIMARY KEY("message_id","reporter_id")
);
--> statement-breakpoint
ALTER TABLE "family_messages" ADD CONSTRAINT "family_messages_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_messages" ADD CONSTRAINT "family_messages_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_family_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."family_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_accounts_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "family_messages_thread_idx" ON "family_messages" USING btree ("world_id","family","created_at");--> statement-breakpoint
CREATE INDEX "family_messages_author_idx" ON "family_messages" USING btree ("account_id","created_at");