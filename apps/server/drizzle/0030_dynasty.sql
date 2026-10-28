CREATE TABLE "generations" (
	"account_id" uuid NOT NULL,
	"world_id" uuid NOT NULL,
	"given" text NOT NULL,
	"year" integer NOT NULL,
	"trait_in" text,
	"earned" jsonb,
	"heir" text,
	"epithet" text,
	"rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generations_account_id_world_id_pk" PRIMARY KEY("account_id","world_id")
);
--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;