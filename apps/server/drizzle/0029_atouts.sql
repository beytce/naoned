CREATE TABLE "account_atouts" (
	"account_id" uuid NOT NULL,
	"code" text NOT NULL,
	"reason" text NOT NULL,
	"world_id" uuid,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "account_atouts_account_id_code_pk" PRIMARY KEY("account_id","code")
);
--> statement-breakpoint
ALTER TABLE "account_atouts" ADD CONSTRAINT "account_atouts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;