CREATE TYPE "pelican"."access" AS ENUM('private', 'shared', 'gallery');--> statement-breakpoint
ALTER TABLE "pelican"."generations" ADD COLUMN "access" "pelican"."access" DEFAULT 'gallery' NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."generations" DROP COLUMN "shared";--> statement-breakpoint
ALTER TABLE "pelican"."generations" DROP COLUMN "public";