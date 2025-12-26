-- Drop old boolean column and add new text column
ALTER TABLE "pelican"."artifacts" DROP COLUMN "rendered";--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ADD COLUMN "render_error" text;