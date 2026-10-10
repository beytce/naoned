ALTER TABLE "accounts" ADD COLUMN "is_bot" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "bot_profile" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "retired_at" timestamp with time zone;