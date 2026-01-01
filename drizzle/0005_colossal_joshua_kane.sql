-- Add new column
ALTER TABLE "pelican"."users" ADD COLUMN "is_registered" boolean DEFAULT false NOT NULL;
-- Invert values: is_registered = NOT is_anon
UPDATE "pelican"."users" SET "is_registered" = NOT "is_anon";
-- Drop old column
ALTER TABLE "pelican"."users" DROP COLUMN "is_anon";