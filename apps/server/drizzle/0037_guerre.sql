CREATE TABLE "guerre_assaults" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"week" timestamp with time zone NOT NULL,
	"day" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"world_id" uuid,
	"by" text NOT NULL,
	"target" text NOT NULL,
	"seals" integer DEFAULT 0 NOT NULL,
	"damage_bps" integer DEFAULT 0 NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"port" jsonb NOT NULL,
	"fleet" jsonb NOT NULL,
	"moves" jsonb NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guerre_weeks" (
	"week" timestamp with time zone PRIMARY KEY NOT NULL,
	"wars" jsonb NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "guerre_assaults" ADD CONSTRAINT "guerre_assaults_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guerre_assaults" ADD CONSTRAINT "guerre_assaults_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guerre_assaults_day_key" ON "guerre_assaults" USING btree ("account_id","day");--> statement-breakpoint
CREATE INDEX "guerre_assaults_week_idx" ON "guerre_assaults" USING btree ("week");