CREATE TABLE "season_results" (
	"world_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"rank" integer NOT NULL,
	"players" integer NOT NULL,
	"worth" bigint NOT NULL,
	"tier" text NOT NULL,
	"renown" integer NOT NULL,
	"seen_at" timestamp with time zone,
	CONSTRAINT "season_results_world_id_account_id_pk" PRIMARY KEY("world_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "season_results" ADD CONSTRAINT "season_results_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_results" ADD CONSTRAINT "season_results_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;