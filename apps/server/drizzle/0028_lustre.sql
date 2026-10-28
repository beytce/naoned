CREATE TABLE "sfide" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"world_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"kind" text DEFAULT 'ladder' NOT NULL,
	"a" uuid NOT NULL,
	"b" uuid,
	"ghost_account" uuid,
	"ghost_world" uuid,
	"ghost_week" integer,
	"stake" integer DEFAULT 0 NOT NULL,
	"accepted_at" timestamp with time zone,
	"a_gain" bigint,
	"b_gain" bigint,
	"delta_a" integer,
	"delta_b" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"settled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "week_curves" (
	"world_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"account_id" uuid NOT NULL,
	"lustre" integer NOT NULL,
	"gains" jsonb NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "week_curves_world_id_week_account_id_pk" PRIMARY KEY("world_id","week","account_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "lustre" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sfide" ADD CONSTRAINT "sfide_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sfide" ADD CONSTRAINT "sfide_a_accounts_id_fk" FOREIGN KEY ("a") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sfide" ADD CONSTRAINT "sfide_b_accounts_id_fk" FOREIGN KEY ("b") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sfide" ADD CONSTRAINT "sfide_ghost_account_accounts_id_fk" FOREIGN KEY ("ghost_account") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_curves" ADD CONSTRAINT "week_curves_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "week_curves" ADD CONSTRAINT "week_curves_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sfide_world_week_idx" ON "sfide" USING btree ("world_id","week");--> statement-breakpoint
CREATE INDEX "sfide_a_idx" ON "sfide" USING btree ("a");--> statement-breakpoint
CREATE INDEX "sfide_b_idx" ON "sfide" USING btree ("b");