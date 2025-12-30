CREATE SCHEMA "pelican";
--> statement-breakpoint
CREATE TYPE "pelican"."approval" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "pelican"."formats" AS ENUM('svg', 'ascii');--> statement-breakpoint
CREATE TYPE "pelican"."providers" AS ENUM('openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom');--> statement-breakpoint
CREATE TYPE "pelican"."status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "pelican"."artifacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"step_id" integer NOT NULL,
	"body" text DEFAULT '',
	"render_error" text
);
--> statement-breakpoint
CREATE TABLE "pelican"."generation_images" (
	"gen_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	CONSTRAINT "generation_images_gen_id_image_id_pk" PRIMARY KEY("gen_id","image_id")
);
--> statement-breakpoint
CREATE TABLE "pelican"."generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"format" "pelican"."formats" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"provider" "pelican"."providers" NOT NULL,
	"model" text NOT NULL,
	"endpoint" text,
	"initial_template" text NOT NULL,
	"refinement_template" text NOT NULL,
	"max_steps" integer DEFAULT 5 NOT NULL,
	"send_full_history" boolean DEFAULT true NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"approval" "pelican"."approval" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pelican"."images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"extension" text DEFAULT 'png' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pelican"."sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pelican"."steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"gen_id" uuid NOT NULL,
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
CREATE TABLE "pelican"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_anon" boolean DEFAULT true NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"registered_at" timestamp,
	"ip" text,
	"user_agent" text,
	"referrer" text,
	"accept_language" text,
	"platform" text,
	"is_mobile" boolean,
	"country" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"landing_page" text,
	"last_seen_at" timestamp,
	"visit_count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ADD CONSTRAINT "artifacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ADD CONSTRAINT "artifacts_step_id_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "pelican"."steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."generation_images" ADD CONSTRAINT "generation_images_gen_id_generations_id_fk" FOREIGN KEY ("gen_id") REFERENCES "pelican"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."generation_images" ADD CONSTRAINT "generation_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "pelican"."images"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD CONSTRAINT "generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."images" ADD CONSTRAINT "images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."steps" ADD CONSTRAINT "steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."steps" ADD CONSTRAINT "steps_gen_id_generations_id_fk" FOREIGN KEY ("gen_id") REFERENCES "pelican"."generations"("id") ON DELETE cascade ON UPDATE no action;