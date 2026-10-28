CREATE TABLE "doges" (
	"month" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"world_id" uuid,
	"mutator" text,
	"decree" jsonb NOT NULL,
	"votes" integer NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doges" ADD CONSTRAINT "doges_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doges" ADD CONSTRAINT "doges_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;