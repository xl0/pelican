ALTER TABLE "pelican"."generations" ALTER COLUMN "send_full_history" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ALTER COLUMN "send_full_history" SET DATA TYPE boolean USING send_full_history::boolean;--> statement-breakpoint
ALTER TABLE "pelican"."generations" ALTER COLUMN "send_full_history" SET DEFAULT true;