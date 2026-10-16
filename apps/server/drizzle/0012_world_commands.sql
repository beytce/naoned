CREATE TABLE "world_commands" (
	"world_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"at" bigint NOT NULL,
	"commands" jsonb NOT NULL,
	CONSTRAINT "world_commands_world_id_version_pk" PRIMARY KEY("world_id","version")
);
--> statement-breakpoint
ALTER TABLE "world_commands" ADD CONSTRAINT "world_commands_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;