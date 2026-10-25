CREATE TABLE "funnel_counts" (
	"day" text NOT NULL,
	"step" text NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "funnel_counts_day_step_source_pk" PRIMARY KEY("day","step","source")
);
