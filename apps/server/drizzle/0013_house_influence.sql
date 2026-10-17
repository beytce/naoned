CREATE TABLE "influence_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"world_id" uuid,
	"source" text NOT NULL,
	"week" integer,
	"amount" integer NOT NULL,
	"patent" text,
	"key" text NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "influence_entries" ADD CONSTRAINT "influence_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "influence_entries" ADD CONSTRAINT "influence_entries_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "influence_entries_key" ON "influence_entries" USING btree ("account_id","key");