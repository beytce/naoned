ALTER TABLE "accounts" ADD COLUMN "condotta_level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "condotta_best" integer DEFAULT 0 NOT NULL;