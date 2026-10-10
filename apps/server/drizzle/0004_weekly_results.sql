CREATE TABLE "weekly_results" (
	"world_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"gain" bigint NOT NULL,
	"award" text,
	CONSTRAINT "weekly_results_world_id_week_account_id_pk" PRIMARY KEY("world_id","week","account_id")
);
--> statement-breakpoint
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;