CREATE TABLE "canal_plots" (
	"plot" integer PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"since_world_id" uuid,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "canal_plots_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
ALTER TABLE "canal_plots" ADD CONSTRAINT "canal_plots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canal_plots" ADD CONSTRAINT "canal_plots_since_world_id_worlds_id_fk" FOREIGN KEY ("since_world_id") REFERENCES "public"."worlds"("id") ON DELETE set null ON UPDATE no action;