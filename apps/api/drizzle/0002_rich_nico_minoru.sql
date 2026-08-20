CREATE TYPE "public"."project_status" AS ENUM('in_progress', 'completed', 'archived');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	"slug" varchar(255) NOT NULL,
	"tech_stack" text[] DEFAULT '{}' NOT NULL,
	"repo_url" varchar(2048),
	"demo_url" varchar(2048),
	"cover_image_url" varchar(2048),
	"status" "project_status" DEFAULT 'in_progress' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"completed_at" date,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_unique" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_order_idx" ON "projects" USING btree ("deleted_at","order");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");