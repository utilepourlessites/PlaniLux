CREATE TABLE "planner_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'school' NOT NULL,
	"color" text DEFAULT '#c6b8f5' NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
