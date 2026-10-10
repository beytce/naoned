CREATE TABLE "ledger_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"from_account" text NOT NULL,
	"to_account" text NOT NULL,
	"amount" bigint NOT NULL,
	"reason" text NOT NULL,
	"ref" text,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "ledger_entries_amount_positive" CHECK ("ledger_entries"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "players" (
	"world_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"region" text NOT NULL,
	"joined_at" timestamp with time zone NOT NULL,
	"tutorial_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "players_world_id_account_id_pk" PRIMARY KEY("world_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"player_id" text NOT NULL,
	"resource" text NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text NOT NULL,
	"ref" text,
	"at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telemetry" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" uuid,
	"world_id" uuid,
	"type" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"props" jsonb
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"world_id" uuid NOT NULL,
	"id" text NOT NULL,
	"resource" text NOT NULL,
	"price" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"buyer_id" text NOT NULL,
	"seller_id" text NOT NULL,
	"buy_order_id" text NOT NULL,
	"sell_order_id" text NOT NULL,
	"tax" bigint NOT NULL,
	"at" timestamp with time zone NOT NULL,
	CONSTRAINT "trades_world_id_id_pk" PRIMARY KEY("world_id","id")
);
--> statement-breakpoint
CREATE TABLE "world_states" (
	"world_id" uuid PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"theme" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_states" ADD CONSTRAINT "world_states_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_entries_world_idx" ON "ledger_entries" USING btree ("world_id","at");--> statement-breakpoint
CREATE INDEX "stock_movements_world_idx" ON "stock_movements" USING btree ("world_id","player_id","resource");--> statement-breakpoint
CREATE INDEX "telemetry_type_idx" ON "telemetry" USING btree ("type","at");--> statement-breakpoint
CREATE INDEX "trades_world_resource_idx" ON "trades" USING btree ("world_id","resource","at");