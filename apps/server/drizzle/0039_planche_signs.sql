CREATE TABLE "planche_signs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"company_id" uuid,
	"to_account" uuid,
	"world_id" uuid,
	"kind" text NOT NULL,
	"target" text NOT NULL,
	"week" timestamp with time zone NOT NULL,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "planche_signs" ADD CONSTRAINT "planche_signs_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planche_signs" ADD CONSTRAINT "planche_signs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planche_signs" ADD CONSTRAINT "planche_signs_to_account_accounts_id_fk" FOREIGN KEY ("to_account") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planche_signs" ADD CONSTRAINT "planche_signs_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "planche_signs_company_idx" ON "planche_signs" USING btree ("company_id","week");--> statement-breakpoint
CREATE INDEX "planche_signs_to_idx" ON "planche_signs" USING btree ("to_account","at");