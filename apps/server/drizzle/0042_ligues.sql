CREATE TABLE "planche_account_leagues" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"best" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planche_lagoon_leagues" (
	"world_id" uuid PRIMARY KEY NOT NULL,
	"league" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planche_tides" (
	"world_id" uuid NOT NULL,
	"tide" integer NOT NULL,
	"moves" jsonb NOT NULL,
	"done_at" timestamp with time zone NOT NULL,
	CONSTRAINT "planche_tides_world_id_tide_pk" PRIMARY KEY("world_id","tide")
);
--> statement-breakpoint
ALTER TABLE "planche_account_leagues" ADD CONSTRAINT "planche_account_leagues_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planche_lagoon_leagues" ADD CONSTRAINT "planche_lagoon_leagues_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planche_tides" ADD CONSTRAINT "planche_tides_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;