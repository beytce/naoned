CREATE TABLE "maison_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"world_id" uuid,
	"kind" text NOT NULL,
	"data" text,
	"key" text NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maison_events" ADD CONSTRAINT "maison_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maison_events" ADD CONSTRAINT "maison_events_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "maison_events_key" ON "maison_events" USING btree ("account_id","key");--> statement-breakpoint
CREATE INDEX "maison_events_account_idx" ON "maison_events" USING btree ("account_id","at");