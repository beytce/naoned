CREATE TABLE "gazettes" (
	"world_id" uuid NOT NULL,
	"week" timestamp with time zone NOT NULL,
	"issue" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "gazettes_world_id_week_pk" PRIMARY KEY("world_id","week")
);
--> statement-breakpoint
ALTER TABLE "gazettes" ADD CONSTRAINT "gazettes_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;