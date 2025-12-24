CREATE SCHEMA "pelican";
--> statement-breakpoint
CREATE TYPE "pelican"."formats" AS ENUM('svg', 'ascii');--> statement-breakpoint
CREATE TYPE "pelican"."status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "pelican"."providers" AS ENUM('openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom');--> statement-breakpoint
CREATE TABLE "pelican"."artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"step_id" integer NOT NULL,
	"body" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "pelican"."generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"format" "pelican"."formats" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pelican"."images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gen_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pelican"."steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"gen_id" uuid NOT NULL,
	"provider" "pelican"."providers" NOT NULL,
	"model" text NOT NULL,
	"endpoint" text,
	"prompt_template" text NOT NULL,
	"rendered_prompt" text NOT NULL,
	"status" "pelican"."status" NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"raw_output" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"input_cost" real,
	"output_cost" real
);
--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ADD CONSTRAINT "artifacts_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "pelican"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."images" ADD CONSTRAINT "images_gen_id_generations_id_fk" FOREIGN KEY ("gen_id") REFERENCES "pelican"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."steps" ADD CONSTRAINT "steps_gen_id_generations_id_fk" FOREIGN KEY ("gen_id") REFERENCES "pelican"."generations"("id") ON DELETE cascade ON UPDATE no action;