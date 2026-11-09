CREATE TABLE "battle_ratings" (
	"world_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "battle_ratings_world_id_account_id_pk" PRIMARY KEY("world_id","account_id")
);
--> statement-breakpoint
ALTER TABLE "battle_ratings" ADD CONSTRAINT "battle_ratings_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_ratings" ADD CONSTRAINT "battle_ratings_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "battle_ratings_world_rating" ON "battle_ratings" USING btree ("world_id","rating");