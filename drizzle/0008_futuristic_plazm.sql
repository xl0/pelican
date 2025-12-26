-- Add nullable columns first
ALTER TABLE "pelican"."steps" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "pelican"."images" ADD COLUMN "user_id" uuid;--> statement-breakpoint

-- Populate user_id from parent generation for steps
UPDATE "pelican"."steps" s SET "user_id" = g."user_id" FROM "pelican"."generations" g WHERE s."gen_id" = g."id";--> statement-breakpoint

-- Populate user_id from parent step->generation for artifacts
UPDATE "pelican"."artifacts" a SET "user_id" = g."user_id" FROM "pelican"."steps" s JOIN "pelican"."generations" g ON s."gen_id" = g."id" WHERE a."step_id" = s."id";--> statement-breakpoint

-- Populate user_id from linked generation for images
UPDATE "pelican"."images" i SET "user_id" = g."user_id" FROM "pelican"."generation_images" gi JOIN "pelican"."generations" g ON gi."gen_id" = g."id" WHERE i."id" = gi."image_id";--> statement-breakpoint

-- Delete orphaned images (no linked generation)
DELETE FROM "pelican"."images" WHERE "user_id" IS NULL;--> statement-breakpoint

-- Make columns NOT NULL
ALTER TABLE "pelican"."steps" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "pelican"."images" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "pelican"."steps" ADD CONSTRAINT "steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."artifacts" ADD CONSTRAINT "artifacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pelican"."images" ADD CONSTRAINT "images_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "pelican"."users"("id") ON DELETE cascade ON UPDATE no action;