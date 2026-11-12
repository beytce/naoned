CREATE TABLE "company_beacon_gifts" (
	"account_id" uuid NOT NULL,
	"day" integer NOT NULL,
	"units" integer NOT NULL,
	CONSTRAINT "company_beacon_gifts_account_id_day_pk" PRIMARY KEY("account_id","day")
);
--> statement-breakpoint
CREATE TABLE "company_beacons" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_beacon_gifts" ADD CONSTRAINT "company_beacon_gifts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_beacons" ADD CONSTRAINT "company_beacons_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;