CREATE TABLE "terra_results" (
	"world_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"of" integer NOT NULL,
	"glory" integer NOT NULL,
	"cells" integer NOT NULL,
	"rating" integer NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "terra_results_world_id_week_account_id_pk" PRIMARY KEY("world_id","week","account_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "terra_rating" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "terra_results" ADD CONSTRAINT "terra_results_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terra_results" ADD CONSTRAINT "terra_results_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;