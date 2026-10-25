CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone NOT NULL,
	"call_at" timestamp with time zone,
	"call_by" uuid
);
--> statement-breakpoint
CREATE TABLE "company_members" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"joined_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_message_reports" (
	"message_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "company_message_reports_message_id_reporter_id_pk" PRIMARY KEY("message_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "company_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "company_left_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_accounts_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_call_by_accounts_id_fk" FOREIGN KEY ("call_by") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_message_reports" ADD CONSTRAINT "company_message_reports_message_id_company_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."company_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_message_reports" ADD CONSTRAINT "company_message_reports_reporter_id_accounts_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_messages" ADD CONSTRAINT "company_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_messages" ADD CONSTRAINT "company_messages_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_code_key" ON "companies" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_name_key" ON "companies" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "company_members_company_idx" ON "company_members" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_messages_thread_idx" ON "company_messages" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "company_messages_author_idx" ON "company_messages" USING btree ("account_id","created_at");