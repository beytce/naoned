CREATE TABLE "planche_seats" (
	"world_id" uuid NOT NULL,
	"house" text NOT NULL,
	"account_id" uuid NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	CONSTRAINT "planche_seats_world_id_house_pk" PRIMARY KEY("world_id","house")
);
--> statement-breakpoint
ALTER TABLE "planche_seats" ADD CONSTRAINT "planche_seats_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planche_seats" ADD CONSTRAINT "planche_seats_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "planche_seats_account_key" ON "planche_seats" USING btree ("account_id");