CREATE TABLE "skirmish_matches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"world_id" uuid NOT NULL,
	"players" text[] NOT NULL,
	"ranked" boolean DEFAULT false NOT NULL,
	"status" text NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	CONSTRAINT "skirmish_matches_status" CHECK ("skirmish_matches"."status" in ('open', 'playing', 'paid', 'done', 'aborted'))
);
--> statement-breakpoint
ALTER TABLE "skirmish_matches" ADD CONSTRAINT "skirmish_matches_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skirmish_matches_world_status" ON "skirmish_matches" USING btree ("world_id","status");