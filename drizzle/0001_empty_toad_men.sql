ALTER TABLE "pelican"."generations" ADD COLUMN "provider" "pelican"."providers" NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "model" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "endpoint" text;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "initial_template" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "refinement_template" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."steps" DROP COLUMN "provider";--> statement-breakpoint
ALTER TABLE "pelican"."steps" DROP COLUMN "model";--> statement-breakpoint
ALTER TABLE "pelican"."steps" DROP COLUMN "endpoint";--> statement-breakpoint
ALTER TABLE "pelican"."steps" DROP COLUMN "prompt_template";